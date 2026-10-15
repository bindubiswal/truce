# truce

**One set of rules. Everybody voted for.**

Truce helps housemates agree on shared house rules through group voting, so no single person has to be the one enforcing rules on everyone else. A housemate creates a house, invites the others by email, and proposes rules. A rule becomes agreed once 75% of the house votes for it.

Built for BUS4012 Vibe Coding for Startups, Assignment 3, by Bindu Biswal.

## Tech stack

| Layer    | Technology                                   | Where it lives            |
| -------- | -------------------------------------------- | ------------------------- |
| Frontend | React 18, Vite, React Router, plain CSS      | `src/`                    |
| Backend  | Python 3, FastAPI                            | `api/index.py`            |
| Database | Supabase (Postgres + Supabase Auth)          | `supabase/schema.sql`     |
| Hosting  | Vercel (static React build + Python function) | `vercel.json`             |

## How it fits together

```
Browser (React)  ──fetch /api/...──▶  Python API on Vercel  ──HTTPS + secret key──▶  Supabase
   holds only the                      checks the user's                              Auth + Postgres
   user's login token                  token, validates input,                        (RLS on, no public access)
                                       checks house membership
```

* The React app only ever calls `/api/...`. It never talks to Supabase directly and contains no Supabase keys.
* The Python backend reads `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from environment variables (set in Vercel, or in a local `.env` file that git ignores).
* Every Supabase table has Row Level Security switched on with no public policies, so the public key cannot read any data. Only the backend can.
* Sign up and sign in go through Supabase Auth. The backend checks the user's access token on every request and only returns data from the house that user belongs to.

## Screens

1. **Login**: sign in or create an account (Supabase Auth)
2. **New house**: name the house and invite housemates by email (saved to `houses`, `house_members`, `invites`)
3. **Propose a rule**: rule text up to 280 characters plus categories (saved to `rules`)
4. **Rule posted**: reads the new rule back from Supabase to confirm it saved
5. **House rules**: every rule in the house with live vote progress and an Agree button (saved to `votes`)

Invited housemates join the house automatically the first time they sign up with the invited email.

## Project structure

```
truce/
├── api/
│   └── index.py          Python FastAPI backend (one Vercel serverless function)
├── src/
│   ├── components/       Reusable UI: PrimaryButton, FormInput, PanelCard, AppHeader, FormMessage, RequireAuth
│   ├── pages/            One file per screen
│   ├── lib/api.js        Fetch helper that adds the login token to each request
│   ├── App.jsx           Routes, with RequireAuth protecting every screen after login
│   └── main.jsx
├── supabase/
│   └── schema.sql        Tables, constraints and Row Level Security
├── public/
├── .env.example          Names of the environment variables (no real values)
├── .gitignore            Keeps .env, node_modules and build output out of git
├── requirements.txt      Python packages for Vercel
├── vercel.json           Sends /api/* to Python and everything else to React
└── package.json
```

## API endpoints

| Method | Path                     | What it does                                   |
| ------ | ------------------------ | ---------------------------------------------- |
| POST   | `/api/auth/signup`       | Create an account and sign in                  |
| POST   | `/api/auth/login`        | Sign in                                        |
| GET    | `/api/me`                | Current user and their house                   |
| POST   | `/api/houses`            | Create a house and save invites                |
| GET    | `/api/house`             | House, members, invites and all rules with votes |
| POST   | `/api/rules`             | Propose a rule                                 |
| GET    | `/api/rules/{id}`        | Read one rule back                             |
| POST   | `/api/rules/{id}/vote`   | Agree with a rule                              |
| GET    | `/api/health`            | Quick check that the API is running            |

## Running it locally

```bash
# 1. Install
npm install
pip install -r requirements.txt uvicorn

# 2. Add your keys
cp .env.example .env      # then fill in SUPABASE_URL and SUPABASE_SECRET_KEY

# 3. Start the backend (terminal 1)
npm run api               # http://localhost:8000

# 4. Start the frontend (terminal 2)
npm run dev               # http://localhost:5173, /api is forwarded to the backend
```

## Environment variables

| Name                  | Used by        | Notes                                                    |
| --------------------- | -------------- | -------------------------------------------------------- |
| `SUPABASE_URL`        | Python backend | Project URL from Supabase settings                       |
| `SUPABASE_SECRET_KEY` | Python backend | Secret (or service_role) key. Never put this in React.   |
| `ALLOWED_ORIGINS`     | Python backend | Optional, only needed for local development              |
