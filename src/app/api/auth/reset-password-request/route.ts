import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const db = getServiceClient();
    if (!db) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    // Use admin.generateLink (type: "recovery") instead of resetPasswordForEmail.
    // This produces a token_hash-based link with no PKCE verifier — so it works
    // regardless of which browser opens the link (app WebView vs. system browser).
    const origin = req.headers.get("origin") ?? "https://tradexterminal.online";
    const { error } = await db.auth.admin.generateLink({
      type: "recovery",
      email: email.trim().toLowerCase(),
      options: {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      },
    });

    if (error) {
      // Don't reveal whether the email exists — return success either way.
      console.warn("[reset-password-request] generateLink error:", error.message);
    }

    // Always return success to prevent email enumeration.
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[reset-password-request] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
