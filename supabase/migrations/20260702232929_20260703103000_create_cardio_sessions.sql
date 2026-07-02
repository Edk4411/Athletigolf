CREATE TABLE IF NOT EXISTS public.cardio_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'run',
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  distance_km numeric DEFAULT 0,
  duration_minutes integer DEFAULT 0,
  avg_heart_rate integer,
  calories integer,
  perceived_effort integer,
  route_name text,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS cardio_sessions_user_date_idx
  ON public.cardio_sessions (user_id, session_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS cardio_sessions_source_external_key
  ON public.cardio_sessions (source, external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE public.cardio_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_own_cardio_sessions ON public.cardio_sessions;
CREATE POLICY select_own_cardio_sessions
  ON public.cardio_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS insert_own_cardio_sessions ON public.cardio_sessions;
CREATE POLICY insert_own_cardio_sessions
  ON public.cardio_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS update_own_cardio_sessions ON public.cardio_sessions;
CREATE POLICY update_own_cardio_sessions
  ON public.cardio_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS delete_own_cardio_sessions ON public.cardio_sessions;
CREATE POLICY delete_own_cardio_sessions
  ON public.cardio_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);