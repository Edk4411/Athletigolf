-- Daily values remain one-per-day; these timestamps record when each value was measured.
alter table public.daily_wellness_logs
  add column if not exists sleep_started_at timestamptz,
  add column if not exists sleep_ended_at timestamptz,
  add column if not exists bodyweight_logged_at timestamptz,
  add column if not exists heart_rate_logged_at timestamptz,
  add column if not exists blood_pressure_logged_at timestamptz;
