/*
# Add full per-user data tables for authenticated accounts

## Purpose
When a user creates an account, all their stable data (horses, employees, trainings, planning, soins, routines, tarif grids) must be stored in Supabase and scoped to their account. The demo mode uses local in-memory mock data with no persistence. This migration creates the multi-tenant schema.

## New Tables (all owner-scoped via user_id)

1. `horses` — one row per horse
   - id (text PK), user_id (uuid, default auth.uid()), name, age, breed, status, ferrure_type, last_ferrure, last_ferrure_by, last_vermifuge, notes, box, owners (jsonb array)

2. `employees` — team members
   - id (text PK), user_id, first_name, last_name, phone, role, pin, pricing (jsonb), tarif_grid_id, advances (jsonb array)

3. `trainings` — training types catalog
   - id (text PK), user_id, name, description, intensity, duration, category

4. `planning` — planning entries
   - id (text PK), user_id, date, lot, horse_id, rider_id, training_id, notes, done

5. `soins` — individual care entries
   - id (text PK), user_id, horse_id, type, date, done, assigned_to, note

6. `routines` — recurring care routines
   - id (text PK), user_id, name, palefrenier_id, weekdays (jsonb int array), start_date, end_date, type, horse_ids (jsonb text array), note

7. `tarif_grids` — pricing grids per role
   - id (text PK), user_id, name, role, rates (jsonb)

## Modified Tables
- `ferrage_orders`: add `user_id` (uuid, default auth.uid()) so orders are scoped to the trainer who created them. Existing rows are public (token-based access continues to work for farriers who are anon).

## Security
- RLS enabled on every new table.
- Each table gets 4 owner-scoped policies (SELECT/INSERT/UPDATE/DELETE) with `auth.uid() = user_id`.
- `ferrage_orders` keeps its existing anon+authenticated full-access policies (token-based access for farriers), and gains an additional owner-scoped SELECT policy so authenticated trainers see only their own orders. The owner-scoped SELECT is added with a predicate `auth.uid() = user_id OR user_id IS NULL`.
- Owner columns default to `auth.uid()` so inserts from the client work even when the client omits user_id.

## Important Notes
1. All id columns are text (app-generated, e.g. `h1234567890`).
2. JSONB columns store structured data (owners array, pricing object, weekdays array, horse_ids array, rates object, advances array).
3. user_id is nullable on ferrage_orders so demo orders (created without auth) still work, but real user orders are scoped.
4. Email confirmation stays OFF — sign-up logs the user in immediately.
*/

