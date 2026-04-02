import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface KeyLevel {
  asset: string;
  price: number;
  bias: "bullish" | "bearish" | "neutral";
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward: string;
  support: number;
  resistance: number;
  pivot: number;
  note: string;
}

let cache: { data: KeyLevel[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 300_000; // 5 min

const ASSETS = [
  { symbol: "XAU/USD", display: "XAUUSD", step: 10, slMultiplier: 0.008, tpMultiplier: 0.015 },
  { symbol: "EUR/USD", display: "EURUSD", step: 0.005, slMultiplier: 0.004, tpMultiplier: 0.008 },
  { symbol: "USD/JPY", display: "USDJPY", step: 0.5, slMultiplier: 0.004, tpMultiplier: 0.008 },
  { symbol: "BTC/USD", display: "BTCUSD", step: 250, slMultiplier: 0.02, tpMultiplier: 0.04 },
  { symbol: "GBP/USD", display: "GBPUSD", step: 0.005, slMultiplier: 0.004, tpMultiplier: 0.008 },
  { symbol: "USD/CAD", display: "USDCAD", step: 0.005, slMultiplier: 0.004, tpMultiplier: 0.008 },
];

function roundToStep(value: number, step: number): number {
  const result = Math.round(value / step) * step;
  // Fix floating point precision
  const decimals = step < 0.01 ? 4 : step < 1 ? 3 : step < 10 ? 1 : 0;
  return parseFloat(result.toFixed(decimals));
}

function deriveBias(pctChange: number): "bullish" | "bearish" | "neutral" {
  if (pctChange > 0.25) return "bullish";
  if (pctChange < -0.25) return "bearish";
  return "neutral";
}

function calculateLevels(
  price: number,
  high: number,
  low: number,
  open: number,
  prevClose: number,
  pctChange: number,
  config: typeof ASSETS[0]
): KeyLevel {
  const bias = deriveBias(pctChange);

  // Classic pivot point
  const pivot = (high + low + prevClose) / 3;
  const s1 = 2 * pivot - high;      // Support 1
  const r1 = 2 * pivot - low;       // Resistance 1

  // Key support/resistance from daily range
  const support = roundToStep(Math.min(s1, low), config.step);
  const resistance = roundToStep(Math.max(r1, high), config.step);

  // Entry, SL, TP based on bias
  // SL uses config.slMultiplier for a realistic tight stop.
  // TPs are projected from actual risk so R:R is always ≥ 1.5:1 (TP1) and ≥ 2.5:1 (TP2).
  let entry: number, stopLoss: number, tp1: number, tp2: number;

  if (bias === "bullish") {
    entry    = roundToStep(price - price * 0.001, config.step);
    stopLoss = roundToStep(entry  - entry  * config.slMultiplier, config.step);
    const riskBull = Math.abs(entry - stopLoss);
    tp1 = roundToStep(entry + riskBull * 1.5, config.step);
    tp2 = roundToStep(entry + riskBull * 2.5, config.step);
  } else if (bias === "bearish") {
    entry    = roundToStep(price + price * 0.001, config.step);
    stopLoss = roundToStep(entry  + entry  * config.slMultiplier, config.step);
    const riskBear = Math.abs(stopLoss - entry);
    tp1 = roundToStep(entry - riskBear * 1.5, config.step);
    tp2 = roundToStep(entry - riskBear * 2.5, config.step);
  } else {
    // Neutral: range trade, TP still guaranteed ≥ 1.5:1
    entry    = roundToStep(price, config.step);
    stopLoss = roundToStep(price - price * config.slMultiplier, config.step);
    const riskNeut = Math.abs(entry - stopLoss);
    tp1 = roundToStep(entry + riskNeut * 1.5, config.step);
    tp2 = roundToStep(entry + riskNeut * 2.5, config.step);
  }

  // Risk/Reward calculation (always based on TP1)
  const risk   = Math.abs(entry - stopLoss);
  const reward = Math.abs(tp1   - entry);
  const rr = risk > 0 ? (reward / risk).toFixed(1) : "—";

  const dec = config.step < 1 ? 4 : 0;
  const riskAmt  = risk.toFixed(dec);
  const tp1Amt   = reward.toFixed(dec);
  const tp2Amt   = Math.abs(tp2 - entry).toFixed(dec);
  const rrLabel  = `${rr}:1 R:R`;

  // Generate note
  const note = bias === "bullish"
    ? `Buy on pullback to ${entry.toFixed(dec)}. Risk ${riskAmt} to SL with ${tp1Amt} reward to TP1 (${rrLabel}). Pivot ${roundToStep(pivot, config.step).toFixed(dec)} is key intraday support.`
    : bias === "bearish"
    ? `Sell rally to ${entry.toFixed(dec)}. Risk ${riskAmt} to SL with ${tp1Amt} reward to TP1 (${rrLabel}). Pivot ${roundToStep(pivot, config.step).toFixed(dec)} acts as resistance.`
    : `Range-bound between ${support.toFixed(dec)}–${resistance.toFixed(dec)}. Wait for a confirmed break before committing. Risk ${riskAmt} if entering at midpoint.`;

  return {
    asset: config.display,
    price,
    bias,
    entry,
    stopLoss,
    takeProfit1: tp1,
    takeProfit2: tp2,
    riskReward: `1:${rr}`,
    support,
    resistance,
    pivot: roundToStep(pivot, config.step),
    note,
  };
}

export async function GET() {
  if (cache.data.length > 0 && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ data: cache.data, timestamp: cache.ts, cached: true });
  }

  try {
    const apiKey = process.env.TWELVEDATA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ data: [], timestamp: Date.now(), error: "No TWELVEDATA_API_KEY" });
    }

    // Ensure shared quotes cache is warm, then read from it
    const { ensureCacheWarm, getQuotesForSymbols } = await import("@/lib/api/quotes-cache");
    await ensureCacheWarm();
    const quoteData = getQuotesForSymbols(ASSETS.map(a => a.symbol));

    const levels: KeyLevel[] = [];

    for (const config of ASSETS) {
      const quote = quoteData[config.symbol];
      if (!quote || (quote as any).code) continue;

      const price = parseFloat(quote.close) || 0;
      const high = parseFloat(quote.high || quote.close) || price;
      const low = parseFloat(quote.low || quote.close) || price;
      const open = parseFloat(quote.open || quote.close) || price;
      const prevClose = parseFloat(quote.previous_close || quote.close) || price;
      const pctChange = parseFloat(quote.percent_change) || 0;

      if (price > 0) {
        levels.push(calculateLevels(price, high, low, open, prevClose, pctChange, config));
      }
    }

    if (levels.length > 0) {
      cache = { data: levels, ts: Date.now() };
    }

    return NextResponse.json({ data: levels, timestamp: Date.now(), count: levels.length });
  } catch (error) {
    console.error("KeyLevels API error:", error);
    return NextResponse.json({ data: cache.data, timestamp: Date.now(), error: "fetch failed" });
  }
}
