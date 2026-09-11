/**
 * POST /api/revenuecat/webhook
 *
 * Grants and revokes Pro for Google Play purchases. The in-app purchase itself
 * only tells the device it succeeded — this is what makes it true server-side,
 * so without it a paying customer stays locked out.
 *
 * RevenueCat signs nothing; it sends whatever Authorization header value is
 * configured alongside the webhook URL in its dashboard, so that shared secret
 * is the whole check. Configure both to match REVENUECAT_WEBHOOK_SECRET.
 *
 * `app_user_id` is the Supabase user id, because the SDK is configured with
 * `appUserID: userId` (see src/lib/billing/revenuecat.ts).
 */

import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// CANCELLATION is deliberately absent: it only records that auto-renew was
// switched off, and the customer keeps access until the period ends — that is
// what EXPIRATION reports. Revoking on cancellation would cut them off early.
const GRANTING = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE",
  "SUBSCRIPTION_EXTENDED",
]);

export async function POST(req: NextRequest) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[revenuecat/webhook] REVENUECAT_WEBHOOK_SECRET not set — rejecting");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  if (!timingSafeEqual(req.headers.get("authorization") ?? "", secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceClient();
  if (!db) {
    console.error("[revenuecat/webhook] SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  let event: Record<string, unknown>;
  try {
    const body = (await req.json()) as { event?: Record<string, unknown> };
    event = body.event ?? {};
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const type = typeof event.type === "string" ? event.type : "";
  const userId = typeof event.app_user_id === "string" ? event.app_user_id : "";

  // Purchases made before the app identified the user carry a generated id that
  // matches no row of ours; there is nothing to grant until they sign in.
  if (!userId || userId.startsWith("$RCAnonymousID")) {
    return NextResponse.json({ ok: true, skipped: "anonymous" });
  }

  const grants = GRANTING.has(type);
  const revokes = type === "EXPIRATION";
  if (!grants && !revokes) {
    return NextResponse.json({ ok: true, skipped: type || "unknown" });
  }

  if (grants) {
    const expiresMs = typeof event.expiration_at_ms === "number" ? event.expiration_at_ms : null;
    const { error } = await db
      .from("subscriptions")
      .update({
        plan:                       "pro",
        status:                     "active",
        source:                     "revenuecat",
        revenuecat_subscription_id: typeof event.product_id === "string" ? event.product_id : null,
        current_period_end:         expiresMs ? new Date(expiresMs).toISOString() : null,
        trial_ends_at:              null,
        updated_at:                 new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("[revenuecat/webhook] grant failed:", error.message);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    console.log(`[revenuecat/webhook] ${type} granted pro to ${userId}`);
    return NextResponse.json({ ok: true, granted: true });
  }

  // Only wind back what RevenueCat granted. A Gumroad buyer who also once
  // subscribed on Play must not lose the access their licence still pays for.
  const { error } = await db
    .from("subscriptions")
    .update({
      plan:       "free",
      status:     "active",
      source:     null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("source", "revenuecat");

  if (error) {
    console.error("[revenuecat/webhook] revoke failed:", error.message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  console.log(`[revenuecat/webhook] ${type} revoked pro from ${userId}`);
  return NextResponse.json({ ok: true, revoked: true });
}
