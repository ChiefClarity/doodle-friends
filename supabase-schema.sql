-- Doodle Friends database schema
-- Run this in Supabase SQL Editor once, before deploying.

create table if not exists profiles (
  username text primary key,
  emoji text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists friends (
  username text not null references profiles(username) on delete cascade,
  friend_username text not null references profiles(username) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (username, friend_username)
);

create table if not exists drawings (
  id uuid primary key default gen_random_uuid(),
  username text not null references profiles(username) on delete cascade,
  title text not null default 'Untitled doodle',
  data_url text not null,
  hearted_by text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists drawings_username_idx on drawings(username);
create index if not exists drawings_created_at_idx on drawings(created_at desc);

-- Row Level Security: this app has no real login system (just a name/avatar
-- picker, same as the Claude artifact version), so we keep policies open —
-- anyone with the site link can read and write, same trust model as before.
-- This is fine for a small family/friends app but NOT for anything with
-- real personal data.

alter table profiles enable row level security;
alter table friends enable row level security;
alter table drawings enable row level security;

create policy "public read profiles" on profiles for select using (true);
create policy "public insert profiles" on profiles for insert with check (true);

create policy "public read friends" on friends for select using (true);
create policy "public insert friends" on friends for insert with check (true);
create policy "public delete friends" on friends for delete using (true);

create policy "public read drawings" on drawings for select using (true);
create policy "public insert drawings" on drawings for insert with check (true);
create policy "public update drawings" on drawings for update using (true);
create policy "public delete drawings" on drawings for delete using (true);
