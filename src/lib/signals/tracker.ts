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
import type { Timeframe } from "@/lib/agents/schemas";
import { getOpenSignals, getSignals, updateSignal } from "./storage";
import { fetchYahooCandles, type YahooCandleBar } from "@/lib/api/yahoo-finance";

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
// OHLC candle fetching — keyed by "SYMBOL_TIMEFRAME" to avoid duplicate calls
// ─────────────────────────────────────────────────────────────────────────────

async function fetchCandleMap(
  signals: SignalRecord[]
): Promise<Map<string, YahooCandleBar[]>> {
  const map = new Map<string, YahooCandleBar[]>();
  const seen = new Set<string>();

  for (const s of signals) {
    if (!s.tradePlan) continue;
    const key = `${s.symbol}_${s.timeframe}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const display = SYMBOL_TO_API[s.symbol];
    if (!display) continue;
    try {
      const candles = await fetchYahooCandles(display, s.timeframe as Timeframe);
      map.set(key, candles ?? []);
    } catch {
      map.set(key, []);
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// OHLC-based resolution — scans candles chronologically, first touch wins
// ─────────────────────────────────────────────────────────────────────────────

const TF_SECONDS: Record<string, number> = { M5: 300, M15: 900, H1: 3600, H4: 14400 };

function resolveFromOHLC(
  signal: SignalRecord,
  allCandles: YahooCandleBar[],
): Resolution | null {
  const plan = signal.tradePlan;
  if (!plan) return null;

  const signalSec = new Date(signal.timestamp).getTime() / 1000;
  const tfSec     = TF_SECONDS[signal.timeframe] ?? 3600;
  // Include the candle that was ACTIVE at signal creation (may have opened before
  // the signal but captured the price move). A candle opened at t covers [t, t+tfSec).
  const candles = allCandles.filter(c => c.t + tfSec > signalSec);
  if (candles.length === 0) return null;

  const { direction, entry, stopLoss, tp1, tp2 } = plan;
  const riskDist = Math.abs(entry - stopLoss);
  if (riskDist <= 0) return null;

  for (const bar of candles) {
    if (direction === "short") {
      const tp2Hit = tp2 !== null && bar.l <= tp2;
      const tp1Hit = bar.l <= tp1;
      const slHit  = bar.h >= stopLoss;

      // Both in same candle: use open direction as tie-breaker
      if (slHit && (tp1Hit || tp2Hit)) {
        const bearishBar = bar.c <= bar.o; // went down first → TP hit first
        if (!bearishBar) {
          return { status: "loss_sl", outcome: mkOutcome(entry, stopLoss, -1, bar.h) };
        }
      }
      if (tp2Hit) return { status: "win_tp2",  outcome: mkOutcome(entry, tp2!, parseFloat((Math.abs(tp2! - entry) / riskDist).toFixed(2)), bar.l) };
      if (tp1Hit) return { status: "win_tp1",  outcome: mkOutcome(entry, tp1,  parseFloat((Math.abs(tp1  - entry) / riskDist).toFixed(2)), bar.l) };
      if (slHit)  return { status: "loss_sl",  outcome: mkOutcome(entry, stopLoss, -1, bar.h) };
    } else {
      const tp2Hit = tp2 !== null && bar.h >= tp2;
      const tp1Hit = bar.h >= tp1;
      const slHit  = bar.l <= stopLoss;

      if (slHit && (tp1Hit || tp2Hit)) {
        const bullishBar = bar.c >= bar.o;
        if (!bullishBar) {
          return { status: "loss_sl", outcome: mkOutcome(entry, stopLoss, -1, bar.l) };
        }
      }
      if (tp2Hit) return { status: "win_tp2",  outcome: mkOutcome(entry, tp2!, parseFloat((Math.abs(tp2! - entry) / riskDist).toFixed(2)), bar.h) };
      if (tp1Hit) return { status: "win_tp1",  outcome: mkOutcome(entry, tp1,  parseFloat((Math.abs(tp1  - entry) / riskDist).toFixed(2)), bar.h) };
      if (slHit)  return { status: "loss_sl",  outcome: mkOutcome(entry, stopLoss, -1, bar.l) };
    }
  }
  return null;
}

function mkOutcome(entry: number, level: number, pnlR: number, priceAtResolution: number): SignalOutcome {
  return {
    resolvedAt: new Date().toISOString(),
    priceAtResolution,
    pnlPercent: pnlR >= 0
      ? ((Math.abs(level - entry) / entry) * 100)
      : -((Math.abs(level - entry) / entry) * 100),
    pnlR,
  };
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

  // TP checked before SL: if price has already passed TP, that is the outcome.
  // Checking SL first causes false losses when price hit TP then bounced back past SL
  // between cron ticks. OHLC resolution above handles the correct order; this
  // snapshot fallback also gives TP priority to reduce miscounts.

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

  // SL checked last: only mark loss if TP was not reached
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

  // Pullback missed: price moved 1R away from signal price in the wrong direction,
  // meaning the entry zone can no longer be naturally reached — setup is gone.
  const isPullbackSetup =
    (direction === "long"  && entry < signal.priceAtSignal) ||
    (direction === "short" && entry > signal.priceAtSignal);
  if (isPullbackSetup) {
    const pullbackMissed =
      direction === "long"
        ? currentPrice > signal.priceAtSignal + riskDist   // price ran up, no dip to entry coming
        : currentPrice < signal.priceAtSignal - riskDist;  // price dropped, no rally to entry coming
    if (pullbackMissed) {
      return {
        status: "invalidated",
        outcome: {
          resolvedAt: new Date().toISOString(),
          priceAtResolution: currentPrice,
          pnlPercent: 0,
          pnlR: 0,
        },
      };
    }
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

  // Fetch prices and OHLC candles in parallel
  const uniqueSymbols = Array.from(new Set(open.map(s => s.symbol)));
  const [prices, candleMap] = await Promise.all([
    fetchCurrentPrices(uniqueSymbols),
    fetchCandleMap(open),
  ]);

  for (const signal of open) {
    const price = prices.get(signal.symbol);
    if (price === undefined) {
      result.errors.push(`${signal.id}: no price for ${signal.symbol}`);
      continue;
    }

    const candles = candleMap.get(`${signal.symbol}_${signal.timeframe}`) ?? [];
    // OHLC-based resolution is authoritative; fall back to snapshot-based
    const resolution = resolveFromOHLC(signal, candles) ?? resolveSignal(signal, price);
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

// ─────────────────────────────────────────────────────────────────────────────
// Reprocess — correct recently mis-classified loss_sl signals
// ─────────────────────────────────────────────────────────────────────────────

export interface ReprocessResult {
  checkedCount: number;
  correctedCount: number;
  corrections: Array<{ id: string; symbol: string; from: string; to: string; pnlR: number }>;
  errors: string[];
}

/**
 * Re-evaluates recent loss_sl signals using OHLC candle data.
 * Corrects any that were actually TP hits — happens when price hit TP
 * then bounced back past SL before the cron fired.
 */
export async function reprocessRecentLosses(withinHours = 24): Promise<ReprocessResult> {
  const result: ReprocessResult = { checkedCount: 0, correctedCount: 0, corrections: [], errors: [] };

  const cutoff = new Date(Date.now() - withinHours * 3_600_000).toISOString();
  const losses = await getSignals({ status: "loss_sl", sinceTimestamp: cutoff });
  result.checkedCount = losses.length;
  if (losses.length === 0) return result;

  const candleMap = await fetchCandleMap(losses);

  for (const signal of losses) {
    try {
      const candles = candleMap.get(`${signal.symbol}_${signal.timeframe}`) ?? [];
      const reeval  = resolveFromOHLC(signal, candles);
      if (!reeval || reeval.status === "loss_sl") continue;

      const updated = await updateSignal(signal.id, {
        status:  reeval.status,
        outcome: reeval.outcome,
      });

      if (updated) {
        result.correctedCount += 1;
        result.corrections.push({
          id:     signal.id,
          symbol: signal.symbol,
          from:   "loss_sl",
          to:     reeval.status,
          pnlR:   reeval.outcome.pnlR,
        });
        console.log(`[reprocess] corrected ${signal.id}: loss_sl → ${reeval.status} (+${reeval.outcome.pnlR}R)`);
      }
    } catch (err) {
      result.errors.push(`${signal.id}: ${String(err)}`);
    }
  }

  return result;
}
