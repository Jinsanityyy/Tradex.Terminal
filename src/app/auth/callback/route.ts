import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { verifyGumroadLicense } from "@/lib/gumroad/verify";
import { PENDING_LICENSE_COOKIE } from "@/lib/gumroad/pending-license-cookie";

/**
 * Binds a pre-verified license key (see /api/gumroad/verify-key) to a user
 * that just landed here via Google OAuth. Re-verifies against Gumroad rather
 * than trusting the earlier check, since time has passed and the key could
 * have been bound or refunded in between.
 */
async function bindPendingLicense(userId: string, licenseKey: string): Promise<boolean> {
  const db = getServiceClient();
  if (!db) return false;

  const { data: existing } = await db
    .from("subscriptions")
    .select("user_id")
    .eq("gumroad_license_key", licenseKey)
    .maybeSingle();
  if (existing && existing.user_id !== userId) return false;

  const result = await verifyGumroadLicense(licenseKey);
  if (!result.ok) return false;

  const { error } = await db.from("subscriptions").upsert(
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
  if (!error) {
    await db.from("gumroad_redemptions").insert({
      user_id: userId, license_key: licenseKey, sale_id: result.purchase.saleId,
      email: result.purchase.email, result: "activated", reason: "google_oauth",
    }).catch(() => {});
  }
  return !error;
}

/** True when this session's first-ever sign-in is the one happening right now. */
function isBrandNewSignIn(user: { created_at: string; last_sign_in_at: string | null }): boolean {
  if (!user.last_sign_in_at) return true;
  return Math.abs(new Date(user.last_sign_in_at).getTime() - new Date(user.created_at).getTime()) < 5000;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code       = searchParams.get("code");        // PKCE flow
  const tokenHash  = searchParams.get("token_hash");  // Email OTP flow
  const type       = searchParams.get("type");        // "recovery" | "signup" | etc.
  const next       = searchParams.get("next") ?? "/dashboard";

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  let error: { message: string } | null = null;

  if (code) {
    // PKCE flow — exchange the one-time code for a session
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    // Email OTP flow — verify the token hash directly
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "recovery" | "signup" | "invite" | "email" | "magiclink" | "email_change",
    }));
  }

  if (error) {
    console.warn("[auth/callback] token exchange failed:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  const destination = type === "recovery" ? "/reset-password" : next;
  const pendingLicenseKey = cookieStore.get(PENDING_LICENSE_COOKIE)?.value;

  // ── Google OAuth: no free tier means no free account, but OAuth creates
  // the Supabase user as part of the redirect — there's no gating that
  // before the fact. Finish (or unwind) the entitlement here instead. ─────
  const isOAuth = !!code && !tokenHash;

  if (isOAuth) {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const db = getServiceClient();
      const { data: sub } = db
        ? await db.from("subscriptions").select("plan, status").eq("user_id", user.id).maybeSingle()
        : { data: null };
      const alreadyEntitled = sub?.status === "active" && (sub?.plan === "pro" || sub?.plan === "elite");

      if (!alreadyEntitled) {
        const bound = pendingLicenseKey ? await bindPendingLicense(user.id, pendingLicenseKey) : false;

        if (!bound && isBrandNewSignIn(user)) {
          // No valid key for a brand-new signup — don't leave a free account
          // behind just because Google, not us, created it.
          const admin = getServiceClient();
          if (admin) await admin.auth.admin.deleteUser(user.id).catch(() => {});
          await supabase.auth.signOut();
          const res = NextResponse.redirect(`${origin}/login?error=license_required&mode=signup`);
          res.cookies.delete(PENDING_LICENSE_COOKIE);
          return res;
        }
      }
    }
  }

  const res = NextResponse.redirect(`${origin}${destination}`);
  res.cookies.delete(PENDING_LICENSE_COOKIE);
  return res;
}
