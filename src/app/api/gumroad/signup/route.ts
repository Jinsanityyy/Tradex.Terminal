/**
 * POST /api/gumroad/signup
 *
 * Body: { email: string; password: string; licenseKey: string }
 *
 * TradeX has no free tier, so there is no path to a free account either: an
 * account only gets created once its license key verifies against Gumroad.
 * The purchase already proves the email is real, so the new account is
 * created pre-confirmed — no separate "verify your email" hop.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { verifyGumroadLicense, isGumroadConfigured } from "@/lib/gumroad/verify";

export const dynamic = "force-dynamic";

// No account exists yet to rate-limit by, so limit by IP instead.
const MAX_ATTEMPTS_PER_HOUR = 10;

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  if (!isGumroadConfigured()) {
    return NextResponse.json(
      { error: "Signup is not available right now." },
      { status: 503 }
    );
  }

  let body: { email?: unknown; password?: unknown; licenseKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email      = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password   = typeof body.password === "string" ? body.password : "";
  const licenseKey = typeof body.licenseKey === "string" ? body.licenseKey.trim() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  if (!licenseKey || licenseKey.length > 128) {
    return NextResponse.json({ error: "Enter the license key from your Gumroad receipt." }, { status: 400 });
  }

  const db = getServiceClient();
  if (!db) {
    console.error("[gumroad/signup] SUPABASE_SERVICE_ROLE_KEY missing");
    return NextResponse.json({ error: "Server is not configured for signups." }, { status: 503 });
  }

  const ip = clientIp(req);

  // ── Rate limit per IP ──────────────────────────────────────────────────────
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  if (ip) {
    const { count } = await db
      .from("gumroad_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", since);

    if ((count ?? 0) >= MAX_ATTEMPTS_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait an hour and try again." },
        { status: 429 }
      );
    }
  }

  async function logAttempt(row: {
    license_key: string;
    sale_id?: string | null;
    email?: string | null;
    result: "activated" | "rejected";
    reason?: string;
  }) {
    try {
      await db!.from("gumroad_redemptions").insert({ user_id: null, ip, ...row });
    } catch {
      /* audit log must never block signup */
    }
  }

  // ── Already bound to an existing account? ─────────────────────────────────
  const { data: existing } = await db
    .from("subscriptions")
    .select("user_id")
    .eq("gumroad_license_key", licenseKey)
    .maybeSingle();

  if (existing) {
    await logAttempt({ license_key: licenseKey, result: "rejected", reason: "already_bound" });
    return NextResponse.json(
      { error: "That license key is already linked to an account. Try signing in instead." },
      { status: 409 }
    );
  }

  // ── Verify with Gumroad ────────────────────────────────────────────────────
  const result = await verifyGumroadLicense(licenseKey);
  if (!result.ok) {
    await logAttempt({ license_key: licenseKey, result: "rejected", reason: result.reason });
    return NextResponse.json({ error: result.reason }, { status: result.retryable ? 502 : 400 });
  }

  // ── Create the account, pre-confirmed ──────────────────────────────────────
  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created?.user) {
    const isDuplicate = /already registered|already exists/i.test(createError?.message ?? "");
    await logAttempt({
      license_key: licenseKey, email: result.purchase.email, result: "rejected",
      reason: isDuplicate ? "email_taken" : (createError?.message ?? "create_user_failed"),
    });
    return NextResponse.json(
      {
        error: isDuplicate
          ? "An account with that email already exists. Try signing in instead."
          : "Could not create your account. Please try again.",
      },
      { status: isDuplicate ? 409 : 500 }
    );
  }

  const userId = created.user.id;

  // ── Bind the license and grant Pro ─────────────────────────────────────────
  const { error: upsertError } = await db
    .from("subscriptions")
    .upsert(
      {
        user_id:             userId,
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
    // A concurrent request won the license key race — don't leave a
    // zero-entitlement account behind.
    await db.auth.admin.deleteUser(userId);
    const isDuplicate = upsertError.code === "23505";
    await logAttempt({
      license_key: licenseKey, email: result.purchase.email, result: "rejected",
      reason: isDuplicate ? "race_already_bound" : upsertError.message,
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

  await logAttempt({
    license_key: licenseKey, sale_id: result.purchase.saleId ?? undefined,
    email: result.purchase.email, result: "activated",
  });

  return NextResponse.json({ ok: true });
}
