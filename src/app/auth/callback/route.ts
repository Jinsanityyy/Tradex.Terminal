import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { isOwnerEmail } from "@/lib/auth/owner";
import { PENDING_LICENSE_COOKIE } from "@/lib/gumroad/pending-license-cookie";
import { bindPendingLicense } from "@/lib/gumroad/bind-pending-license";

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
      // Mirrors the middleware's entitlement check, owner allowlist included —
      // without it the owner's first Google sign-in is deleted as an
      // unlicensed signup, and there is no second sign-in to recover from.
      const alreadyEntitled =
        isOwnerEmail(user.email) ||
        (sub?.status === "active" && (sub?.plan === "pro" || sub?.plan === "elite"));

      // A signup without a licence is a free account, not a rejected one. Still
      // bind a key when one is waiting, so a Gumroad buyer lands on pro rather
      // than having to redeem again after signing in.
      if (!alreadyEntitled && pendingLicenseKey) {
        await bindPendingLicense(user.id, pendingLicenseKey);
      }
    }
  }

  const res = NextResponse.redirect(`${origin}${destination}`);
  res.cookies.delete(PENDING_LICENSE_COOKIE);
  return res;
}
