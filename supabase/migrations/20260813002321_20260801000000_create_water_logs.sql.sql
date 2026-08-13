/*
# Create water_logs table

## Purpose
Stores individual water intake entries for the Water tracking feature.
Each row is one water log entry (date + amount in ml) belonging to a user.

## 1. New Table: water_logs
- id (uuid, primary key, default gen_random_uuid())
- user_id (uuid, default auth.uid(), references auth.users ON DELETE CASCADE)
- log_date (date, not null) — the date the water was consumed
- amount_ml (integer, not null) — amount in milliliters
- created_at (timestamptz, default now())

## 2. Security (RLS)
- RLS enabled on water_logs.
- Owner-scoped SELECT, INSERT, DELETE — each authenticated user can only
  access rows where user_id matches their auth.uid().
- No UPDATE policy (water logs are append/delete only).

## 3. Indexes
- water_logs_user_date_idx on (user_id, log_date) for fast per-day queries.

## 4. Safety
- CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
- Policies use DROP POLICY IF EXISTS before CREATE for idempotency.
*/

CREATE TABLE IF NOT EXISTS public.water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  amount_ml integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_water_logs" ON public.water_logs;
CREATE POLICY "select_own_water_logs"
  ON public.water_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_water_logs" ON public.water_logs;
CREATE POLICY "insert_own_water_logs"
  ON public.water_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_water_logs" ON public.water_logs;
CREATE POLICY "delete_own_water_logs"
  ON public.water_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS water_logs_user_date_idx
  ON public.water_logs (user_id, log_date);