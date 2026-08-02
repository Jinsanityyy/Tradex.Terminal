/**
 * POST /api/gumroad/webhook?token=<GUMROAD_WEBHOOK_SECRET>
 *
 * Gumroad Ping / resource-subscription receiver. Used to REVOKE access when a
 * sale is refunded, disputed, or a membership ends — without it, a refunded
 * buyer keeps Pro forever.
 *
 * Gumroad Ping has no request signature, so the endpoint is protected by a
 * shared secret in the query string. Configure the ping URL in Gumroad as:
 *   https://<your-domain>/api/gumroad/webhook?token=<GUMROAD_WEBHOOK_SECRET>
 *
 * The payload is treated as an untrusted trigger only: we re-verify the
 * license against Gumroad's API rather than believing the POST body.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { verifyGumroadLicense } from "@/lib/gumroad/verify";

export const dynamic = "force-dynamic";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  const secret = process.env.GUMROAD_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[gumroad/webhook] GUMROAD_WEBHOOK_SECRET not set — rejecting");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const token =
    req.nextUrl.searchParams.get("token") ?? req.headers.get("x-gumroad-token") ?? "";
  if (!timingSafeEqual(token, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Gumroad posts application/x-www-form-urlencoded.
  let licenseKey = "";
  let saleId = "";
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const j = (await req.json()) as Record<string, unknown>;
      licenseKey = typeof j.license_key === "string" ? j.license_key : "";
      saleId     = typeof j.sale_id === "string" ? j.sale_id : "";
    } else {
      const form = await req.formData();
      licenseKey = String(form.get("license_key") ?? "");
      saleId     = String(form.get("sale_id") ?? "");
    }
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!licenseKey && !saleId) {
    // Nothing actionable — ack so Gumroad stops retrying.
    return NextResponse.json({ ok: true, note: "no license_key or sale_id" });
  }

  const db = getServiceClient();
  if (!db) {
    console.error("[gumroad/webhook] service client unavailable");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  // Locate the account this sale activated.
  const query = licenseKey
    ? db.from("subscriptions").select("user_id, gumroad_license_key").eq("gumroad_license_key", licenseKey)
    : db.from("subscriptions").select("user_id, gumroad_license_key").eq("gumroad_sale_id", saleId);

  const { data: sub } = await query.maybeSingle();
  if (!sub) {
    // Sale exists on Gumroad but nobody redeemed it here yet. Nothing to do.
    return NextResponse.json({ ok: true, note: "no linked account" });
  }

  const keyToCheck = sub.gumroad_license_key ?? licenseKey;
  if (!keyToCheck) return NextResponse.json({ ok: true, note: "no key to verify" });

  // Re-verify rather than trusting the ping body.
  const result = await verifyGumroadLicense(keyToCheck);

  if (result.ok) {
    // Still a good standing purchase — leave entitlement alone.
    return NextResponse.json({ ok: true, action: "none" });
  }

  if (result.retryable) {
    // Gumroad was unreachable. Do NOT revoke on a transient error; 503 makes
    // Gumroad retry the ping later.
    return NextResponse.json({ error: "Verification unavailable" }, { status: 503 });
  }

  // Genuinely no longer entitled (refunded / disputed / membership ended).
  await db
    .from("subscriptions")
    .update({
      plan:       "free",
      status:     "active",
      source:     null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", sub.user_id);

  console.log(`[gumroad/webhook] revoked access for user ${sub.user_id}: ${result.reason}`);

  return NextResponse.json({ ok: true, action: "revoked", reason: result.reason });
}
