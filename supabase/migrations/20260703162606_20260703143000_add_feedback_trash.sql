alter table feedback_reports
  add column if not exists deleted_at timestamptz;

create index if not exists feedback_reports_deleted_at_idx on feedback_reports(deleted_at);

drop policy if exists admin_delete_feedback_reports on feedback_reports;
create policy admin_delete_feedback_reports
on feedback_reports
for delete
to authenticated
using (
  exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);