CREATE TABLE IF NOT EXISTS public.strava_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id bigint NOT NULL,
  athlete_name text,
  scope text NOT NULL DEFAULT '',
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at integer NOT NULL,
  last_imported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS strava_connections_athlete_id_idx
  ON public.strava_connections (athlete_id);

ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS public.get_strava_connection_status();
CREATE OR REPLACE FUNCTION public.get_strava_connection_status()
RETURNS TABLE (
  user_id uuid,
  athlete_id bigint,
  athlete_name text,
  scope text,
  expires_at integer,
  last_imported_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sc.user_id,
    sc.athlete_id,
    sc.athlete_name,
    sc.scope,
    sc.expires_at,
    sc.last_imported_at,
    sc.created_at,
    sc.updated_at
  FROM public.strava_connections sc
  WHERE sc.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_strava_connection_status() TO authenticated;