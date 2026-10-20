/*
# Create ferrage_orders table for magic-link farrier access

1. Purpose
- Stores ferrage (shoeing) orders that are accessed by farriers via a magic link containing a token.
- No authentication required — the token IS the access credential. Any person with the token URL can read and update the order.
- This replaces the previous localStorage approach which only worked within the same browser.

2. New Tables
- `ferrage_orders`
  - `id` (text, primary key) — app-generated unique id
  - `token` (text, unique, not null) — the magic-link token used for URL-based access
  - `created_at` (date) — ISO date the order was created
  - `expires_at` (date) — ISO date the order expires (3 days from creation)
  - `status` (text, not null, default 'pending') — 'pending' or 'completed'
  - `completed_at` (date, nullable) — ISO date the order was validated
  - `marechal_id` (text, nullable) — employee id of the selected farrier
  - `marechal_name` (text, nullable) — name of the farrier (denormalized for display)
  - `horses` (jsonb, not null) — array of { horseId, consigne, done, note } objects

3. Security
- Enable RLS on `ferrage_orders`.
- Allow anon + authenticated full CRUD because access is controlled by the token in the URL, not by user identity. Anyone with the token link can read/update the order. This is intentionally public/shared data (single-tenant, no-auth magic-link pattern).

4. Important Notes
- The token column has a unique index for fast lookups by the farrier session page.
- The horses column stores the full per-horse state as JSONB — this includes done flags and notes that the farrier updates.
- Expiry is 3 days from creation; the app should check expires_at before allowing access.
*/