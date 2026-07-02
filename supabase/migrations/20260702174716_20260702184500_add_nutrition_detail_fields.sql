alter table public.nutrition_entries
add column if not exists saturated_fats_grams numeric,
add column if not exists sugars_grams numeric,
add column if not exists saturated_fats_per_100g numeric,
add column if not exists sugars_per_100g numeric;

alter table public.saved_foods
add column if not exists saturated_fats_grams numeric,
add column if not exists sugars_grams numeric,
add column if not exists saturated_fats_per_100g numeric,
add column if not exists sugars_per_100g numeric;