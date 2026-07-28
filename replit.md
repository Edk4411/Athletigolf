# AthletiGolf

A mobile-first fitness and golf tracking app built with React, TypeScript, Vite, Supabase, and Capacitor (Android).

## Stack

- **Frontend:** React 19 + TypeScript + Vite 7
- **Styling:** Tailwind CSS v4
- **Routing:** Wouter
- **Backend:** Supabase (auth, database, Edge Functions)
- **Mobile:** Capacitor (Android)
- **Animations:** Framer Motion

## Environment Variables Required

Copy to `.env.local`:
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

## Running Locally

```bash
npm install
npm run dev
```

## Available Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript validation |
| `npm run app:sync` | Build + sync Capacitor |
| `npm run app:android` | Open Android Studio |

## Project Structure

```
src/
  pages/       — Full page components (RoundTracker, Wellness, Cardio, etc.)
  components/  — Shared UI components (AppDock, GolfCoursePicker, etc.)
  hooks/       — React hooks (useAuth, useStrava)
  lib/         — Utilities, types, Supabase client
supabase/
  migrations/  — SQL migrations for full schema
  functions/   — Edge Functions (strava-import, food-search, golf-course-search)
```

## Key Architecture Notes

- The app runs as a **native Android app** (AppDock + AppHeader) and **web app** (MobileSidebar) — toggled by `isNativeApp()`
- Sport mode gating: users can be golf-only, gym-only, or both — routes are filtered accordingly
- Wellness uses a panel system with URL deep-linking (`/wellness/:panel`)
- Round Tracker saves via a full delete-then-insert across 6 tables (no true autosave yet — a known issue)
- Handicap calculations use raw handicap index without WHS Course Handicap conversion (known issue)

## User Preferences

- Do not make large architectural changes without discussion
- Preserve existing functionality and code patterns
- Maintain the existing design system/language
- Mobile-first design — test for both desktop and mobile
- Do not remove features unless explicitly requested
