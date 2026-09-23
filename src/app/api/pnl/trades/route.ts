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

  // Details: MT5 EA v1.02+ (null for older EAs, exchanges and manual trades).
  volume: number | null;
  openPrice: number | null;
  closePrice: number | null;
  sl: number | null;
  tp: number | null;
  /** Money at risk at the initial stop; pnl / risk = R. */
  risk: number | null;
  /** R-multiple, when the risk is known. */
  r: number | null;
  /** Minutes held, when the open time is known. */
  holdMins: number | null;

  // The trader's review (after 20260924_trade_details_and_tags.sql).
  setup: string | null;
  tags: string[];
  reviewNote: string | null;
}

const MAX_RECENT = 200;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Detail and review columns are optional: they only exist once the
// 20260924 migration has run, which is why the selects below use "*".
type Review = { setup?: string | null; tags?: string[] | null; review_note?: string | null; risk?: number | null };
type TradeRow = Review & {
  id: string; exchange: string; connection_id: string; symbol: string;
  side: string; pnl: number; fee: number; closed_at: string;
  opened_at?: string | null; open_price?: number | null; close_price?: number | null;
  volume?: number | null; sl?: number | null; tp?: number | null;
};
type ManualRow = Review & {
  id: string; date: string; symbol: string; direction: string; pnl: number;
  fees: number; open_time: string | null; close_time: string | null; created_at: string;
};

const TRADE_COLS = "*";
const MANUAL_COLS = "*";

const numOrNull = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
const rOf = (pnl: number, risk: number | null) => (risk && risk > 0 ? Math.round((pnl / risk) * 100) / 100 : null);
function minutesBetween(open: string, close: string): number | null {
  const [oh, om] = open.split(":").map(Number), [ch, cm] = close.split(":").map(Number);
  if ([oh, om, ch, cm].some(Number.isNaN)) return null;
  const m = ch * 60 + cm - (oh * 60 + om);
  return m >= 0 ? m : m + 1440;   // closed after midnight
}

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
      const pnl = Number(t.pnl) || 0;
      const risk = numOrNull(t.risk);
      return {
        id: t.id,
        source: t.exchange,
        sourceDetail: detail || null,
        symbol: t.symbol,
        side: t.side,
        pnl,
        fee: Number(t.fee) || 0,
        closedAt: t.closed_at,
        closeTime: localTime(t.closed_at, tz),
        openTime: t.opened_at ? localTime(t.opened_at, tz) : null,
        date: localDate(t.closed_at, tz),
        volume: numOrNull(t.volume),
        openPrice: numOrNull(t.open_price),
        closePrice: numOrNull(t.close_price),
        sl: numOrNull(t.sl),
        tp: numOrNull(t.tp),
        risk,
        r: rOf(pnl, risk),
        holdMins: t.opened_at ? Math.round((Date.parse(t.closed_at) - Date.parse(t.opened_at)) / 60000) : null,
        setup: t.setup ?? null,
        tags: t.tags ?? [],
        reviewNote: t.review_note ?? null,
      };
    });
    if (date) synced = synced.filter((t) => t.date === date);
    if (from) synced = synced.filter((t) => t.date >= from);

    const manual: DayTrade[] = manualRows.map((t) => {
      const pnl = Number(t.pnl) || 0;
      const risk = numOrNull(t.risk);
      const openTime = t.open_time ? t.open_time.slice(0, 5) : null;
      const closeTime = t.close_time ? t.close_time.slice(0, 5) : null;
      return {
        id: t.id,
        source: "manual",
        sourceDetail: null,
        symbol: t.symbol,
        side: t.direction,
        pnl,
        fee: Number(t.fees) || 0,
        closedAt: t.close_time ?? null,
        closeTime,
        openTime,
        date: t.date,
        volume: null, openPrice: null, closePrice: null, sl: null, tp: null,
        risk,
        r: rOf(pnl, risk),
        holdMins: openTime && closeTime ? minutesBetween(openTime, closeTime) : null,
        setup: t.setup ?? null,
        tags: t.tags ?? [],
        reviewNote: t.review_note ?? null,
      };
    });

    // Oldest first within a day; manual trades without a time sort to the start of it.
    const key = (t: DayTrade) => `${t.date}T${t.closeTime ?? "00:00"}`;
    const merged = [...synced, ...manual].sort((a, b) => key(a).localeCompare(key(b)));

    if (date || from) return NextResponse.json({ data: merged });
    return NextResponse.json({ data: merged.reverse().slice(0, limit) });
  } catch (err: any) {
    return NextResponse.json({ data: [], error: err.message }, { status: 500 });
  }
}

const MAX_TAGS = 12;

/**
 * PATCH /api/pnl/trades   the trader's review of one trade
 * { source: "manual" | "mt5" | ..., id, setup?, tags?, reviewNote?, risk? }
 * `risk` (money at risk) can only be set on manual trades; synced trades get
 * it from the EA. Needs 20260924_trade_details_and_tags.sql.
 */
export async function PATCH(req: NextRequest) {
  const gate = await requireUser(req);
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.id !== "string" || typeof body.source !== "string") {
    return NextResponse.json({ error: "source and id are required" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if ("setup" in body) {
    const setup = typeof body.setup === "string" ? body.setup.trim().slice(0, 60) : "";
    update.setup = setup || null;
  }
  if ("tags" in body) {
    if (!Array.isArray(body.tags)) return NextResponse.json({ error: "tags must be an array" }, { status: 400 });
    const tags = [...new Set(
      (body.tags as unknown[]).filter((t): t is string => typeof t === "string").map((t) => t.trim().slice(0, 32)).filter(Boolean),
    )].slice(0, MAX_TAGS);
    update.tags = tags;
  }
  if ("reviewNote" in body) {
    const note = typeof body.reviewNote === "string" ? body.reviewNote.trim().slice(0, 2000) : "";
    update.review_note = note || null;
  }
  if ("risk" in body && body.source === "manual") {
    const risk = Number(body.risk);
    update.risk = Number.isFinite(risk) && risk > 0 ? Math.round(risk * 100) / 100 : null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const table = body.source === "manual" ? "manual_trades" : "trades";
    const { data, error } = await supabase
      .from(table)
      .update(update)
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) {
      if (/column .* does not exist|Could not find the '.*' column/i.test(error.message)) {
        return NextResponse.json(
          { error: "Trade reviews need the latest database update (20260924_trade_details_and_tags.sql)." },
          { status: 409 },
        );
      }
      throw error;
    }
    if (!data) return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
