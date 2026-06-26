# Migration Notes

This folder contains the historical Supabase migrations for AthletiGolf.

Some early practice-session migrations have duplicate-looking names and `.sql.sql`
suffixes. Keep those files in place because they may already be part of deployed
database history. Removing or renaming applied migrations can make local and
remote Supabase environments disagree.

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
