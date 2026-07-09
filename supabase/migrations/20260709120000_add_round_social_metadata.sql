alter table public.rounds
  add column if not exists round_name text,
  add column if not exists playing_partners text;

comment on column public.rounds.round_name is 'Optional user-facing round label, e.g. Saturday medal or Nine after school.';
comment on column public.rounds.playing_partners is 'Optional free-text names for guests or friends played with. Scores for other players are intentionally not stored in alpha.';
