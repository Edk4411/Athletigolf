/*
# Add body-composition metrics to daily_wellness_logs

## Purpose
Keeps the existing daily bodyweight record intact while allowing optional
composition readings from compatible scales or manual measurements.

## 1. Columns Added to daily_wellness_logs (2 columns)
- body_fat_percentage (numeric, nullable) — body-fat percentage, constrained
  to the 0-100 range via a CHECK constraint.
- muscle_mass_kg (numeric, nullable) — muscle mass in kilograms, constrained
  to be >= 0 via a CHECK constraint.

## 2. Column Comments
- Descriptive comments added to both columns for catalog clarity.

## 3. Safety
- ADD COLUMN IF NOT EXISTS — safe to re-run.
- No DROP, no type changes, no data loss, no policy/migration changes.
*/

ALTER TABLE public.daily_wellness_logs
  ADD COLUMN IF NOT EXISTS body_fat_percentage numeric CHECK (body_fat_percentage >= 0 AND body_fat_percentage <= 100),
  ADD COLUMN IF NOT EXISTS muscle_mass_kg numeric CHECK (muscle_mass_kg >= 0);

COMMENT ON COLUMN public.daily_wellness_logs.body_fat_percentage IS
  'Optional body-fat percentage logged alongside a daily bodyweight measurement.';

COMMENT ON COLUMN public.daily_wellness_logs.muscle_mass_kg IS
  'Optional muscle mass in kilograms logged alongside a daily bodyweight measurement.';