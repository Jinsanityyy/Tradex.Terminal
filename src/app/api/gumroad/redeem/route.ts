/**
 * POST /api/gumroad/redeem
 *
 * Body: { licenseKey: string }
 *
 * Verifies a Gumroad license key and binds it to the signed-in account,
 * upgrading them to Pro. A key can only ever activate one account — the
 * unique index on subscriptions.gumroad_license_key enforces that even if
 * two requests race.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { getServiceClient } from "@/lib/supabase/service";
import { verifyGumroadLicense, isGumroadConfigured } from "@/lib/gumroad/verify";

export const dynamic = "force-dynamic";

// Brute-force guard: a key is 30+ chars of entropy, but don't let someone
// grind the endpoint anyway.
const MAX_ATTEMPTS_PER_HOUR = 10;

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip");
}

async function logAttempt(
  db: NonNullable<ReturnType<typeof getServiceClient>>,
  row: {
    user_id: string;
    license_key: string;
    sale_id?: string | null;
    email?: string | null;
    result: "activated" | "rejected";
    reason?: string;
    ip?: string | null;
  }
) {
  try {
    await db.from("gumroad_redemptions").insert(row);
  } catch {
    /* audit log must never block a redemption */
  }
}

export async function POST(req: NextRequest) {
  if (!isGumroadConfigured()) {
    return NextResponse.json(
      { error: "License redemption is not available right now." },
      { status: 503 }
    );
  }

  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sign in to redeem your license." }, { status: 401 });
  }

  let body: { licenseKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const licenseKey = typeof body.licenseKey === "string" ? body.licenseKey.trim() : "";
  if (!licenseKey || licenseKey.length > 128) {
    return NextResponse.json({ error: "Enter the license key from your Gumroad receipt." }, { status: 400 });
  }

  const db = getServiceClient();
  if (!db) {
    console.error("[gumroad/redeem] SUPABASE_SERVICE_ROLE_KEY missing");
    return NextResponse.json({ error: "Server is not configured for redemptions." }, { status: 503 });
  }

  const ip = clientIp(req);

  // ── Rate limit per account ────────────────────────────────────────────────
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("gumroad_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);

  if ((count ?? 0) >= MAX_ATTEMPTS_PER_HOUR) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait an hour and try again." },
      { status: 429 }
    );
  }

  // ── Already bound to someone else? ────────────────────────────────────────
  const { data: existing } = await db
    .from("subscriptions")
    .select("user_id")
    .eq("gumroad_license_key", licenseKey)
    .maybeSingle();

  if (existing && existing.user_id !== user.id) {
    await logAttempt(db, {
      user_id: user.id, license_key: licenseKey, result: "rejected",
      reason: "already_bound", ip,
    });
    return NextResponse.json(
      { error: "That license key is already linked to another account." },
      { status: 409 }
    );
  }

  // ── Verify with Gumroad ───────────────────────────────────────────────────
  const result = await verifyGumroadLicense(licenseKey);

  if (!result.ok) {
    await logAttempt(db, {
      user_id: user.id, license_key: licenseKey, result: "rejected",
      reason: result.reason, ip,
    });
    return NextResponse.json({ error: result.reason }, { status: result.retryable ? 502 : 400 });
  }

  // ── Activate ──────────────────────────────────────────────────────────────
  const { error: upsertError } = await db
    .from("subscriptions")
    .upsert(
      {
        user_id:             user.id,
        plan:                "pro",
        status:              "active",
        source:              "gumroad",
        gumroad_license_key: licenseKey,
        gumroad_sale_id:     result.purchase.saleId,
        gumroad_product_id:  result.purchase.productId,
        gumroad_email:       result.purchase.email,
        trial_ends_at:       null,
        updated_at:          new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    // The unique index rejects a key that got bound by a concurrent request.
    const isDuplicate = upsertError.code === "23505";
    await logAttempt(db, {
      user_id: user.id, license_key: licenseKey, result: "rejected",
      reason: isDuplicate ? "race_already_bound" : upsertError.message, ip,
    });
    return NextResponse.json(
      {
        error: isDuplicate
          ? "That license key is already linked to another account."
          : "Could not activate your license. Please try again.",
      },
      { status: isDuplicate ? 409 : 500 }
    );
  }

  await logAttempt(db, {
    user_id: user.id, license_key: licenseKey,
    sale_id: result.purchase.saleId, email: result.purchase.email,
    result: "activated", ip,
  });

  return NextResponse.json({
    ok: true,
    plan: "pro",
    productName: result.purchase.productName,
  });
}
