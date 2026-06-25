ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS main_goal text,
  ADD COLUMN IF NOT EXISTS distance_unit text DEFAULT 'yards',
  ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS theme text DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS penalty_shots integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chip_shots integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS greenside_bunker_shots integer DEFAULT 0;

UPDATE public.rounds SET penalty_shots = 0 WHERE penalty_shots IS NULL;
UPDATE public.rounds SET chip_shots = 0 WHERE chip_shots IS NULL;
UPDATE public.rounds SET greenside_bunker_shots = 0 WHERE greenside_bunker_shots IS NULL;

ALTER TABLE public.rounds
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN is_competition SET DEFAULT false,
  ALTER COLUMN penalty_shots SET DEFAULT 0,
  ALTER COLUMN chip_shots SET DEFAULT 0,
  ALTER COLUMN greenside_bunker_shots SET DEFAULT 0;

ALTER TABLE public.workouts
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN exercises SET DEFAULT '[]'::jsonb;

ALTER TABLE public.split_days
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN exercises SET DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  practice_type text NOT NULL DEFAULT 'Driving Range',
  duration_minutes integer NOT NULL DEFAULT 0,
  focus_area text,
  rating integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.practice_sessions
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS practice_type text DEFAULT 'Driving Range',
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS focus_area text,
  ADD COLUMN IF NOT EXISTS rating integer,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.practice_sessions SET practice_type = 'Driving Range' WHERE practice_type IS NULL;
UPDATE public.practice_sessions SET duration_minutes = 0 WHERE duration_minutes IS NULL;

ALTER TABLE public.practice_sessions
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN practice_type SET DEFAULT 'Driving Range',
  ALTER COLUMN practice_type SET NOT NULL,
  ALTER COLUMN duration_minutes SET DEFAULT 0,
  ALTER COLUMN duration_minutes SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.practice_sessions DROP COLUMN IF EXISTS date;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_practice_sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "insert_own_practice_sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "update_own_practice_sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "delete_own_practice_sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "Users can view own practice sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "Users can insert own practice sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "Users can update own practice sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "Users can delete own practice sessions" ON public.practice_sessions;

CREATE POLICY "select_own_practice_sessions" ON public.practice_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_practice_sessions" ON public.practice_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_practice_sessions" ON public.practice_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_practice_sessions" ON public.practice_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rounds_user_id ON public.rounds(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_split_days_user_id ON public.split_days(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_created_at ON public.practice_sessions(created_at DESC);