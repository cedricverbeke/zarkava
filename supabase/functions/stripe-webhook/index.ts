import Stripe from "npm:stripe@17.7.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Stripe-Signature",
};

const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const stripe = new Stripe(stripeSecret);
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function upsertSubscription(userId: string, fields: Record<string, unknown>) {
  const { error } = await admin
    .from("subscriptions")
    .upsert({ user_id: userId, updated_at: new Date().toISOString(), ...fields }, { onConflict: "user_id" });
  if (error) console.error("upsert error:", error.message);
}

function graceEnds14DaysFromNow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature") ?? "";
    const body = await req.text();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      return new Response(`Webhook signature failed: ${err instanceof Error ? err.message : "unknown"}`, {
        status: 400,
        headers: corsHeaders,
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;
        const fullSub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = fullSub.items.data[0]?.price?.id;
        const userId = session.metadata?.user_id ?? fullSub.metadata?.user_id;
        if (!userId) {
          console.warn("checkout.session.completed: no user_id in metadata");
          break;
        }
        await upsertSubscription(userId, {
          status: "active",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          current_period_end: fullSub.current_period_end
            ? new Date(fullSub.current_period_end * 1000).toISOString()
            : null,
          grace_ends_at: null,
          canceled_at: null,
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = sub.metadata?.user_id;
        if (!userId) break;
        await upsertSubscription(userId, {
          status: "active",
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          grace_ends_at: null,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = sub.metadata?.user_id;
        if (!userId) break;
        await upsertSubscription(userId, {
          status: "past_due",
          grace_ends_at: graceEnds14DaysFromNow(),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) break;
        await upsertSubscription(userId, {
          status: "canceled",
          canceled_at: new Date().toISOString(),
        });
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
