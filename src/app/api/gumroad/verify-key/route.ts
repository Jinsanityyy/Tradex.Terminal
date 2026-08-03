/**
 * POST /api/gumroad/verify-key
 *
 * Body: { licenseKey: string }
 *
 * Pre-checks a license key before a Google OAuth signup. OAuth hands control
 * to Google/Supabase for the redirect, so there's no way to block account
 * creation itself the way /api/gumroad/signup does for email/password — the
 * best we can do is verify *before* sending the user to Google, stash the key
 * in a short-lived cookie, and have /auth/callback finish the binding (or
 * unwind the account) once the user comes back with a session.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { verifyGumroadLicense, isGumroadConfigured } from "@/lib/gumroad/verify";
import { PENDING_LICENSE_COOKIE } from "@/lib/gumroad/pending-license-cookie";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isGumroadConfigured()) {
    return NextResponse.json({ error: "Signup is not available right now." }, { status: 503 });
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
    return NextResponse.json({ error: "Server is not configured for signups." }, { status: 503 });
  }

  const { data: existing } = await db
    .from("subscriptions")
    .select("user_id")
    .eq("gumroad_license_key", licenseKey)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "That license key is already linked to an account. Try signing in instead." },
      { status: 409 }
    );
  }

  const result = await verifyGumroadLicense(licenseKey);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: result.retryable ? 502 : 400 });
  }

  const res = NextResponse.json({ ok: true });
  // Short-lived: only needs to survive the Google redirect round trip.
  res.cookies.set(PENDING_LICENSE_COOKIE, licenseKey, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
