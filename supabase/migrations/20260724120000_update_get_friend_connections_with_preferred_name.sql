create or replace function public.get_friend_connections_with_profiles()
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
  other_preferred_name text,
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
    p.preferred_name as other_preferred_name,
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
