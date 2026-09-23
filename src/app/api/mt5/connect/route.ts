import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { requirePro } from "@/lib/auth/entitlement";
import { generateWebhookToken, hashWebhookToken } from "@/lib/mt5/webhook";

export const dynamic = "force-dynamic";

/**
 * POST /api/mt5/connect
 *   { label }         -  create an MT5 connection and issue its EA token
 *   { connectionId }  -  issue a new token for an existing one (the old one stops working)
 *
 * The token is returned exactly once; only its hash is stored. Rotating keeps
 * the connection, so already-journaled trades stay put.
 */
export async function POST(req: NextRequest) {
  const gate = await requirePro(req);
  if (!gate.ok) return gate.response;

  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized  -  please log out and log back in" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const token = generateWebhookToken();
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin}/api/mt5/webhook`;

    if (typeof body.connectionId === "string") {
      const { data, error } = await supabase
        .from("exchange_connections")
        .update({ webhook_token_hash: hashWebhookToken(token) })
        .eq("id", body.connectionId)
        .eq("user_id", user.id)
        .eq("exchange", "mt5")
        .select("id, exchange, label, is_active, last_synced_at, created_at")
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "MT5 connection not found" }, { status: 404 });
      return NextResponse.json({ data, token, webhookUrl });
    }

    const label = typeof body.label === "string" ? body.label.trim().slice(0, 60) : "";
    if (!label) return NextResponse.json({ error: "label is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("exchange_connections")
      .insert({
        user_id: user.id,
        exchange: "mt5",
        label,
        api_key: "",
        api_secret: "",
        webhook_token_hash: hashWebhookToken(token),
      })
      .select("id, exchange, label, is_active, last_synced_at, created_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ data, token, webhookUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
