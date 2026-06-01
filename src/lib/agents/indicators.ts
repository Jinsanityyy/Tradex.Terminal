/**
 * TradeX  -  Shared Technical Indicators
 *
 * Real indicator math used by the market-snapshot builder so agents receive
 * genuine MACD / ATR / RSI values instead of fabricated proxies.
 *
 * All functions are pure and operate on plain OHLC arrays.
 */

export interface OHLC {
  o: number;
  h: number;
  l: number;
  c: number;
}

// ── EMA ────────────────────────────────────────────────────────────────────────
export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
  }
  return e;
}

// Full EMA series (needed for MACD signal line)
function emaSeries(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let e = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  out.push(e);
  for (let i = period; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
    out.push(e);
  }
  return out;
}

// ── MACD (12/26/9) ──────────────────────────────────────────────────────────────
export interface MACDResult {
  macd: number;       // MACD line = EMA12 - EMA26
  signal: number;     // 9-EMA of MACD line
  histogram: number;  // macd - signal
}

/**
 * Real MACD(12,26,9) histogram from a series of closes.
 * Returns null when there is not enough history (needs ≥ 35 closes).
 */
export function computeMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): MACDResult | null {
  if (closes.length < slow + signalPeriod) return null;

  const fastSeries = emaSeries(closes, fast);
  const slowSeries = emaSeries(closes, slow);
  if (fastSeries.length === 0 || slowSeries.length === 0) return null;

  // Align the two EMA series to the same (most-recent) length.
  const len = Math.min(fastSeries.length, slowSeries.length);
  const macdLine: number[] = [];
  for (let i = 0; i < len; i++) {
    macdLine.push(
      fastSeries[fastSeries.length - len + i] - slowSeries[slowSeries.length - len + i]
    );
  }

  const signalSeries = emaSeries(macdLine, signalPeriod);
  if (signalSeries.length === 0) return null;

  const macd = macdLine[macdLine.length - 1];
  const signal = signalSeries[signalSeries.length - 1];
  return { macd, signal, histogram: macd - signal };
}

// ── ATR (Average True Range) ──────────────────────────────────────────────────────
/**
 * Wilder's ATR over `period` bars. Returns absolute ATR in price units,
 * or null when there is not enough history.
 */
export function computeATR(candles: OHLC[], period = 14): number | null {
  if (candles.length < period + 1) return null;

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prevClose = candles[i - 1].c;
    const tr = Math.max(
      cur.h - cur.l,
      Math.abs(cur.h - prevClose),
      Math.abs(cur.l - prevClose)
    );
    trueRanges.push(tr);
  }
  if (trueRanges.length < period) return null;

  // Wilder smoothing
  let atr = trueRanges.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }
  return atr;
}

/** ATR expressed as a percentage of the supplied reference price. */
export function computeATRPercent(
  candles: OHLC[],
  price: number,
  period = 14
): number | null {
  const atr = computeATR(candles, period);
  if (atr === null || !Number.isFinite(price) || price <= 0) return null;
  return (atr / price) * 100;
}

// ── RSI (Wilder) ──────────────────────────────────────────────────────────────────
export function computeRSI(closes: number[], period = 14): number | null {
  if (closes.length <= period) return null;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
