-- Additive migration: cardio elevation + round autosave columns

-- Cardio elevation for Strava imports
ALTER TABLE public.cardio_sessions
  ADD COLUMN IF NOT EXISTS elevation_gain_meters numeric;

-- Round autosave fields (used by background flush logic)
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS auto_saved_at timestamptz;

-- Additional round player columns for WHS calculations
ALTER TABLE public.round_players
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS handicap_allowance_percent integer,
  ADD COLUMN IF NOT EXISTS course_rating numeric,
  ADD COLUMN IF NOT EXISTS slope_rating numeric;

-- round_holes: stroke index column (if not already present)
ALTER TABLE public.round_holes
  ADD COLUMN IF NOT EXISTS stroke_index integer;
