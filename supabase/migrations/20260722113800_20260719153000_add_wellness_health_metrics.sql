alter table public.daily_wellness_logs
  add column if not exists resting_heart_rate integer,
  add column if not exists blood_pressure_systolic integer,
  add column if not exists blood_pressure_diastolic integer;

comment on column public.daily_wellness_logs.resting_heart_rate is
  'Optional manually logged resting heart rate in bpm.';

comment on column public.daily_wellness_logs.blood_pressure_systolic is
  'Optional manually logged systolic blood pressure.';

comment on column public.daily_wellness_logs.blood_pressure_diastolic is
  'Optional manually logged diastolic blood pressure.';
