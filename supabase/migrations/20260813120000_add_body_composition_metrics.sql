-- Keep the existing daily bodyweight record intact while allowing optional
-- composition readings from compatible scales or manual measurements.
alter table public.daily_wellness_logs
  add column if not exists body_fat_percentage numeric check (body_fat_percentage >= 0 and body_fat_percentage <= 100),
  add column if not exists muscle_mass_kg numeric check (muscle_mass_kg >= 0);

comment on column public.daily_wellness_logs.body_fat_percentage is
  'Optional body-fat percentage logged alongside a daily bodyweight measurement.';

comment on column public.daily_wellness_logs.muscle_mass_kg is
  'Optional muscle mass in kilograms logged alongside a daily bodyweight measurement.';
