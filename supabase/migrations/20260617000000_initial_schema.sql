-- Veritas Navigator — Initial Schema
-- Run this in your Supabase SQL editor: Dashboard → SQL Editor → New Query

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── USERS ───────────────────────────────────────────────────────────────────
create table if not exists users (
  id         uuid primary key default uuid_generate_v4(),
  name       text,
  phone      text,
  email      text unique,
  county     text,
  created_at timestamptz not null default now()
);

-- ─── CASES ───────────────────────────────────────────────────────────────────
create type matter_type as enum (
  'housing', 'family_court', 'billing_dispute',
  'business_formation', 'judgment_defense', 'other'
);

create type case_status as enum (
  'intake', 'in_progress', 'document_generated',
  'referred_to_attorney', 'closed'
);

create table if not exists cases (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references users(id) on delete set null,
  matter_type  matter_type not null default 'other',
  status       case_status not null default 'intake',
  red_flags    text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger cases_updated_at before update on cases
  for each row execute function update_updated_at();

-- ─── CHAT MESSAGES ───────────────────────────────────────────────────────────
create table if not exists chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  case_id    uuid references cases(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

-- ─── DOCUMENTS ───────────────────────────────────────────────────────────────
create type doc_status as enum ('draft', 'completed', 'downloaded');

create table if not exists documents (
  id                 uuid primary key default uuid_generate_v4(),
  case_id            uuid references cases(id) on delete cascade,
  template_id        text not null,
  field_data         jsonb not null default '{}',
  generated_file_url text,
  status             doc_status not null default 'draft',
  created_at         timestamptz not null default now()
);

-- ─── DEADLINES ───────────────────────────────────────────────────────────────
create table if not exists deadlines (
  id            uuid primary key default uuid_generate_v4(),
  case_id       uuid references cases(id) on delete cascade,
  deadline_date date not null,
  description   text not null,
  reminder_sent boolean not null default false
);

-- ─── REFERRALS ───────────────────────────────────────────────────────────────
create table if not exists referrals (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid references cases(id) on delete cascade,
  referred_to text not null,
  reason      text,
  created_at  timestamptz not null default now()
);

-- ─── RLS (Row Level Security) ─────────────────────────────────────────────────
-- Enable RLS — users can only see their own data
alter table users enable row level security;
alter table cases enable row level security;
alter table chat_messages enable row level security;
alter table documents enable row level security;
alter table deadlines enable row level security;
alter table referrals enable row level security;

-- Anon users can create cases (for no-login-required first document)
create policy "anon can create cases" on cases for insert to anon with check (user_id is null);
create policy "anon can read own session cases" on cases for select to anon using (user_id is null);

-- Authenticated users own their own data
create policy "users own their cases" on cases for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users own their messages" on chat_messages for all to authenticated
  using (case_id in (select id from cases where user_id = auth.uid()));

create policy "users own their documents" on documents for all to authenticated
  using (case_id in (select id from cases where user_id = auth.uid()));

create policy "users own their deadlines" on deadlines for all to authenticated
  using (case_id in (select id from cases where user_id = auth.uid()));
