-- USDA and Open Food Facts values can be fractional after serving-size scaling.
-- Preserve those values instead of rejecting or rounding them at save time.
alter table public.nutrition_entries
  alter column calories type numeric using calories::numeric,
  alter column protein_grams type numeric using protein_grams::numeric,
  alter column carbs_grams type numeric using carbs_grams::numeric,
  alter column fats_grams type numeric using fats_grams::numeric;
