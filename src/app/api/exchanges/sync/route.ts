import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/exchanges/encrypt";
import { syncExchange } from "@/lib/exchanges";
import type { ExchangeCredentials } from "@/lib/exchanges/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const connectionId: string | undefined = body.connectionId;

    // Fetch connection(s) for this user
    let query = supabase
      .from("exchange_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (connectionId) query = query.eq("id", connectionId);

    const { data: connections, error } = await query;
    if (error) throw error;
    if (!connections?.length) {
      return NextResponse.json({ error: "No active connections found" }, { status: 404 });
    }

    const results = [];

    for (const conn of connections) {
      // Figure out last synced time (sync 90 days on first sync, otherwise from last sync)
      const lastSynced = conn.last_synced_at
        ? new Date(conn.last_synced_at).getTime()
        : Date.now() - 90 * 24 * 60 * 60 * 1000;

      const creds: ExchangeCredentials = {
        id: conn.id,
        exchange: conn.exchange,
        label: conn.label,
        apiKey: conn.api_key ? decrypt(conn.api_key) : "",
        apiSecret: conn.api_secret ? decrypt(conn.api_secret) : "",
        apiPassphrase: conn.api_passphrase ? decrypt(conn.api_passphrase) : undefined,
        metaapiToken: conn.metaapi_token ? decrypt(conn.metaapi_token) : undefined,
        metaapiAccountId: conn.metaapi_account_id ?? undefined,
      };

      const result = await syncExchange(creds, lastSynced);
      results.push({ connectionId: conn.id, exchange: conn.exchange, count: result.trades.length, error: result.error });

      if (result.trades.length > 0) {
        // Upsert trades (ignore duplicates via UNIQUE constraint)
        const rows = result.trades.map((t) => ({
          user_id: user.id,
          connection_id: conn.id,
          exchange: conn.exchange,
          trade_id: t.tradeId,
          symbol: t.symbol,
          side: t.side,
          pnl: t.pnl,
          fee: t.fee,
          closed_at: t.closedAt.toISOString(),
        }));

        // Batch insert in chunks of 500
        for (let i = 0; i < rows.length; i += 500) {
          await supabase
            .from("trades")
            .upsert(rows.slice(i, i + 500), { onConflict: "connection_id,trade_id", ignoreDuplicates: true });
        }

        // Update last_synced_at
        await supabase
          .from("exchange_connections")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", conn.id);
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
