-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again later.

create table if not exists users (
  id             text primary key,
  name           text not null,
  email          text not null unique,
  password_hash  text not null,
  xp             integer not null default 0,
  streak         integer not null default 0,
  last_done_date text,
  xp_date        text,
  xp_today       integer not null default 0,
  created_at     timestamptz not null default now()
);

-- (only needed if you created the users table with an older version of this file)
alter table users add column if not exists xp_date text;
alter table users add column if not exists xp_today integer not null default 0;

create table if not exists pages (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  parent_id  text,
  title      text not null default '',
  icon       text not null default '📄',
  type       text not null default 'doc',      -- 'doc' or 'board'
  content    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pages_user_id_idx on pages (user_id);

-- Lock the tables: nobody can read them from the browser.
-- Only your server (using the secret key) can read and write.
alter table users enable row level security;
alter table pages enable row level security;
