/*
# Rebuild AthletiGolf Full Schema (idempotent)

This migration recreates the complete AthletiGolf database shape described in
`supabase/migrations/CURRENT_SCHEMA.md`. It is fully idempotent: every CREATE
uses IF NOT EXISTS, every column addition uses IF NOT EXISTS, every policy is
dropped before re-create, and every function is CREATE OR REPLACE. Re-running
this migration is safe and will not lose data.

## Tables covered
- profiles (extended with settings, onboarding, username, role)
- rounds (golf round summaries + social metadata + draft status)
- round_holes (hole-by-hole scoring)
- workouts (saved training sessions)
- split_days (active + archived training boards)
- practice_sessions (golf practice with drills)
- competitions (golf competitions)
- cardio_sessions (running/walking + Strava imports)
- daily_wellness_logs (daily nutrition/hydration/recovery)
- nutrition_entries (individual food entries)
- saved_foods (personal food presets)
- friend_connections (friend requests/relationships + labels)
- live_activities (check-ins)
- feedback_reports (beta feedback + soft delete + admin handling)
- notifications (user notifications)
- strava_connections (server-side OAuth tokens)
- exercise_library (curated exercise catalog + seed data)

## Functions
- normalise_username(text)
- handle_new_user() trigger function
- search_profiles_for_friend(text)
- get_friend_connections_with_profiles()
- get_strava_connection_status()
- get_friend_profile(uuid)
- notify_admins_of_feedback() trigger function
- notify_friends_of_live_activity() trigger function

## Security
- RLS enabled on every table.
- Owner-scoped CRUD policies (auth.uid() = user_id) for user data.
- Admin-scoped policies for feedback_reports (profiles.role = 'admin').
- Friend-visible SELECT for live_activities.
- exercise_library is read-only for authenticated users.
- All SECURITY DEFINER functions use search_path = public.

## Important notes
1. This migration does NOT drop any existing data — it only adds missing
   tables, columns, indexes, constraints, policies, and functions.
2. exercise_library seed data is inserted with ON CONFLICT (slug) DO UPDATE
   so re-running keeps the catalog up to date without duplicates.
3. The auth.users trigger `on_auth_user_created` is re-created idempotently.
*/

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_search text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_display_name_in_search boolean DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS height text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS golf_handicap numeric;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS main_goal text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS distance_unit text DEFAULT 'yards';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'kg';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text DEFAULT 'default';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_data jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_username_search_format'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_search_format
      CHECK (username_search IS NULL OR username_search ~ '^[a-z0-9_]{3,24}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_search_key
  ON public.profiles (username_search)
  WHERE username_search IS NOT NULL;

DROP POLICY IF EXISTS "select_own_profiles" ON public.profiles;
CREATE POLICY "select_own_profiles" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profiles" ON public.profiles;
CREATE POLICY "insert_own_profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profiles" ON public.profiles;
CREATE POLICY "update_own_profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profiles" ON public.profiles;
CREATE POLICY "delete_own_profiles" ON public.profiles
  FOR DELETE TO authenticated USING (auth.uid() = id);

-- ============================================================================
-- ROUNDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  course text,
  date text,
  score integer,
  fairways_hit integer,
  fairways_possible integer DEFAULT 0,
  greens_in_regulation integer,
  putts integer,
  penalty_shots integer DEFAULT 0,
  chip_shots integer DEFAULT 0,
  greenside_bunker_shots integer DEFAULT 0,
  holes_played integer DEFAULT 18,
  tee_colour text,
  average_driving_distance numeric,
  longest_drive numeric,
  tee_shot_quality text,
  scramble_percentage numeric,
  is_competition boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS fairways_possible integer DEFAULT 0;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS penalty_shots integer DEFAULT 0;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS chip_shots integer DEFAULT 0;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS greenside_bunker_shots integer DEFAULT 0;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS holes_played integer DEFAULT 18;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS tee_colour text;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS average_driving_distance numeric;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS longest_drive numeric;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS tee_shot_quality text;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed';
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS target_holes integer NOT NULL DEFAULT 18;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS round_name text;
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS playing_partners text;

ALTER TABLE public.rounds
  DROP CONSTRAINT IF EXISTS rounds_status_check;
ALTER TABLE public.rounds
  ADD CONSTRAINT rounds_status_check
  CHECK (status IN ('draft', 'unfinished', 'completed'));

CREATE INDEX IF NOT EXISTS idx_rounds_user_status_created_at
  ON public.rounds (user_id, status, created_at desc);

DROP POLICY IF EXISTS "select_own_rounds" ON public.rounds;
CREATE POLICY "select_own_rounds" ON public.rounds
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_rounds" ON public.rounds;
CREATE POLICY "insert_own_rounds" ON public.rounds
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_rounds" ON public.rounds;
CREATE POLICY "update_own_rounds" ON public.rounds
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_rounds" ON public.rounds;
CREATE POLICY "delete_own_rounds" ON public.rounds
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- ROUND_HOLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.round_holes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  hole_number integer,
  par integer DEFAULT 4,
  score integer,
  fairway_result text DEFAULT 'na',
  tee_shot_location text,
  gir boolean DEFAULT false,
  putts integer DEFAULT 0,
  penalty_shots integer DEFAULT 0,
  chip_shots integer DEFAULT 0,
  greenside_bunker_shots integer DEFAULT 0,
  recovery_shot_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.round_holes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'round_holes_round_id_hole_number_key'
      AND conrelid = 'public.round_holes'::regclass
  ) THEN
    ALTER TABLE public.round_holes
      ADD CONSTRAINT round_holes_round_id_hole_number_key
      UNIQUE (round_id, hole_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_round_holes_round_id
  ON public.round_holes (round_id);
CREATE INDEX IF NOT EXISTS idx_round_holes_user_id
  ON public.round_holes (user_id);

DROP POLICY IF EXISTS "select_own_round_holes" ON public.round_holes;
CREATE POLICY "select_own_round_holes" ON public.round_holes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_round_holes" ON public.round_holes;
CREATE POLICY "insert_own_round_holes" ON public.round_holes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_round_holes" ON public.round_holes;
CREATE POLICY "update_own_round_holes" ON public.round_holes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_round_holes" ON public.round_holes;
CREATE POLICY "delete_own_round_holes" ON public.round_holes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- WORKOUTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date text,
  workout_name text,
  exercises jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workouts" ON public.workouts;
CREATE POLICY "select_own_workouts" ON public.workouts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_workouts" ON public.workouts;
CREATE POLICY "insert_own_workouts" ON public.workouts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_workouts" ON public.workouts;
CREATE POLICY "update_own_workouts" ON public.workouts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_workouts" ON public.workouts;
CREATE POLICY "delete_own_workouts" ON public.workouts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- SPLIT_DAYS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.split_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  day_name text,
  split_name text,
  exercises jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.split_days ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.split_days
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_split_days_user_archived
  ON public.split_days (user_id, archived_at);

DROP POLICY IF EXISTS "select_own_split_days" ON public.split_days;
CREATE POLICY "select_own_split_days" ON public.split_days
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_split_days" ON public.split_days;
CREATE POLICY "insert_own_split_days" ON public.split_days
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_split_days" ON public.split_days;
CREATE POLICY "update_own_split_days" ON public.split_days
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_split_days" ON public.split_days;
CREATE POLICY "delete_own_split_days" ON public.split_days
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- PRACTICE_SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  practice_type text DEFAULT 'Driving Range',
  duration_minutes integer DEFAULT 0,
  focus_area text,
  rating integer,
  drill_name text,
  drill_attempts integer,
  drill_successes integer,
  drill_distance text,
  drills jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_practice_sessions" ON public.practice_sessions;
CREATE POLICY "select_own_practice_sessions" ON public.practice_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_practice_sessions" ON public.practice_sessions;
CREATE POLICY "insert_own_practice_sessions" ON public.practice_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_practice_sessions" ON public.practice_sessions;
CREATE POLICY "update_own_practice_sessions" ON public.practice_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_practice_sessions" ON public.practice_sessions;
CREATE POLICY "delete_own_practice_sessions" ON public.practice_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- COMPETITIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  course text,
  competition_date date,
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

CREATE INDEX IF NOT EXISTS idx_competitions_user_date
  ON public.competitions (user_id, competition_date);

DROP POLICY IF EXISTS "select_own_competitions" ON public.competitions;
CREATE POLICY "select_own_competitions" ON public.competitions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_competitions" ON public.competitions;
CREATE POLICY "insert_own_competitions" ON public.competitions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_competitions" ON public.competitions;
CREATE POLICY "update_own_competitions" ON public.competitions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_competitions" ON public.competitions;
CREATE POLICY "delete_own_competitions" ON public.competitions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- CARDIO_SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cardio_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text DEFAULT 'run',
  session_date date DEFAULT current_date,
  distance_km numeric DEFAULT 0,
  duration_minutes integer DEFAULT 0,
  avg_heart_rate integer,
  calories integer,
  perceived_effort integer,
  route_name text,
  notes text,
  source text DEFAULT 'manual',
  external_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.cardio_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cardio_sessions_user_date
  ON public.cardio_sessions (user_id, session_date desc);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cardio_sessions_source_external_id_key'
      AND conrelid = 'public.cardio_sessions'::regclass
  ) THEN
    ALTER TABLE public.cardio_sessions
      ADD CONSTRAINT cardio_sessions_source_external_id_key
      UNIQUE (source, external_id);
  END IF;
