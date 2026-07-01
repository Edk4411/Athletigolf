# AthletiGolf Current Database Shape

This file is the current source of truth for what the deployed Supabase database
needs to support the app. It is not a migration and should not be pasted into
Supabase SQL editor.

Use this when Bolt asks what database capabilities are needed.

## Important Rule

Do not delete, rename, or reorder the existing migration files, including the
duplicate-looking `.sql.sql` files. Some may already exist in deployed database
history. Future database changes should be added as one new additive migration.

## Required Tables

### `profiles`

Purpose: user profile, app preferences, theme, and account settings.

Required columns:

- `id uuid primary key`
- `full_name text`
- `age integer`
- `height text`
- `weight text`
- `golf_handicap numeric`
- `main_goal text`
- `distance_unit text default 'yards'`
- `weight_unit text default 'kg'`
- `theme text`
- `notifications_enabled boolean default false`
- `onboarding_completed boolean default false`
- `onboarding_completed_at timestamptz`
- `onboarding_data jsonb default '{}'::jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Security:

- Row Level Security enabled.
- Users can only select, insert, update, and delete their own row where
  `auth.uid() = id`.

### `rounds`

Purpose: one saved golf round summary.

Required columns:

- `id uuid primary key`
- `user_id uuid default auth.uid()`
- `course text`
- `date text`
- `score integer`
- `fairways_hit integer`
- `fairways_possible integer default 0`
- `greens_in_regulation integer`
- `putts integer`
- `penalty_shots integer default 0`
- `chip_shots integer default 0`
- `greenside_bunker_shots integer default 0`
- `holes_played integer default 18`
- `tee_colour text`
- `average_driving_distance numeric`
- `longest_drive numeric`
- `tee_shot_quality text`
- `scramble_percentage numeric`
- `is_competition boolean default false`
- `notes text`
- `created_at timestamptz`

Security:

- Row Level Security enabled.
- Users can only access rows where `auth.uid() = user_id`.

### `round_holes`

Purpose: hole-by-hole golf scoring and short-game stats.

Required columns:

- `id uuid primary key`
- `round_id uuid references rounds(id) on delete cascade`
- `user_id uuid default auth.uid()`
- `hole_number integer`
- `par integer default 4`
- `score integer`
- `fairway_result text default 'na'`
- `tee_shot_location text`
- `gir boolean default false`
- `putts integer default 0`
- `penalty_shots integer default 0`
- `chip_shots integer default 0`
- `greenside_bunker_shots integer default 0`
- `recovery_shot_type text`
- `created_at timestamptz`

Recommended constraint/indexes:

- Unique pair: `(round_id, hole_number)`
- Index on `round_id`
- Index on `user_id`

Security:

- Row Level Security enabled.
- Users can only access rows where `auth.uid() = user_id`.

### `workouts`

Purpose: saved training sessions.

Required columns:

- `id uuid primary key`
- `user_id uuid default auth.uid()`
- `date text`
- `workout_name text`
- `exercises jsonb default '[]'::jsonb`
- `notes text`
- `created_at timestamptz`

Exercise JSON objects may include:

- `name`
- `weight`
- `sets`
- `reps`
- `notes`
- `weight_value`
- `sets_value`
- `reps_value`
- `volume`
- `muscle_group`
- `library_match`

Security:

- Row Level Security enabled.
- Users can only access rows where `auth.uid() = user_id`.

### `split_days`

Purpose: active and archived training boards/splits.

Required columns:

- `id uuid primary key`
- `user_id uuid default auth.uid()`
- `day_name text`
- `split_name text`
- `exercises jsonb default '[]'::jsonb`
- `archived_at timestamptz`
- `created_at timestamptz`

Recommended index:

- `(user_id, archived_at)`

Security:

- Row Level Security enabled.
- Users can only access rows where `auth.uid() = user_id`.

### `practice_sessions`

Purpose: saved golf practice sessions, optional drills, notes, and ratings.

Required columns:

- `id uuid primary key`
- `user_id uuid default auth.uid()`
- `practice_type text default 'Driving Range'`
- `duration_minutes integer default 0`
- `focus_area text`
- `rating integer`
- `drill_name text`
- `drill_attempts integer`
- `drill_successes integer`
- `drill_distance text`
- `drills jsonb default '[]'::jsonb`
- `notes text`
- `created_at timestamptz`

Security:

- Row Level Security enabled.
- Users can only access rows where `auth.uid() = user_id`.

### `competitions`

Purpose: upcoming and completed golf competitions, prep focus, and post-event review.

Required columns:

- `id uuid primary key`
- `user_id uuid default auth.uid()`
- `name text`
- `course text`
- `competition_date date`
- `start_time text`
- `priority text default 'medium'`
- `target_score integer`
- `focus_area text`
- `notes text`
- `status text default 'upcoming'`
- `result_score integer`
- `reflection_strength text`
- `reflection_weakness text`
- `created_at timestamptz`
- `updated_at timestamptz`

Recommended index:

- `(user_id, competition_date)`

Security:

- Row Level Security enabled.
- Users can only access rows where `auth.uid() = user_id`.

### `daily_wellness_logs`

Purpose: daily manual nutrition, hydration, recovery, and bodyweight signals.

Required columns:

- `id uuid primary key`
- `user_id uuid default auth.uid()`
- `log_date date`
- `water_litres numeric`
- `calories integer`
- `protein_grams integer`
- `carbs_grams integer`
- `fats_grams integer`
- `bodyweight numeric`
- `sleep_hours numeric`
- `energy_rating integer`
- `notes text`
- `created_at timestamptz`
- `updated_at timestamptz`

Recommended constraints/indexes:

- Unique pair: `(user_id, log_date)`
- Index on `(user_id, log_date)`

Security:

- Row Level Security enabled.
- Users can only access rows where `auth.uid() = user_id`.

### `nutrition_entries`

Purpose: individual food entries grouped by meal for daily nutrition tracking.

Required columns:

- `id uuid primary key`
- `user_id uuid default auth.uid()`
- `log_date date`
- `meal_type text default 'snack'`
- `food_name text`
- `serving text`
- `calories integer default 0`
- `protein_grams integer default 0`
- `carbs_grams integer default 0`
- `fats_grams integer default 0`
- `created_at timestamptz`
- `updated_at timestamptz`

Recommended index:

- `(user_id, log_date)`

Security:

- Row Level Security enabled.
- Users can only access rows where `auth.uid() = user_id`.

### `saved_foods`

Purpose: reusable personal food presets for fast nutrition logging.

Required columns:

- `id uuid primary key`
- `user_id uuid default auth.uid()`
- `food_name text`
- `serving text`
- `calories integer default 0`
- `protein_grams integer default 0`
- `carbs_grams integer default 0`
- `fats_grams integer default 0`
- `created_at timestamptz`
- `updated_at timestamptz`

Recommended index:

- `(user_id, food_name)`

Security:

- Row Level Security enabled.
- Users can only access rows where `auth.uid() = user_id`.

### `friend_connections`

Purpose: friend requests and accepted friend relationships.

Required columns:

- `id uuid primary key`
- `requester_id uuid default auth.uid()`
- `receiver_id uuid`
- `requester_label text`
- `receiver_label text`
- `status text default 'pending'`
- `created_at timestamptz`
- `updated_at timestamptz`

Recommended constraints/indexes:

- Unique pair: `(requester_id, receiver_id)`
- Index on `(requester_id, status)`
- Index on `(receiver_id, status)`

Security:

- Row Level Security enabled.
- Users can only access rows where they are the requester or receiver.

### `live_activities`

Purpose: current gym, course, practice, or availability check-ins.

Required columns:

- `id uuid primary key`
- `user_id uuid default auth.uid()`
- `activity_type text`
- `location_name text`
- `detail text`
- `visibility text default 'friends'`
- `started_at timestamptz`
- `expires_at timestamptz`
- `ended_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

Recommended index:

- `(user_id, ended_at, expires_at)`

Security:

- Row Level Security enabled.
- Users can manage their own live activity rows.
- Users can select friends-visible active rows from accepted friends.

## Bolt Answer

If Bolt asks what database work it needs, say:

> Do not recreate the database or delete old migrations. Check the current
> Supabase database has the columns listed in
> `supabase/migrations/CURRENT_SCHEMA.md`. If anything is missing, create one
> new additive migration using `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT
> EXISTS`, and guarded policies/indexes. Do not paste duplicate historical
> `.sql.sql` migrations if the columns already exist.

## Future Migration Rules

- Add one new migration per real database change.
- Use a clear timestamp and name, for example:
  `20260701130000_add_competitions.sql`.
- Prefer `ADD COLUMN IF NOT EXISTS` for new columns.
- Prefer `CREATE TABLE IF NOT EXISTS` for new tables.
- Never rewrite old migration files after they may have been applied remotely.
- Never remove duplicate-looking historical migrations unless the remote
  migration history is known and intentionally cleaned.
