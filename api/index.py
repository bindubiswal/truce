"""
Truce backend (Python, FastAPI).

Runs as a Vercel serverless function in production and with uvicorn locally.
It is the only part of the app that talks to Supabase. The Supabase URL and the
secret key are read from environment variables, so they never appear in the
React code or in the browser.
"""

import math
import os
import re
from typing import List, Optional

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

# Load a local .env file when running on a laptop. On Vercel the variables are
# set in the project settings instead, so this simply does nothing there.
try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY", "")
ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()
]

CATEGORIES = ["Kitchen", "Shared Space", "Noise", "Guests", "Utilities & Supplies"]
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
AGREEMENT_SHARE = 0.75  # 75% of the house has to agree for a rule to pass

app = FastAPI(title="Truce API", docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


# --------------------------------------------------------------------------
# Supabase helpers (plain HTTPS calls to the Supabase Auth and REST APIs)
# --------------------------------------------------------------------------

def _require_config():
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        raise HTTPException(500, "Server is missing its Supabase environment variables.")


def _service_headers(extra: Optional[dict] = None) -> dict:
    headers = {
        "apikey": SUPABASE_SECRET_KEY,
        "Authorization": f"Bearer {SUPABASE_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


async def db(method: str, table: str, params: Optional[dict] = None, json=None, prefer: Optional[str] = None):
    """Call a Supabase table through its REST API using the server side secret key."""
    _require_config()
    extra = {"Prefer": prefer} if prefer else None
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.request(
            method,
            f"{SUPABASE_URL}/rest/v1/{table}",
            params=params,
            json=json,
            headers=_service_headers(extra),
        )
    if res.status_code >= 400:
        raise HTTPException(502, f"Database error on {table}: {res.text[:200]}")
    return res.json() if res.content else None


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------

class Credentials(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=8, max_length=72)

    @field_validator("email")
    @classmethod
    def valid_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Please enter a valid email address")
        return v


async def _password_sign_in(email: str, password: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(
            f"{SUPABASE_URL}/auth/v1/token",
            params={"grant_type": "password"},
            json={"email": email, "password": password},
            headers=_service_headers(),
        )
    if res.status_code >= 400:
        raise HTTPException(401, "Email or password is incorrect.")
    data = res.json()
    return {
        "access_token": data["access_token"],
        "expires_in": data.get("expires_in", 3600),
        "email": data["user"]["email"],
    }


@app.post("/api/auth/signup")
async def signup(body: Credentials):
    _require_config()
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            json={"email": body.email, "password": body.password, "email_confirm": True},
            headers=_service_headers(),
        )
    if res.status_code in (409, 422) or (res.status_code == 400 and "already" in res.text.lower()):
        raise HTTPException(409, "An account with this email already exists. Try signing in instead.")
    if res.status_code >= 400:
        raise HTTPException(400, "We couldn't create that account. Please try a stronger password.")
    return await _password_sign_in(body.email, body.password)


@app.post("/api/auth/login")
async def login(body: Credentials):
    _require_config()
    return await _password_sign_in(body.email, body.password)


async def current_user(authorization: str = Header(default="")) -> dict:
    """Checks the Supabase access token sent by the React app on every request."""
    _require_config()
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Please sign in.")
    token = authorization.split(" ", 1)[1].strip()
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"apikey": SUPABASE_SECRET_KEY, "Authorization": f"Bearer {token}"},
        )
    if res.status_code != 200:
        raise HTTPException(401, "Your session has expired. Please sign in again.")
    user = res.json()
    return {"id": user["id"], "email": (user.get("email") or "").lower()}


# --------------------------------------------------------------------------
# Houses
# --------------------------------------------------------------------------

async def _membership(user: dict) -> Optional[dict]:
    """Returns the user's house. If they were invited but haven't joined yet, joins them now."""
    rows = await db("GET", "house_members", {"user_id": f"eq.{user['id']}", "select": "house_id", "limit": "1"})
    if rows:
        houses = await db("GET", "houses", {"id": f"eq.{rows[0]['house_id']}", "select": "*"})
        return houses[0] if houses else None

    invites = await db(
        "GET", "invites",
        {"email": f"eq.{user['email']}", "select": "house_id", "order": "created_at.desc", "limit": "1"},
    )
    if invites:
        house_id = invites[0]["house_id"]
        await db(
            "POST", "house_members",
            json={"house_id": house_id, "user_id": user["id"], "email": user["email"]},
            prefer="resolution=ignore-duplicates",
        )
        houses = await db("GET", "houses", {"id": f"eq.{house_id}", "select": "*"})
        return houses[0] if houses else None
    return None


async def _require_house(user: dict) -> dict:
    house = await _membership(user)
    if not house:
        raise HTTPException(404, "You're not part of a house yet.")
    return house


@app.get("/api/me")
async def me(user: dict = Depends(current_user)):
    house = await _membership(user)
    return {"email": user["email"], "house": house}


