import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { encrypt } from "@/lib/exchanges/encrypt";
import { exchangeCodeForTokens, fetchAccounts } from "@/lib/ctrader/service";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env.CTRADER_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.CTRADER_CLIENT_SECRET ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * GET /api/ctrader/callback?code=...&state=...
 * Called by Spotware after the user authorizes. Exchanges the code for
 * tokens, fetches the trading account list, and stores everything in Supabase.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateB64 = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/pnl-calendar?error=${encodeURIComponent(oauthError)}`
    );
  }

  if (!code || !stateB64) {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/pnl-calendar?error=missing_params`
    );
  }

  // Decode state
  let stateData: { userId: string; label: string; isLive: boolean };
  try {
    stateData = JSON.parse(Buffer.from(stateB64, "base64url").toString("utf8"));
  } catch {
    return NextResponse.redirect(
      `${APP_URL}/dashboard/pnl-calendar?error=invalid_state`
    );
  }

  try {
    const redirectUri = `${APP_URL}/api/ctrader/callback`;

    // 1. Exchange auth code for tokens
    const { accessToken, refreshToken } = await exchangeCodeForTokens(
      code,
      CLIENT_ID,
      CLIENT_SECRET,
      redirectUri
    );

    // 2. Fetch the list of trading accounts linked to this access token
    //    Try live first; if no live accounts, fall back to demo
    let accounts = await fetchAccounts(accessToken, CLIENT_ID, CLIENT_SECRET, stateData.isLive).catch(() => []);
    if (accounts.length === 0) {
      accounts = await fetchAccounts(accessToken, CLIENT_ID, CLIENT_SECRET, !stateData.isLive).catch(() => []);
    }

    if (accounts.length === 0) {
      return NextResponse.redirect(
        `${APP_URL}/dashboard/pnl-calendar?error=no_accounts`
      );
    }

    // Pick the first live account (or the first available if none are live)
    const account = accounts.find(a => a.isLive) ?? accounts[0];
    const isLiveAccount = account.isLive;

    // 3. Store connection in Supabase
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (pairs) => pairs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
    );

    const { error } = await supabase.from("exchange_connections").upsert(
      {
        user_id: stateData.userId,
        exchange: "ctrader",
        label: stateData.label,
        api_key: "",
        api_secret: "",
        ctrader_access_token: encrypt(accessToken),
        ctrader_refresh_token: encrypt(refreshToken),
        ctrader_ctid: account.ctid,
        ctrader_is_live: isLiveAccount,
        is_active: true,
      },
      { onConflict: "user_id,exchange,ctrader_ctid" }
    );

    if (error) throw error;

    return NextResponse.redirect(
      `${APP_URL}/dashboard/pnl-calendar?connected=ctrader`
    );
  } catch (err: any) {
    console.error("cTrader callback error:", err);
    return NextResponse.redirect(
      `${APP_URL}/dashboard/pnl-calendar?error=${encodeURIComponent(err.message ?? "callback_error")}`
    );
  }
}
