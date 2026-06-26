ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS fairways_possible integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS holes_played integer DEFAULT 18,
  ADD COLUMN IF NOT EXISTS tee_colour text;

UPDATE public.rounds
SET fairways_possible = 14
WHERE fairways_possible IS NULL;

UPDATE public.rounds
SET holes_played = 18
WHERE holes_played IS NULL;

ALTER TABLE public.rounds
  ALTER COLUMN fairways_possible SET DEFAULT 0,
  ALTER COLUMN holes_played SET DEFAULT 18;

CREATE TABLE IF NOT EXISTS public.round_holes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  hole_number integer NOT NULL,
  par integer NOT NULL DEFAULT 4,
  score integer,
  fairway_result text DEFAULT 'na',
  gir boolean NOT NULL DEFAULT false,
  putts integer DEFAULT 0,
  penalty_shots integer DEFAULT 0,
  chip_shots integer DEFAULT 0,
  greenside_bunker_shots integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(round_id, hole_number)
);

ALTER TABLE public.round_holes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_round_holes" ON public.round_holes;
DROP POLICY IF EXISTS "insert_own_round_holes" ON public.round_holes;
DROP POLICY IF EXISTS "update_own_round_holes" ON public.round_holes;
DROP POLICY IF EXISTS "delete_own_round_holes" ON public.round_holes;

CREATE POLICY "select_own_round_holes"
  ON public.round_holes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_round_holes"
  ON public.round_holes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_round_holes"
  ON public.round_holes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_round_holes"
  ON public.round_holes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_round_holes_round_id
  ON public.round_holes(round_id);

CREATE INDEX IF NOT EXISTS idx_round_holes_user_id
  ON public.round_holes(user_id);
