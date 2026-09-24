import { createClient } from "@/lib/supabase/client";
import { browserTimeZone, localDate, localTime } from "./local-date";

export interface TakenSignal {
  id: string;
  signalId?: string;
  symbol: string;
  symbolDisplay: string;
  direction: "BUY" | "SELL";
  timeframe?: string;
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2?: number | null;
  rrRatio: number;
  grade?: string;
  lotSize: number;
  riskAmount: number;
  takenAt: string;
  status: "open" | "closed";
  exitPrice?: number;
  closedAt?: string;
  pnlDollar?: number;
  pnlR?: number;
  result?: "win" | "loss" | "be";
  notes?: string;
  /** Closed by a build that logs each close exactly once; safe to retry the log. */
  syncPending?: boolean;
}

const KEY = "tradex-taken-signals-v1";

/** Fired after a trade closes, so every view holding the log can reload it. */
export const TRADES_CHANGED_EVENT = "tradex:trades-changed";
const SYNCED_KEY = "tradex-synced-trade-ids";
/** Trade ids with a calendar POST in flight. */
const syncing = new Set<string>();

function pointValue(symbol: string): number {
  if (symbol === "BTCUSD" || symbol === "ETHUSD") return 1;
  if (symbol === "XAUUSD") return 100;
  return 100_000;
}

function getSyncedIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SYNCED_KEY) ?? "[]")); }
  catch { return new Set(); }
}
/** True once this trade is on the P&L calendar (or the trader chose to leave it off). */
export function isTradeLogged(id: string): boolean {
  return getSyncedIds().has(id);
}

/** Leave a closed trade off the calendar without writing it. */
export function markTradeLogged(id: string): void {
  markSynced(id);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(TRADES_CHANGED_EVENT));
}

function markSynced(id: string): void {
  const ids = getSyncedIds();
  ids.add(id);
  localStorage.setItem(SYNCED_KEY, JSON.stringify([...ids]));
}

function fmtLevel(n: number): string {
  return n > 100 ? n.toFixed(2) : n.toFixed(4);
}

/**
 * Logs a closed trade to the P&L calendar, once. Returns whether it is on the
 * server (already, or now). This is the only path that writes it: the close
 * dialog used to POST its own copy as well, so every hand-closed trade was
 * counted twice.
 */
export async function syncClosedTradeToServer(trade: TakenSignal): Promise<boolean> {
  if (typeof window === "undefined" || trade.status !== "closed") return false;
  if (getSyncedIds().has(trade.id)) return true;
  // The close itself and the on-open retry can race for the same trade.
  if (syncing.has(trade.id)) return false;
  syncing.add(trade.id);
  try {
    const supabase = createClient();
    const authHeader: Record<string, string> = {};
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) authHeader.Authorization = `Bearer ${session.access_token}`;
    }
    const closedAt = trade.closedAt ?? new Date().toISOString();
    // The calendar is kept in the trader's own days: a UTC date filed every
    // trade closed before 8am in Manila under the day before.
    const tz = browserTimeZone();
    const r = trade.pnlR;
    const summary =
      `Signal trade · ${trade.direction} ${trade.symbolDisplay} @ ${fmtLevel(trade.entry)} → ${fmtLevel(trade.exitPrice ?? trade.entry)}` +
      (r != null ? ` · ${r >= 0 ? "+" : ""}${r}R` : "");
    const res = await fetch("/api/manual-trades", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({
        date: localDate(closedAt, tz),
        symbol: trade.symbol,
        direction: trade.direction === "BUY" ? "long" : "short",
        pnl: trade.pnlDollar ?? 0,
        fees: 0,
        notes: trade.notes ? `${summary} · ${trade.notes}` : summary,
        open_time: localTime(trade.takenAt, tz),
        close_time: localTime(closedAt, tz),
      }),
    });
    if (res.ok) {
      markSynced(trade.id);
      window.dispatchEvent(new Event(TRADES_CHANGED_EVENT));
    }
    return res.ok;
  } catch {
    return false;
  } finally {
    syncing.delete(trade.id);
  }
}

