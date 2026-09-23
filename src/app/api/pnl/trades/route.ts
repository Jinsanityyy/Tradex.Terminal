import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { requireUser } from "@/lib/auth/entitlement";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { localDate, localTime, resolveTimeZone, shiftDate } from "@/lib/trades/local-date";

export const dynamic = "force-dynamic";

/** One trade in the journal, whichever way it got here. */
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
  /** Close time as HH:MM in the viewer's timezone (null when unknown). */
  closeTime: string | null;
  /** Open time as HH:MM, when the trade has one (manual trades only, for now). */
  openTime: string | null;
  /** The calendar day it counts toward, in the viewer's timezone. */
  date: string;
}

const MAX_RECENT = 200;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type TradeRow = {
  id: string; exchange: string; connection_id: string; symbol: string;
  side: string; pnl: number; fee: number; closed_at: string;
};
type ManualRow = {
  id: string; date: string; symbol: string; direction: string; pnl: number;
  fees: number; open_time: string | null; close_time: string | null; created_at: string;
};

const TRADE_COLS = "id, exchange, connection_id, symbol, side, pnl, fee, closed_at";
const MANUAL_COLS = "id, date, symbol, direction, pnl, fees, open_time, close_time, created_at";

/**
 * All modes take ?tz=<IANA zone> and bucket days in it, exactly as /api/pnl
 * does, so every list adds up to the calendar.
 *
 * GET /api/pnl/trades?date=YYYY-MM-DD  every trade on that day
 * GET /api/pnl/trades?from=YYYY-MM-DD  every trade since that day (analytics)
 * GET /api/pnl/trades?limit=50         the newest trades, newest first
 */
export async function GET(req: NextRequest) {
  const gate = await requireUser(req);
  if (!gate.ok) return gate.response;

  const params = req.nextUrl.searchParams;
  const date = params.get("date");
  const from = params.get("from");
  if ((date !== null && !DATE_RE.test(date)) || (from !== null && !DATE_RE.test(from))) {
    return NextResponse.json({ error: "date and from must be YYYY-MM-DD" }, { status: 400 });
  }
  const tz = resolveTimeZone(params.get("tz"));
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), MAX_RECENT);

  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ data: [] });

    const trades = () => supabase.from("trades").select(TRADE_COLS).eq("user_id", user.id);
    const manuals = () => supabase.from("manual_trades").select(MANUAL_COLS).eq("user_id", user.id);

    let tradeRows: TradeRow[];
    let manualRows: ManualRow[];

    if (date || from) {
      // A local day spans at most UTC-14..UTC+14, so a one-day margin on each
      // side catches every candidate; the exact cut happens on localDate below.
      const lo = `${shiftDate((date ?? from)!, -1)}T00:00:00.000Z`;
      const hi = date ? `${shiftDate(date, 2)}T00:00:00.000Z` : null;
      [tradeRows, manualRows] = await Promise.all([
        fetchAllRows<TradeRow>((a, b) => {
          let q = trades().gte("closed_at", lo);
          if (hi) q = q.lt("closed_at", hi);
          return q.order("closed_at", { ascending: true }).order("id", { ascending: true }).range(a, b);
        }),
        fetchAllRows<ManualRow>((a, b) => {
          const q = date ? manuals().eq("date", date) : manuals().gte("date", from!);
          return q.order("date", { ascending: true }).order("id", { ascending: true }).range(a, b);
        }),
      ]);
    } else {
      const [t, m] = await Promise.all([
        trades().order("closed_at", { ascending: false }).limit(limit),
        manuals().order("date", { ascending: false }).order("created_at", { ascending: false }).limit(limit),
      ]);
      if (t.error) throw t.error;
      if (m.error) throw m.error;
      tradeRows = (t.data ?? []) as TradeRow[];
      manualRows = (m.data ?? []) as ManualRow[];
    }

    // "*" so a database without mt5_account still answers.
    const { data: conns } = await supabase.from("exchange_connections").select("*").eq("user_id", user.id);
    const connections = new Map<string, { label: string; mt5_account?: string | null }>(
      (conns ?? []).map((c) => [c.id, c]),
    );

    let synced: DayTrade[] = tradeRows.map((t) => {
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
        closeTime: localTime(t.closed_at, tz),
        openTime: null,
        date: localDate(t.closed_at, tz),
      };
    });
    if (date) synced = synced.filter((t) => t.date === date);
    if (from) synced = synced.filter((t) => t.date >= from);

    const manual: DayTrade[] = manualRows.map((t) => ({
      id: t.id,
      source: "manual",
      sourceDetail: null,
      symbol: t.symbol,
      side: t.direction,
      pnl: Number(t.pnl) || 0,
      fee: Number(t.fees) || 0,
      closedAt: t.close_time ?? null,
      closeTime: t.close_time ? t.close_time.slice(0, 5) : null,
      openTime: t.open_time ? t.open_time.slice(0, 5) : null,
      date: t.date,
    }));

    // Oldest first within a day; manual trades without a time sort to the start of it.
    const key = (t: DayTrade) => `${t.date}T${t.closeTime ?? "00:00"}`;
    const merged = [...synced, ...manual].sort((a, b) => key(a).localeCompare(key(b)));

    if (date || from) return NextResponse.json({ data: merged });
    return NextResponse.json({ data: merged.reverse().slice(0, limit) });
  } catch (err: any) {
    return NextResponse.json({ data: [], error: err.message }, { status: 500 });
  }
}
