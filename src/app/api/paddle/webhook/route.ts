import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

export const dynamic = "force-dynamic";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function verifySignature(rawBody: string, header: string | null): boolean {
  if (!header) return false;
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return false;

  // header format: ts=1234567890;h1=abc123...
  const parts = Object.fromEntries(header.split(";").map(p => p.split("=")));
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const signed = createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");

  return signed === h1;
}

function getPlanFromPriceId(priceId: string | undefined): "pro" | "free" {
  if (
    priceId === process.env.PADDLE_MONTHLY_PRICE_ID ||
    priceId === process.env.PADDLE_ANNUAL_PRICE_ID
  ) return "pro";
  return "free";
}

function periodEnd(endsAt: string | undefined): string {
  if (endsAt) return new Date(endsAt).toISOString();
  // fallback: 31 days from now
  return new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("Paddle-Signature");

    if (!verifySignature(rawBody, signatureHeader)) {
      console.warn("Paddle webhook: invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventType: string = body.event_type ?? "";
    const data = body.data ?? {};

    console.log("Paddle webhook:", eventType);

    const supabase = getServiceClient();

    switch (eventType) {

      // ── Subscription activated (first payment confirmed) ──────────
      case "subscription.activated": {
        const subId      = data.id as string;
        const customerId = data.customer_id as string | null ?? null;
        const userId     = data.custom_data?.user_id as string | null ?? null;
        const priceId    = data.items?.[0]?.price?.id as string | undefined;
        const endsAt     = data.current_billing_period?.ends_at as string | undefined;

        if (!userId) {
          console.warn("Paddle subscription.activated: missing user_id in custom_data");
          break;
        }

        const plan = getPlanFromPriceId(priceId);

        await supabase.from("subscriptions").upsert({
          user_id: userId,
          plan,
          status: "active",
          paypal_subscription_id: subId,   // reusing column for Paddle sub ID
          paypal_payer_id: customerId,      // reusing column for Paddle customer ID
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd(endsAt),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        break;
      }

      // ── Subscription updated (renewal, plan change, reactivation) ─
      case "subscription.updated": {
        const subId  = data.id as string;
        const status = data.status as string;
        const endsAt = data.current_billing_period?.ends_at as string | undefined;

        const mappedStatus =
          status === "active"   ? "active"    :
          status === "canceled" ? "cancelled" :
          status === "paused"   ? "suspended" :
          status === "past_due" ? "suspended" : "active";

        const update: Record<string, unknown> = {
          status: mappedStatus,
          updated_at: new Date().toISOString(),
        };
        if (endsAt) update.current_period_end = new Date(endsAt).toISOString();

        await supabase
          .from("subscriptions")
          .update(update)
          .eq("paypal_subscription_id", subId);

        break;
      }

      // ── Subscription canceled ─────────────────────────────────────
      case "subscription.canceled": {
        const subId = data.id as string;
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled", plan: "free", updated_at: new Date().toISOString() })
          .eq("paypal_subscription_id", subId);
        break;
      }

      // ── Subscription past due (payment failed) ────────────────────
      case "subscription.past_due":
      // ── Subscription paused ───────────────────────────────────────
      case "subscription.paused": {
        const subId = data.id as string;
        await supabase
          .from("subscriptions")
          .update({ status: "suspended", updated_at: new Date().toISOString() })
          .eq("paypal_subscription_id", subId);
        break;
      }

      // ── Transaction completed (subscription renewal payment) ──────
      case "transaction.completed": {
        const subId  = data.subscription_id as string | null;
        const endsAt = data.billing_period?.ends_at as string | undefined;
        if (!subId) break;

        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            ...(endsAt ? { current_period_end: new Date(endsAt).toISOString() } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("paypal_subscription_id", subId);

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Paddle webhook error:", err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
