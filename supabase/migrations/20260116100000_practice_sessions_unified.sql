-- Extends practice_sessions to be the single home for all practice tracking:
-- driving range, short game, putting green, on-course, and simulator work,
-- with source metadata for future TopTracer / Trackman / launch-monitor
-- integrations. Existing columns (type, practice_type, focus_area, drills,
-- rating, notes) are preserved so legacy flows keep working.

-- 1. New columns on practice_sessions ------------------------------------
alter table if exists public.practice_sessions
  add column if not exists mode text
    check (mode in ('on_course','driving_range','short_game','putting','simulator')),
  add column if not exists source text
    check (source in ('manual','toptracer','trackman','garmin_r10','flightscope','skytrak','foresight','uneekor','arccos','shotscope','other'))
    default 'manual',
  add column if not exists source_session_id text,
  add column if not exists source_mode text, -- e.g. warm_up | toptracer_30 | toptracer_12 | my_practice
  add column if not exists session_date date,
  add column if not exists location text,
  add column if not exists course_name text,
  add column if not exists handicap_at_session numeric(4,1),
  add column if not exists metrics jsonb not null default '{}'::jsonb,
  add column if not exists shots jsonb not null default '[]'::jsonb,
  add column if not exists club_averages jsonb not null default '[]'::jsonb,
  add column if not exists ai_summary text,
  add column if not exists updated_at timestamptz not null default now();

-- 2. Backfill mode from legacy practice_type -----------------------------
-- Only touches rows that don't yet have a mode set.
update public.practice_sessions
set mode = case
  when lower(coalesce(practice_type, type)) in ('driving range','range','drive') then 'driving_range'
  when lower(coalesce(practice_type, type)) in ('putting','putting green') then 'putting'
  when lower(coalesce(practice_type, type)) in ('chipping','short game','pitching') then 'short_game'
  when lower(coalesce(practice_type, type)) in ('on course','on-course','course') then 'on_course'
  when lower(coalesce(practice_type, type)) in ('sim work','simulator','launch monitor','sim') then 'simulator'
  else 'driving_range'
end
where mode is null;

-- 3. Backfill session_date from created_at -------------------------------
update public.practice_sessions
set session_date = (created_at at time zone 'UTC')::date
where session_date is null;

-- 4. Migrate old toptracer_sessions rows into practice_sessions ---------
-- Only migrates rows that haven't already been imported (based on source + source_session_id).
insert into public.practice_sessions (
  user_id, mode, source, source_session_id, source_mode, session_date, location,
  course_name, handicap_at_session, notes, club_averages, metrics, shots, created_at, updated_at
)
select
  t.user_id,
  'driving_range' as mode,
  'toptracer' as source,
  t.id::text as source_session_id,
  t.mode as source_mode,
  t.session_date,
  t.location,
  t.course_name,
  t.handicap_at_session,
  t.notes,
  coalesce(t.club_averages, '[]'::jsonb) as club_averages,
  jsonb_build_object(
    'challenge_result', coalesce(t.challenge_result, 'null'::jsonb)
  ) as metrics,
  '[]'::jsonb as shots,
  t.created_at,
  t.updated_at
from public.toptracer_sessions t
where to_regclass('public.toptracer_sessions') is not null
  and not exists (
    select 1 from public.practice_sessions p
    where p.source = 'toptracer' and p.source_session_id = t.id::text
  );

-- 5. Indexes for the new query paths ------------------------------------
create index if not exists idx_practice_sessions_user_session_date
  on public.practice_sessions (user_id, session_date desc);
create index if not exists idx_practice_sessions_mode
  on public.practice_sessions (user_id, mode);
create index if not exists idx_practice_sessions_source_lookup
  on public.practice_sessions (source, source_session_id);
create index if not exists idx_practice_sessions_metrics_gin
  on public.practice_sessions using gin (metrics);
