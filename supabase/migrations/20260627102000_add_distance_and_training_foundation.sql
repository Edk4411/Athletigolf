ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS average_driving_distance numeric,
  ADD COLUMN IF NOT EXISTS longest_drive numeric,
  ADD COLUMN IF NOT EXISTS tee_shot_quality text;
