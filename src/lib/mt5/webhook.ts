/**
 * MT5 live journaling.
 *
 * The TradexJournal EA (public/mt5/TradexJournal.mq5) runs inside the user's
 * terminal and POSTs every closing deal to /api/mt5/webhook. There is no
 * broker login involved: the EA authenticates with a per-connection token,
 * of which we only keep the SHA-256.
 */
import crypto from "crypto";

export const TOKEN_PREFIX = "tdx_mt5_";
export const MAX_DEALS_PER_REQUEST = 500;

export function generateWebhookToken(): string {
  return TOKEN_PREFIX + crypto.randomBytes(24).toString("hex");
}

export function hashWebhookToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Pulls the token from `Authorization: Bearer`, `X-Tradex-Token`, or the body. */
export function extractToken(headers: Headers, body: unknown): string | null {
  const auth = headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim() || null;
  const header = headers.get("x-tradex-token");
  if (header) return header.trim() || null;
  const fromBody = (body as { token?: unknown } | null)?.token;
  return typeof fromBody === "string" && fromBody.trim() ? fromBody.trim() : null;
}

/** One closing deal as the EA sends it. Times are UTC unix seconds. */
export interface Mt5Deal {
  ticket: string;
  symbol: string;
  side: "long" | "short";   // direction of the position that was closed
  profit: number;
  swap: number;
  commission: number;
  fee: number;
  close_time: number;
}

export interface Mt5TradeRow {
  trade_id: string;
  symbol: string;
  side: "long" | "short";
  pnl: number;
  fee: number;
  closed_at: string;
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/**
 * Validates one deal and maps it onto a `trades` row. Follows the cTrader
 * convention: pnl is profit + swap, costs go in `fee` as a positive number.
 * Returns an error string instead of throwing so one bad deal can't sink a batch.
 */
export function normalizeDeal(raw: unknown): Mt5TradeRow | string {
  if (!raw || typeof raw !== "object") return "deal is not an object";
  const d = raw as Record<string, unknown>;

  const ticket = typeof d.ticket === "number" ? String(d.ticket) : d.ticket;
  if (typeof ticket !== "string" || !/^\d{1,20}$/.test(ticket)) return "ticket must be a deal number";

  const symbol = typeof d.symbol === "string" ? d.symbol.trim() : "";
  if (!symbol || symbol.length > 32) return `deal ${ticket}: symbol is missing`;

  if (d.side !== "long" && d.side !== "short") return `deal ${ticket}: side must be long or short`;

  const profit = num(d.profit);
  if (profit === null) return `deal ${ticket}: profit is not a number`;
  const swap = num(d.swap ?? 0);
  const commission = num(d.commission ?? 0);
  const fee = num(d.fee ?? 0);
  if (swap === null || commission === null || fee === null) return `deal ${ticket}: swap/commission/fee must be numbers`;

  const closeTime = num(d.close_time);
  // Anything before 2000 or more than a day ahead is a clock/encoding bug, not a trade.
  if (closeTime === null || closeTime < 946684800 || closeTime > Date.now() / 1000 + 86400) {
    return `deal ${ticket}: close_time must be UTC unix seconds`;
  }

  return {
    trade_id: ticket,
    symbol,
    side: d.side,
    pnl: round2(profit + swap),
    fee: round2(Math.abs(commission) + Math.abs(fee)),
    closed_at: new Date(closeTime * 1000).toISOString(),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "12345678 @ ICMarkets-Demo" from the EA's account block, or null. */
export function describeAccount(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  const login = a.login != null ? String(a.login).slice(0, 20) : "";
  const server = typeof a.server === "string" ? a.server.slice(0, 64) : "";
  if (!login) return null;
  return server ? `${login} @ ${server}` : login;
}
