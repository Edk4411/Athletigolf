# Migration Notes

This folder contains the historical Supabase migrations for AthletiGolf.

Some migrations have duplicate-looking names and `.sql.sql` suffixes. Keep those
files in place because they may already be part of deployed database history.
Removing or renaming applied migrations can make local and remote Supabase
environments disagree.

Going forward:

- Add one new migration per database change.
- Use clear names such as `20260626103000_add_round_fairways_possible.sql`.
- Do not create duplicate repair migrations for the same table unless a deployed
  database genuinely needs a follow-up fix.
- Prefer additive migrations over rewriting old history.
- If a table needs cleanup, write a new migration that safely handles existing
  data with `IF EXISTS`, `IF NOT EXISTS`, and guarded `DO $$` blocks.

The `20260626120000_add_round_holes.sql` migration adds `fairways_possible`
and the `round_holes` table so fairway percentage and short-game stats can be
calculated from actual hole-by-hole data instead of a standard assumption.

## Current Bolt/Supabase Checklist

If Bolt asks what database changes it needs, check that these capabilities exist:

- `rounds` has distance fields: `average_driving_distance`, `longest_drive`, and
  `tee_shot_quality`.
- `round_holes` exists and has `tee_shot_location` and `recovery_shot_type`.
- `practice_sessions` has both legacy drill columns and the newer `drills jsonb`
  column.
- `split_days` has `archived_at`.

The duplicate-looking repair migrations for practice drills and split archiving
are intentionally additive and use `IF NOT EXISTS`, so applying either copy
should be harmless. Do not paste both copies into Bolt manually if the columns
already exist.
