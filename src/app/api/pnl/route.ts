import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { requireUser } from "@/lib/auth/entitlement";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { localDate, resolveTimeZone } from "@/lib/trades/local-date";

export const dynamic = "force-dynamic";

export interface DailyPnL {
  date: string;   // YYYY-MM-DD
  pnl: number;
  trades: number;
  wins: number;
  fees: number;
  /** Where that day's trades came from: "mt5", "manual", "ctrader"... */
  sources: string[];
}

export interface MonthlyPnL {
  year: number;
  month: number;  // 1-12
  pnl: number;
  trades: number;
  wins: number;
}

export interface PnLData {
  daily: DailyPnL[];
  monthly: MonthlyPnL[];
  connections: { id: string; exchange: string; label: string }[];
}

export async function GET(req: NextRequest) {
  const gate = await requireUser(req);
  if (!gate.ok) return gate.response;

  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ daily: [], monthly: [], connections: [] });

    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get("connectionId");
    // Days are the trader's days: ?tz=Asia/Manila puts a 07:00 close on that date.
    const tz = resolveTimeZone(searchParams.get("tz"));

    const { data: connections } = await supabase
      .from("exchange_connections")
      .select("id, exchange, label")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const since = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    type TradeRow = { pnl: number; fee: number; closed_at: string; connection_id: string; exchange: string };
    type ManualRow = { pnl: number; fees: number; date: string };

    // Paged: a plain select stops at 1000 rows and would silently drop trades.
    const [trades, manualTrades] = await Promise.all([
      fetchAllRows<TradeRow>((from, to) => {
        let q = supabase
          .from("trades")
          .select("pnl, fee, closed_at, connection_id, exchange")
          .eq("user_id", user.id)
          .gte("closed_at", since)
          .order("closed_at", { ascending: true })
          .order("id", { ascending: true });
        if (connectionId) q = q.eq("connection_id", connectionId);
        return q.range(from, to);
      }),
      // Manual trades belong to no connection, so a per-connection view leaves them out.
      connectionId
        ? Promise.resolve([] as ManualRow[])
        : fetchAllRows<ManualRow>((from, to) =>
            supabase
              .from("manual_trades")
              .select("pnl, fees, date")
              .eq("user_id", user.id)
              .gte("date", since.split("T")[0])
              .order("date", { ascending: true })
              .order("id", { ascending: true })
              .range(from, to)),
    ]);

    const dailyMap = new Map<string, DailyPnL>();
    const monthlyMap = new Map<string, MonthlyPnL>();

    function upsertDay(date: string, pnl: number, fee: number, source: string) {
      const d = new Date(date + "T00:00:00Z");
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      const monthKey = `${year}-${month}`;

      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, pnl: 0, trades: 0, wins: 0, fees: 0, sources: [] });
      }
      const day = dailyMap.get(date)!;
      if (source && !day.sources.includes(source)) day.sources.push(source);
      day.pnl   = parseFloat((day.pnl   + pnl).toFixed(4));
      day.fees  = parseFloat((day.fees  + fee).toFixed(4));
      day.trades += 1;
      if (pnl > 0) day.wins += 1;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { year, month, pnl: 0, trades: 0, wins: 0 });
      }
      const mo = monthlyMap.get(monthKey)!;
      mo.pnl    = parseFloat((mo.pnl + pnl).toFixed(4));
      mo.trades += 1;
      if (pnl > 0) mo.wins += 1;
    }

    for (const t of trades) {
      upsertDay(localDate(t.closed_at, tz), Number(t.pnl) || 0, Number(t.fee) || 0, t.exchange);
    }

    for (const t of manualTrades) {
      upsertDay(t.date, Number(t.pnl) || 0, Number(t.fees) || 0, "manual");
    }

    return NextResponse.json({
      daily: Array.from(dailyMap.values()),
      monthly: Array.from(monthlyMap.values()),
      connections: connections ?? [],
    } satisfies PnLData);
  } catch (err: any) {
    return NextResponse.json({ daily: [], monthly: [], connections: [], error: err.message });
  }
}
