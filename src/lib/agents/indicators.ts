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

// ── Andybiotic Max% Indicator Suite ───────────────────────────────────────────
//
// Core logic ported from the Pine Script indicator (© Andybiotic, MPL 2.0).
// Used by the agent system to base signals on real indicator math rather than
// proxy heuristics.

export interface AndybioticSignal {
  // SuperTrend
  superTrend: number;          // current SuperTrend level in price units
  superTrendDir: 1 | -1;      // -1 = bullish (price above ST), 1 = bearish (below)
  // EMA / SMA
  ema200: number | null;       // EMA(200) value
  sma13: number | null;        // SMA(13) — signal gate
  // Signals on the LAST closed bar
  isBull: boolean;             // crossover(close, supertrend) AND close >= sma13
  isBear: boolean;             // crossunder(close, supertrend) AND close <= sma13
  isSmartBuy: boolean;         // bull AND close > ema200
  isSmartSell: boolean;        // bear AND close < ema200
  // ADX sideways filter
  adx: number | null;          // ADX(15) value
  isSideways: boolean;         // ADX < 15 → ranging market, avoid signals
  // Bar count since last signal (gives freshness)
  barsSinceBull: number;       // bars elapsed since last bull crossover
  barsSinceBear: number;       // bars elapsed since last bear crossunder
}

/** Wilder RMA (Running Moving Average) — same as Pine Script ta.rma() */
function rma(src: number[], period: number): number[] {
  const out: number[] = new Array(src.length).fill(NaN);
  let val = NaN;
  for (let i = 0; i < src.length; i++) {
    val = isNaN(val) ? src[i] : (val * (period - 1) + src[i]) / period;
    out[i] = val;
  }
  return out;
}

/** ATR series (Wilder RMA of True Range) */
function atrSeries(candles: OHLC[], period: number): number[] {
  const tr = candles.map((b, i) => {
    if (i === 0) return b.h - b.l;
    const pc = candles[i - 1].c;
    return Math.max(b.h - b.l, Math.abs(b.h - pc), Math.abs(b.l - pc));
  });
  return rma(tr, period);
}

/** SMA series (internal to Andybiotic suite) */
function andySma(src: number[], period: number): number[] {
  const out: number[] = new Array(src.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    sum += src[i];
    if (i >= period) sum -= src[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** EMA series (internal to Andybiotic suite) */
function andyEma(src: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = new Array(src.length).fill(NaN);
  let val = NaN;
  for (let i = 0; i < src.length; i++) {
    val = isNaN(val) ? src[i] : src[i] * k + val * (1 - k);
    out[i] = val;
  }
  return out;
}

/**
 * SuperTrend — mirrors Pine Script supertrend() used by Andybiotic Max%.
 * factor = sensitivity × 2 (default sensitivity=4 → factor=8), atrLen=11
 */
function superTrendSeries(
  candles: OHLC[],
  factor: number,
  atrLen: number
): { line: number[]; dir: number[] } {
  const atrVals = atrSeries(candles, atrLen);
  const line: number[] = new Array(candles.length).fill(NaN);
  const dir:  number[] = new Array(candles.length).fill(1);

  let prevUpper = NaN, prevLower = NaN, prevST = NaN;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i].c;
    const a = atrVals[i];
    if (isNaN(a)) continue;

    let upper = c + factor * a;
    let lower = c - factor * a;

    if (!isNaN(prevLower)) lower = (lower > prevLower || (candles[i - 1]?.c ?? c) < prevLower) ? lower : prevLower;
    if (!isNaN(prevUpper)) upper = (upper < prevUpper || (candles[i - 1]?.c ?? c) > prevUpper) ? upper : prevUpper;

    let d: number;
    if (isNaN(prevST))          d = 1;
    else if (prevST === prevUpper) d = c > upper ? -1 : 1;
    else                           d = c < lower ?  1 : -1;

    line[i] = d === -1 ? lower : upper;
    dir[i]  = d;
    prevUpper = upper;
    prevLower = lower;
    prevST    = line[i];
  }
  return { line, dir };
}

/**
 * ADX(15) — mirrors Pine Script adx(dilen=15, adxlen=15) in Andybiotic Max%.
 * Returns a series of ADX values.
 */
function adxSeries(candles: OHLC[], period = 15): number[] {
  const plusDM:  number[] = [];
  const minusDM: number[] = [];
  const trArr:   number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { plusDM.push(0); minusDM.push(0); trArr.push(candles[i].h - candles[i].l); continue; }
    const up = candles[i].h - candles[i - 1].h;
    const dn = candles[i - 1].l - candles[i].l;
    plusDM.push(up > dn && up > 0 ? up : 0);
    minusDM.push(dn > up && dn > 0 ? dn : 0);
    const pc = candles[i - 1].c;
    trArr.push(Math.max(candles[i].h - candles[i].l, Math.abs(candles[i].h - pc), Math.abs(candles[i].l - pc)));
  }

  const sTR   = rma(trArr, period);
  const sPDM  = rma(plusDM, period);
  const sMDM  = rma(minusDM, period);

  const dx = sTR.map((tr, i) => {
    if (isNaN(tr) || tr === 0) return NaN;
    const pdi = (sPDM[i] / tr) * 100;
    const mdi = (sMDM[i] / tr) * 100;
    const sum = pdi + mdi;
    return sum === 0 ? 0 : (Math.abs(pdi - mdi) / sum) * 100;
  });

  return rma(dx.map(v => isNaN(v) ? 0 : v), period);
}