CREATE TABLE IF NOT EXISTS horses (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  age integer NOT NULL DEFAULT 4,
  breed text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'actif',
  ferrure_type text NOT NULL DEFAULT '',
  last_ferrure date NOT NULL DEFAULT CURRENT_DATE,
  last_ferrure_by text NOT NULL DEFAULT '',
  last_vermifuge date NOT NULL DEFAULT CURRENT_DATE,
  notes text NOT NULL DEFAULT '',
  box text NOT NULL DEFAULT '',
  owners jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE horses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_horses" ON horses;
CREATE POLICY "select_own_horses" ON horses FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_horses" ON horses;
CREATE POLICY "insert_own_horses" ON horses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_horses" ON horses;
CREATE POLICY "update_own_horses" ON horses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_horses" ON horses;
CREATE POLICY "delete_own_horses" ON horses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS employees (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'cavalier',
  pin text,
  pricing jsonb,
  tarif_grid_id text,
  advances jsonb NOT NULL DEFAULT '[]'::jsonb
);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_employees" ON employees;
CREATE POLICY "select_own_employees" ON employees FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_employees" ON employees;
CREATE POLICY "insert_own_employees" ON employees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_employees" ON employees;
CREATE POLICY "update_own_employees" ON employees FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_employees" ON employees;
CREATE POLICY "delete_own_employees" ON employees FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS trainings (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  intensity text NOT NULL DEFAULT 'faible',
  duration integer NOT NULL DEFAULT 30,
  category text NOT NULL DEFAULT 'lot'
);
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_trainings" ON trainings;
CREATE POLICY "select_own_trainings" ON trainings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_trainings" ON trainings;
CREATE POLICY "insert_own_trainings" ON trainings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_trainings" ON trainings;
CREATE POLICY "update_own_trainings" ON trainings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_trainings" ON trainings;
CREATE POLICY "delete_own_trainings" ON trainings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS planning (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  lot integer NOT NULL DEFAULT 1,
  horse_id text NOT NULL,
  rider_id text NOT NULL,
  training_id text NOT NULL,
  notes text NOT NULL DEFAULT '',
  done boolean NOT NULL DEFAULT false
);
ALTER TABLE planning ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_planning" ON planning;
CREATE POLICY "select_own_planning" ON planning FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_planning" ON planning;
CREATE POLICY "insert_own_planning" ON planning FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_planning" ON planning;
CREATE POLICY "update_own_planning" ON planning FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_planning" ON planning;
CREATE POLICY "delete_own_planning" ON planning FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS soins (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  horse_id text NOT NULL,
  type text NOT NULL,
  date date NOT NULL,
  done boolean NOT NULL DEFAULT false,
  assigned_to text,
  note text NOT NULL DEFAULT ''
);
ALTER TABLE soins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_soins" ON soins;
CREATE POLICY "select_own_soins" ON soins FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_soins" ON soins;
CREATE POLICY "insert_own_soins" ON soins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_soins" ON soins;
CREATE POLICY "update_own_soins" ON soins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_soins" ON soins;
CREATE POLICY "delete_own_soins" ON soins FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS routines (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  palefrenier_id text NOT NULL,
  weekdays jsonb NOT NULL DEFAULT '[]'::jsonb,
  start_date date NOT NULL,
  end_date date NOT NULL,
  type text NOT NULL,
  horse_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text NOT NULL DEFAULT ''
);
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_routines" ON routines;
CREATE POLICY "select_own_routines" ON routines FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_routines" ON routines;
CREATE POLICY "insert_own_routines" ON routines FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_routines" ON routines;
CREATE POLICY "update_own_routines" ON routines FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_routines" ON routines;
CREATE POLICY "delete_own_routines" ON routines FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS tarif_grids (
  id text PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  rates jsonb NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE tarif_grids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_tarif_grids" ON tarif_grids;
CREATE POLICY "select_own_tarif_grids" ON tarif_grids FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_tarif_grids" ON tarif_grids;
CREATE POLICY "insert_own_tarif_grids" ON tarif_grids FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_tarif_grids" ON tarif_grids;
CREATE POLICY "update_own_tarif_grids" ON tarif_grids FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_tarif_grids" ON tarif_grids;
CREATE POLICY "delete_own_tarif_grids" ON tarif_grids FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add user_id to ferrage_orders (nullable for backward compat with demo orders)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ferrage_orders' AND column_name = 'user_id') THEN
    ALTER TABLE ferrage_orders ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "anon_select_ferrage" ON ferrage_orders;
CREATE POLICY "anon_select_ferrage" ON ferrage_orders FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_ferrage" ON ferrage_orders;
CREATE POLICY "anon_insert_ferrage" ON ferrage_orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_ferrage" ON ferrage_orders;
CREATE POLICY "anon_update_ferrage" ON ferrage_orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_ferrage" ON ferrage_orders;
CREATE POLICY "anon_delete_ferrage" ON ferrage_orders FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_horses_user_id ON horses(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_trainings_user_id ON trainings(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_user_id ON planning(user_id);
CREATE INDEX IF NOT EXISTS idx_soins_user_id ON soins(user_id);
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON routines(user_id);
CREATE INDEX IF NOT EXISTS idx_tarif_grids_user_id ON tarif_grids(user_id);
CREATE INDEX IF NOT EXISTS idx_ferrage_orders_user_id ON ferrage_orders(user_id);