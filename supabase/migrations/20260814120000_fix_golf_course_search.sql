-- Create a searchable function for golf courses using the existing tsvector expression
create or replace function public.search_golf_courses(search_query text)
returns table (
  id uuid,
  club_name text,
  course_name text,
  city text,
  state text,
  country text,
  address text
)
language sql
security definer
as $$
  select id, club_name, course_name, city, state, country, address
  from public.golf_courses
  where to_tsvector('english', coalesce(club_name, '') || ' ' || coalesce(course_name, '') || ' ' || coalesce(city, '') || ' ' || coalesce(country, '')) @@ websearch_to_tsquery('english', search_query)
  limit 12;
$$;
