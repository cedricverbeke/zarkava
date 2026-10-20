# Stripe Integration — Setup TODO

This file is the single source of truth for the remaining Stripe setup steps.
The integration is already wired in code; the placeholders below must be
filled in before going live.

## Values to Replace

The following values are placeholders and must be updated before going live.

**Files containing placeholders:**

- [.env](.env)
- [supabase/functions/create-checkout-session/index.ts](supabase/functions/create-checkout-session/index.ts)

| Field | Current Value | What to Set |
|-------|---------------|-------------|
| `STRIPE_SECRET_KEY` (.env) | `sk_test_XXX_REPLACE_ME` | Your Stripe **test** secret key from https://dashboard.stripe.com/test/apikeys (starts with `sk_test_`). In production, swap for a live key (`sk_live_`). Bolt already stores this as a deployed secret — confirm via the Stripe settings panel. |
| `STRIPE_WEBHOOK_SECRET` (.env) | `whsec_XXX_REPLACE_ME` | Your Stripe webhook signing secret. Bolt registers the webhook endpoint automatically when you apply the Stripe integration; the secret is exposed in the Stripe Dashboard → Developers → Webhooks for the endpoint pointing at `https://<your-project>.supabase.co/functions/v1/stripe-webhook`. |
| `STRIPE_PRICE_ID` (.env + edge function) | `price_XXX_REPLACE_ME` | The Stripe **Price ID** for your 49 €/month subscription. Create it in Stripe Dashboard → Products → your product "prod_VTNvJu7GD3eP2l" → copy the `price_...` ID of the recurring monthly EUR price. The tarif stays editable in Stripe at any time. |

## Configured Parameters

These parameters were configured in Checkout Studio and are already set correctly in the edge function.

**Files containing these parameters:**

- [supabase/functions/create-checkout-session/index.ts](supabase/functions/create-checkout-session/index.ts)

| Parameter | Value |
|-----------|-------|
| `ui_mode` | `hosted_page` (Stripe SDK 17.x — pinned via `npm:stripe@17.7.0`) |
| `mode` | `subscription` |
| `billing_address_collection` | `auto` |
| `phone_number_collection` | `{ enabled: false }` |
| `automatic_tax` | `{ enabled: false }` |
| `allow_promotion_codes` | `false` |
| `payment_method_collection` | `always` |
| `submit_type` | `auto` |
| `success_url` | `${origin}?checkout=success&session_id={CHECKOUT_SESSION_ID}` |
| `cancel_url` | `${origin}?checkout=canceled` |
| `line_items` | `[{ price: STRIPE_PRICE_ID, quantity: 1 }]` |

## Setup and next steps

### 1. Environment variables (Bolt secrets panel)

Bolt already injects `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as edge-function secrets. You still need to add:

- `STRIPE_PRICE_ID` → the `price_...` ID from your Stripe product `prod_VTNvJu7GD3eP2l`.

Add it via the Bolt Stripe settings panel (gear icon → Stripe), or ask Bolt to "add the STRIPE_PRICE_ID secret".

### 2. Project structure (new files)

- `supabase/functions/create-checkout-session/index.ts` — authenticated edge function that creates a Stripe Checkout Session for the logged-in trainer and returns a hosted-checkout URL.
- `supabase/functions/stripe-webhook/index.ts` — public edge function (JWT verification off) that verifies the Stripe signature and updates the `subscriptions` table on `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, and `customer.subscription.deleted`.
- `supabase/migrations/…create_subscriptions_table` — creates the `subscriptions` table with RLS (read/insert own row; updates only via service role).
- `src/useSubscription.ts` — React hook that reads the trainer's subscription state and exposes `startCheckout()`.
- `src/components/SubscriptionGate.tsx` — full-screen gate shown when the trial has ended or the grace period has expired; includes a "S'abonner — 49 €/mois" button that redirects to Stripe Checkout.
- `src/App.tsx` — wraps the trainer shell in `SubscriptionGate` (demo users bypass the gate).

### 3. How the integration works

1. **Sign-up**: A new trainer creates an account for free. A `subscriptions` row is inserted with `status = 'trialing'` and `trial_ends_at = now + 30 days`.
2. **Trial**: For 30 days the trainer has full access. The gate does not block.
3. **Checkout**: When the trial ends (or at any time during the trial), the trainer clicks "S'abonner — 49 €/mois". The frontend calls `create-checkout-session`, which creates a Stripe hosted Checkout Session in `subscription` mode for the configured `STRIPE_PRICE_ID` and redirects there.
4. **Success**: Stripe redirects back to `${origin}?checkout=success`. The webhook receives `checkout.session.completed` and sets `status = 'active'`, stores the Stripe customer + subscription IDs, and clears any grace period.
5. **Recurring billing**: Each month `invoice.paid` keeps `status = 'active'`. If `invoice.payment_failed` fires, `status` becomes `past_due` and `grace_ends_at` is set to now + 14 days. During the 14-day grace the app still works but shows a warning banner. After the grace expires, the gate blocks access.
6. **Cancellation**: `customer.subscription.deleted` sets `status = 'canceled'` and the gate blocks access immediately.
7. **Data deletion after grace**: Per your policy, data is kept for 14 days after a failed payment, then deleted. The deletion itself is not automated in this first version — it must be triggered manually from Supabase or via a scheduled job you can ask Bolt to add. The gate prevents access after the grace period regardless.

### 4. Testing

Use Stripe **test mode** and these test cards:

| Card number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment (any future expiry, any CVC) |
| `4000 0000 0000 9995` | Card declined (simulates `invoice.payment_failed` → `past_due` + grace) |

Trigger a test webhook from the Stripe Dashboard → Developers → Webhooks → your endpoint → "Send test webhook" → choose `checkout.session.completed` or `invoice.payment_failed`.

### 5. Next steps

- Add the `STRIPE_PRICE_ID` secret (see step 1).
- (Optional) Ask Bolt to add a scheduled job that deletes a trainer's data 14 days after `grace_ends_at` if their subscription is still `past_due` or `canceled`.
- Update the monthly price anytime in Stripe Dashboard → Products → your product. The new price only applies to new subscriptions; existing subscribers keep their original price unless you migrate them in Stripe.
- Before going live: switch test keys to live keys in the Bolt Stripe settings panel, and use a real `STRIPE_PRICE_ID` from your live Stripe account.

## Resources

- Stripe support: https://support.stripe.com
- Stripe docs: https://docs.stripe.com/mcp
- Bolt Stripe integration guide: https://support.bolt.new/integrations/stripe
