-- Rename columns to match new schema
ALTER TABLE public.practice_sessions RENAME COLUMN type TO practice_type;
ALTER TABLE public.practice_sessions RENAME COLUMN focus TO focus_area;

-- Make practice_type NOT NULL
ALTER TABLE public.practice_sessions ALTER COLUMN practice_type SET NOT NULL;

-- Remove default on user_id (auth.uid() default not needed with RLS)
ALTER TABLE public.practice_sessions ALTER COLUMN user_id DROP DEFAULT;

-- Drop the extra date column (not in new schema)
ALTER TABLE public.practice_sessions DROP COLUMN IF EXISTS date;

-- Replace old policies with new ones
DROP POLICY IF EXISTS "select_own_practice_sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "insert_own_practice_sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "update_own_practice_sessions" ON public.practice_sessions;
DROP POLICY IF EXISTS "delete_own_practice_sessions" ON public.practice_sessions;

CREATE POLICY "Users can view own practice sessions"
  ON public.practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice sessions"
  ON public.practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice sessions"
  ON public.practice_sessions FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own practice sessions"
  ON public.practice_sessions FOR DELETE
  USING (auth.uid() = user_id);