export async function syncAllClosedTrades(): Promise<void> {
  if (typeof window === "undefined") return;
  // Only closes that were ever written by one path: those from this build, and
  // auto-closes (TP/SL) from any build — they never went through the close
  // dialog's own (now removed) second POST, so a failed write means the trade
  // is simply missing. Retrying a hand-closed one from an older build could add
  // it a second time.
  const closed = loadTradeLog().filter(
    t => t.status === "closed" && (t.syncPending || t.notes?.startsWith("Auto-closed:")),
  );
  await Promise.all(closed.map(syncClosedTradeToServer));
}

export function loadTradeLog(): TakenSignal[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

function save(trades: TakenSignal[]): void {
  localStorage.setItem(KEY, JSON.stringify(trades));
}

export function calcPnLDollar(
  symbol: string,
  direction: "BUY" | "SELL",
  entry: number,
  exitPrice: number,
  lotSize: number
): number {
  const diff = direction === "BUY" ? exitPrice - entry : entry - exitPrice;
  return parseFloat((diff * lotSize * pointValue(symbol)).toFixed(2));
}

export function suggestLotSize(
  symbol: string,
  entry: number,
  stopLoss: number,
  accountBalance: number,
  riskPct: number
): number {
  const riskAmount = accountBalance * (riskPct / 100);
  const slDist = Math.abs(entry - stopLoss);
  if (slDist === 0) return 0.01;
  const raw = riskAmount / (slDist * pointValue(symbol));
  if (symbol === "BTCUSD" || symbol === "ETHUSD") return parseFloat(raw.toFixed(4));
  return parseFloat(raw.toFixed(2));
}

export function takeTrade(params: Omit<TakenSignal, "id" | "status" | "takenAt">): TakenSignal {
  const trade: TakenSignal = {
    ...params,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "open",
    takenAt: new Date().toISOString(),
  };
  const trades = loadTradeLog();
  save([trade, ...trades]);
  return trade;
}

export function closeTrade(
  id: string,
  exitPrice: number,
  notes?: string,
  /** When the exit actually happened — an auto-detected TP/SL hit can be hours old. */
  closedAt?: string,
): TakenSignal | null {
  const trades = loadTradeLog();
  const idx = trades.findIndex(t => t.id === id);
  if (idx === -1) return null;
  const t = trades[idx];
  const riskDist = Math.abs(t.entry - t.stopLoss);
  const pnlDollar = calcPnLDollar(t.symbol, t.direction, t.entry, exitPrice, t.lotSize);
  const rawR = riskDist > 0
    ? (t.direction === "BUY" ? exitPrice - t.entry : t.entry - exitPrice) / riskDist
    : 0;
  const pnlR = parseFloat(rawR.toFixed(2));
  const result: TakenSignal["result"] = pnlDollar > 0 ? "win" : pnlDollar < 0 ? "loss" : "be";
  const closed: TakenSignal = {
    ...t,
    status: "closed",
    exitPrice,
    closedAt: closedAt ?? new Date().toISOString(),
    pnlDollar,
    pnlR,
    result,
    notes: notes?.trim() || t.notes,
    syncPending: true,
  };
  trades[idx] = closed;
  save(trades);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(TRADES_CHANGED_EVENT));
  return closed;
}

export function discardTrade(id: string): void {
  const trades = loadTradeLog();
  save(trades.filter(t => t.id !== id));
}

export function findOpenBySetup(
  symbol: string,
  entry: number,
  stopLoss: number
): TakenSignal | undefined {
  return loadTradeLog().find(
    t =>
      t.status === "open" &&
      t.symbol === symbol &&
      Math.abs(t.entry - entry) < 0.01 &&
      Math.abs(t.stopLoss - stopLoss) < 0.01
  );
}
