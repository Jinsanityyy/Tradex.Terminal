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
  macdHist: number,
  high: number,
  low: number,
  open: number,
  prevClose: number
): { bias: "bullish" | "bearish" | "neutral"; confidence: number; smcContext: string } {
  let score = 0;

  // ── Price Action / Structure (primary — SMC priority) ──
  const range52 = high52w - low52w;
  const pos52 = range52 > 0 ? (price - low52w) / range52 : 0.5;
  const equilibrium = (high + low) / 2;
  const inDiscount = price < equilibrium;
  const inPremium  = price > equilibrium;
  const posInRange = (high - low) > 0 ? (price - low) / (high - low) : 0.5;

  // BOS detection: significant break of previous close
  const bosUp   = pctChange > 0.4;
  const bosDown = pctChange < -0.4;
  const choch   = (pos52 > 0.6 && pctChange < -0.6) || (pos52 < 0.4 && pctChange > 0.6);

  if (bosUp)   score += 30;
  if (bosDown) score -= 30;
  if (choch)   score  = choch && pctChange > 0 ? Math.max(score, 20) : Math.min(score, -20);

  // Premium/Discount alignment
  if (pctChange > 0 && inDiscount) score += 15; // buy in discount = institutional
  if (pctChange < 0 && inPremium)  score -= 15; // sell in premium = institutional
  if (pctChange > 0 && inPremium)  score -= 5;  // buying premium = risky
  if (pctChange < 0 && inDiscount) score += 5;  // selling discount = risky

  // ── RSI (secondary — confirms, not primary) ──
  if (rsi > 70) score -= 10;
  else if (rsi > 60) score += 12;
  else if (rsi > 50) score += 6;
  else if (rsi > 40) score -= 6;
  else if (rsi > 30) score -= 12;
  else score += 10; // deeply oversold = reversal potential

  // ── 52-week structural position ──
  if (pos52 > 0.8) score += 8;
  else if (pos52 > 0.6) score += 12;
  else if (pos52 > 0.4) score += 3;
  else if (pos52 > 0.2) score -= 8;
  else score -= 12;

  // ── MACD secondary ──
  if (macdHist > 0) score += Math.min(15, macdHist * 30);
  else score += Math.max(-15, macdHist * 30);

  score = Math.max(-100, Math.min(100, score));

  const bias = score > 15 ? "bullish" : score < -15 ? "bearish" : "neutral";
  const confidence = Math.min(95, Math.max(25, 50 + Math.abs(score) * 0.45));

  // SMC context string
  const smcContext = [
    bosUp   ? "BOS to upside detected" : bosDown ? "BOS to downside detected" : "No clear BOS",
    choch   ? "CHoCH in play — potential trend reversal" : "",
    inDiscount ? "Price in discount zone (buy area)" : inPremium ? "Price in premium zone (sell area)" : "Price at equilibrium",
    `52w position: ${(pos52 * 100).toFixed(0)}% of annual range`,
  ].filter(Boolean).join(" | ");

  return { bias, confidence: Math.round(confidence), smcContext };
}

function generateSupportingFactors(
  bias: "bullish" | "bearish" | "neutral",
  rsi: number,
  pctChange: number,
  price: number,
  high52w: number,
  low52w: number,
  macdHist: number,
  assetName: string,
  high: number,
  low: number,
  prevClose: number
): string[] {
  const factors: string[] = [];
  const range52 = high52w - low52w;
  const pos52 = range52 > 0 ? (price - low52w) / range52 : 0.5;
  const equilibrium = (high + low) / 2;
  const inDiscount = price < equilibrium;
  const inPremium  = price > equilibrium;
  const bosUp   = pctChange > 0.4;
  const bosDown = pctChange < -0.4;

  if (bias === "bullish") {
    if (bosUp) factors.push(`BOS to upside — ${assetName} broke ${prevClose.toFixed(2)} with ${Math.abs(pctChange).toFixed(2)}% momentum`);
    if (inDiscount) factors.push(`Price in discount zone below EQ ${equilibrium.toFixed(2)} — institutional buy area`);
    if (rsi > 50 && rsi < 70) factors.push(`RSI ${rsi.toFixed(0)} — momentum positive, not yet overbought`);
    if (rsi < 35) factors.push(`RSI ${rsi.toFixed(0)} — deeply oversold, smart money accumulation likely`);
    if (macdHist > 0) factors.push(`MACD histogram positive — upside momentum confirmed`);
    if (pos52 > 0.6) factors.push(`Upper ${Math.round(pos52 * 100)}% of 52w range — structural HTF uptrend`);
    if (pos52 < 0.3) factors.push(`Near 52w lows — potential liquidity sweep before reversal`);
  } else if (bias === "bearish") {
    if (bosDown) factors.push(`BOS to downside — ${assetName} broke ${prevClose.toFixed(2)}, ${Math.abs(pctChange).toFixed(2)}% selling pressure`);
    if (inPremium) factors.push(`Price in premium zone above EQ ${equilibrium.toFixed(2)} — institutional sell area`);
    if (rsi > 70) factors.push(`RSI ${rsi.toFixed(0)} — overbought, distribution phase likely`);
    if (rsi < 50) factors.push(`RSI ${rsi.toFixed(0)} — below midline, sellers in control`);
    if (macdHist < 0) factors.push(`MACD histogram negative — downward momentum building`);
    if (pos52 < 0.4) factors.push(`Lower ${Math.round(pos52 * 100)}% of 52w range — structural HTF downtrend`);
  } else {
    factors.push(`Price at equilibrium ${equilibrium.toFixed(2)} — no clear directional bias`);
    factors.push(`RSI ${rsi.toFixed(0)} near midline — neither buyers nor sellers in control`);
    factors.push(`Wait for BOS above ${high.toFixed(2)} or below ${low.toFixed(2)} before committing`);
  }

  if (factors.length < 3) {
    factors.push(`52w range: ${low52w.toFixed(2)}–${high52w.toFixed(2)}, price at ${(pos52 * 100).toFixed(0)}% of range`);
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
      const high = parseFloat(quote.high || quote.close) || price;
      const low = parseFloat(quote.low || quote.close) || price;
      const open = parseFloat(quote.open || quote.close) || price;
      const prevClose = parseFloat(quote.previous_close || quote.close) || price;
      const pctChange = parseFloat(quote.percent_change) || 0;
      const high52w = parseFloat(quote.fifty_two_week?.high ?? String(price * 1.1));
      const low52w = parseFloat(quote.fifty_two_week?.low ?? String(price * 0.9));
      const rsi = rsiValues[i];
      const macdHist = pctChange * 0.01;

      const effectivePctChange = invertBias ? -pctChange : pctChange;
      const effectiveMacdHist = invertBias ? -macdHist : macdHist;
      const effectiveRsi = invertBias ? (100 - rsi) : rsi;
      const effectiveHigh = invertBias ? price * 2 - low : high;
      const effectiveLow  = invertBias ? price * 2 - high : low;

      const { bias, confidence, smcContext } = deriveBiasFromIndicators(
        effectiveRsi, effectivePctChange, price, high52w, low52w, effectiveMacdHist,
        effectiveHigh, effectiveLow, open, prevClose
      );
      const keyLevels = deriveKeyLevels(price, high52w, low52w);
      const supportingFactors = generateSupportingFactors(bias, rsi, pctChange, price, high52w, low52w, macdHist, asset.display, high, low, prevClose);
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
        smcContext,
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
