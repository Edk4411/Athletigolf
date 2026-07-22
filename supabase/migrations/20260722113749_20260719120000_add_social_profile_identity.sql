alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists home_course text;

alter table public.round_players
  add column if not exists username text,
  add column if not exists avatar_url text;

drop function if exists public.search_profiles_for_friend(text);
drop function if exists public.get_friend_connections_with_profiles();
drop function if exists public.get_friend_profile(uuid);

create function public.search_profiles_for_friend(search_query text)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  golf_handicap numeric,
  relationship_status text,
  relationship_direction text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  lookup text := public.normalise_username(search_query);
begin
  if auth.uid() is null or length(lookup) < 2 then
    return;
  end if;

  return query
  select
    p.id as user_id,
    p.username,
    case when p.show_display_name_in_search then p.full_name else null end as display_name,
    case when p.show_display_name_in_search then p.avatar_url else null end as avatar_url,
    p.golf_handicap,
    fc.status,
    case
      when fc.id is null then 'none'
      when fc.status = 'accepted' then 'accepted'
      when fc.requester_id = auth.uid() then 'outgoing'
      when fc.receiver_id = auth.uid() then 'incoming'
      else 'none'
    end as relationship_direction
  from public.profiles p
  left join public.friend_connections fc
    on (
      (fc.requester_id = auth.uid() and fc.receiver_id = p.id)
      or (fc.receiver_id = auth.uid() and fc.requester_id = p.id)
    )
  where p.id <> auth.uid()
    and p.username_search ilike lookup || '%'
  order by
    case when p.username_search = lookup then 0 else 1 end,
    p.username_search
  limit 12;
end;
$$;

create function public.get_friend_connections_with_profiles()
returns table (
  id uuid,
  requester_id uuid,
  receiver_id uuid,
  requester_label text,
  receiver_label text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  other_user_id uuid,
  other_username text,
  other_display_name text,
  other_avatar_url text,
  other_golf_handicap numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  select
    fc.id,
    fc.requester_id,
    fc.receiver_id,
    fc.requester_label,
    fc.receiver_label,
    fc.status,
    fc.created_at,
    fc.updated_at,
    p.id as other_user_id,
    p.username as other_username,
    case when p.show_display_name_in_search then p.full_name else null end as other_display_name,
    p.avatar_url as other_avatar_url,
    p.golf_handicap as other_golf_handicap
  from public.friend_connections fc
  join public.profiles p
    on p.id = case
      when fc.requester_id = auth.uid() then fc.receiver_id
      else fc.requester_id
    end
  where fc.requester_id = auth.uid()
     or fc.receiver_id = auth.uid()
  order by fc.created_at desc;
end;
$$;

create function public.get_friend_profile(friend_user_id uuid)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  home_course text,
  golf_handicap numeric,
  main_sport text,
  main_goal text,
  created_at timestamptz,
  relationship_label text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    p.id as user_id,
    p.username,
    case
      when p.show_display_name_in_search then p.full_name
      else null
    end as display_name,
    p.avatar_url,
    p.bio,
    p.home_course,
    p.golf_handicap,
    p.onboarding_data ->> 'mainSport' as main_sport,
    p.main_goal,
    p.created_at,
    case
      when fc.requester_id = auth.uid() then 'Friend'
      when fc.receiver_id = auth.uid() then 'Friend'
      else null
    end as relationship_label
  from public.profiles p
  join public.friend_connections fc
    on fc.status = 'accepted'
   and (
    (fc.requester_id = auth.uid() and fc.receiver_id = friend_user_id)
    or
    (fc.receiver_id = auth.uid() and fc.requester_id = friend_user_id)
   )
  where p.id = friend_user_id
  limit 1;
$$;

revoke all on function public.search_profiles_for_friend(text) from public;
revoke all on function public.search_profiles_for_friend(text) from anon;
revoke all on function public.get_friend_connections_with_profiles() from public;
revoke all on function public.get_friend_connections_with_profiles() from anon;
revoke all on function public.get_friend_profile(uuid) from public;
revoke all on function public.get_friend_profile(uuid) from anon;

grant execute on function public.search_profiles_for_friend(text) to authenticated;
grant execute on function public.get_friend_connections_with_profiles() to authenticated;
grant execute on function public.get_friend_profile(uuid) to authenticated;
