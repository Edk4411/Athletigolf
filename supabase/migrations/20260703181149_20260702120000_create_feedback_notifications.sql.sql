create table if not exists feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null default 'feedback',
  title text not null,
  message text not null,
  page_url text,
  device_context text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists feedback_reports_created_at_idx on feedback_reports(created_at desc);
create index if not exists feedback_reports_status_idx on feedback_reports(status);
create index if not exists notifications_recipient_created_idx on notifications(recipient_user_id, created_at desc);
create index if not exists notifications_recipient_read_idx on notifications(recipient_user_id, read_at);

alter table feedback_reports enable row level security;
alter table notifications enable row level security;

drop policy if exists insert_own_feedback_reports on feedback_reports;
create policy insert_own_feedback_reports
on feedback_reports
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists select_own_feedback_reports on feedback_reports;
create policy select_own_feedback_reports
on feedback_reports
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists admin_select_feedback_reports on feedback_reports;
create policy admin_select_feedback_reports
on feedback_reports
for select
to authenticated
using (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists admin_update_feedback_reports on feedback_reports;
create policy admin_update_feedback_reports
on feedback_reports
for update
to authenticated
using (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists select_own_notifications on notifications;
create policy select_own_notifications
on notifications
for select
to authenticated
using (auth.uid() = recipient_user_id);

drop policy if exists update_own_notifications on notifications;
create policy update_own_notifications
on notifications
for update
to authenticated
using (auth.uid() = recipient_user_id)
with check (auth.uid() = recipient_user_id);

drop policy if exists delete_own_notifications on notifications;
create policy delete_own_notifications
on notifications
for delete
to authenticated
using (auth.uid() = recipient_user_id);

create or replace function notify_admins_of_feedback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (recipient_user_id, actor_user_id, type, title, body, link_path)
  select
    profiles.id,
    new.user_id,
    'alpha_feedback',
    'New alpha feedback',
    coalesce(new.title, 'Feedback submitted'),
    '/admin/feedback'
  from profiles
  where profiles.role = 'admin';

  return new;
end;
$$;

drop trigger if exists feedback_reports_notify_admins on feedback_reports;
create trigger feedback_reports_notify_admins
after insert on feedback_reports
for each row
execute function notify_admins_of_feedback();

create or replace function notify_friends_of_live_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.visibility <> 'friends' or new.ended_at is not null then
    return new;
  end if;

  insert into notifications (recipient_user_id, actor_user_id, type, title, body, link_path)
  select
    case
      when friend_connections.requester_id = new.user_id then friend_connections.receiver_id
      else friend_connections.requester_id
    end as recipient_user_id,
    new.user_id,
    'friend_live_activity',
    case
      when new.activity_type = 'gym' then 'Friend is at the gym'
      when new.activity_type = 'course' then 'Friend is on course'
      when new.activity_type = 'practice' then 'Friend is practicing'
      else 'Friend is available'
    end,
    coalesce(new.location_name, new.detail, 'Live check-in started'),
    '/social'
  from friend_connections
  where friend_connections.status = 'accepted'
    and (friend_connections.requester_id = new.user_id or friend_connections.receiver_id = new.user_id);

  return new;
end;
$$;

drop trigger if exists live_activities_notify_friends on live_activities;
create trigger live_activities_notify_friends
after insert on live_activities
for each row
execute function notify_friends_of_live_activity();