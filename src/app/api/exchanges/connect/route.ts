import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { encrypt } from "@/lib/exchanges/encrypt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized — please log out and log back in" }, { status: 401 });

    const body = await req.json();
    const { exchange, label, apiKey, apiSecret, apiPassphrase, metaapiToken, metaapiAccountId } = body;

    if (!exchange || !label) {
      return NextResponse.json({ error: "exchange and label are required" }, { status: 400 });
    }

    if (exchange === "mt5" || exchange === "ctrader") {
      if (!metaapiToken || !metaapiAccountId) {
        return NextResponse.json({ error: "MetaApi token and account ID required for MT5/cTrader" }, { status: 400 });
      }
    } else {
      if (!apiKey || !apiSecret) {
        return NextResponse.json({ error: "API key and secret required" }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("exchange_connections")
      .insert({
        user_id: user.id,
        exchange,
        label,
        api_key: apiKey ? encrypt(apiKey) : "",
        api_secret: apiSecret ? encrypt(apiSecret) : "",
        api_passphrase: apiPassphrase ? encrypt(apiPassphrase) : null,
        metaapi_token: metaapiToken ? encrypt(metaapiToken) : null,
        metaapi_account_id: metaapiAccountId ?? null,
      })
      .select("id, exchange, label, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
