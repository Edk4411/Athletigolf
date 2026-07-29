/*
# Add round_players.handicap_allowance_percent and friend_nicknames table

## Purpose
Adds two confirmed-missing database items that the application code already
expects. No React code changes — schema only.

## 1. round_players.handicap_allowance_percent (1 column)
- handicap_allowance_percent (numeric, default 100) — percentage of handicap
  applied for this player in the round. The RoundTracker writes this column
  on every player insert; without it Supabase errors:
  "Could not find the 'handicap_allowance_percent' column of 'round_players'".

## 2. friend_nicknames (new table)
Stores a custom nickname that one user (owner) has given to another user
(friend) in their social graph.
- id (uuid, primary key, default gen_random_uuid())
- owner_id (uuid, references profiles(id) ON DELETE CASCADE)
- friend_id (uuid, references profiles(id) ON DELETE CASCADE)
- nickname (text)
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())
- UNIQUE(owner_id, friend_id) — one nickname per owner-friend pair

## 3. Security (RLS)
- RLS enabled on friend_nicknames.
- Owner-scoped CRUD: each authenticated user can only read/insert/update/
  delete rows where owner_id matches their own auth.uid().

## 4. Not included (intentionally)
- rounds.match_result — unused; derived from per-hole data instead.
- round_players.username — display_name is used instead.
- course_handicap / playing_handicap — already exist on round_players.

## 5. Safety
- ALTER TABLE ADD COLUMN uses IF NOT EXISTS.
- CREATE TABLE uses IF NOT EXISTS.
- Policies use DROP POLICY IF EXISTS before CREATE for idempotency.
- No DROP TABLE, no DROP COLUMN, no DELETE.
*/

-- ============================================================
-- SECTION 1: Add handicap_allowance_percent to round_players
-- ============================================================

ALTER TABLE round_players
  ADD COLUMN IF NOT EXISTS handicap_allowance_percent numeric DEFAULT 100;

-- ============================================================
-- SECTION 2: Create friend_nicknames table
-- ============================================================

CREATE TABLE IF NOT EXISTS friend_nicknames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nickname text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friend_nicknames_owner_friend_unique UNIQUE (owner_id, friend_id)
);

-- ============================================================
-- SECTION 3: Enable RLS and add owner-only policies
-- ============================================================

ALTER TABLE friend_nicknames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_friend_nicknames" ON friend_nicknames;
CREATE POLICY "select_own_friend_nicknames"
  ON friend_nicknames FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_friend_nicknames" ON friend_nicknames;
CREATE POLICY "insert_own_friend_nicknames"
  ON friend_nicknames FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_friend_nicknames" ON friend_nicknames;
CREATE POLICY "update_own_friend_nicknames"
  ON friend_nicknames FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_friend_nicknames" ON friend_nicknames;
CREATE POLICY "delete_own_friend_nicknames"
  ON friend_nicknames FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- ============================================================
-- SECTION 4: updated_at trigger for friend_nicknames
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'friend_nicknames_set_updated_at'
      AND event_object_table = 'friend_nicknames'
  ) THEN
    CREATE TRIGGER friend_nicknames_set_updated_at
      BEFORE UPDATE ON friend_nicknames
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;