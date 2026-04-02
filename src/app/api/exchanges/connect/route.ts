import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/exchanges/encrypt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { exchange, label, apiKey, apiSecret, apiPassphrase, metaapiToken, metaapiAccountId } = body;

    if (!exchange || !label) {
      return NextResponse.json({ error: "exchange and label are required" }, { status: 400 });
    }

    // Validate exchange-specific required fields
    if (exchange === "mt5") {
      if (!metaapiToken || !metaapiAccountId) {
        return NextResponse.json({ error: "MetaApi token and account ID required for MT5" }, { status: 400 });
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
