# AthletiGolf - PRD (living document)

## Overview
Mobile-first web + Capacitor Android app for golf, gym training, and wellness tracking.
Stack: Vite + React 19 + TS, Tailwind, wouter, Supabase, Capacitor.

## Session 2026-01-15 - Feature bundle
User request: 8 improvements to existing app.

### Completed
1. Split day preferences (`GymQuiz.tsx`) - two-pass placement.
2. All exercises in Add/Avoid + cross-list guard.
3. Exercise info pages with `BodyDiagram.tsx`.
4. Preferred / first name (`preferred_name` + `friend_nicknames`).
5. Individual Wellness pages via `/wellness/:panel`.
6. Supplement recommendations.
7. Golf gear recommendations.
8. TopTracer session logger (superseded 2026-01-16).

## Session 2026-01-16 - Unified Practice Tracking
Migration `20260116100000_practice_sessions_unified.sql`, new `LogPractice.tsx`, `PracticeModeForms.tsx`, `practiceTypes.ts`. See file for details.

## Session 2026-01-17 - Round Tracker reliability & calculation integrity
User request: end-to-end redesign of round tracking.

### Completed
- **Inspection** - identified: no autosave, no unfinished-round banner, no stroke_index column, no handicap_allowance_percent, no primary_game_type snapshot, no match_result snapshot, no gross/net breakdown, no per-hole strokes-received storage in a stable place.
- **New migration** `20260117090000_round_tracker_reliability.sql`:
  - `round_holes`: `stroke_index`, `tee_yardage`, `tee_meters` (backfills `stroke_index` from legacy `handicap`)
  - `round_players`: `handicap_allowance_percent`, `course_rating`, `slope_rating`, `tee_yardage`, `team`, `notes`
  - `rounds`: `primary_game_type`, `handicap_allowance_percent`, `auto_saved_at`, `client_draft_key`, `match_result` (jsonb), `gross_score`, `net_score`, `stableford_points`, `course_id_external`, `tee_name_snapshot`, `tee_colour_snapshot`
  - `round_player_holes`: ensure `strokes_received`, `stableford_points`, `net_score`, `updated_at` exist
  - Indexes: `idx_rounds_user_unfinished` (partial), `idx_round_holes_round_hole`, `idx_round_player_holes_round_hole`
  - Backfills gross_score from score, primary_game_type from first round_games entry
- **New handicap library** `src/lib/handicap.ts`:
  - USGA/WHS default allowances table (Match 100, Stableford 95, 4BBB 90, Foursomes 50, Greensomes 60, Scramble variable)
  - `computeCourseHandicap`, `computePlayingHandicap`, `strokesOnHole`, `stablefordPoints`, `matchHoleResult`, `matchStatusLabel`
- **New draft utilities** `src/lib/roundDraft.ts` - localStorage snapshot save/load/clear
- **New autosave hook** `src/hooks/useRoundAutosave.ts` - debounced local + Supabase flushing
- **New UI**:
  - `HandicapAllowanceSelector.tsx` - 100/95/90/85/80 chips + custom, format-aware suggestion
  - `UnfinishedRoundBanner.tsx` - shown on Golf Hub whenever an unfinished round exists locally or remotely
  - `PostRoundMatchAnalysis.tsx` - holes won / lost / halved + result label, blue vs red team, shown ONLY after the round finishes
- **RoundTracker.tsx surgical integration**:
  - Autosave effect writes local snapshot on every state change
  - Visibility-change and pagehide events flush to Supabase
  - "Save Round" button visible in the top banner during hole entry
  - "Settings" button jumps back to setup step (change course / tees / players / handicap / game type mid-round without restarting)
  - Setup step now includes `HandicapAllowanceSelector`
  - Saved payload includes: primary_game_type, handicap_allowance_percent, gross_score, net_score, auto_saved_at, client_draft_key, match_result, tee_name_snapshot, tee_colour_snapshot
  - Hole rows saved with explicit stroke_index / tee_yardage / tee_meters
  - localStorage draft cleared on completion
  - Post-round match analysis shown in the "saved" step for match_play / four_ball_match

### Match play behaviour
- **During the round**: scorecard shows only the player's score. Team colour (blue/red) implied by team assignment.
- **After the round**: `PostRoundMatchAnalysis` displays holes won / lost / halved and result label.
- All match hole data continues to be stored in `round_player_holes` + `round_game_holes` for later re-analysis.

### AthletiAI / future analysis ready
Every completed round now stores:
- gross_score, net_score, handicap_allowance_percent, primary_game_type
- hole-by-hole: par, score, stroke_index, putts, penalties, chip/bunker shots
- match_result snapshot (jsonb)
- Enough to recompute stableford points, strokes gained, handicap trends, and player comparisons at any point.

## Backlog / P1
- AthletiAI worker: populate `ai_summary` and per-round insights.
- Server-side autosave debounce (currently only visibility-change triggers server sync; per-hole trigger can be added).
- Match-play scorecard: apply the blue/red circle outline styling around player scores in the live scorecard grid.
- Stroke index import from course API when available (Golf Course API typically provides handicap ranking - map into `stroke_index`).

## P2
- Split Wellness (2600 lines) into per-panel components.
- TopTracer / Trackman auto-sync APIs.
- Session sharing with friends.
