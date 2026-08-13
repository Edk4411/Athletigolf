alter table public.daily_wellness_logs
  add column if not exists sleep_score numeric check (sleep_score >= 0 and sleep_score <= 10);
