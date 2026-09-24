/**
 * Detects when a taken trade has reached its TP1 or its stop, so the trade
 * closes itself at that level instead of waiting for the trader to report it.
 *
 * Two checks:
 *  - live price: each tick while the app is open.
 *  - candles: when the app opens, and every few minutes, so a hit that happened
 *    while the app was closed (a wick through the stop at 3am) is still caught,
 *    and closed at the time it happened.
 *
 * Closing at TP1 is deliberate: it is the target a trader sets on the order.
 */

import type { TakenSignal } from "./trade-log";

export interface CandleBar { t: number; o: number; h: number; l: number; c: number }

export interface TradeHit {
  kind: "tp1" | "sl";
  price: number;
  /** ISO time of the hit */
  at: string;
}

export function hitFromPrice(t: TakenSignal, price: number): TradeHit | null {
  if (!Number.isFinite(price) || price <= 0) return null;
  const at = new Date().toISOString();
  if (t.direction === "BUY") {
    if (price >= t.tp1)      return { kind: "tp1", price: t.tp1, at };
    if (price <= t.stopLoss) return { kind: "sl",  price: t.stopLoss, at };
  } else {
    if (price <= t.tp1)      return { kind: "tp1", price: t.tp1, at };
    if (price >= t.stopLoss) return { kind: "sl",  price: t.stopLoss, at };
  }
  return null;
}

/**
 * First bar after the trade was taken that touched TP1 or the stop.
 *
 * `livePrice` aligns the bars with the quote the trader saw: a feed that fell
 * back to futures sits several dollars off spot, which on a 5-dollar stop is
 * the difference between a win and a loss. When that gap is as wide as the stop
 * itself the bars cannot settle it, so nothing is returned and the live check
 * decides instead.
 */
export function hitFromCandles(
  t: TakenSignal,
  candles: CandleBar[],
  livePrice: number | null,
): TradeHit | null {
  if (candles.length === 0) return null;
  const risk = Math.abs(t.entry - t.stopLoss);
  if (risk <= 0) return null;

  const offset = livePrice ? livePrice - candles[candles.length - 1].c : 0;
  if (Math.abs(offset) >= risk) return null;

  // Only bars that opened after the trade: the bar it was taken in holds price
  // action from before the entry.
  const takenSec = new Date(t.takenAt).getTime() / 1000;
  const isBuy = t.direction === "BUY";

  for (const raw of candles) {
    if (raw.t < takenSec) continue;
    const bar = { o: raw.o + offset, h: raw.h + offset, l: raw.l + offset, c: raw.c + offset };
    const at = new Date(raw.t * 1000).toISOString();
    const tpHit = isBuy ? bar.h >= t.tp1 : bar.l <= t.tp1;
    const slHit = isBuy ? bar.l <= t.stopLoss : bar.h >= t.stopLoss;

    // Both inside one bar: the bar's own direction says which came first — the
    // same rule the signal tracker uses, so a trade and its signal agree.
    if (tpHit && slHit) {
      const towardTarget = isBuy ? bar.c >= bar.o : bar.c <= bar.o;
      return towardTarget
        ? { kind: "tp1", price: t.tp1, at }
        : { kind: "sl", price: t.stopLoss, at };
    }
    if (tpHit) return { kind: "tp1", price: t.tp1, at };
    if (slHit) return { kind: "sl", price: t.stopLoss, at };
  }
  return null;
}

/** Finest timeframe whose 500-bar history still reaches back to the trade. */
export function timeframeFor(takenAt: string): "M5" | "M15" | "H1" {
  const hours = (Date.now() - new Date(takenAt).getTime()) / 3_600_000;
  if (hours < 40)  return "M5";
  if (hours < 120) return "M15";
  return "H1";
}
