import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { requireUser } from "@/lib/auth/entitlement";

export const dynamic = "force-dynamic";

/** One trade in a day's journal, whichever way it got here. */
export interface DayTrade {
  id: string;
  /** "manual", or the connector that journaled it: "mt5", "ctrader", "binance"... */
  source: string;
  /** Which connection: its label, plus the MT5 account when known. */
  sourceDetail: string | null;
  symbol: string;
  side: string;
  pnl: number;
  fee: number;
  /** ISO timestamp for synced trades; "HH:MM" (or null) for manual ones. */
  closedAt: string | null;
}

/**
 * GET /api/pnl/trades?date=YYYY-MM-DD
 * Every trade that makes up that day's calendar cell. Days are UTC, exactly
 * as /api/pnl buckets them, so the list always adds up to the cell.
 */
export async function GET(req: NextRequest) {
  const gate = await requireUser(req);
  if (!gate.ok) return gate.response;

  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ data: [] });

    const start = `${date}T00:00:00.000Z`;
    const end = new Date(Date.parse(start) + 86_400_000).toISOString();

    const [tradesRes, manualRes, connRes] = await Promise.all([
      supabase
        .from("trades")
        .select("id, exchange, connection_id, symbol, side, pnl, fee, closed_at")
        .eq("user_id", user.id)
        .gte("closed_at", start)
        .lt("closed_at", end)
        .order("closed_at", { ascending: true }),
      supabase
        .from("manual_trades")
        .select("id, symbol, direction, pnl, fees, close_time, created_at")
        .eq("user_id", user.id)
        .eq("date", date),
      // "*" so a database without mt5_account still answers.
      supabase.from("exchange_connections").select("*").eq("user_id", user.id),
    ]);
    if (tradesRes.error) throw tradesRes.error;
    if (manualRes.error) throw manualRes.error;

    const connections = new Map<string, { label: string; mt5_account?: string | null }>(
      (connRes.data ?? []).map((c) => [c.id, c]),
    );

    const synced: DayTrade[] = (tradesRes.data ?? []).map((t) => {
      const conn = connections.get(t.connection_id);
      const detail = [conn?.label, conn?.mt5_account].filter(Boolean).join(" · ");
      return {
        id: t.id,
        source: t.exchange,
        sourceDetail: detail || null,
        symbol: t.symbol,
        side: t.side,
        pnl: Number(t.pnl) || 0,
        fee: Number(t.fee) || 0,
        closedAt: t.closed_at,
      };
    });

    const manual: DayTrade[] = (manualRes.data ?? []).map((t) => ({
      id: t.id,
      source: "manual",
      sourceDetail: null,
      symbol: t.symbol,
      side: t.direction,
      pnl: Number(t.pnl) || 0,
      fee: Number(t.fees) || 0,
      closedAt: t.close_time ?? null,
    }));

    return NextResponse.json({ data: [...synced, ...manual] });
  } catch (err: any) {
    return NextResponse.json({ data: [], error: err.message }, { status: 500 });
  }
}
