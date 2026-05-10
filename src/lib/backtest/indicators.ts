/**
 * Pure indicator functions for the backtest engine.
 * No external dependencies — all computed from OHLCV arrays.
 */

export interface Candle {
  t: number; // Unix seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMA
// ─────────────────────────────────────────────────────────────────────────────

export function ema(values: number[], period: number): number[] {
  if (values.length < period) return values.map(() => NaN);
  const k = 2 / (period + 1);
  const result: number[] = new Array(values.length).fill(NaN);

  // Seed with SMA of first `period` values
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  result[period - 1] = seed / period;

  for (let i = period; i < values.length; i++) {
    result[i] = values[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// RSI (Wilder smoothing)
// ─────────────────────────────────────────────────────────────────────────────

export function rsi(closes: number[], period = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) avgGain += delta;
    else avgLoss -= delta;
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = Math.max(0, delta);
    const loss = Math.max(0, -delta);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// MACD histogram
// ─────────────────────────────────────────────────────────────────────────────

export function macdHistogram(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): number[] {
  const fastEma  = ema(closes, fast);
  const slowEma  = ema(closes, slow);
  const macdLine = closes.map((_, i) =>
    isNaN(fastEma[i]) || isNaN(slowEma[i]) ? NaN : fastEma[i] - slowEma[i]
  );

  // Signal line as EMA of MACD values (skip NaN prefix)
  const firstValid = macdLine.findIndex(v => !isNaN(v));
  const signalLine = new Array(closes.length).fill(NaN);
  if (firstValid >= 0) {
    const macdSlice = macdLine.slice(firstValid);
    const signalSlice = ema(macdSlice, signal);
    for (let i = 0; i < signalSlice.length; i++) {
      signalLine[firstValid + i] = signalSlice[i];
    }
  }

  return closes.map((_, i) =>
    isNaN(macdLine[i]) || isNaN(signalLine[i]) ? NaN : macdLine[i] - signalLine[i]
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATR proxy (abs % change, same as live agents use)
// ─────────────────────────────────────────────────────────────────────────────

export function atrProxy(candles: Candle[], index: number): number {
  const c = candles[index];
  if (!c || c.c === 0) return 0;
  return Math.abs((c.c - c.o) / c.o) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// 52-week range position (using available candle history)
// ─────────────────────────────────────────────────────────────────────────────

export function pos52w(
  candles: Candle[],
  index: number,
  lookbackBars = 1344 // ~3 months of M15 = 96 bars/day * ~14 days... actually use all available
): { pos: number; high: number; low: number } {
  const start = Math.max(0, index - lookbackBars);
  const slice = candles.slice(start, index + 1);
  const high = Math.max(...slice.map(c => c.h));
  const low  = Math.min(...slice.map(c => c.l));
  const range = high - low;
  const pos = range > 0 ? ((candles[index].c - low) / range) * 100 : 50;
  return { pos: Math.round(pos * 10) / 10, high, low };
}

// ─────────────────────────────────────────────────────────────────────────────
// Session detection from UTC timestamp
// ─────────────────────────────────────────────────────────────────────────────

export function detectSession(unixSec: number): {
  session: string;
  sessionHour: number;
} {
  const d = new Date(unixSec * 1000);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const totalMin = h * 60 + m;

  let session: string;
  if (totalMin >= 0 && totalMin < 7 * 60)       session = "Asia";       // 00:00–07:00
  else if (totalMin >= 7 * 60 && totalMin < 12 * 60)  session = "London";     // 07:00–12:00
  else if (totalMin >= 12 * 60 && totalMin < 20 * 60) session = "New York";   // 12:00–20:00
  else                                               session = "Closed";

  return { session, sessionHour: h };
}

// ─────────────────────────────────────────────────────────────────────────────
// MACD bias: positive hist = bullish, negative = bearish
// ─────────────────────────────────────────────────────────────────────────────

export function macdBias(hist: number): "bullish" | "bearish" | "neutral" {
  if (hist > 0.01) return "bullish";
  if (hist < -0.01) return "bearish";
  return "neutral";
}
