/**
 * TradeX Trend System v1.7, ported from docs/reference/TradeX_TrendSystem_v1_7.pine.
 *
 * Pure, synchronous, no UI. Only CLOSED candles are used: the forming candle of
 * every timeframe is dropped before any calculation, so nothing repaints and
 * nothing looks ahead. EXPERIMENTAL: statistics describe a small backtest of
 * the rule, they are not a forecast and not a profit signal.
 */

import { atr, dmi, ema, sma, supertrend } from "./indicators";
import { computeStats, gradeOf } from "./stats";
import {
  DEFAULT_PARAMS, MTF_TFS, TF_SECONDS,
  type Candle, type CandlesByTf, type LatestState, type MarketState, type MtfTf, type Outcome, type Series,
  type SessionName, type Side, type StDir, type Tf, type TradeRecord, type Trend, type TrendParams, type TrendSnapshot,
} from "./types";

export * from "./types";
export { computeStats, ci95, compareColor, edgePerTrade, winRate } from "./stats";
export { atr, dmi, ema, rma, sma, supertrend, trueRange } from "./indicators";
export { TRADEX_TREND_ENABLED } from "./flag";

const nul = (v: number): number | null => (Number.isNaN(v) ? null : v);

/** Drop candles that have not closed at `asOf` (unix seconds). */
export function closedOnly(c: Candle[] | undefined, tf: Tf, asOf: number): Candle[] {
  if (!c) return [];
  let end = c.length;
  while (end > 0 && c[end - 1].time + TF_SECONDS[tf] > asOf) end--;
  return end === c.length ? c : c.slice(0, end);
}

/** Did this candle end the trade? SL is checked first, so SL wins ties. */
export function checkExit(
  t: Pick<TradeRecord, "side" | "sl" | "tp1">,
  k: Pick<Candle, "high" | "low">,
): "LOSS" | "WIN" | null {
  const long = t.side === "BUY";
  if (long ? k.low <= t.sl : k.high >= t.sl) return "LOSS";
  if (long ? k.high >= t.tp1 : k.low <= t.tp1) return "WIN";
  return null;
}

export function marketState(adx: number, threshold = 25): MarketState {
  return adx >= threshold ? "Trending" : adx >= 15 ? "Ranging" : "Dead";
}

export function sessionAt(unixSec: number): SessionName {
  const h = new Date(unixSec * 1000).getUTCHours();
  if (h >= 13 && h < 16) return "London / NY";
  if (h >= 7 && h < 13) return "London";
  if (h >= 16 && h < 21) return "New York";
  if (h < 7) return "Asia";
  return "Off hours";
}

interface MtfSeries {
  /** Close time of each closed candle. */
  closeTime: number[];
  dir: StDir[];
  /** Number of leading candles with a defined SuperTrend (ATR available). */
  warm: number;
}

/** MTF trend at time T = SuperTrend of the last candle that closed at or before T. */
function trendAt(s: MtfSeries | undefined, t: number): Trend {
  if (!s || s.closeTime.length === 0) return 0;
  let lo = 0;
  let hi = s.closeTime.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (s.closeTime[mid] <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1;
  }
  if (idx < s.warm) return 0;
  return s.dir[idx] < 0 ? 1 : -1;
}