END $$;

DROP POLICY IF EXISTS "select_own_cardio_sessions" ON public.cardio_sessions;
CREATE POLICY "select_own_cardio_sessions" ON public.cardio_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_cardio_sessions" ON public.cardio_sessions;
CREATE POLICY "insert_own_cardio_sessions" ON public.cardio_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_cardio_sessions" ON public.cardio_sessions;
CREATE POLICY "update_own_cardio_sessions" ON public.cardio_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_cardio_sessions" ON public.cardio_sessions;
CREATE POLICY "delete_own_cardio_sessions" ON public.cardio_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- DAILY_WELLNESS_LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_wellness_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date,
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
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.daily_wellness_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_wellness_logs_user_id_log_date_key'
      AND conrelid = 'public.daily_wellness_logs'::regclass
  ) THEN
    ALTER TABLE public.daily_wellness_logs
      ADD CONSTRAINT daily_wellness_logs_user_id_log_date_key
      UNIQUE (user_id, log_date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_wellness_logs_user_date
  ON public.daily_wellness_logs (user_id, log_date);

DROP POLICY IF EXISTS "select_own_daily_wellness_logs" ON public.daily_wellness_logs;
CREATE POLICY "select_own_daily_wellness_logs" ON public.daily_wellness_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_daily_wellness_logs" ON public.daily_wellness_logs;
CREATE POLICY "insert_own_daily_wellness_logs" ON public.daily_wellness_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_daily_wellness_logs" ON public.daily_wellness_logs;
CREATE POLICY "update_own_daily_wellness_logs" ON public.daily_wellness_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_daily_wellness_logs" ON public.daily_wellness_logs;
CREATE POLICY "delete_own_daily_wellness_logs" ON public.daily_wellness_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- NUTRITION_ENTRIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.nutrition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date,
  meal_type text DEFAULT 'snack',
  food_name text,
  serving text,
  calories integer DEFAULT 0,
  protein_grams integer DEFAULT 0,
  carbs_grams integer DEFAULT 0,
  fats_grams integer DEFAULT 0,
  saturated_fats_grams numeric,
  sugars_grams numeric,
  source text,
  external_id text,
  brand text,
  barcode text,
  serving_grams numeric,
  serving_label text,
  calories_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fats_per_100g numeric,
  saturated_fats_per_100g numeric,
  sugars_per_100g numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.nutrition_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_nutrition_entries_user_date
  ON public.nutrition_entries (user_id, log_date);

DROP POLICY IF EXISTS "select_own_nutrition_entries" ON public.nutrition_entries;
CREATE POLICY "select_own_nutrition_entries" ON public.nutrition_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_nutrition_entries" ON public.nutrition_entries;
CREATE POLICY "insert_own_nutrition_entries" ON public.nutrition_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_nutrition_entries" ON public.nutrition_entries;
CREATE POLICY "update_own_nutrition_entries" ON public.nutrition_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_nutrition_entries" ON public.nutrition_entries;
CREATE POLICY "delete_own_nutrition_entries" ON public.nutrition_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- SAVED_FOODS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.saved_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name text,
  serving text,
  calories integer DEFAULT 0,
  protein_grams integer DEFAULT 0,
  carbs_grams integer DEFAULT 0,
  fats_grams integer DEFAULT 0,
  saturated_fats_grams numeric,
  sugars_grams numeric,
  source text,
  external_id text,
  brand text,
  barcode text,
  serving_grams numeric,
  serving_label text,
  calories_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fats_per_100g numeric,
  saturated_fats_per_100g numeric,
  sugars_per_100g numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.saved_foods ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_saved_foods_user_name
  ON public.saved_foods (user_id, food_name);

DROP POLICY IF EXISTS "select_own_saved_foods" ON public.saved_foods;
CREATE POLICY "select_own_saved_foods" ON public.saved_foods
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_saved_foods" ON public.saved_foods;
CREATE POLICY "insert_own_saved_foods" ON public.saved_foods
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_saved_foods" ON public.saved_foods;
CREATE POLICY "update_own_saved_foods" ON public.saved_foods
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_saved_foods" ON public.saved_foods;
CREATE POLICY "delete_own_saved_foods" ON public.saved_foods
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- FRIEND_CONNECTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.friend_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.friend_connections
  ADD COLUMN IF NOT EXISTS requester_label text;
ALTER TABLE public.friend_connections
  ADD COLUMN IF NOT EXISTS receiver_label text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'friend_connections_requester_id_receiver_id_key'
      AND conrelid = 'public.friend_connections'::regclass
  ) THEN
    ALTER TABLE public.friend_connections
      ADD CONSTRAINT friend_connections_requester_id_receiver_id_key
      UNIQUE (requester_id, receiver_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS friend_connections_requester_idx
  ON public.friend_connections (requester_id, status);
CREATE INDEX IF NOT EXISTS friend_connections_receiver_idx
  ON public.friend_connections (receiver_id, status);

DROP POLICY IF EXISTS "select_own_friend_connections" ON public.friend_connections;
CREATE POLICY "select_own_friend_connections" ON public.friend_connections
  FOR SELECT TO authenticated USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "insert_own_friend_connections" ON public.friend_connections;
CREATE POLICY "insert_own_friend_connections" ON public.friend_connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);
DROP POLICY IF EXISTS "update_own_friend_connections" ON public.friend_connections;
CREATE POLICY "update_own_friend_connections" ON public.friend_connections
  FOR UPDATE TO authenticated USING (auth.uid() = requester_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "delete_own_friend_connections" ON public.friend_connections;
CREATE POLICY "delete_own_friend_connections" ON public.friend_connections
  FOR DELETE TO authenticated USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- ============================================================================
-- LIVE_ACTIVITIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.live_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  location_name text,
  detail text,
  visibility text DEFAULT 'friends',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.live_activities ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS live_activities_user_active_idx
  ON public.live_activities (user_id, ended_at, expires_at);

-- SELECT: own rows + friends-visible active rows (replaces the basic own-only policy)
DROP POLICY IF EXISTS "select_own_live_activities" ON public.live_activities;
DROP POLICY IF EXISTS "select_own_and_friend_live_activities" ON public.live_activities;
CREATE POLICY "select_own_and_friend_live_activities" ON public.live_activities
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR (
      visibility = 'friends'
      AND ended_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
      AND EXISTS (
        SELECT 1 FROM public.friend_connections fc
        WHERE fc.status = 'accepted'
          AND (
            (fc.requester_id = auth.uid() AND fc.receiver_id = live_activities.user_id)
            OR (fc.receiver_id = auth.uid() AND fc.requester_id = live_activities.user_id)
          )
      )
    )
  );

