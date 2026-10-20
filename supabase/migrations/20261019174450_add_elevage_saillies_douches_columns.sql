/*
# Add elevage, saillies, douches tables + new columns

## New Tables
1. `elevage_horses` — breeding stock (juments, étalons, poulains, pouliches)
   - id, user_id, name, category, breed, birth_date, sire, dam_name, notes, photo
2. `saillies` — covering/breeding records
   - id, user_id, date, jument_id, etalon_id, observations, sauts, status, mise_bas_prevue
3. `douches` — daily shower assignments
   - id, user_id, date, horse_id, assigned_to, done

## Modified Tables
- `horses`: add `photo` (text, data URL)
- `employees`: add `color` (text, hex), add `nourriture` and `soin_particulier` to pricing (stored in jsonb, no column change needed)
- `routines`: add `week_pattern` (text, default 'A'), change palefrenier_id to palefrenier_ids (jsonb array), add `custom_price` (numeric)
- `soins`: add `price` (numeric, for soin_particulier)
- `tarif_grids`: rates jsonb now includes douche, nourriture keys (no column change)
- `auth.users` user_metadata: logo_url stored in user metadata (no table change)

## Security
- RLS enabled on all new tables with owner-scoped CRUD policies.
- All user_id columns default to auth.uid().
*/

CREATE TABLE IF NOT EXISTS elevage_horses (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'jument',
  breed text NOT NULL DEFAULT '',
  birth_date date,
  sire text,
  dam_name text,
  notes text NOT NULL DEFAULT '',
  photo text
);
ALTER TABLE elevage_horses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_elevage" ON elevage_horses;
CREATE POLICY "select_own_elevage" ON elevage_horses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_elevage" ON elevage_horses;
CREATE POLICY "insert_own_elevage" ON elevage_horses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_elevage" ON elevage_horses;
CREATE POLICY "update_own_elevage" ON elevage_horses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_elevage" ON elevage_horses;
CREATE POLICY "delete_own_elevage" ON elevage_horses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS saillies (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  jument_id text NOT NULL,
  etalon_id text NOT NULL,
  observations text NOT NULL DEFAULT '',
  sauts integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'en_attente',
  mise_bas_prevue date
);
ALTER TABLE saillies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_saillies" ON saillies;
CREATE POLICY "select_own_saillies" ON saillies FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_saillies" ON saillies;
CREATE POLICY "insert_own_saillies" ON saillies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_saillies" ON saillies;
CREATE POLICY "update_own_saillies" ON saillies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_saillies" ON saillies;
CREATE POLICY "delete_own_saillies" ON saillies FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS douches (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  horse_id text NOT NULL,
  assigned_to text NOT NULL,
  done boolean NOT NULL DEFAULT false
);
ALTER TABLE douches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_douches" ON douches;
CREATE POLICY "select_own_douches" ON douches FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_douches" ON douches;
CREATE POLICY "insert_own_douches" ON douches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_douches" ON douches;
CREATE POLICY "update_own_douches" ON douches FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_douches" ON douches;
CREATE POLICY "delete_own_douches" ON douches FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add photo column to horses
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'horses' AND column_name = 'photo') THEN
    ALTER TABLE horses ADD COLUMN photo text;
  END IF;
END $$;

-- Add color column to employees
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'color') THEN
    ALTER TABLE employees ADD COLUMN color text;
  END IF;
END $$;

-- Add week_pattern and custom_price to routines; change palefrenier_id to palefrenier_ids (jsonb array)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routines' AND column_name = 'week_pattern') THEN
    ALTER TABLE routines ADD COLUMN week_pattern text NOT NULL DEFAULT 'A';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routines' AND column_name = 'custom_price') THEN
    ALTER TABLE routines ADD COLUMN custom_price numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'routines' AND column_name = 'palefrenier_ids') THEN
    ALTER TABLE routines ADD COLUMN palefrenier_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add price column to soins
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'soins' AND column_name = 'price') THEN
    ALTER TABLE soins ADD COLUMN price numeric;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_elevage_user_id ON elevage_horses(user_id);
CREATE INDEX IF NOT EXISTS idx_saillies_user_id ON saillies(user_id);
CREATE INDEX IF NOT EXISTS idx_douches_user_id ON douches(user_id);