import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";

export const dynamic = "force-dynamic";

/**
 * GET /api/ctrader/trades?connectionId=...&limit=500
 * Returns normalized trades from the `trades` table for the user's
 * cTrader connections. Also returns open positions from exchange_connections.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get("connectionId");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "500"), 2000);

    // Load connections
    let connQuery = supabase
      .from("exchange_connections")
      .select("id, label, ctrader_ctid, balance, equity, currency, open_positions, last_synced_at, ctrader_is_live")
      .eq("user_id", user.id)
      .eq("exchange", "ctrader")
      .eq("is_active", true);
    if (connectionId) connQuery = connQuery.eq("id", connectionId);

    const { data: connections, error: connErr } = await connQuery;
    if (connErr) throw connErr;

    // Load closed trades
    let tradesQuery = supabase
      .from("trades")
      .select("trade_id, symbol, side, pnl, fee, closed_at, connection_id")
      .eq("user_id", user.id)
      .eq("exchange", "ctrader")
      .order("closed_at", { ascending: false })
      .limit(limit);
    if (connectionId) tradesQuery = tradesQuery.eq("connection_id", connectionId);

    const { data: trades, error: tradesErr } = await tradesQuery;
    if (tradesErr) throw tradesErr;

    return NextResponse.json({ connections, trades });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