DROP POLICY IF EXISTS "insert_own_live_activities" ON public.live_activities;
CREATE POLICY "insert_own_live_activities" ON public.live_activities
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_live_activities" ON public.live_activities;
CREATE POLICY "update_own_live_activities" ON public.live_activities
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_live_activities" ON public.live_activities;
CREATE POLICY "delete_own_live_activities" ON public.live_activities
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- FEEDBACK_REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'feedback',
  title text NOT NULL,
  message text NOT NULL,
  page_url text,
  device_context text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.feedback_reports
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS feedback_reports_created_at_idx
  ON public.feedback_reports (created_at desc);
CREATE INDEX IF NOT EXISTS feedback_reports_status_idx
  ON public.feedback_reports (status);

DROP POLICY IF EXISTS "insert_own_feedback_reports" ON public.feedback_reports;
CREATE POLICY "insert_own_feedback_reports" ON public.feedback_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_feedback_reports" ON public.feedback_reports;
CREATE POLICY "select_own_feedback_reports" ON public.feedback_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_select_feedback_reports" ON public.feedback_reports;
CREATE POLICY "admin_select_feedback_reports" ON public.feedback_reports
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "admin_update_feedback_reports" ON public.feedback_reports;
CREATE POLICY "admin_update_feedback_reports" ON public.feedback_reports
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "admin_delete_feedback_reports" ON public.feedback_reports;
CREATE POLICY "admin_delete_feedback_reports" ON public.feedback_reports
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link_path text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON public.notifications (recipient_user_id, created_at desc);
CREATE INDEX IF NOT EXISTS notifications_recipient_read_idx
  ON public.notifications (recipient_user_id, read_at);

