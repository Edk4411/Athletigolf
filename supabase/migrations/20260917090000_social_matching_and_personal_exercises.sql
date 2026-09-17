-- Opt-in social matching and private custom exercise library.
create table if not exists public.match_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  public_opt_in boolean not null default false,
  gym_area text, gym_name text, gym_goals text[] not null default '{}', gym_availability text[] not null default '{}',
  golf_area text, home_course text, handicap_min numeric, handicap_max numeric, golf_availability text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint match_preferences_handicap_band check (handicap_min is null or handicap_max is null or handicap_min <= handicap_max)
);
alter table public.match_preferences enable row level security;
create policy "Users manage their matching preferences" on public.match_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Members can view public matching preferences" on public.match_preferences for select using (public_opt_in = true);

create or replace function public.get_public_match_candidates()
returns table (user_id uuid, display_name text, gym_area text, gym_name text, gym_goals text[], gym_availability text[], golf_area text, home_course text, handicap_min numeric, handicap_max numeric, golf_availability text[])
language sql stable security definer set search_path = public
as $$
  select mp.user_id, coalesce(p.preferred_name, p.full_name, p.username, 'AthletiGolf member'), mp.gym_area, mp.gym_name, mp.gym_goals, mp.gym_availability, mp.golf_area, mp.home_course, mp.handicap_min, mp.handicap_max, mp.golf_availability
  from public.match_preferences mp join public.profiles p on p.id = mp.user_id
  where mp.public_opt_in = true and mp.user_id <> auth.uid();
$$;
grant execute on function public.get_public_match_candidates() to authenticated;

create table if not exists public.match_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  match_type text not null check (match_type in ('gym_bro', 'fourball')),
  requested_date date not null, requested_time time, venue text, note text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint match_requests_no_self_request check (requester_id <> recipient_id)
);
create unique index if not exists match_requests_pending_pair on public.match_requests(requester_id, recipient_id, match_type) where status = 'pending';
create index if not exists match_requests_recipient_status_idx on public.match_requests(recipient_id, status, requested_date);
create index if not exists match_requests_requester_status_idx on public.match_requests(requester_id, status, requested_date);
alter table public.match_requests enable row level security;
create policy "Participants can view match requests" on public.match_requests for select using (auth.uid() in (requester_id, recipient_id));
create policy "Requesters create match requests" on public.match_requests for insert with check (auth.uid() = requester_id);
create policy "Participants update match requests" on public.match_requests for update using (auth.uid() in (requester_id, recipient_id)) with check (auth.uid() in (requester_id, recipient_id));

create table if not exists public.personal_exercises (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, primary_muscle text not null, secondary_muscles text[] not null default '{}', equipment text not null default 'Other',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists personal_exercises_user_name_idx on public.personal_exercises(user_id, lower(name));
alter table public.personal_exercises enable row level security;
create policy "Users manage personal exercises" on public.personal_exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
