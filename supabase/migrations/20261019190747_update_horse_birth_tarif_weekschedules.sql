/*
# Update horse birth, tarif grids, week schedules, ferrage notes

1. Modified tables
- horses: add birth_year (int), birth_month (int), last_ferrure_note (text). The old `age` column stays for backward compat but the app now uses birth_year/birth_month.
- tarifs_grids: add training_rates (jsonb) for per-training pricing overrides.
- routines: drop week_pattern column is NOT safe (data loss risk). Instead we just stop using it. The app no longer sends it.
- saillies: add refuse_date (date) for tracking when refusal was determined.

2. New tables
- week_schedules: programmable week rotation (A/B/C/D referencing routines)
  - id (text, PK)
  - user_id (uuid, default auth.uid())
  - name (text)
  - week_a_id (text, nullable, references routine id)
  - week_b_id (text, nullable)
  - week_c_id (text, nullable)
  - week_d_id (text, nullable)
  - start_date (date)
  - end_date (date)
  - created_at (timestamptz)

3. Security
- week_schedules: RLS enabled, owner-scoped CRUD (same pattern as other user tables).
- No changes to existing table policies.
*/

-- Add birth_year, birth_month, last_ferrure_note to horses
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'horses' AND column_name = 'birth_year') THEN
    ALTER TABLE horses ADD COLUMN birth_year int;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'horses' AND column_name = 'birth_month') THEN
    ALTER TABLE horses ADD COLUMN birth_month int;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'horses' AND column_name = 'last_ferrure_note') THEN
    ALTER TABLE horses ADD COLUMN last_ferrure_note text DEFAULT '';
  END IF;
END $$;

-- Add training_rates to tarifs_grids
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tarif_grids' AND column_name = 'training_rates') THEN
    ALTER TABLE tarif_grids ADD COLUMN training_rates jsonb DEFAULT '{}';
  END IF;
END $$;

-- Add refuse_date to saillies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saillies' AND column_name = 'refuse_date') THEN
    ALTER TABLE saillies ADD COLUMN refuse_date date;
  END IF;
END $$;

-- Add trainer_observation to ferrage_orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ferrage_orders' AND column_name = 'trainer_observation') THEN
    ALTER TABLE ferrage_orders ADD COLUMN trainer_observation text DEFAULT '';
  END IF;
END $$;

-- Create week_schedules table
CREATE TABLE IF NOT EXISTS week_schedules (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  week_a_id text,
  week_b_id text,
  week_c_id text,
  week_d_id text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL DEFAULT CURRENT_DATE + interval '90 days',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE week_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_week_schedules" ON week_schedules;
CREATE POLICY "select_own_week_schedules" ON week_schedules FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_week_schedules" ON week_schedules;
CREATE POLICY "insert_own_week_schedules" ON week_schedules FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_week_schedules" ON week_schedules;
CREATE POLICY "update_own_week_schedules" ON week_schedules FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_week_schedules" ON week_schedules;
CREATE POLICY "delete_own_week_schedules" ON week_schedules FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