DROP POLICY IF EXISTS "select_own_notifications" ON public.notifications;
CREATE POLICY "select_own_notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = recipient_user_id);
DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;
CREATE POLICY "update_own_notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = recipient_user_id) WITH CHECK (auth.uid() = recipient_user_id);
DROP POLICY IF EXISTS "delete_own_notifications" ON public.notifications;
CREATE POLICY "delete_own_notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = recipient_user_id);

-- ============================================================================
-- STRAVA_CONNECTIONS
-- ============================================================================
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

ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS strava_connections_athlete_id_idx
  ON public.strava_connections (athlete_id);

-- No browser SELECT policy: tokens must not be exposed to the client.
-- Status is read through get_strava_connection_status() SECURITY DEFINER function.

-- ============================================================================
-- EXERCISE_LIBRARY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exercise_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL,
  primary_muscles text[] NOT NULL DEFAULT '{}',
  secondary_muscles text[] DEFAULT '{}',
  equipment text NOT NULL,
  difficulty text NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  movement_type text NOT NULL CHECK (movement_type IN ('push', 'pull', 'squat', 'hinge', 'carry', 'rotation', 'anti-rotation', 'cardio', 'core', 'mobility')),
  instructions text,
  form_cues text[] DEFAULT '{}',
  common_mistakes text[] DEFAULT '{}',
  safety_notes text,
  golf_relevant boolean NOT NULL DEFAULT false,
  golf_benefit text,
  alternatives text[] DEFAULT '{}',
  youtube_search text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read exercise library" ON public.exercise_library;