class NewHouse(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    invites: List[str] = Field(default_factory=list, max_length=19)

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Give your house a name")
        return v

    @field_validator("invites")
    @classmethod
    def clean_invites(cls, v: List[str]) -> List[str]:
        cleaned = []
        for email in v:
            email = email.strip().lower()
            if not email:
                continue
            if not EMAIL_RE.match(email):
                raise ValueError(f"'{email}' doesn't look like an email address")
            if email not in cleaned:
                cleaned.append(email)
        return cleaned


@app.post("/api/houses", status_code=201)
async def create_house(body: NewHouse, user: dict = Depends(current_user)):
    if await _membership(user):
        raise HTTPException(409, "You already belong to a house.")
    invites = [e for e in body.invites if e != user["email"]]
    created = await db(
        "POST", "houses",
        json={"name": body.name, "housemate_count": len(invites) + 1, "created_by": user["id"]},
        prefer="return=representation",
    )
    house = created[0]
    await db("POST", "house_members", json={"house_id": house["id"], "user_id": user["id"], "email": user["email"]})
    if invites:
        await db("POST", "invites", json=[{"house_id": house["id"], "email": e} for e in invites])
    return house


@app.get("/api/house")
async def house_overview(user: dict = Depends(current_user)):
    house = await _require_house(user)
    members = await db("GET", "house_members", {"house_id": f"eq.{house['id']}", "select": "email,joined_at"})
    invites = await db("GET", "invites", {"house_id": f"eq.{house['id']}", "select": "email"})
    joined = {m["email"] for m in members}
    rules = await db(
        "GET", "rules",
        {"house_id": f"eq.{house['id']}", "select": "*,votes(user_id)", "order": "created_at.desc"},
    )
    return {
        "house": house,
        "members": [m["email"] for m in members],
        "pending_invites": [i["email"] for i in invites if i["email"] not in joined],
        "rules": [_shape_rule(r, user, house) for r in rules],
    }


# --------------------------------------------------------------------------
# Rules and votes
# --------------------------------------------------------------------------

def _shape_rule(rule: dict, user: dict, house: dict) -> dict:
    voters = [v["user_id"] for v in rule.pop("votes", []) or []]
    rule["agree_count"] = len(voters)
    rule["you_agreed"] = user["id"] in voters
    rule["status"] = "agreed" if len(voters) >= rule["votes_needed"] else "voting"
    rule["housemate_count"] = house["housemate_count"]
    return rule


class NewRule(BaseModel):
    text: str = Field(min_length=1, max_length=280)
    categories: List[str] = Field(min_length=1, max_length=len(CATEGORIES))

    @field_validator("text")
    @classmethod
    def clean_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Write the rule before posting it")
        return v

    @field_validator("categories")
    @classmethod
    def known_categories(cls, v: List[str]) -> List[str]:
        unknown = [c for c in v if c not in CATEGORIES]
        if unknown:
            raise ValueError(f"Unknown category: {', '.join(unknown)}")
        return list(dict.fromkeys(v))


@app.post("/api/rules", status_code=201)
async def propose_rule(body: NewRule, user: dict = Depends(current_user)):
    house = await _require_house(user)
    votes_needed = max(1, math.ceil(house["housemate_count"] * AGREEMENT_SHARE))
    created = await db(
        "POST", "rules",
        json={
            "house_id": house["id"],
            "created_by": user["id"],
            "author_email": user["email"],
            "text": body.text,
            "categories": body.categories,
            "votes_needed": votes_needed,
        },
        prefer="return=representation",
    )
    rule = created[0]
    # Proposing a rule counts as the proposer agreeing with it.
    await db("POST", "votes", json={"rule_id": rule["id"], "user_id": user["id"]})
    return await _get_rule(rule["id"], house, user)


async def _get_rule(rule_id: str, house: dict, user: dict) -> dict:
    rows = await db(
        "GET", "rules",
        {"id": f"eq.{rule_id}", "house_id": f"eq.{house['id']}", "select": "*,votes(user_id)"},
    )
    if not rows:
        raise HTTPException(404, "That rule couldn't be found in your house.")
    return _shape_rule(rows[0], user, house)


UUID_RE = re.compile(r"^[0-9a-fA-F-]{36}$")


@app.get("/api/rules/{rule_id}")
async def get_rule(rule_id: str, user: dict = Depends(current_user)):
    if not UUID_RE.match(rule_id):
        raise HTTPException(404, "That rule couldn't be found in your house.")
    house = await _require_house(user)
    return await _get_rule(rule_id, house, user)


@app.post("/api/rules/{rule_id}/vote")
async def agree_with_rule(rule_id: str, user: dict = Depends(current_user)):
    if not UUID_RE.match(rule_id):
        raise HTTPException(404, "That rule couldn't be found in your house.")
    house = await _require_house(user)
    await _get_rule(rule_id, house, user)  # makes sure the rule belongs to this user's house
    await db(
        "POST", "votes",
        json={"rule_id": rule_id, "user_id": user["id"]},
        prefer="resolution=ignore-duplicates",
    )
    return await _get_rule(rule_id, house, user)


@app.get("/api/health")
async def health():
    return {"status": "ok", "supabase_configured": bool(SUPABASE_URL and SUPABASE_SECRET_KEY)}
