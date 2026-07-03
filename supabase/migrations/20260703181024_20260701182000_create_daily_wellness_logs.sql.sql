CREATE TABLE IF NOT EXISTS public.daily_wellness_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  log_date date NOT NULL,
  water_litres numeric,
  calories integer,
  protein_grams integer,
  carbs_grams integer,
  fats_grams integer,
  bodyweight numeric,
  sleep_hours numeric,
  energy_rating integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, log_date)
);

ALTER TABLE public.daily_wellness_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_wellness_logs" ON public.daily_wellness_logs;
CREATE POLICY "select_own_wellness_logs"
  ON public.daily_wellness_logs
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_wellness_logs" ON public.daily_wellness_logs;
CREATE POLICY "insert_own_wellness_logs"
  ON public.daily_wellness_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_wellness_logs" ON public.daily_wellness_logs;
CREATE POLICY "update_own_wellness_logs"
  ON public.daily_wellness_logs
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_wellness_logs" ON public.daily_wellness_logs;
CREATE POLICY "delete_own_wellness_logs"
  ON public.daily_wellness_logs
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS daily_wellness_logs_user_date_idx
  ON public.daily_wellness_logs (user_id, log_date);