import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  getWhopUserId,
  hasActiveMembership,
  createSessionToken,
} from "@/lib/whop";

export const runtime = "nodejs";

const COOKIE_NAME = "whop_session";
const SEVEN_DAYS  = 60 * 60 * 24 * 7;

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/access-denied?reason=oauth_error`);
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const [userId, active] = await Promise.all([
      getWhopUserId(accessToken),
      hasActiveMembership(accessToken),
    ]);

    if (!active) {
      return NextResponse.redirect(`${origin}/access-denied?reason=no_subscription`);
    }

    const sessionToken = await createSessionToken(userId);

    // Redirect to login (Supabase login page) after Whop gate passes
    const res = NextResponse.redirect(`${origin}/login`);
    res.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   SEVEN_DAYS,
      path:     "/",
    });
    return res;
  } catch (err) {
    console.error("[whop/callback]", err);
    return NextResponse.redirect(`${origin}/access-denied?reason=server_error`);
  }
}
