-- Truce database schema
-- Paste this whole file into Supabase > SQL Editor > New query, then press Run.

create extension if not exists "pgcrypto";

-- A house is a shared household. housemate_count is the creator plus everyone invited.
create table if not exists public.houses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  housemate_count int not null default 1 check (housemate_count between 1 and 20),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Everyone who belongs to a house (the creator joins automatically,
-- invited housemates join the first time they sign in with the invited email).
create table if not exists public.house_members (
  house_id uuid not null references public.houses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  joined_at timestamptz not null default now(),
  primary key (house_id, user_id)
);

-- Emails the creator invited from the Create House screen.
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique (house_id, email)
);

-- Rules proposed from the Propose Rule screen.
create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  author_email text not null,
  text text not null check (char_length(text) between 1 and 280),
  categories text[] not null default '{}',
  votes_needed int not null check (votes_needed >= 1),
  created_at timestamptz not null default now()
);

-- One "agree" vote per housemate per rule.
create table if not exists public.votes (
  rule_id uuid not null references public.rules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (rule_id, user_id)
);

create index if not exists rules_house_idx on public.rules(house_id, created_at desc);
create index if not exists invites_email_idx on public.invites(lower(email));

-- Security: turn on Row Level Security with NO public policies.
-- This means the public (anon / publishable) key can read nothing at all.
-- Only the Python backend, which holds the secret key in a Vercel environment
-- variable, can read or write these tables, and it checks house membership itself.
alter table public.houses        enable row level security;
alter table public.house_members enable row level security;
alter table public.invites       enable row level security;
alter table public.rules         enable row level security;
alter table public.votes         enable row level security;

-- Make sure the backend's server role can use the tables through the Data API.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
