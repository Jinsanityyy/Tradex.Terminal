import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Use service role key  -  bypasses RLS so webhook can write subscriptions
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getPlanFromPlanId(planId: string): "pro" | "elite" | "free" {
  if (planId === process.env.NEXT_PUBLIC_PAYPAL_ELITE_PLAN_ID) return "elite";
  if (planId === process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID) return "pro";
  return "free";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType: string = body.event_type ?? "";
    const resource = body.resource ?? {};

    console.log("PayPal webhook:", eventType);

    const supabase = getServiceClient();

    switch (eventType) {

      // ── Subscription activated (first payment) ────────────────────
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        const subId   = resource.id;
        const planId  = resource.plan_id;
        const payerId = resource.subscriber?.payer_id ?? null;
        const userId  = resource.custom_id ?? null; // we pass user_id when creating subscription

        if (!userId) break;

        const plan = getPlanFromPlanId(planId);
        const periodEnd = resource.billing_info?.next_billing_time
          ? new Date(resource.billing_info.next_billing_time)
          : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);

        await supabase.from("subscriptions").upsert({
          user_id: userId,
          plan,
          status: "active",
          paypal_subscription_id: subId,
          paypal_payer_id: payerId,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        break;
      }

      // ── Payment completed (renewal) ───────────────────────────────
      case "PAYMENT.SALE.COMPLETED":
      case "BILLING.SUBSCRIPTION.RENEWED": {
        const subId = resource.billing_agreement_id ?? resource.id;
        if (!subId) break;

        const nextBilling = resource.billing_info?.next_billing_time;
        const updateData: Record<string, unknown> = {
          status: "active",
          updated_at: new Date().toISOString(),
        };
        if (nextBilling) updateData.current_period_end = new Date(nextBilling).toISOString();

        await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("paypal_subscription_id", subId);

        break;
      }

      // ── Subscription cancelled ────────────────────────────────────
      case "BILLING.SUBSCRIPTION.CANCELLED": {
        const subId = resource.id;
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("paypal_subscription_id", subId);
        break;
      }

      // ── Subscription suspended (payment failed) ───────────────────
      case "BILLING.SUBSCRIPTION.SUSPENDED":
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED": {
        const subId = resource.id;
        await supabase
          .from("subscriptions")
          .update({ status: "suspended", updated_at: new Date().toISOString() })
          .eq("paypal_subscription_id", subId);
        break;
      }

      // ── Subscription expired ──────────────────────────────────────
      case "BILLING.SUBSCRIPTION.EXPIRED": {
        const subId = resource.id;
        await supabase
          .from("subscriptions")
          .update({ plan: "free", status: "expired", updated_at: new Date().toISOString() })
          .eq("paypal_subscription_id", subId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("PayPal webhook error:", err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
