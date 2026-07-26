/*
# Create strava_activity_queue table

1. New Tables
- `strava_activity_queue`
  Stores Strava golf activities detected during import that have not yet been
  linked to a golf round. Each row represents one Strava activity awaiting
  user action (link to an existing round, create a new round, or ignore).

  Columns:
  - `id` (uuid, primary key, auto-generated)
  - `user_id` (uuid, not null, references auth.users, defaults to auth.uid())
  - `external_id` (text, Strava activity ID)
  - `activity_type` (text, raw activity type from Strava)
  - `classification` (text, AthletiGolf category e.g. 'golf')
  - `activity_date` (timestamptz, when the activity occurred)
  - `distance_km` (numeric, distance in kilometres)
  - `duration_minutes` (integer, duration in minutes)
  - `calories` (integer, calories burned)
  - `avg_heart_rate` (integer, average heart rate in bpm)
  - `status` (text, default 'pending' — lifecycle: pending → processed/ignored)
  - `raw_activity_data` (jsonb, full Strava activity payload)
  - `round_id` (uuid, nullable, references rounds — set when linked to a round)
  - `created_at` (timestamptz, default now())

2. Indexes
  - `strava_activity_queue_user_status_idx` on (user_id, status) for efficient
    per-user queue queries filtered by status.

3. Security
  - RLS enabled on `strava_activity_queue`.
  - Four owner-scoped CRUD policies (SELECT/INSERT/UPDATE/DELETE) restricted
    to `authenticated` users, each checking `auth.uid() = user_id`.
  - No anon access — this table contains user-specific Strava data.

4. Important Notes
  - No existing tables are modified.
  - `user_id` defaults to `auth.uid()` so inserts from the authenticated
    client that omit the column still satisfy the INSERT WITH CHECK policy.
  - `external_id` is not given a UNIQUE constraint because the same Strava
    activity could theoretically be re-queued after being ignored; the
    application layer handles deduplication via the edge function.
*/

CREATE TABLE IF NOT EXISTS public.strava_activity_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  activity_type text,
  classification text,
  activity_date timestamptz,
  distance_km numeric,
  duration_minutes integer,
  calories integer,
  avg_heart_rate integer,
  status text NOT NULL DEFAULT 'pending',
  raw_activity_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  round_id uuid REFERENCES public.rounds(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS strava_activity_queue_user_status_idx
  ON public.strava_activity_queue (user_id, status);

ALTER TABLE public.strava_activity_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_strava_activity_queue" ON public.strava_activity_queue;
CREATE POLICY "select_own_strava_activity_queue" ON public.strava_activity_queue
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_strava_activity_queue" ON public.strava_activity_queue;
CREATE POLICY "insert_own_strava_activity_queue" ON public.strava_activity_queue
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_strava_activity_queue" ON public.strava_activity_queue;
CREATE POLICY "update_own_strava_activity_queue" ON public.strava_activity_queue
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_strava_activity_queue" ON public.strava_activity_queue;
CREATE POLICY "delete_own_strava_activity_queue" ON public.strava_activity_queue
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
