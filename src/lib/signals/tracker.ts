/**
 * TradeX Signal History — Outcome Tracker
 *
 * Checks open signals against current market price and resolves them.
 * - If price hits TP1 → "win_tp1"
 * - If price hits TP2 → "win_tp2"
 * - If price hits SL  → "loss_sl"
 * - If 24h pass without resolution → "expired"
 * - No-trade signals are closed to "informational" after 4h
 *
 * Called by the cron endpoint (/api/cron/track-signals).
 */

import type { SignalRecord, SignalOutcome, SignalStatus } from "./types";
import { getOpenSignals, updateSignal } from "./storage";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const SIGNAL_EXPIRY_MS  = 24 * 60 * 60 * 1000;   // 24h for directional signals
const NO_TRADE_EXPIRY_MS = 4 * 60 * 60 * 1000;    // 4h for no-trade markers
const SYMBOL_TO_API: Record<string, string> = {
  XAUUSD: "XAU/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  BTCUSD: "BTC/USD",
};

// ─────────────────────────────────────────────────────────────────────────────
// Price fetching (reuses existing quotes cache)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchCurrentPrices(symbols: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (symbols.length === 0) return result;

  try {
    const { ensureCacheWarm, getQuotesForSymbols } = await import("@/lib/api/quotes-cache");
    await ensureCacheWarm();
    const apiSymbols = symbols.map(s => SYMBOL_TO_API[s] ?? s);
    const quotes = getQuotesForSymbols(apiSymbols) as Record<string, { close?: string }>;
    for (const sym of symbols) {
      const apiKey = SYMBOL_TO_API[sym] ?? sym;
      const q = quotes[apiKey];
      const close = q?.close ? parseFloat(q.close) : NaN;
      if (!Number.isNaN(close)) result.set(sym, close);
    }
  } catch (err) {
    console.warn("[outcome-tracker] price fetch failed:", err);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolution logic
// ─────────────────────────────────────────────────────────────────────────────

interface Resolution {
  status: SignalStatus;
  outcome: SignalOutcome;
}

/**
 * Given a signal and current price, determine if it has resolved.
 * Returns null if still open (no hit yet, not expired).
 *
 * NOTE: This is a "level-touch" heuristic — it checks if current price crossed
 * a key level. A more accurate implementation would pull OHLC data between
 * signal time and now to detect intra-period touches, but for MVP this is enough.
 */
function resolveSignal(signal: SignalRecord, currentPrice: number): Resolution | null {
  const now = Date.now();
  const signalTime = new Date(signal.timestamp).getTime();
  const ageMs = now - signalTime;
  const plan = signal.tradePlan;

  // No-trade markers expire to "informational"
  if (signal.finalBias === "no-trade" || !plan) {
    if (ageMs >= NO_TRADE_EXPIRY_MS) {
      return {
        status: "informational",
        outcome: {
          resolvedAt: new Date().toISOString(),
          priceAtResolution: currentPrice,
          pnlPercent: 0,
          pnlR: 0,
        },
      };
    }
    return null;
  }

  const { direction, entry, stopLoss, tp1, tp2 } = plan;
  const riskDist = Math.abs(entry - stopLoss);
  if (riskDist <= 0) return null;

  // Long logic: SL is below entry, TP is above
  // Short logic: SL is above entry, TP is below
  const hitLongSL  = direction === "long"  && currentPrice <= stopLoss;
  const hitShortSL = direction === "short" && currentPrice >= stopLoss;
  const hitLongTP1  = direction === "long"  && currentPrice >= tp1;
  const hitShortTP1 = direction === "short" && currentPrice <= tp1;
  const hitLongTP2  = direction === "long"  && tp2 !== null && currentPrice >= tp2;
  const hitShortTP2 = direction === "short" && tp2 !== null && currentPrice <= tp2;

  // Check SL first (conservative: if both SL and TP could have hit, assume SL)
  if (hitLongSL || hitShortSL) {
    return {
      status: "loss_sl",
      outcome: {
        resolvedAt: new Date().toISOString(),
        priceAtResolution: currentPrice,
        pnlPercent: direction === "long"
          ? ((currentPrice - entry) / entry) * 100
          : ((entry - currentPrice) / entry) * 100,
        pnlR: -1,
      },
    };
  }

  // TP2 takes precedence over TP1 if both hit
  if (hitLongTP2 || hitShortTP2) {
    const rewardDist = Math.abs(tp2! - entry);
    return {
      status: "win_tp2",
      outcome: {
        resolvedAt: new Date().toISOString(),
        priceAtResolution: currentPrice,
        pnlPercent: direction === "long"
          ? ((tp2! - entry) / entry) * 100
          : ((entry - tp2!) / entry) * 100,
        pnlR: parseFloat((rewardDist / riskDist).toFixed(2)),
      },
    };
  }

  if (hitLongTP1 || hitShortTP1) {
    const rewardDist = Math.abs(tp1 - entry);
    return {
      status: "win_tp1",
      outcome: {
        resolvedAt: new Date().toISOString(),
        priceAtResolution: currentPrice,
        pnlPercent: direction === "long"
          ? ((tp1 - entry) / entry) * 100
          : ((entry - tp1) / entry) * 100,
        pnlR: parseFloat((rewardDist / riskDist).toFixed(2)),
      },
    };
  }

  // Expiry: 24h without any hit
  if (ageMs >= SIGNAL_EXPIRY_MS) {
    const pnlPct = direction === "long"
      ? ((currentPrice - entry) / entry) * 100
      : ((entry - currentPrice) / entry) * 100;
    const pnlR = parseFloat(
      (((direction === "long"
         ? currentPrice - entry
         : entry - currentPrice) / riskDist)).toFixed(2)
    );
    return {
      status: "expired",
      outcome: {
        resolvedAt: new Date().toISOString(),
        priceAtResolution: currentPrice,
        pnlPercent: pnlPct,
        pnlR,
      },
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main tracker
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackingResult {
  checkedCount: number;
  resolvedCount: number;
  resolutions: Array<{
    id: string;
    symbol: string;
    status: SignalStatus;
    pnlR: number;
  }>;
  errors: string[];
}

export async function trackOpenSignals(): Promise<TrackingResult> {
  const open = await getOpenSignals();
  const result: TrackingResult = {
    checkedCount: open.length,
    resolvedCount: 0,
    resolutions: [],
    errors: [],
  };

  if (open.length === 0) return result;

  // Fetch prices once for all unique symbols
  const uniqueSymbols = Array.from(new Set(open.map(s => s.symbol)));
  const prices = await fetchCurrentPrices(uniqueSymbols);

  for (const signal of open) {
    const price = prices.get(signal.symbol);
    if (price === undefined) {
      result.errors.push(`${signal.id}: no price for ${signal.symbol}`);
      continue;
    }

    const resolution = resolveSignal(signal, price);
    if (!resolution) continue;

    const updated = await updateSignal(signal.id, {
      status: resolution.status,
      outcome: resolution.outcome,
    });

    if (updated) {
      result.resolvedCount += 1;
      result.resolutions.push({
        id: signal.id,
        symbol: signal.symbol,
        status: resolution.status,
        pnlR: resolution.outcome.pnlR,
      });
    }
  }

  return result;
}