export function computeTradexTrend(
  candlesByTf: CandlesByTf,
  chartTf: Tf,
  params: Partial<TrendParams> = {},
  asOf: number = Math.floor(Date.now() / 1000),
): TrendSnapshot {
  const p: TrendParams = { ...DEFAULT_PARAMS, ...params };
  const c = closedOnly(candlesByTf[chartTf], chartTf, asOf);
  const n = c.length;
  const chartSec = TF_SECONDS[chartTf];

  // ---- Core series on the chart timeframe
  const st = supertrend(c, p.stFactor, p.atrLen);
  const emaF = ema(c.map((k) => k.close), p.emaLen);
  const atrV = atr(c, p.atrLen);
  const atrAvg = sma(atrV, 100);
  const { adx } = dmi(c, p.adxLen);
  const basis = ema(c.map((k) => (k.high + k.low + k.close) / 3), p.cloudLen);

  const series: Series = {
    time: c.map((k) => k.time),
    stLine: st.line.map(nul),
    stDir: st.dir,
    ema: emaF.map(nul),
    cloudTop: basis.map((b, i) => nul(b + atrV[i] * p.cloudMult)),
    cloudBottom: basis.map((b, i) => nul(b - atrV[i] * p.cloudMult)),
    atr: atrV.map(nul),
    adx: adx.map(nul),
  };

  // ---- Multi-timeframe trends (closed candles only)
  const mtf: Partial<Record<MtfTf, MtfSeries>> = {};
  for (const tf of MTF_TFS) {
    const src = closedOnly(candlesByTf[tf], tf, asOf);
    if (src.length === 0) continue;
    const r = supertrend(src, p.stFactor, p.atrLen);
    mtf[tf] = {
      closeTime: src.map((k) => k.time + TF_SECONDS[tf]),
      dir: r.dir,
      warm: p.atrLen, // first bar with ATR[1] defined is index atrLen
    };
  }
  const mtfAt = (t: number) => {
    const m = {} as Record<MtfTf, Trend>;
    let sum = 0;
    for (const tf of MTF_TFS) { m[tf] = trendAt(mtf[tf], t); sum += m[tf]; }
    return { m, sum };
  };

  // ---- Signals, trade levels, honest tracker (mirrors the Pine state machine)
  const signals: TrendSnapshot["signals"] = [];
  const trades: TradeRecord[] = [];
  let open: TradeRecord | null = null;

  const close = (t: TradeRecord, outcome: Outcome, i: number) => {
    t.outcome = outcome;
    t.exitIndex = i;
    t.exitTime = c[i].time + chartSec;
  };

  for (let i = 1; i < n; i++) {
    const buyRaw = st.dir[i] < st.dir[i - 1];
    const sellRaw = st.dir[i] > st.dir[i - 1];
    const smart = buyRaw ? c[i].close > emaF[i] : sellRaw ? c[i].close < emaF[i] : false;
    const isSig = (buyRaw || sellRaw) && (!p.smartOnly || smart);

    if (isSig) {
      const side: Side = buyRaw ? "BUY" : "SELL";
      const dirSign = buyRaw ? 1 : -1;
      signals.push({ index: i, time: c[i].time, side, smart });
      if (open) close(open, "FLIP", i);

      // Factors evaluated at the signal candle's close, HTF from closed candles only.
      const tClose = c[i].time + chartSec;
      const { m, sum } = mtfAt(tClose);
      const trendSign = st.dir[i] < 0 ? 1 : -1; // == dirSign for a flip
      const f1 = adx[i] >= p.adxThreshold;
      const f2 = (trendSign === 1 && sum >= 3) || (trendSign === -1 && sum <= -3);
      const f3 = m.H1 === trendSign && m.H4 === trendSign;
      const f4 = trendSign === 1 ? c[i].close > emaF[i] : c[i].close < emaF[i];
      const h = new Date(c[i].time * 1000).getUTCHours();
      const f5 = h >= 7 && h < 21;
      const factors: TradeRecord["factors"] = [f1, f2, f3, f4, f5];
      const score = factors.filter(Boolean).length;

      const r = atrV[i] * p.slAtrMult;
      const entry = c[i].close;
      // P&L per lot = R * contract, in the quote currency; convert to USD when USD is the base.
      const lotsRaw = r > 0 ? p.riskUsd / (r * p.contractSize * (p.quoteUsd ? 1 : 1 / entry)) : 0;
      open = {
        index: i, time: c[i].time, side, smart,
        entry, sl: entry - dirSign * r,
        tp1: entry + dirSign * r, tp2: entry + dirSign * r * 2, tp3: entry + dirSign * r * 3,
        r, lots: Math.floor(lotsRaw * 100 + 1e-9) / 100, riskUsd: p.riskUsd,
        factors, score, grade: gradeOf(score),
        outcome: "OPEN", exitIndex: null, exitTime: null,
      };
      trades.push(open);
    } else if (open) {
      // From the candle AFTER the signal.
      const res = checkExit(open, c[i]);
      if (res) { close(open, res, i); open = null; }
    }
  }

  const stats = computeStats(trades, p.costR);

  // ---- Latest state
  let latest: LatestState | null = null;
  if (n > 0) {
    const i = n - 1;
    const tClose = c[i].time + chartSec;
    const { m, sum } = mtfAt(tClose);
    const a = Number.isNaN(atrV[i]) ? null : atrV[i];
    const ax = Number.isNaN(adx[i]) ? null : adx[i];
    const vol = sma(c.map((k) => k.volume), 20)[i];
    const hasVol = c.some((k) => k.volume > 0);
    const lastSig = signals.length ? signals[signals.length - 1] : null;
    latest = {
      time: c[i].time,
      close: c[i].close,
      bullish: st.dir[i] < 0,
      atr: a,
      adx: ax,
      market: ax === null ? null : marketState(ax, p.adxThreshold),
      volRatio: a !== null && atrAvg[i] > 0 ? a / atrAvg[i] : null,
      session: sessionAt(asOf),
      mtf: m,
      mtfSum: sum,
      mtfBias: sum >= 3 ? "Bullish" : sum <= -3 ? "Bearish" : "Mixed",
      volHigh: hasVol && !Number.isNaN(vol) ? c[i].volume > vol : null,
      lastSignal: lastSig
        ? { side: lastSig.side, smart: lastSig.smart, barsAgo: i - lastSig.index, time: lastSig.time }
        : null,
      trade: trades.length ? trades[trades.length - 1] : null,
    };
  }

  return { chartTf, params: p, asOf, series, signals, trades, stats, latest };
}
