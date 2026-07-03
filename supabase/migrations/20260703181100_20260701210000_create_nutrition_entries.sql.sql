CREATE TABLE IF NOT EXISTS public.nutrition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  log_date date NOT NULL,
  meal_type text NOT NULL DEFAULT 'snack',
  food_name text NOT NULL,
  serving text,
  calories integer DEFAULT 0,
  protein_grams integer DEFAULT 0,
  carbs_grams integer DEFAULT 0,
  fats_grams integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.nutrition_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_nutrition_entries" ON public.nutrition_entries;
CREATE POLICY "select_own_nutrition_entries"
  ON public.nutrition_entries
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_nutrition_entries" ON public.nutrition_entries;
CREATE POLICY "insert_own_nutrition_entries"
  ON public.nutrition_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_nutrition_entries" ON public.nutrition_entries;
CREATE POLICY "update_own_nutrition_entries"
  ON public.nutrition_entries
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_nutrition_entries" ON public.nutrition_entries;
CREATE POLICY "delete_own_nutrition_entries"
  ON public.nutrition_entries
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS nutrition_entries_user_date_idx
  ON public.nutrition_entries (user_id, log_date);

CREATE TABLE IF NOT EXISTS public.saved_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  food_name text NOT NULL,
  serving text,
  calories integer DEFAULT 0,
  protein_grams integer DEFAULT 0,
  carbs_grams integer DEFAULT 0,
  fats_grams integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.saved_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_saved_foods" ON public.saved_foods;
CREATE POLICY "select_own_saved_foods"
  ON public.saved_foods
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_saved_foods" ON public.saved_foods;
CREATE POLICY "insert_own_saved_foods"
  ON public.saved_foods
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_saved_foods" ON public.saved_foods;
CREATE POLICY "update_own_saved_foods"
  ON public.saved_foods
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_saved_foods" ON public.saved_foods;
CREATE POLICY "delete_own_saved_foods"
  ON public.saved_foods
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS saved_foods_user_name_idx
  ON public.saved_foods (user_id, food_name);