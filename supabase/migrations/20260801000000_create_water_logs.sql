-- Migration to add water_logs table for individual water tracking
CREATE TABLE IF NOT EXISTS public.water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  amount_ml integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_water_logs"
  ON public.water_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_water_logs"
  ON public.water_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_water_logs"
  ON public.water_logs
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS water_logs_user_date_idx
  ON public.water_logs (user_id, log_date);
