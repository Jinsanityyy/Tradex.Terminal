/**
 * Builds a MarketSnapshot from historical candle data for the backtest engine.
 * No live API calls  -  all indicators computed locally from OHLCV arrays.
 */

import type { MarketSnapshot, Symbol, Timeframe, PriceZone, SnapshotCandle } from "@/lib/agents/schemas";
import { rsi as computeRsi, ema, macdHistogram, pos52w as compute52w, detectSession } from "./indicators";

// ─────────────────────────────────────────────────────────────────────────────
// Inline conviction bias (mirrors src/lib/api/conviction.ts, no import needed)
// ─────────────────────────────────────────────────────────────────────────────

function deriveConvictionBias(
  rsiVal: number,
  pctChange: number,
  price: number,
  high52w: number,
  low52w: number,
  macdHist: number,
  high: number,
  low: number,
): { bias: "bullish" | "bearish" | "neutral"; confidence: number; smcContext: string } {
  let score = 0;
  const range52   = high52w - low52w;
  const pos52     = range52 > 0 ? (price - low52w) / range52 : 0.5;
  const equilibrium = (high + low) / 2;
  const inDiscount  = price < equilibrium;
  const inPremium   = price > equilibrium;

  const bosUp   = pctChange > 0.2;
  const bosDown = pctChange < -0.2;
  const choch   = (pos52 > 0.6 && pctChange < -0.5) || (pos52 < 0.4 && pctChange > 0.5);

  if (bosUp)   score += 30;
  if (bosDown) score -= 30;
  if (choch)   score = choch && pctChange > 0 ? Math.max(score, 20) : Math.min(score, -20);

  if (pctChange > 0 && inDiscount) score += 15;
  if (pctChange < 0 && inPremium)  score -= 15;
  if (pctChange > 0 && inPremium)  score -= 2;
  if (pctChange < 0 && inDiscount) score += 2;

  if      (rsiVal > 70) score -= 8;
  else if (rsiVal > 60) score += 14;
  else if (rsiVal > 50) score += 7;
  else if (rsiVal > 40) score -= 7;
  else if (rsiVal > 30) score -= 14;
  else                  score += 8;

  if      (pos52 > 0.75) score += 15;
  else if (pos52 > 0.55) score += 10;
  else if (pos52 > 0.40) score += 4;
  else if (pos52 > 0.25) score -= 8;
  else                   score -= 15;

  if (macdHist > 0) score += Math.min(15, macdHist * 60);
  else              score += Math.max(-15, macdHist * 60);

  score = Math.max(-100, Math.min(100, score));
  const rawBias   = score > 10 ? "bullish" : score < -10 ? "bearish" : "neutral";
  const rawConf   = Math.min(95, Math.max(25, 50 + Math.abs(score) * 0.45));
  const confidence = Math.round(rawConf);
  const bias: "bullish" | "bearish" | "neutral" = confidence >= 50 ? rawBias : "neutral";

  const smcContext = [
    bosUp   ? "BOS to upside detected"   :
    bosDown ? "BOS to downside detected" : "No clear BOS",
    choch   ? "CHoCH in play  -  potential trend reversal" : "",
    inDiscount ? "Price in discount zone (buy area)" :
    inPremium  ? "Price in premium zone" : "Price at equilibrium",
    `52w position: ${(pos52 * 100).toFixed(0)}% of annual range`,
  ].filter(Boolean).join(" | ");

  return { bias, confidence, smcContext };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-computed series cache  -  avoids re-computing for each bar
// ─────────────────────────────────────────────────────────────────────────────

export interface PrecomputedSeries {
  closes:   number[];
  rsiSeries:  number[];
  macdSeries: number[];
  ema20:      number[];
  ema50:      number[];
  ema200:     number[];
}

export function precompute(candles: { c: number }[]): PrecomputedSeries {
  const closes = candles.map(c => c.c);
  return {
    closes,
    rsiSeries:  computeRsi(closes, 14),
    macdSeries: macdHistogram(closes, 12, 26, 9),
    ema20:      ema(closes, 20),
    ema50:      ema(closes, 50),
    ema200:     ema(closes, 200),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot builder
// ─────────────────────────────────────────────────────────────────────────────

export interface SnapshotCandles {
  t: number; o: number; h: number; l: number; c: number; v: number;
}

export function buildHistoricalSnapshot(
  symbol: Symbol,
  timeframe: Timeframe,
  candles: SnapshotCandles[],
  index: number,                  // current bar index
  series: PrecomputedSeries,
): MarketSnapshot {
  const cur  = candles[index];
  const prev = index > 0 ? candles[index - 1] : cur;

  // Price fields
  const close      = cur.c;
  const open       = cur.o;
  const high       = cur.h;
  const low        = cur.l;
  const prevClose  = prev.c;
  const change     = close - prevClose;
  const changePct  = prevClose !== 0 ? (change / prevClose) * 100 : 0;
  const dayRange   = high - low;
  const posInDay   = dayRange > 0 ? ((close - low) / dayRange) * 100 : 50;

  // Indicators
  const rsiVal  = isNaN(series.rsiSeries[index])  ? 50   : series.rsiSeries[index];
  const macdH   = isNaN(series.macdSeries[index]) ? 0    : series.macdSeries[index];

  // 52-week position using all candles up to and including this bar
  const w52 = compute52w(candles, index, candles.length);
  const high52w = w52.high;
  const low52w  = w52.low;

  // Structure
  const lookback20 = candles.slice(Math.max(0, index - 19), index + 1);
  const structuralHigh = Math.max(...lookback20.map(c => c.h));
  const structuralLow  = Math.min(...lookback20.map(c => c.l));
  const equilibrium    = (structuralHigh + structuralLow) / 2;
  const inDiscount     = close < equilibrium;
  const inPremium      = close > equilibrium;
  let zone: PriceZone  = "EQUILIBRIUM";
  if (close < equilibrium * 0.998) zone = "DISCOUNT";
  else if (close > equilibrium * 1.002) zone = "PREMIUM";

  const conviction = deriveConvictionBias(
    rsiVal, changePct, close,
    high52w, low52w, macdH,
    structuralHigh, structuralLow,
  );

  // Session from candle timestamp
  const { session, sessionHour } = detectSession(cur.t);
  const atrProxy  = Math.abs(changePct);

  // Recent 60 candles for PA agent
  const recent60  = candles.slice(Math.max(0, index - 59), index + 1) as SnapshotCandle[];

  const symbolDisplay: Record<string, string> = {
    XAUUSD: "Gold (XAUUSD)",
    EURUSD: "EUR/USD (DXY Proxy)",
    GBPUSD: "GBP/USD",
    BTCUSD: "Bitcoin (BTCUSD)",
  };

  return {
    symbol,
    symbolDisplay: symbolDisplay[symbol] ?? symbol,
    timeframe,
    timestamp: new Date(cur.t * 1000).toISOString(),
    price: {
      current:       close,
      open,
      high,
      low,
      prevClose,
      change,
      changePercent: parseFloat(changePct.toFixed(4)),
      dayRange,
      positionInDay: Math.round(posInDay),
    },
    structure: {
      pos52w:        w52.pos,
      high52w,
      low52w,
      zone,
      htfBias:       conviction.bias,
      htfConfidence: conviction.confidence,
      smcContext:    conviction.smcContext,
      equilibrium,
      inDiscount,
      inPremium,
    },
    indicators: {
      rsi:         parseFloat(rsiVal.toFixed(2)),
      macdHist:    parseFloat(macdH.toFixed(6)),
      atrProxy:    parseFloat(atrProxy.toFixed(4)),
      session,
      sessionHour,
    },
    recentNews: [],   // no live news in backtest
    recentCandles: recent60,
    volatilityHigh:  atrProxy > 1.0,
    isExtended:      rsiVal > 70 || rsiVal < 30,
    hasNewsCatalyst: false,
  };
}
