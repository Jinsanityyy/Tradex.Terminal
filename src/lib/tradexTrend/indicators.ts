/**
 * TradingView-exact indicator math. Series are plain number arrays; NaN means
 * "na" (not yet defined).
 */

import type { Candle, StDir } from "./types";

/** ta.tr: first bar = high - low. */
export function trueRange(c: Candle[]): number[] {
  return c.map((k, i) =>
    i === 0
      ? k.high - k.low
      : Math.max(k.high - k.low, Math.abs(k.high - c[i - 1].close), Math.abs(k.low - c[i - 1].close)),
  );
}

/**
 * ta.rma (Wilder). Seeded with the SMA of the first `len` defined values,
 * then rma = (prev * (len - 1) + x) / len. Leading NaNs in `x` are skipped,
 * so the first output is at (first defined index + len - 1).
 */
export function rma(x: number[], len: number): number[] {
  const out = new Array<number>(x.length).fill(NaN);
  let first = 0;
  while (first < x.length && Number.isNaN(x[first])) first++;
  if (first + len > x.length) return out;
  let sum = 0;
  for (let i = first; i < first + len; i++) sum += x[i];
  let prev = sum / len;
  out[first + len - 1] = prev;
  for (let i = first + len; i < x.length; i++) {
    prev = (prev * (len - 1) + x[i]) / len;
    out[i] = prev;
  }
  return out;
}

/** ta.atr = rma(tr, len). */
export function atr(c: Candle[], len: number): number[] {
  return rma(trueRange(c), len);
}

/** ta.ema: alpha = 2 / (len + 1), seeded with the first source value. */
export function ema(x: number[], len: number): number[] {
  const out = new Array<number>(x.length).fill(NaN);
  const a = 2 / (len + 1);
  let prev = NaN;
  for (let i = 0; i < x.length; i++) {
    if (Number.isNaN(x[i])) continue;
    prev = Number.isNaN(prev) ? x[i] : a * x[i] + (1 - a) * prev;
    out[i] = prev;
  }
  return out;
}

/** ta.sma; NaN until `len` defined values are available. */
export function sma(x: number[], len: number): number[] {
  const out = new Array<number>(x.length).fill(NaN);
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < x.length; i++) {
    if (!Number.isNaN(x[i])) { sum += x[i]; cnt++; }
    if (i >= len && !Number.isNaN(x[i - len])) { sum -= x[i - len]; cnt--; }
    if (cnt === len) out[i] = sum / len;
  }
  return out;
}

export interface SuperTrendResult {
  /** NaN until ATR is defined. */
  line: number[];
  /** 1 = downtrend, -1 = uptrend. */
  dir: StDir[];
}

/** ta.supertrend(factor, atrLen), source hl2. Mirrors the Pine built-in line by line. */
export function supertrend(c: Candle[], factor: number, atrLen: number): SuperTrendResult {
  const a = atr(c, atrLen);
  const n = c.length;
  const line = new Array<number>(n).fill(NaN);
  const dir = new Array<StDir>(n).fill(1);
  let prevLower = 0; // nz(lowerBand[1])
  let prevUpper = 0;
  let prevSt = NaN;
  for (let i = 0; i < n; i++) {
    const hl2 = (c[i].high + c[i].low) / 2;
    let upper = hl2 + factor * a[i];
    let lower = hl2 - factor * a[i];
    const prevClose = i > 0 ? c[i - 1].close : NaN;
    // NaN comparisons are false, so while ATR is na the bands fall back to nz(prev) = 0, as in Pine.
    lower = lower > prevLower || prevClose < prevLower ? lower : prevLower;
    upper = upper < prevUpper || prevClose > prevUpper ? upper : prevUpper;
    let d: StDir;
    if (i === 0 || Number.isNaN(a[i - 1])) d = 1;
    else if (prevSt === prevUpper) d = c[i].close > upper ? -1 : 1;
    else d = c[i].close < lower ? 1 : -1;
    const st = d === -1 ? lower : upper;
    dir[i] = d;
    line[i] = Number.isNaN(a[i]) ? NaN : st;
    prevSt = st;
    prevLower = Number.isNaN(lower) ? 0 : lower; // nz()
    prevUpper = Number.isNaN(upper) ? 0 : upper;
  }
  return { line, dir };
}

/** ta.dmi(len, len): returns +DI, -DI and ADX. */
export function dmi(c: Candle[], len: number): { plus: number[]; minus: number[]; adx: number[] } {
  const n = c.length;
  const plusDM = new Array<number>(n).fill(NaN);
  const minusDM = new Array<number>(n).fill(NaN);
  for (let i = 1; i < n; i++) {
    const up = c[i].high - c[i - 1].high;
    const down = -(c[i].low - c[i - 1].low);
    plusDM[i] = up > down && up > 0 ? up : 0;
    minusDM[i] = down > up && down > 0 ? down : 0;
  }
  const tr = rma(trueRange(c), len);
  const pS = rma(plusDM, len);
  const mS = rma(minusDM, len);
  const plus = pS.map((v, i) => (100 * v) / tr[i]);
  const minus = mS.map((v, i) => (100 * v) / tr[i]);
  const dx = plus.map((p, i) => {
    if (Number.isNaN(p) || Number.isNaN(minus[i])) return NaN;
    const sum = p + minus[i];
    return Math.abs(p - minus[i]) / (sum === 0 ? 1 : sum);
  });
  const adx = rma(dx, len).map((v) => 100 * v);
  return { plus, minus, adx };
}
