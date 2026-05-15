import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env.CTRADER_CLIENT_ID ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * GET /api/ctrader/connect?label=MyAccount&isLive=true
 * Redirects the user to the Spotware OAuth authorization page.
 */
export async function GET(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!CLIENT_ID) {
    return NextResponse.json(
      { error: "CTRADER_CLIENT_ID is not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const label = searchParams.get("label") ?? "cTrader Account";
  const isLive = searchParams.get("isLive") !== "false";

  const redirectUri = `${APP_URL}/api/ctrader/callback`;
  const state = Buffer.from(
    JSON.stringify({ userId: user.id, label, isLive })
  ).toString("base64url");

  const oauthUrl = new URL("https://connect.spotware.com/apps/auth");
  oauthUrl.searchParams.set("client_id", CLIENT_ID);
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("scope", "trading");
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("state", state);

  return NextResponse.redirect(oauthUrl.toString());
}
