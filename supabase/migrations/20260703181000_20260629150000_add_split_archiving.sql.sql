ALTER TABLE public.split_days
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_split_days_user_archived
  ON public.split_days(user_id, archived_at);