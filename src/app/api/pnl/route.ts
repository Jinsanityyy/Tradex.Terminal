import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export interface DailyPnL {
  date: string;   // YYYY-MM-DD
  pnl: number;
  trades: number;
  wins: number;
  fees: number;
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
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get("connectionId"); // optional filter

    // Fetch connections
    const { data: connections } = await supabase
      .from("exchange_connections")
      .select("id, exchange, label")
      .eq("user_id", user.id)
      .eq("is_active", true);

    // Fetch all trades (last 2 years)
    const since = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    let query = supabase
      .from("trades")
      .select("pnl, fee, closed_at, connection_id")
      .eq("user_id", user.id)
      .gte("closed_at", since)
      .order("closed_at", { ascending: true });

    if (connectionId) query = query.eq("connection_id", connectionId);

    const { data: trades, error } = await query;
    if (error) throw error;

    // Aggregate daily P&L
    const dailyMap = new Map<string, DailyPnL>();
    const monthlyMap = new Map<string, MonthlyPnL>();

    for (const t of (trades ?? [])) {
      const d = new Date(t.closed_at);
      // Use UTC date as key so it's consistent
      const date = d.toISOString().split("T")[0];
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      const monthKey = `${year}-${month}`;

      // Daily
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, pnl: 0, trades: 0, wins: 0, fees: 0 });
      }
      const day = dailyMap.get(date)!;
      day.pnl = parseFloat((day.pnl + (t.pnl ?? 0)).toFixed(4));
      day.fees = parseFloat((day.fees + (t.fee ?? 0)).toFixed(4));
      day.trades += 1;
      if ((t.pnl ?? 0) > 0) day.wins += 1;

      // Monthly
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { year, month, pnl: 0, trades: 0, wins: 0 });
      }
      const mo = monthlyMap.get(monthKey)!;
      mo.pnl = parseFloat((mo.pnl + (t.pnl ?? 0)).toFixed(4));
      mo.trades += 1;
      if ((t.pnl ?? 0) > 0) mo.wins += 1;
    }

    return NextResponse.json({
      daily: Array.from(dailyMap.values()),
      monthly: Array.from(monthlyMap.values()),
      connections: connections ?? [],
    } satisfies PnLData);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
