import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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

  if (!error) {
    // For password recovery, always land on the reset-password page
    const destination = type === "recovery" ? "/reset-password" : next;
    return NextResponse.redirect(`${origin}${destination}`);
  }

  console.warn("[auth/callback] token exchange failed:", error?.message);
  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}
