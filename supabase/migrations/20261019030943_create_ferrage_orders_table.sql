/*
# Create ferrage_orders table for magic-link farrier access

1. Purpose
- Stores ferrage (shoeing) orders accessed by farriers via a magic link containing a token.
- No authentication required — the token IS the access credential.
- Replaces the previous localStorage approach which only worked within the same browser.

2. New Tables
- `ferrage_orders`
  - `id` (text, primary key) — app-generated unique id
  - `token` (text, unique, not null) — the magic-link token for URL-based access
  - `created_at` (date) — ISO date the order was created
  - `expires_at` (date) — ISO date the order expires (3 days from creation)
  - `status` (text, not null, default 'pending') — 'pending' or 'completed'
  - `completed_at` (date, nullable) — ISO date the order was validated
  - `marechal_id` (text, nullable) — employee id of the selected farrier
  - `marechal_name` (text, nullable) — name of the farrier (denormalized for display)
  - `horses` (jsonb, not null) — array of { horseId, consigne, done, note } objects

3. Security
- Enable RLS on `ferrage_orders`.
- Allow anon + authenticated full CRUD. Access is controlled by the token in the URL, not by user identity. This is intentionally public/shared data (single-tenant, no-auth magic-link pattern).

4. Important Notes
- Unique index on token for fast lookups.
- horses column stores per-horse state as JSONB (done flags, notes).
- Expiry is 3 days; the app checks expires_at before allowing access.
*/

CREATE TABLE IF NOT EXISTS ferrage_orders (
  id text PRIMARY KEY,
  token text UNIQUE NOT NULL,
  created_at date NOT NULL,
  expires_at date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at date,
  marechal_id text,
  marechal_name text,
  horses jsonb NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE ferrage_orders ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS idx_ferrage_orders_token ON ferrage_orders(token);