/**
 * Compute the full Andybiotic Max% signal set from a candle array.
 * Requires at least 220 candles for EMA(200) to be meaningful.
 * Returns null when not enough data.
 */
export function computeAndybiotic(
  candles: OHLC[],
  sensitivity = 4
): AndybioticSignal | null {
  if (candles.length < 30) return null;

  const closes = candles.map(b => b.c);
  const factor = sensitivity * 2; // Andybiotic uses nsensitivity * 2

  const { line: stLine, dir } = superTrendSeries(candles, factor, 11);
  const ema200Arr = andyEma(closes, 200);
  const sma13Arr  = andySma(closes, 13);
  const adxArr    = adxSeries(candles, 15);

  const n = candles.length;
  const last    = n - 1;
  const prev    = n - 2;

  const stCur   = stLine[last];
  const stPrev  = stLine[prev];
  const cCur    = closes[last];
  const cPrev   = closes[prev];
  const ema200  = ema200Arr[last];
  const sma13   = sma13Arr[last];
  const adxVal  = adxArr[last];

  if (isNaN(stCur) || isNaN(stPrev)) return null;

  // Crossover / crossunder detection (same as Pine Script ta.crossover / ta.crossunder)
  const crossedUp   = cPrev <= stPrev && cCur > stCur;
  const crossedDown = cPrev >= stPrev && cCur < stCur;

  const isBull      = crossedUp   && (!isNaN(sma13) ? cCur >= sma13 : true);
  const isBear      = crossedDown && (!isNaN(sma13) ? cCur <= sma13 : true);
  const isSmartBuy  = isBull && !isNaN(ema200) && cCur > ema200;
  const isSmartSell = isBear && !isNaN(ema200) && cCur < ema200;
  const isSideways  = !isNaN(adxVal) && adxVal < 15;

  // Count bars since last signal
  let barsSinceBull = 9999, barsSinceBear = 9999;
  for (let i = last; i >= Math.max(0, last - 100); i--) {
    const cp = closes[i - 1] ?? closes[i];
    const sp = stLine[i - 1] ?? stLine[i];
    if (cp <= sp && closes[i] > stLine[i]) {
      barsSinceBull = last - i;
      break;
    }
  }
  for (let i = last; i >= Math.max(0, last - 100); i--) {
    const cp = closes[i - 1] ?? closes[i];
    const sp = stLine[i - 1] ?? stLine[i];
    if (cp >= sp && closes[i] < stLine[i]) {
      barsSinceBear = last - i;
      break;
    }
  }

  return {
    superTrend:     stCur,
    superTrendDir:  dir[last] as 1 | -1,
    ema200:         isNaN(ema200) ? null : ema200,
    sma13:          isNaN(sma13)  ? null : sma13,
    isBull,
    isBear,
    isSmartBuy,
    isSmartSell,
    adx:            isNaN(adxVal) ? null : adxVal,
    isSideways,
    barsSinceBull,
    barsSinceBear,
  };
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
