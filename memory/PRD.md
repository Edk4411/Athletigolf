# AthletiGolf - PRD (living document)

## Overview
Mobile-first web + Capacitor Android app for golf, gym training, and wellness tracking.
Stack: Vite + React 19 + TS, Tailwind, wouter, Supabase, Capacitor.

## Session 2026-01-15 - Feature bundle
User request: 8 improvements to existing app.

### Completed
1. **Split day preferences** (`GymQuiz.tsx`) - two-pass placement, user picks always win, auto-build path honours preferences.
2. **All exercises in Add/Avoid + cross-list guard** (`GymQuiz.tsx`) - full scrollable picker (`FullExerciseSelector`), blocks and warns on cross-list conflicts.
3. **Exercise info pages** (`ExerciseDetail.tsx` + new `BodyDiagram.tsx`) - front/back SVG anatomy with primary (red) / secondary (amber) highlights, equipment chips, tips/mistakes.
4. **Preferred / first name across app** - `preferred_name` on profiles + `friend_nicknames` table (migration `20260115120000_preferred_name_and_features.sql`), used in Dashboard/Profile/FriendProfile.
5. **Individual Wellness pages** - `/wellness/:panel` route, URL <-> panel state sync.
6. **Supplement recommendations** (`Recommendations.tsx` at `/recommendations`).
7. **Golf gear recommendations** (same page, "Golf Gear" tab).
8. **TopTracer session logger** (`TopTracerSession.tsx` - now legacy, superseded in Session 2026-01-16).

### Migrations
- `20260115120000_preferred_name_and_features.sql` - preferred_name + friend_nicknames + toptracer_sessions.
  - FK: friend_nicknames -> profiles(id), toptracer_sessions.user_id -> profiles(id) (per final review).
  - No updated_at trigger (project doesn't use that pattern; client sets updated_at manually).

## Session 2026-01-16 - Unified Practice Tracking
User request: redesign practice tracking. TopTracer / Trackman / launch monitors under one Practice flow.

### Completed
- **New migration** `20260116100000_practice_sessions_unified.sql` extends existing `practice_sessions` with:
  - `mode` (on_course | driving_range | short_game | putting | simulator) with CHECK constraint
  - `source` (manual | toptracer | trackman | garmin_r10 | flightscope | skytrak | foresight | uneekor | arccos | shotscope | other)
  - `source_session_id`, `source_mode` (e.g. warm_up | toptracer_30 | toptracer_12 | my_practice)
  - `session_date`, `location`, `course_name`, `handicap_at_session`
  - `metrics jsonb`, `shots jsonb`, `club_averages jsonb`, `ai_summary`, `updated_at`
  - Backfills `mode` from legacy `practice_type`, `session_date` from `created_at`
  - Migrates existing `toptracer_sessions` rows into `practice_sessions` (idempotent via source_session_id)
  - New indexes on (user_id, session_date desc), (user_id, mode), (source, source_session_id), GIN on metrics
- **New page** `LogPractice.tsx` at `/practice/new` - 3-step flow:
  1. "What type of practice was this?" (5 options)
  2. "Where is the data coming from?" (10 sources incl. TopTracer, Trackman, Foresight, SkyTrak, GSPro, Garmin R10, Uneekor, Arccos, Shot Scope)
  3. Mode-specific form
- **Mode-specific forms** (`components/PracticeModeForms.tsx`):
  - Range: club averages (carry, total, dispersion, shots) + advanced (ball speed, launch angle) when source is a launch monitor; TopTracer modes + challenge results if source=toptracer
  - Short Game: distance-bucketed up-and-downs, proximity, success %
  - Putting: distance-bucketed made %, start-line offset, short/long/left/right miss breakdown
  - On Course: strokes, putts, GIR, FIR, penalties, up-and-downs, sand saves
  - Simulator: brand, course, score, strokes gained (total/OTT/APP/ATG/Putt), plus club averages
- **Shared types** (`src/lib/practiceTypes.ts`) - PracticeMode, PracticeSource, ClubAverage, ShortGameBucket, PuttingBucket, OnCourseMetrics, SimulatorMetrics, ChallengeResult, PracticeMetrics
- **PracticeHistory** now shows mode/source/location/course/handicap tiles, club-average summary block, full-metrics JSON expandable panel, and AthletiAI summary card when present.
- **Legacy PracticeSession page** untouched but shows a "Try the new unified logger" CTA.
- **Route changes**:
  - `/golf/toptracer` now routes to `LogPractice` (backward-compatible URL, same practice-logger flow).
  - `/practice/new` - primary entry to the new flow.
- **Golf Hub tile** updated: "TopTracer / Range" -> "Log Practice" pointing at `/practice/new`.

### AthletiAI-ready
Every practice row now has `mode`, `source`, structured `metrics`, `club_averages`, `shots`, `ai_summary`. AthletiAI can query by mode, aggregate by source/date, and populate `ai_summary` per session.

### Future integration points (already in schema)
- TopTracer Range API - `source='toptracer'`, `source_session_id` = TopTracer session UUID.
- Trackman Performance Studio - `source='trackman'`, `metrics.strokes_gained_*`, per-shot detail in `shots`.
- Garmin R10 / Foresight / SkyTrak - same shape via `source`.
- Arccos / Shot Scope on-course - `source='arccos'`, per-hole detail in `shots`.

### Deprecated (kept for backward compat)
- `TopTracerSession.tsx` - no imports, superseded by `LogPractice.tsx`. Safe to delete when confident.
- `toptracer_sessions` table - retained; rows migrated into `practice_sessions`. Safe to drop after verification.

## Backlog / P1
- AthletiAI worker: read new rows and populate `ai_summary` (currently unused).
- Handicap-Filtered gear recommendations (read user handicap).
- Extract each Wellness panel into its own file for maintainability.
- Practice-history analytics: per-club trend charts, made-% trend, strokes-gained trend.
- Actual TopTracer / Trackman API sync (schema is ready).

## P2
- Split Wellness (2600 lines) into per-panel components.
- Photo upload on practice sessions.
- Session sharing with friends.
