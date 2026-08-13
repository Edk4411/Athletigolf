/*
# Add sleep_score to daily_wellness_logs

## Purpose
Adds a numeric sleep_score column (0-10 range) to the daily wellness log,
allowing the app to store a scored sleep quality value alongside the
existing sleep metrics.

## 1. Column Added to daily_wellness_logs
- sleep_score (numeric, nullable) — sleep quality score, constrained to
  the 0-10 range via a CHECK constraint.

## 2. Safety
- ADD COLUMN IF NOT EXISTS — safe to re-run.
- No DROP, no type changes, no data loss.
*/

ALTER TABLE public.daily_wellness_logs
  ADD COLUMN IF NOT EXISTS sleep_score numeric CHECK (sleep_score >= 0 AND sleep_score <= 10);