drop index if exists public.cardio_sessions_source_external_key;

create unique index if not exists cardio_sessions_source_external_key
  on public.cardio_sessions (source, external_id);
