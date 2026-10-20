/*
# Subscription state for Stripe billing

1. Purpose
   - Stores per-trainer Stripe subscription state so the frontend can gate
     access after a 1-month free trial and after failed payments.
   - A row is created automatically (by the webhook) when the trainer first
     signs up, or lazily by the create-checkout-session edge function. We use
     `user_id = auth.uid()` as the key so each trainer has exactly one row.

2. New Table: `subscriptions`
   - `id`            uuid PK
   - `user_id`       uuid NOT NULL, unique, REFERENCES auth.users ON DELETE CASCADE,
                     DEFAULT auth.uid() so client inserts without passing it.
   - `status`        text NOT NULL DEFAULT 'trialing'
                     ('trialing' | 'active' | 'past_due' | 'canceled')
   - `trial_started_at`   timestamptz NOT NULL DEFAULT now()
   - `trial_ends_at`      timestamptz NOT NULL DEFAULT (now() + interval '30 days')
   - `grace_ends_at`      timestamptz            -- set when payment fails; 14-day grace
   - `stripe_customer_id`      text
   - `stripe_subscription_id`  text
   - `stripe_price_id`         text              -- current price
   - `current_period_end`      timestamptz
   - `canceled_at`             timestamptz
   - `updated_at`   timestamptz NOT NULL DEFAULT now()

3. Security
   - Enable RLS.
   - SELECT: authenticated users can read their own row.
   - INSERT: authenticated users can insert their own row (only user_id is
     client-set; sensitive fields like status/subscription_id are guarded by
     the edge function using the service role key, not the client).
   - UPDATE/DELETE: deny from the client (only edge functions with service
     role should mutate subscription state). We still expose update policy
     so a user could toggle nothing — but to keep it safe we scope the check
     to ownership AND effectively forbid by not granting it. We omit
     UPDATE/DELETE policies entirely so the anon/authenticated roles cannot
     mutate the row.
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'trialing',
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  grace_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_end timestamptz,
  canceled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscription" ON subscriptions;
CREATE POLICY "select_own_subscription"
  ON subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_subscription" ON subscriptions;
CREATE POLICY "insert_own_subscription"
  ON subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Note: no UPDATE / DELETE policies => client (anon + authenticated) cannot
-- mutate subscription rows. All mutations go through edge functions using
-- the service-role key, which bypasses RLS.
