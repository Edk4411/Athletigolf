alter table public.nutrition_entries
add column if not exists source text,
add column if not exists external_id text,
add column if not exists brand text,
add column if not exists barcode text,
add column if not exists serving_grams numeric,
add column if not exists serving_label text,
add column if not exists calories_per_100g numeric,
add column if not exists protein_per_100g numeric,
add column if not exists carbs_per_100g numeric,
add column if not exists fats_per_100g numeric;

alter table public.saved_foods
add column if not exists source text,
add column if not exists external_id text,
add column if not exists brand text,
add column if not exists barcode text,
add column if not exists serving_grams numeric,
add column if not exists serving_label text,
add column if not exists calories_per_100g numeric,
add column if not exists protein_per_100g numeric,
add column if not exists carbs_per_100g numeric,
add column if not exists fats_per_100g numeric;

create index if not exists nutrition_entries_source_external_idx
  on public.nutrition_entries (source, external_id);

create index if not exists saved_foods_source_external_idx
  on public.saved_foods (source, external_id);