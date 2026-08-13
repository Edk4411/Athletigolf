/*
# Allow decimal nutrition entry values

## Purpose
USDA and Open Food Facts food values can be fractional after serving-size
scaling. The nutrition_entries columns are currently integer, which would
reject or round those fractional values at save time. This migration widens
them to numeric so decimal values (e.g. 5.5) are preserved exactly.

## 1. Columns Modified on nutrition_entries (4 columns)
- calories: integer -> numeric
- protein_grams: integer -> numeric
- carbs_grams: integer -> numeric
- fats_grams: integer -> numeric

## 2. Data Safety
- integer -> numeric is a safe widening conversion. The USING clause casts
  each existing value to numeric, so no data is lost or rounded.
- No DROP, no DELETE, no column removal.

## 3. Notes
- No RLS or policy changes.
- No index changes.
*/

ALTER TABLE public.nutrition_entries
  ALTER COLUMN calories TYPE numeric USING calories::numeric,
  ALTER COLUMN protein_grams TYPE numeric USING protein_grams::numeric,
  ALTER COLUMN carbs_grams TYPE numeric USING carbs_grams::numeric,
  ALTER COLUMN fats_grams TYPE numeric USING fats_grams::numeric;