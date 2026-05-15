import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { decrypt } from "@/lib/exchanges/encrypt";
import { syncExchange } from "@/lib/exchanges";
import type { ExchangeCredentials } from "@/lib/exchanges/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const connectionId: string | undefined = body.connectionId;

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
      // cTrader uses its own sync route (/api/ctrader/sync)
      if (conn.exchange === "ctrader" || conn.exchange === "mt5") {
        results.push({ connectionId: conn.id, exchange: conn.exchange, count: 0, skipped: true });
        continue;
      }

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
      };

      const result = await syncExchange(creds, lastSynced);
      results.push({ connectionId: conn.id, exchange: conn.exchange, count: result.trades.length, error: result.error });

      if (result.trades.length > 0) {
        const rows = result.trades.map((t) => ({
          user_id: user!.id,
          connection_id: conn.id,
          exchange: conn.exchange,
          trade_id: t.tradeId,
          symbol: t.symbol,
          side: t.side,
          pnl: t.pnl,
          fee: t.fee,
          closed_at: t.closedAt.toISOString(),
        }));

        for (let i = 0; i < rows.length; i += 500) {
          await supabase
            .from("trades")
            .upsert(rows.slice(i, i + 500), { onConflict: "connection_id,trade_id", ignoreDuplicates: true });
        }

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
