/*
# Add wellness metric timestamps to daily_wellness_logs

## Purpose
Daily values remain one-per-day; these timestamp columns record when each
value was actually measured, so the app can display the time alongside
sleep, bodyweight, heart-rate, and blood-pressure entries.

## 1. Columns Added to daily_wellness_logs (5 columns)
- sleep_started_at (timestamptz, nullable) — when the user went to sleep.
- sleep_ended_at (timestamptz, nullable) — when the user woke up.
- bodyweight_logged_at (timestamptz, nullable) — when bodyweight was measured.
- heart_rate_logged_at (timestamptz, nullable) — when heart rate was measured.
- blood_pressure_logged_at (timestamptz, nullable) — when blood pressure was measured.

## 2. Safety
- Every ADD COLUMN uses IF NOT EXISTS — safe to re-run.
- No DROP, no type changes, no data loss.
*/

ALTER TABLE public.daily_wellness_logs
  ADD COLUMN IF NOT EXISTS sleep_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS sleep_ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS bodyweight_logged_at timestamptz,
  ADD COLUMN IF NOT EXISTS heart_rate_logged_at timestamptz,
  ADD COLUMN IF NOT EXISTS blood_pressure_logged_at timestamptz;