/*
# Add active column to week_schedules

1. Changes
- `week_schedules.active` (boolean, NOT NULL, default true): whether the programme is currently generating soins (true) or paused (false).
2. Security
- No policy changes; existing owner-scoped CRUD on week_schedules still applies.
3. Notes
- Idempotent: uses DO block to add the column only if absent.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'week_schedules' AND column_name = 'active'
  ) THEN
    ALTER TABLE week_schedules ADD COLUMN active boolean NOT NULL DEFAULT true;
  END IF;
END $$;
