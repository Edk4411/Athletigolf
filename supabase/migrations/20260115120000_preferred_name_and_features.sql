-- Adds preferred_name to profiles, friend_nicknames table, toptracer_sessions
-- table, and gear/supplement recommendation storage.

alter table if exists profiles
  add column if not exists preferred_name text;

-- Backfill preferred_name from full_name first word where empty
update profiles
set preferred_name = split_part(full_name, ' ', 1)
where preferred_name is null and full_name is not null and length(trim(full_name)) > 0;

-- Nicknames I set for my friends (per-user rename)
create table if not exists friend_nicknames (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, friend_id)
);

alter table friend_nicknames enable row level security;

drop policy if exists "friend_nicknames_owner_select" on friend_nicknames;
create policy "friend_nicknames_owner_select" on friend_nicknames
  for select using (auth.uid() = owner_id);

drop policy if exists "friend_nicknames_owner_insert" on friend_nicknames;
create policy "friend_nicknames_owner_insert" on friend_nicknames
  for insert with check (auth.uid() = owner_id);

drop policy if exists "friend_nicknames_owner_update" on friend_nicknames;
create policy "friend_nicknames_owner_update" on friend_nicknames
  for update using (auth.uid() = owner_id);

drop policy if exists "friend_nicknames_owner_delete" on friend_nicknames;
create policy "friend_nicknames_owner_delete" on friend_nicknames
  for delete using (auth.uid() = owner_id);

-- TopTracer / range-session logger
create table if not exists toptracer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  mode text not null check (mode in ('warm_up', 'toptracer_30', 'toptracer_12', 'my_practice')),
  notes text,
  -- Warm-up / My Practice: array of { club, avg_carry_yards, avg_total_yards, dispersion_yards, shots }
  club_averages jsonb not null default '[]'::jsonb,
  -- TopTracer 30 / 12: { total_score, closest_to_pin_ft, longest_drive_yards, targets_hit, shots_taken, holes }
  challenge_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table toptracer_sessions enable row level security;

drop policy if exists "toptracer_sessions_owner_select" on toptracer_sessions;
create policy "toptracer_sessions_owner_select" on toptracer_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "toptracer_sessions_owner_insert" on toptracer_sessions;
create policy "toptracer_sessions_owner_insert" on toptracer_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "toptracer_sessions_owner_update" on toptracer_sessions;
create policy "toptracer_sessions_owner_update" on toptracer_sessions
  for update using (auth.uid() = user_id);

drop policy if exists "toptracer_sessions_owner_delete" on toptracer_sessions;
create policy "toptracer_sessions_owner_delete" on toptracer_sessions
  for delete using (auth.uid() = user_id);

create index if not exists toptracer_sessions_user_date_idx
  on toptracer_sessions (user_id, session_date desc);
