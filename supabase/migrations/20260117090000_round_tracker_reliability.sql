-- Round tracker reliability + calculation-integrity upgrade.
-- Adds columns needed to recalculate any historic round correctly:
--   - stroke_index per hole (was ambiguously named "handicap")
--   - handicap_allowance_percent per player (Match 90/95/100%, foursomes 60/40, etc.)
--   - primary_game_type snapshot on the round
--   - handicap_allowance_percent default on the round
--   - autosave heartbeat + match-play summary snapshot
-- Everything is idempotent and non-destructive.

-- ---------- round_holes: explicit stroke_index (per player if needed later) ----------
alter table if exists public.round_holes
  add column if not exists stroke_index integer,
  add column if not exists tee_yardage integer,
  add column if not exists tee_meters integer;

-- Backfill stroke_index from the older `handicap` column where possible.
update public.round_holes
set stroke_index = handicap
where stroke_index is null and handicap is not null;

create index if not exists idx_round_holes_round_hole
  on public.round_holes (round_id, hole_number);

-- ---------- round_players: handicap allowance + tee snapshot ----------
alter table if exists public.round_players
  add column if not exists handicap_allowance_percent numeric(5,2) default 100.00,
  add column if not exists course_rating numeric(4,1),
  add column if not exists slope_rating integer,
  add column if not exists tee_yardage integer,
  add column if not exists team text,
  add column if not exists notes text;

-- ---------- rounds: primary game + defaults + reliability metadata ----------
alter table if exists public.rounds
  add column if not exists primary_game_type text,
  add column if not exists handicap_allowance_percent numeric(5,2) default 100.00,
  add column if not exists auto_saved_at timestamptz,
  add column if not exists client_draft_key text,          -- localStorage key that owns the draft
  add column if not exists match_result jsonb,             -- post-round match analysis snapshot
  add column if not exists gross_score integer,
  add column if not exists net_score integer,
  add column if not exists stableford_points integer,
  add column if not exists course_id_external text,        -- copy from golf_course_external_id for portability
  add column if not exists tee_name_snapshot text,
  add column if not exists tee_colour_snapshot text;

-- Backfill gross_score from the existing `score` column (which represents gross).
update public.rounds
set gross_score = score
where gross_score is null and score is not null;

-- Backfill primary_game_type from the round_games table (first game).
update public.rounds r
set primary_game_type = g.game_type
from public.round_games g
where r.primary_game_type is null
  and g.round_id = r.id
  and g.created_at = (
    select min(created_at) from public.round_games where round_id = r.id
  );

-- ---------- round_player_holes: stableford + handicap trail (already exists in schema) ----------
-- Ensure the columns exist even on older schema branches.
alter table if exists public.round_player_holes
  add column if not exists strokes_received integer default 0,
  add column if not exists stableford_points integer,
  add column if not exists net_score integer,
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_round_player_holes_round_hole
  on public.round_player_holes (round_id, hole_number);

-- ---------- Index to find unfinished rounds fast ----------
create index if not exists idx_rounds_user_unfinished
  on public.rounds (user_id, status, updated_at desc nulls last)
  where status in ('draft', 'unfinished');
