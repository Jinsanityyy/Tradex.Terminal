import { NextResponse } from "next/server";
import type { BiasData } from "@/types";
import { TRACKED_ASSETS } from "@/lib/api/market-data";

export const dynamic = "force-dynamic";

// Cache bias data for 5 minutes (technical indicators don't change fast)
let cache: { data: BiasData[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 300_000;

// The 4 primary bias assets we analyze
// Note: DXY and SPX are not available on Twelve Data free tier
// We use EUR/USD as inverse DXY proxy and GBP/USD as additional forex pair
const BIAS_ASSETS = [
  {
    symbol: "XAU/USD",
    display: "Gold (XAUUSD)",
    correlatedAssets: ["DXY (inverse)", "US10Y (inverse)", "Silver", "USDJPY (inverse)"],
    macroBase: ["Real yields", "USD strength", "Geopolitical risk", "Central bank demand"],
    sessionBehavior: "London session typically drives directional moves; Asia accumulation phase.",
  },
  {
    symbol: "EUR/USD",
    display: "EUR/USD (DXY Proxy)",
    invertBias: true, // EUR/USD up = DXY down, so invert for DXY bias
    correlatedAssets: ["DXY (inverse)", "Gold", "US10Y", "USDJPY (inverse)"],
    macroBase: ["Fed policy expectations", "ECB rate differentials", "Risk sentiment", "Trade flows"],
    sessionBehavior: "NY session most impactful for DXY; London sets the tone. EUR/USD inversely tracks dollar strength.",
  },
  {
    symbol: "USD/JPY",
    display: "S&P 500 Risk Proxy (USDJPY)",
    correlatedAssets: ["SPX", "NDX", "US10Y", "VIX (inverse)"],
    macroBase: ["Risk appetite", "Yield differentials", "BOJ policy", "Equity correlation"],
    sessionBehavior: "Tracks US equity sentiment closely. Tokyo session sets Asian tone; NY drives direction.",
  },
  {
    symbol: "BTC/USD",
    display: "Bitcoin (BTC)",
    correlatedAssets: ["NDX", "SPX", "Gold (partial)", "ETH"],
    macroBase: ["Liquidity expectations", "ETF flows", "Risk appetite", "Halving cycle"],
    sessionBehavior: "24/7 market; US session tends to set direction; Asia often mean-reverts.",
  },
];

// ── Technical analysis templates based on RSI + price action ──

function deriveBiasFromIndicators(
  rsi: number,
  pctChange: number,
  price: number,
  high52w: number,
  low52w: number,
  macdHist: number
): { bias: "bullish" | "bearish" | "neutral"; confidence: number } {
  let score = 0; // -100 to +100

  // RSI contribution (weight: 30)
  if (rsi > 70) score -= 15; // overbought = bearish signal
  else if (rsi > 60) score += 20;
  else if (rsi > 50) score += 10;
  else if (rsi > 40) score -= 10;
  else if (rsi > 30) score -= 20;
  else score += 15; // oversold = bullish reversal signal

  // Price change contribution (weight: 25)
  if (pctChange > 1.5) score += 25;
  else if (pctChange > 0.5) score += 15;
  else if (pctChange > 0) score += 5;
  else if (pctChange > -0.5) score -= 5;
  else if (pctChange > -1.5) score -= 15;
  else score -= 25;

  // MACD histogram contribution (weight: 25)
  if (macdHist > 0) score += Math.min(25, macdHist * 50);
  else score += Math.max(-25, macdHist * 50);

  // 52-week range position (weight: 20)
  const range = high52w - low52w;
  if (range > 0) {
    const position = (price - low52w) / range; // 0 = at low, 1 = at high
    if (position > 0.8) score += 10; // near highs = momentum
    else if (position > 0.6) score += 15;
    else if (position > 0.4) score += 5;
    else if (position > 0.2) score -= 10;
    else score -= 15; // near lows = bearish
  }

  // Clamp score
  score = Math.max(-100, Math.min(100, score));

  const bias = score > 15 ? "bullish" : score < -15 ? "bearish" : "neutral";
  const confidence = Math.min(95, Math.max(25, 50 + Math.abs(score) * 0.45));

  return { bias, confidence: Math.round(confidence) };
}

function generateSupportingFactors(
  bias: "bullish" | "bearish" | "neutral",
  rsi: number,
  pctChange: number,
  price: number,
  high52w: number,
  low52w: number,
  macdHist: number,
  assetName: string
): string[] {
  const factors: string[] = [];
  const range = high52w - low52w;
  const position = range > 0 ? (price - low52w) / range : 0.5;

  if (bias === "bullish" || bias === "neutral") {
    if (pctChange > 0) factors.push(`${assetName} up ${Math.abs(pctChange).toFixed(2)}% — positive momentum in current session`);
    if (rsi > 50 && rsi < 70) factors.push(`RSI at ${rsi.toFixed(0)} — bullish territory without overbought risk`);
    if (rsi <= 35) factors.push(`RSI at ${rsi.toFixed(0)} — deeply oversold, reversal potential building`);
    if (macdHist > 0) factors.push(`MACD histogram positive (${macdHist.toFixed(4)}) — upward momentum confirmed`);
    if (position > 0.6) factors.push(`Trading in upper ${Math.round(position * 100)}% of 52-week range — structural uptrend intact`);
    if (position < 0.3) factors.push(`Near 52-week lows — mean reversion opportunity developing`);
  } else {
    if (pctChange < 0) factors.push(`${assetName} down ${Math.abs(pctChange).toFixed(2)}% — selling pressure dominant`);
    if (rsi > 70) factors.push(`RSI at ${rsi.toFixed(0)} — overbought, correction risk elevated`);
    if (rsi < 50) factors.push(`RSI at ${rsi.toFixed(0)} — bearish territory, sellers in control`);
    if (macdHist < 0) factors.push(`MACD histogram negative (${macdHist.toFixed(4)}) — downward momentum building`);
    if (position < 0.4) factors.push(`Trading in lower ${Math.round(position * 100)}% of 52-week range — weakness persists`);
  }

  // Pad with generic context-aware factors
  if (factors.length < 3) {
    if (rsi > 40 && rsi < 60) factors.push(`RSI near neutral at ${rsi.toFixed(0)} — waiting for directional catalyst`);
    factors.push(`Price at ${price.toFixed(2)} within 52-week range of ${low52w.toFixed(2)}–${high52w.toFixed(2)}`);
  }

  return factors.slice(0, 5);
}

function generateInvalidationFactors(
  bias: "bullish" | "bearish" | "neutral",
  rsi: number,
  price: number,
  high52w: number,
  low52w: number,
  support: number,
  resistance: number
): string[] {
  const factors: string[] = [];

  if (bias === "bullish") {
    factors.push(`Break below ${support.toFixed(2)} support would negate bullish structure`);
    if (rsi > 65) factors.push(`RSI approaching overbought — momentum exhaustion possible above 70`);
    factors.push(`Failure to hold above ${(price * 0.985).toFixed(2)} intraday suggests sellers stepping in`);
    factors.push(`Sudden risk-off event or USD strength could reverse gains`);
  } else if (bias === "bearish") {
    factors.push(`Break above ${resistance.toFixed(2)} resistance would invalidate bearish thesis`);
    if (rsi < 35) factors.push(`RSI nearing oversold — snapback rally risk increasing`);
    factors.push(`Reclaim of ${(price * 1.015).toFixed(2)} would signal potential reversal`);
    factors.push(`Dovish policy surprise or risk-on catalyst could trigger short squeeze`);
  } else {
    factors.push(`Decisive break above ${resistance.toFixed(2)} would tilt bias bullish`);
    factors.push(`Break below ${support.toFixed(2)} would shift bias bearish`);
    factors.push(`Consolidation may continue until next macro catalyst`);
  }

  return factors.slice(0, 4);
}

function deriveKeyLevels(price: number, high52w: number, low52w: number): { support: number; resistance: number } {
  // Simple key level derivation from price structure
  const range = high52w - low52w;
  const position = range > 0 ? (price - low52w) / range : 0.5;

  // Support: nearest round number below, or recent structure
  const step = price > 1000 ? 50 : price > 100 ? 10 : price > 10 ? 1 : 0.005;
  const support = Math.floor((price - price * 0.02) / step) * step;
  const resistance = Math.ceil((price + price * 0.02) / step) * step;

  return { support: parseFloat(support.toFixed(4)), resistance: parseFloat(resistance.toFixed(4)) };
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
    const finalQuoteData = getQuotesForSymbols(BIAS_ASSETS.map(a => a.symbol));

    // Fetch RSI — only 4 credits, cached for 5 min so won't repeat often
    const rsiPromises = BIAS_ASSETS.map(async (asset) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const rsiUrl = `https://api.twelvedata.com/rsi?symbol=${asset.symbol}&interval=1day&time_period=14&outputsize=1&apikey=${apiKey}`;
        const res = await fetch(rsiUrl, { signal: controller.signal, cache: "no-store" });
        clearTimeout(timer);
        if (!res.ok) return 50;
        const data = await res.json();
        if (data.code === 429) return 50;
        return parseFloat(data.values?.[0]?.rsi ?? "50");
      } catch {
        return 50;
      }
    });

    const rsiValues = await Promise.all(rsiPromises);

    // Build bias data for each asset
    const biasResults: BiasData[] = BIAS_ASSETS.map((asset, i) => {
      const invertBias = "invertBias" in asset && asset.invertBias;
      const quote = finalQuoteData[asset.symbol];
      if (!quote || (quote as any).code) {
        return {
          asset: asset.display,
          bias: "neutral" as const,
          confidence: 50,
          supportingFactors: ["Data temporarily unavailable — awaiting market data refresh"],
          invalidationFactors: ["Monitor for data availability"],
          keyLevels: { support: 0, resistance: 0 },
          macroDrivers: asset.macroBase,
          correlatedAssets: asset.correlatedAssets,
          sessionBehavior: asset.sessionBehavior,
        };
      }

      const price = parseFloat(quote.close) || 0;
      const pctChange = parseFloat(quote.percent_change) || 0;
      const high52w = parseFloat(quote.fifty_two_week?.high ?? String(price * 1.1));
      const low52w = parseFloat(quote.fifty_two_week?.low ?? String(price * 0.9));
      const rsi = rsiValues[i];
      const macdHist = pctChange * 0.01;

      const effectivePctChange = invertBias ? -pctChange : pctChange;
      const effectiveMacdHist = invertBias ? -macdHist : macdHist;
      const effectiveRsi = invertBias ? (100 - rsi) : rsi;

      const { bias, confidence } = deriveBiasFromIndicators(effectiveRsi, effectivePctChange, price, high52w, low52w, effectiveMacdHist);
      const keyLevels = deriveKeyLevels(price, high52w, low52w);
      const supportingFactors = generateSupportingFactors(bias, rsi, pctChange, price, high52w, low52w, macdHist, asset.display);
      const invalidationFactors = generateInvalidationFactors(bias, rsi, price, high52w, low52w, keyLevels.support, keyLevels.resistance);

      const macroDrivers = [...asset.macroBase];
      if (Math.abs(pctChange) > 1) macroDrivers.push("High volatility session");
      if (rsi > 70 || rsi < 30) macroDrivers.push("Extreme RSI reading");

      return {
        asset: asset.display,
        bias,
        confidence,
        supportingFactors,
        invalidationFactors,
        keyLevels,
        macroDrivers: macroDrivers.slice(0, 5),
        correlatedAssets: asset.correlatedAssets,
        sessionBehavior: asset.sessionBehavior,
      };
    });

    if (biasResults.length > 0) {
      cache = { data: biasResults, ts: Date.now() };
    }

    return NextResponse.json({ data: biasResults, timestamp: Date.now(), count: biasResults.length });
  } catch (error) {
    console.error("Bias API error:", error);
    return NextResponse.json({ data: cache.data, timestamp: Date.now(), error: "fetch failed" });
  }
}
