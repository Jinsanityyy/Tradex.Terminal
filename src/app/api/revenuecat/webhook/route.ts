import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// RevenueCat sends a shared secret header for verification
function verifySecret(req: NextRequest): boolean {
  const secret = req.headers.get("authorization");
  return secret === process.env.REVENUECAT_WEBHOOK_SECRET;
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const event = body.event ?? {};
    const type: string = event.type ?? "";
    const appUserId: string = event.app_user_id ?? "";

    if (!appUserId) return NextResponse.json({ received: true });

    const supabase = getServiceClient();
    const now = new Date().toISOString();

    switch (type) {
      // ── New subscription or trial started ────────────────────────────────────
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION": {
        const periodEnd = event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();

        await supabase.from("subscriptions").upsert({
          user_id: appUserId,
          plan: "pro",
          status: "active",
          revenuecat_subscription_id: event.product_id ?? null,
          current_period_start: event.purchased_at_ms
            ? new Date(event.purchased_at_ms).toISOString()
            : now,
          current_period_end: periodEnd,
          updated_at: now,
        }, { onConflict: "user_id" });
        break;
      }

      // ── Subscription cancelled (still active until period end) ────────────────
      case "CANCELLATION": {
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: now })
          .eq("user_id", appUserId);
        break;
      }

      // ── Billing issue / payment failed ────────────────────────────────────────
      case "BILLING_ISSUE": {
        await supabase
          .from("subscriptions")
          .update({ status: "suspended", updated_at: now })
          .eq("user_id", appUserId);
        break;
      }

      // ── Subscription expired ──────────────────────────────────────────────────
      case "EXPIRATION": {
        await supabase
          .from("subscriptions")
          .update({ plan: "free", status: "expired", updated_at: now })
          .eq("user_id", appUserId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("RevenueCat webhook error:", err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
