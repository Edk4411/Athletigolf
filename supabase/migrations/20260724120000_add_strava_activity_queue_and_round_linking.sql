-- Migration for Strava activity staging and round linking

CREATE TABLE IF NOT EXISTS public.strava_activity_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id text UNIQUE NOT NULL,
  
  -- Dedicated columns for querying
  activity_type text NOT NULL, -- Raw type from Strava
  classification text NOT NULL, -- AthletiGolf category (e.g., 'golf', 'cardio')
  activity_date date NOT NULL,
  distance_km numeric,
  duration_minutes integer,
  calories integer,
  avg_heart_rate integer,
  
  -- Lifecycle
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'ignored')),
  
  -- Raw payload
  activity_data jsonb NOT NULL, 
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS strava_activity_queue_user_status_idx ON public.strava_activity_queue (user_id, status);

ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS strava_external_id text;
