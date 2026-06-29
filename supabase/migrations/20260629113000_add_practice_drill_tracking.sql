ALTER TABLE public.practice_sessions
  ADD COLUMN IF NOT EXISTS drill_name text,
  ADD COLUMN IF NOT EXISTS drill_attempts integer,
  ADD COLUMN IF NOT EXISTS drill_successes integer,
  ADD COLUMN IF NOT EXISTS drill_distance text,
  ADD COLUMN IF NOT EXISTS drills jsonb DEFAULT '[]'::jsonb;