CREATE POLICY "Authenticated users can read exercise library" ON public.exercise_library
  FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalise_username(input_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT left(
    regexp_replace(
      regexp_replace(lower(trim(coalesce(input_value, ''))), '\s+', '_', 'g'),
      '[^a-z0-9_]',
      '',
      'g'
    ),
    24
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_username text := public.normalise_username(NEW.raw_user_meta_data->>'username');
  chosen_username text;
BEGIN
  chosen_username := CASE
    WHEN raw_username ~ '^[a-z0-9_]{3,24}$' THEN raw_username
    ELSE 'athlete_' || left(NEW.id::text, 8)
  END;

  INSERT INTO public.profiles (id, full_name, username, username_search, show_display_name_in_search)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.raw_user_meta_data->>'username'),
    chosen_username,
    chosen_username,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    username_search = COALESCE(public.profiles.username_search, EXCLUDED.username_search),
    show_display_name_in_search = COALESCE(public.profiles.show_display_name_in_search, false);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.search_profiles_for_friend(search_query text)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  relationship_status text,
  relationship_direction text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lookup text := public.normalise_username(search_query);
BEGIN
  IF auth.uid() IS NULL OR length(lookup) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.username,
    CASE WHEN p.show_display_name_in_search THEN p.full_name ELSE NULL END AS display_name,
    fc.status,
    CASE
      WHEN fc.id IS NULL THEN 'none'
      WHEN fc.status = 'accepted' THEN 'accepted'
      WHEN fc.requester_id = auth.uid() THEN 'outgoing'
      WHEN fc.receiver_id = auth.uid() THEN 'incoming'
      ELSE 'none'
    END AS relationship_direction
  FROM public.profiles p
  LEFT JOIN public.friend_connections fc
    ON (
      (fc.requester_id = auth.uid() AND fc.receiver_id = p.id)
      OR (fc.receiver_id = auth.uid() AND fc.requester_id = p.id)
    )
  WHERE p.id <> auth.uid()
    AND p.username_search ILIKE lookup || '%'
  ORDER BY
    CASE WHEN p.username_search = lookup THEN 0 ELSE 1 END,
    p.username_search
  LIMIT 12;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_friend_connections_with_profiles()
RETURNS TABLE (
  id uuid,
  requester_id uuid,
  receiver_id uuid,
  requester_label text,
  receiver_label text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  other_user_id uuid,
  other_username text,
  other_display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    fc.id,
    fc.requester_id,
    fc.receiver_id,
    fc.requester_label,
    fc.receiver_label,
    fc.status,
    fc.created_at,
    fc.updated_at,
    p.id AS other_user_id,
    p.username AS other_username,
    CASE WHEN p.show_display_name_in_search THEN p.full_name ELSE NULL END AS other_display_name
  FROM public.friend_connections fc
  JOIN public.profiles p
    ON p.id = CASE
      WHEN fc.requester_id = auth.uid() THEN fc.receiver_id
      ELSE fc.requester_id
    END
  WHERE fc.requester_id = auth.uid()
     OR fc.receiver_id = auth.uid()
  ORDER BY fc.created_at DESC;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.get_friend_profile(friend_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  main_sport text,
  main_goal text,
  created_at timestamptz,
  relationship_label text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id AS user_id,
    p.username,
    CASE WHEN p.show_display_name_in_search THEN p.full_name ELSE NULL END AS display_name,
    p.onboarding_data ->> 'mainSport' AS main_sport,
    p.main_goal,
    p.created_at,
    CASE
      WHEN fc.requester_id = auth.uid() THEN 'Friend'
      WHEN fc.receiver_id = auth.uid() THEN 'Friend'
      ELSE NULL
    END AS relationship_label
  FROM public.profiles p
  JOIN public.friend_connections fc
    ON fc.status = 'accepted'
   AND (
    (fc.requester_id = auth.uid() AND fc.receiver_id = friend_user_id)
    OR
    (fc.receiver_id = auth.uid() AND fc.requester_id = friend_user_id)
   )
  WHERE p.id = friend_user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.search_profiles_for_friend(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_connections_with_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_strava_connection_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_profile(uuid) TO authenticated;

-- Notification trigger functions
CREATE OR REPLACE FUNCTION public.notify_admins_of_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (recipient_user_id, actor_user_id, type, title, body, link_path)
  SELECT
    profiles.id,
    NEW.user_id,
    'alpha_feedback',
    'New alpha feedback',
    COALESCE(NEW.title, 'Feedback submitted'),
    '/admin/feedback'
  FROM public.profiles
  WHERE profiles.role = 'admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feedback_reports_notify_admins ON public.feedback_reports;
CREATE TRIGGER feedback_reports_notify_admins
  AFTER INSERT ON public.feedback_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_of_feedback();

CREATE OR REPLACE FUNCTION public.notify_friends_of_live_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.visibility <> 'friends' OR NEW.ended_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (recipient_user_id, actor_user_id, type, title, body, link_path)
  SELECT
    CASE
      WHEN friend_connections.requester_id = NEW.user_id THEN friend_connections.receiver_id
      ELSE friend_connections.requester_id
    END AS recipient_user_id,
    NEW.user_id,
    'friend_live_activity',
    CASE
      WHEN NEW.activity_type = 'gym' THEN 'Friend is at the gym'
      WHEN NEW.activity_type = 'course' THEN 'Friend is on course'
      WHEN NEW.activity_type = 'practice' THEN 'Friend is practicing'
      ELSE 'Friend is available'
    END,
    COALESCE(NEW.location_name, NEW.detail, 'Live check-in started'),
    '/social'
  FROM public.friend_connections
  WHERE friend_connections.status = 'accepted'
    AND (friend_connections.requester_id = NEW.user_id OR friend_connections.receiver_id = NEW.user_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS live_activities_notify_friends ON public.live_activities;
CREATE TRIGGER live_activities_notify_friends
  AFTER INSERT ON public.live_activities
  FOR EACH ROW EXECUTE FUNCTION public.notify_friends_of_live_activity();

-- ============================================================================
-- EXERCISE_LIBRARY SEED DATA
-- ============================================================================
WITH generated_exercises AS (
  SELECT *
  FROM (
    VALUES
      ('Chest', ARRAY['Chest'], ARRAY['Shoulders','Triceps'], 'push', true, 'Pressing strength supports upper-body force and trunk bracing.'),
      ('Back', ARRAY['Back'], ARRAY['Biceps','Rear Delts'], 'pull', true, 'Back strength helps posture, control and speed transfer.'),
      ('Legs', ARRAY['Quads','Glutes'], ARRAY['Hamstrings','Core'], 'squat', true, 'Lower-body strength improves ground force and stability.'),
      ('Posterior Chain', ARRAY['Hamstrings','Glutes'], ARRAY['Back','Core'], 'hinge', true, 'Hip hinge strength supports rotation, speed and lower-back resilience.'),
      ('Shoulders', ARRAY['Shoulders'], ARRAY['Upper Back','Triceps'], 'push', true, 'Shoulder capacity helps handle golf and gym volume.'),
      ('Arms', ARRAY['Arms'], ARRAY['Forearms'], 'pull', false, 'Arm work supports balanced training and grip capacity.'),
      ('Core', ARRAY['Core'], ARRAY['Glutes','Shoulders'], 'core', true, 'Trunk control helps transfer force through the swing.'),
      ('Rotation', ARRAY['Obliques','Core'], ARRAY['Hips','Shoulders'], 'rotation', true, 'Rotational power and control carry directly into golf speed.'),
      ('Anti-Rotation', ARRAY['Core','Obliques'], ARRAY['Glutes','Shoulders'], 'anti-rotation', true, 'Anti-rotation work builds control and protects positions.'),
      ('Cardio', ARRAY['Cardiovascular System'], ARRAY['Legs'], 'cardio', true, 'Aerobic fitness supports walking rounds and recovery.'),
      ('Mobility', ARRAY['Mobility'], ARRAY['Hips','T-Spine','Shoulders'], 'mobility', true, 'Mobility work supports cleaner swing positions and recovery.'),
      ('Golf-Specific', ARRAY['Core','Hips'], ARRAY['Glutes','Shoulders'], 'rotation', true, 'Golf-specific drills connect gym qualities to swing movement.')
  ) AS category_seed(category, primary_muscles, secondary_muscles, default_movement, golf_relevant, golf_benefit)
),
movement_templates AS (
  SELECT *
  FROM (
    VALUES
      ('Chest', 'Bench Press', 'Barbell', 'intermediate', 'push'),
      ('Chest', 'Dumbbell Bench Press', 'Dumbbells', 'beginner', 'push'),
      ('Chest', 'Incline Dumbbell Press', 'Dumbbells', 'beginner', 'push'),
      ('Chest', 'Machine Chest Press', 'Machine', 'beginner', 'push'),
      ('Chest', 'Cable Fly', 'Cable', 'beginner', 'push'),
      ('Chest', 'Push Up', 'Bodyweight', 'beginner', 'push'),
      ('Chest', 'Landmine Press', 'Landmine', 'beginner', 'push'),
      ('Back', 'Lat Pulldown', 'Cable', 'beginner', 'pull'),
      ('Back', 'Seated Cable Row', 'Cable', 'beginner', 'pull'),
      ('Back', 'Chest Supported Row', 'Machine', 'beginner', 'pull'),
      ('Back', 'Single Arm Dumbbell Row', 'Dumbbells', 'beginner', 'pull'),
      ('Back', 'Pull Up', 'Bodyweight', 'intermediate', 'pull'),
      ('Back', 'Assisted Pull Up', 'Machine', 'beginner', 'pull'),
      ('Back', 'Face Pull', 'Cable', 'beginner', 'pull'),
      ('Legs', 'Back Squat', 'Barbell', 'intermediate', 'squat'),
      ('Legs', 'Front Squat', 'Barbell', 'advanced', 'squat'),
      ('Legs', 'Goblet Squat', 'Kettlebell', 'beginner', 'squat'),
      ('Legs', 'Leg Press', 'Machine', 'beginner', 'squat'),
      ('Legs', 'Hack Squat', 'Machine', 'intermediate', 'squat'),
      ('Legs', 'Walking Lunge', 'Dumbbells', 'beginner', 'squat'),
      ('Legs', 'Bulgarian Split Squat', 'Dumbbells', 'intermediate', 'squat'),
      ('Legs', 'Leg Extension', 'Machine', 'beginner', 'squat'),
      ('Posterior Chain', 'Romanian Deadlift', 'Barbell', 'intermediate', 'hinge'),
      ('Posterior Chain', 'Dumbbell RDL', 'Dumbbells', 'beginner', 'hinge'),
      ('Posterior Chain', 'Trap Bar Deadlift', 'Trap Bar', 'intermediate', 'hinge'),
      ('Posterior Chain', 'Hip Thrust', 'Barbell', 'beginner', 'hinge'),
      ('Posterior Chain', 'Hamstring Curl', 'Machine', 'beginner', 'hinge'),
      ('Posterior Chain', 'Kettlebell Swing', 'Kettlebell', 'intermediate', 'hinge'),
      ('Shoulders', 'Shoulder Press', 'Dumbbells', 'beginner', 'push'),
      ('Shoulders', 'Machine Shoulder Press', 'Machine', 'beginner', 'push'),
      ('Shoulders', 'Lateral Raise', 'Dumbbells', 'beginner', 'push'),
      ('Shoulders', 'Cable Lateral Raise', 'Cable', 'beginner', 'push'),
      ('Shoulders', 'Rear Delt Fly', 'Dumbbells', 'beginner', 'pull'),
      ('Shoulders', 'Arnold Press', 'Dumbbells', 'intermediate', 'push'),
      ('Arms', 'Biceps Curl', 'Dumbbells', 'beginner', 'pull'),
      ('Arms', 'Hammer Curl', 'Dumbbells', 'beginner', 'pull'),
      ('Arms', 'Cable Curl', 'Cable', 'beginner', 'pull'),
      ('Arms', 'Tricep Pushdown', 'Cable', 'beginner', 'push'),
      ('Arms', 'Overhead Tricep Extension', 'Dumbbells', 'beginner', 'push'),
      ('Arms', 'Close Grip Bench Press', 'Barbell', 'intermediate', 'push'),
      ('Core', 'Plank', 'Bodyweight', 'beginner', 'core'),
      ('Core', 'Side Plank', 'Bodyweight', 'beginner', 'core'),
      ('Core', 'Dead Bug', 'Bodyweight', 'beginner', 'core'),
      ('Core', 'Bird Dog', 'Bodyweight', 'beginner', 'core'),
      ('Core', 'Hanging Knee Raise', 'Bodyweight', 'intermediate', 'core'),
      ('Core', 'Cable Crunch', 'Cable', 'beginner', 'core'),
      ('Rotation', 'Cable Wood Chop', 'Cable', 'beginner', 'rotation'),
      ('Rotation', 'Medicine Ball Rotational Throw', 'Medicine Ball', 'intermediate', 'rotation'),
      ('Rotation', 'Landmine Rotation', 'Landmine', 'intermediate', 'rotation'),
      ('Rotation', 'Russian Twist', 'Medicine Ball', 'beginner', 'rotation'),
      ('Anti-Rotation', 'Pallof Press', 'Cable', 'beginner', 'anti-rotation'),
      ('Anti-Rotation', 'Band Pallof Press', 'Band', 'beginner', 'anti-rotation'),
      ('Anti-Rotation', 'Suitcase Carry', 'Dumbbells', 'beginner', 'carry'),
      ('Anti-Rotation', 'Farmer Carry', 'Dumbbells', 'beginner', 'carry'),
      ('Cardio', 'Treadmill Run', 'Cardio Machine', 'beginner', 'cardio'),
      ('Cardio', 'Incline Treadmill Walk', 'Cardio Machine', 'beginner', 'cardio'),
      ('Cardio', 'Bike Intervals', 'Cardio Machine', 'beginner', 'cardio'),
      ('Cardio', 'Rowing Machine', 'Cardio Machine', 'beginner', 'cardio'),
      ('Cardio', 'Stair Climber', 'Cardio Machine', 'beginner', 'cardio'),
      ('Mobility', 'Hip Flexor Stretch', 'Bodyweight', 'beginner', 'mobility'),
      ('Mobility', '90/90 Hip Switch', 'Bodyweight', 'beginner', 'mobility'),
      ('Mobility', 'Thoracic Open Book', 'Bodyweight', 'beginner', 'mobility'),
      ('Mobility', 'Shoulder CARs', 'Bodyweight', 'beginner', 'mobility'),
      ('Mobility', 'Ankle Rocks', 'Bodyweight', 'beginner', 'mobility'),
      ('Golf-Specific', 'Medicine Ball Scoop Toss', 'Medicine Ball', 'intermediate', 'rotation'),
      ('Golf-Specific', 'Split Stance Cable Rotation', 'Cable', 'intermediate', 'rotation'),
      ('Golf-Specific', 'Step And Rotate', 'Bodyweight', 'beginner', 'rotation'),
      ('Golf-Specific', 'Single Leg Balance Reach', 'Bodyweight', 'beginner', 'mobility'),
      ('Golf-Specific', 'Band Hip Turn Drill', 'Band', 'beginner', 'rotation')
  ) AS curated(category, name, equipment, difficulty, movement_type)
),
generated_templates AS (
  SELECT *
  FROM (
    VALUES
      ('Chest', 'Press', ARRAY['Dumbbell','Cable','Machine','Band','Smith Machine'], 'push'),
      ('Chest', 'Fly', ARRAY['Dumbbell','Cable','Machine','Band'], 'push'),
      ('Back', 'Row', ARRAY['Dumbbell','Cable','Machine','Band','Barbell','Landmine'], 'pull'),
      ('Back', 'Pulldown', ARRAY['Cable','Band','Machine'], 'pull'),
      ('Legs', 'Squat', ARRAY['Dumbbell','Barbell','Kettlebell','Smith Machine','Machine'], 'squat'),
      ('Legs', 'Lunge', ARRAY['Bodyweight','Dumbbell','Kettlebell','Barbell'], 'squat'),
      ('Legs', 'Step Up', ARRAY['Bodyweight','Dumbbell','Kettlebell'], 'squat'),
      ('Posterior Chain', 'Deadlift', ARRAY['Dumbbell','Barbell','Kettlebell','Trap Bar'], 'hinge'),
      ('Posterior Chain', 'Hip Hinge', ARRAY['Dumbbell','Barbell','Band','Cable'], 'hinge'),
      ('Shoulders', 'Press', ARRAY['Dumbbell','Barbell','Machine','Landmine','Kettlebell'], 'push'),
      ('Shoulders', 'Raise', ARRAY['Dumbbell','Cable','Band','Machine'], 'push'),
      ('Arms', 'Curl', ARRAY['Dumbbell','Cable','Band','Barbell','Machine'], 'pull'),
      ('Arms', 'Tricep Extension', ARRAY['Dumbbell','Cable','Band','Machine'], 'push'),
      ('Core', 'Hold', ARRAY['Bodyweight','Cable','Band','Medicine Ball'], 'core'),
      ('Rotation', 'Rotational Throw', ARRAY['Medicine Ball','Cable','Band','Landmine'], 'rotation'),
      ('Anti-Rotation', 'Anti Rotation Press', ARRAY['Cable','Band','Medicine Ball'], 'anti-rotation'),
      ('Cardio', 'Intervals', ARRAY['Treadmill','Bike','Rower','SkiErg','Stair Climber'], 'cardio'),
      ('Mobility', 'Mobility Flow', ARRAY['Bodyweight','Band','Foam Roller'], 'mobility'),
      ('Golf-Specific', 'Golf Rotation Drill', ARRAY['Cable','Band','Medicine Ball','Bodyweight','Landmine'], 'rotation')
  ) AS template(category, movement_name, equipment_options, movement_type)
),
generated_variants AS (
  SELECT
    concat(equipment, ' ', category, ' ', movement_name) AS name,
    category,
    equipment,
    'beginner'::text AS difficulty,
    movement_type
  FROM generated_templates
  CROSS JOIN LATERAL unnest(equipment_options) AS equipment
  UNION ALL
  SELECT
    concat('Single Arm ', equipment, ' ', category, ' ', movement_name),
    category,
    equipment,
    'intermediate',
    movement_type
  FROM generated_templates
  CROSS JOIN LATERAL unnest(equipment_options) AS equipment
  WHERE movement_type IN ('push', 'pull', 'rotation', 'anti-rotation')
  UNION ALL
  SELECT
    concat('Single Leg ', equipment, ' ', category, ' ', movement_name),
    category,
    equipment,
    'intermediate',
    movement_type
  FROM generated_templates
  CROSS JOIN LATERAL unnest(equipment_options) AS equipment
  WHERE category IN ('Legs', 'Posterior Chain', 'Golf-Specific')
),
all_seed AS (
  SELECT name, category, equipment, difficulty, movement_type FROM movement_templates
  UNION
  SELECT name, category, equipment, difficulty, movement_type FROM generated_variants
),
deduped AS (
  SELECT DISTINCT ON (lower(name)) all_seed.*
  FROM all_seed
  ORDER BY lower(name), name
)
INSERT INTO public.exercise_library (
  name,
  slug,
  category,
  primary_muscles,
  secondary_muscles,
  equipment,
  difficulty,
  movement_type,
  instructions,
  form_cues,
  common_mistakes,
  safety_notes,
  golf_relevant,
  golf_benefit,
  alternatives,
  youtube_search
)
SELECT
  d.name,
  regexp_replace(regexp_replace(lower(d.name), '&', 'and', 'g'), '[^a-z0-9]+', '-', 'g') AS slug,
  d.category,
  c.primary_muscles,
  c.secondary_muscles,
  d.equipment,
  d.difficulty,
  d.movement_type,
  'Set up with control, move through a comfortable range, and keep the target muscles doing the work.',
  ARRAY[
    'Brace before each rep.',
    'Move with a controlled tempo.',
    'Stop the set when form breaks down.'
  ],
  ARRAY[
    'Using momentum instead of control.',
    'Chasing load before clean movement.',
    'Ignoring pain or unstable positions.'
  ],
  'Warm up first, choose a load you can control, and stop if pain changes the movement.',
  c.golf_relevant,
  c.golf_benefit,
  ARRAY[]::text[],
  concat(d.name, ' proper form')
FROM deduped d
JOIN generated_exercises c ON c.category = d.category
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  equipment = EXCLUDED.equipment,
  difficulty = EXCLUDED.difficulty,
  movement_type = EXCLUDED.movement_type,
  instructions = EXCLUDED.instructions,
  form_cues = EXCLUDED.form_cues,
  common_mistakes = EXCLUDED.common_mistakes,
  safety_notes = EXCLUDED.safety_notes,
  golf_relevant = EXCLUDED.golf_relevant,
  golf_benefit = EXCLUDED.golf_benefit,
  youtube_search = EXCLUDED.youtube_search,
  updated_at = now();

-- Security hardening
ALTER FUNCTION public.normalise_username(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.search_profiles_for_friend(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_friend_connections_with_profiles() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_strava_connection_status() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_friend_profile(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_admins_of_feedback() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_friends_of_live_activity() SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.normalise_username(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_profiles_for_friend(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_friend_connections_with_profiles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_strava_connection_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins_of_feedback() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_friends_of_live_activity() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.search_profiles_for_friend(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_connections_with_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_strava_connection_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_profile(uuid) TO authenticated;

DROP POLICY IF EXISTS deny_direct_client_strava_connections ON public.strava_connections;
CREATE POLICY deny_direct_client_strava_connections
  ON public.strava_connections
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

REVOKE INSERT, UPDATE, DELETE ON public.exercise_library FROM anon, authenticated;
GRANT SELECT ON public.exercise_library TO authenticated;
