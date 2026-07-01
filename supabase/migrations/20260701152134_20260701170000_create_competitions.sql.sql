CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  name text NOT NULL,
  course text,
  competition_date date NOT NULL,
  start_time text,
  priority text DEFAULT 'medium',
  target_score integer,
  focus_area text,
  notes text,
  status text DEFAULT 'upcoming',
  result_score integer,
  reflection_strength text,
  reflection_weakness text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_competitions" ON public.competitions;
CREATE POLICY "select_own_competitions"
  ON public.competitions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_competitions" ON public.competitions;
CREATE POLICY "insert_own_competitions"
  ON public.competitions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_competitions" ON public.competitions;
CREATE POLICY "update_own_competitions"
  ON public.competitions
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_competitions" ON public.competitions;
CREATE POLICY "delete_own_competitions"
  ON public.competitions
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS competitions_user_date_idx
  ON public.competitions (user_id, competition_date);