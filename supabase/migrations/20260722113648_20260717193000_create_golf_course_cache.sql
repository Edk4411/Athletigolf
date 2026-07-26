create table if not exists public.golf_courses (
  id uuid primary key default gen_random_uuid(),
  external_id integer not null unique,
  club_name text not null,
  course_name text not null,
  address text,
  city text,
  state text,
  country text,
  latitude numeric,
  longitude numeric,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.golf_course_tees (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.golf_courses(id) on delete cascade,
  gender text not null default 'unknown',
  tee_name text not null,
  course_rating numeric,
  slope_rating integer,
  bogey_rating numeric,
  total_yards integer,
  total_meters integer,
  number_of_holes integer,
  par_total integer,
  front_course_rating numeric,
  front_slope_rating integer,
  front_bogey_rating numeric,
  back_course_rating numeric,
  back_slope_rating integer,
  back_bogey_rating numeric,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, gender, tee_name, number_of_holes)
);

create table if not exists public.golf_course_holes (
  id uuid primary key default gen_random_uuid(),
  tee_id uuid not null references public.golf_course_tees(id) on delete cascade,
  hole_number integer not null,
  par integer,
  yardage integer,
  meters integer,
  handicap integer,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(tee_id, hole_number)
);

alter table public.rounds
  add column if not exists golf_course_id uuid references public.golf_courses(id) on delete set null,
  add column if not exists golf_course_external_id integer,
  add column if not exists golf_course_tee_id uuid references public.golf_course_tees(id) on delete set null,
  add column if not exists tee_name text,
  add column if not exists course_rating numeric,
  add column if not exists slope_rating integer,
  add column if not exists total_yards integer,
  add column if not exists total_meters integer,
  add column if not exists par_total integer;

alter table public.round_holes
  add column if not exists yardage integer,
  add column if not exists meters integer,
  add column if not exists handicap integer;

create index if not exists idx_golf_courses_external_id on public.golf_courses(external_id);
create index if not exists idx_golf_courses_search on public.golf_courses using gin (
  to_tsvector('english', coalesce(club_name, '') || ' ' || coalesce(course_name, '') || ' ' || coalesce(city, '') || ' ' || coalesce(country, ''))
);
create index if not exists idx_golf_course_tees_course_id on public.golf_course_tees(course_id);
create index if not exists idx_golf_course_holes_tee_id on public.golf_course_holes(tee_id);
create index if not exists idx_rounds_golf_course_id on public.rounds(golf_course_id);

alter table public.golf_courses enable row level security;
alter table public.golf_course_tees enable row level security;
alter table public.golf_course_holes enable row level security;

drop policy if exists "authenticated_read_golf_courses" on public.golf_courses;
create policy "authenticated_read_golf_courses"
  on public.golf_courses for select
  to authenticated
  using (true);

drop policy if exists "authenticated_read_golf_course_tees" on public.golf_course_tees;
create policy "authenticated_read_golf_course_tees"
  on public.golf_course_tees for select
  to authenticated
  using (true);

drop policy if exists "authenticated_read_golf_course_holes" on public.golf_course_holes;
create policy "authenticated_read_golf_course_holes"
  on public.golf_course_holes for select
  to authenticated
  using (true);

grant select on public.golf_courses to authenticated;
grant select on public.golf_course_tees to authenticated;
grant select on public.golf_course_holes to authenticated;

comment on table public.golf_courses is 'Cached GolfCourseAPI course records selected by AthletiGolf users.';
comment on table public.golf_course_tees is 'Cached tee sets with rating, slope, yardage and par totals.';
comment on table public.golf_course_holes is 'Cached per-hole par, yardage and stroke-index style handicap data for each tee.';
