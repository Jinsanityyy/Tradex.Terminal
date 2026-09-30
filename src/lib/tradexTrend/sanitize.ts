import type { Candle } from "./types";

/**
 * Providers sometimes return null/NaN fields, duplicate timestamps or unsorted rows
 * (forex gaps, DST, partial bars). The chart library throws on any of those, and the
 * indicators would be wrong, so clean the series first: finite OHLC, ascending,
 * one candle per timestamp (the later row wins), high/low covering open and close.
 */
export function sanitizeCandles(rows: Candle[]): Candle[] {
  const byTime = new Map<number, Candle>();
  for (const c of rows) {
    if (![c.time, c.open, c.high, c.low, c.close].every((v) => typeof v === "number" && Number.isFinite(v))) continue;
    if (c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0) continue;
    byTime.set(c.time, {
      time: c.time,
      open: c.open,
      close: c.close,
      high: Math.max(c.high, c.open, c.close),
      low: Math.min(c.low, c.open, c.close),
      volume: Number.isFinite(c.volume) ? c.volume : 0,
    });
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}
