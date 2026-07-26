# AthletiGolf - PRD (living document)

## Overview
Mobile-first web + Capacitor Android app for golf, gym training, and wellness tracking.
Stack: Vite + React 19 + TS, Tailwind, wouter, Supabase, Capacitor.

## Session 2026-01-15 - Feature bundle
User request: 8 improvements to existing app.

### Completed
1. **Split day preferences** (`GymQuiz.tsx`)
   - Rewrote `applyPreferredTrainingDays` with a two-pass placement that locks in user picks before falling back to auto-fill.
   - `applyProtectedRestDays` now preserves user-preferred days even when they clash with rest-day protection.
   - Auto-build path now also honours `preferredDays`.
2. **All exercises in Add/Avoid + cross-list guard** (`GymQuiz.tsx`)
   - New `FullExerciseSelector` component: full scrollable list with search, Add/Avoid buttons per exercise.
   - `toggleExercisePreference` blocks moving an exercise into the opposite list and surfaces a conflict message.
3. **Exercise info pages** (`ExerciseDetail.tsx` + new `BodyDiagram.tsx`)
   - Inline SVG front + back anatomy diagram, highlights primary (red) and secondary (amber) muscles.
   - Better tips/mistakes panels, equipment chip list (uses `equipmentOptions`), safety notes intact.
4. **Preferred / first name across app**
   - Added `preferred_name` column to `profiles` (migration `20260115120000_preferred_name_and_features.sql`).
   - New `friend_nicknames` table with RLS so users can rename friends locally.
   - Updated `Profile.tsx` (edit field), `Dashboard.tsx` (greeting), `FriendProfile.tsx` (nickname editor).
   - Helper: `src/lib/preferredName.ts`.
5. **Individual Wellness pages**
   - New route `/wellness/:panel` (`food`, `water`, `sleep`, `body`, `heartRate`, `bloodPressure`).
   - `setActivePanel` now syncs the URL so browser back works and each area is share-linkable.
6. **Supplement recommendations** (`Recommendations.tsx` at `/recommendations`)
   - Curated whey / vegan protein / pre-workout / creatine picks with rationale and search links.
7. **Golf gear recommendations** (same page, `Golf Gear` tab)
   - Balls, drivers, irons, wedges, putter picks segmented by handicap band.
   - Linked from GolfHub and GymHub.
8. **TopTracer session logger** (`TopTracerSession.tsx` at `/golf/toptracer`)
   - Modes: Warm-Up, TopTracer 30, TopTracer 12, My Practice.
   - Warm-Up / My Practice: club-average rows (carry, total, dispersion, shots).
   - TopTracer 30/12: challenge result fields (score, closest to pin, longest drive, targets hit, shots, holes).
   - Stored in `toptracer_sessions` with JSONB payloads so new modes can be added later.

### Migration applied
`supabase/migrations/20260115120000_preferred_name_and_features.sql` - run this on your Supabase project.

### Not yet touched
- Wellness page is still one big file (2600 lines). Routes now work but internal rendering is unchanged.
- Golf gear recommendations are not yet handicap-filtered dynamically (user profile handicap not read).
- TopTracer history has no analytics view yet (just recent list).

## Backlog / P1
- Filter Recommendations by user's stored handicap.
- Extract each Wellness panel into its own component file for maintainability.
- Add per-club trend charts on TopTracer history.
- Auto-link "Add / Avoid" picks in generated split preview so users can see the effect.

## P2
- Live TopTracer API when public API exists.
- Photo upload on TopTracer session.
