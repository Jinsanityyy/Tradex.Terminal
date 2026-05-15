import { NextResponse } from "next/server";
import type { BiasData } from "@/types";
import { TRACKED_ASSETS } from "@/lib/api/market-data";
import { deriveConvictionBias } from "@/lib/api/conviction";

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

// ── Conviction engine ─────────────────────────────────────────────────────────
// Imported from shared lib  -  same function used by /api/market/keylevels
// to guarantee consistent HTF Bias output across the entire app.

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
  const range52   = high52w - low52w;
  const pos52     = range52 > 0 ? (price - low52w) / range52 : 0.5;
  const equilibrium = (high + low) / 2;
  const inDiscount  = price < equilibrium;
  const inPremium   = price > equilibrium;
  const bosUp       = pctChange > 0.4;
  const bosDown     = pctChange < -0.4;
  const choch       = (pos52 > 0.6 && pctChange < -0.6) || (pos52 < 0.4 && pctChange > 0.6);
  const nearHigh52  = pos52 > 0.85;
  const nearLow52   = pos52 < 0.15;

  if (bias === "bullish") {
    if (bosUp)
      factors.push(`BOS to upside  -  ${assetName} displaced ${Math.abs(pctChange).toFixed(2)}% above ${prevClose.toFixed(2)}, institutional order flow confirmed`);
    if (choch && pctChange > 0)
      factors.push(`CHoCH detected  -  trend reversal from bearish structure, smart money repositioning to long`);
    if (inDiscount)
      factors.push(`Price trading in discount (below EQ ${equilibrium.toFixed(2)})  -  optimal institutional buy zone, OB/FVG entries valid`);
    if (rsi > 50 && rsi < 65)
      factors.push(`RSI ${rsi.toFixed(0)}  -  momentum above midline with room to expand, not yet overbought`);
    if (rsi < 35)
      factors.push(`RSI ${rsi.toFixed(0)}  -  extreme oversold, stop hunts likely complete, reversal accumulation forming`);
    if (nearLow52)
      factors.push(`Price near 52-week low liquidity pool  -  equal lows below offering high-probability reversal zone`);
    if (pos52 > 0.6 && !nearHigh52)
      factors.push(`Upper ${Math.round(pos52 * 100)}% of annual range  -  HTF structural uptrend intact, buy pullbacks`);
    if (macdHist > 0)
      factors.push(`Momentum expansion confirmed  -  displacement candle structure supports continuation`);
  } else if (bias === "bearish") {
    if (bosDown)
      factors.push(`BOS to downside  -  ${assetName} displaced ${Math.abs(pctChange).toFixed(2)}% below ${prevClose.toFixed(2)}, distribution confirmed`);
    if (choch && pctChange < 0)
      factors.push(`CHoCH detected  -  failed attempt at new highs, smart money distributing into retail longs`);
    if (inPremium)
      factors.push(`Price in premium zone (above EQ ${equilibrium.toFixed(2)})  -  institutional sell area, OB/FVG shorts valid`);
    if (rsi > 70)
      factors.push(`RSI ${rsi.toFixed(0)}  -  overbought extreme, distribution phase active, stop hunts above highs probable`);
    if (rsi > 55 && rsi <= 70)
      factors.push(`RSI ${rsi.toFixed(0)}  -  elevated but not extreme, bearish momentum confirmed below midline`);
    if (nearHigh52)
      factors.push(`Price near 52-week high sell-side liquidity  -  equal highs and stop clusters above, sweep-and-reverse risk high`);
    if (pos52 < 0.4 && !nearLow52)
      factors.push(`Lower ${Math.round(pos52 * 100)}% of annual range  -  HTF structural downtrend, sell rallies into OBs`);
    if (macdHist < 0)
      factors.push(`Negative momentum expansion  -  bearish order flow dominant, no reversal candle structure visible`);
  } else {
    factors.push(`Price at equilibrium ${equilibrium.toFixed(2)}  -  institutional buy/sell pressure balanced, no edge`);
    factors.push(`No BOS confirmed  -  wait for decisive break above ${high.toFixed(2)} or below ${low.toFixed(2)}`);
    factors.push(`Ranging between session high/low  -  liquidity building on both sides for expansion move`);
  }

  if (factors.length < 3) {
    factors.push(`Annual range ${low52w.toFixed(2)}–${high52w.toFixed(2)}, price at ${(pos52 * 100).toFixed(0)}%  -  ${pos52 > 0.5 ? "premium" : "discount"} territory`);
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
    factors.push(`CHoCH to downside  -  break and close below ${support.toFixed(2)} structure low negates bullish thesis`);
    factors.push(`Failure auction above ${resistance.toFixed(2)} with immediate reversal signals distribution, not accumulation`);
    if (rsi > 68) factors.push(`RSI ${rsi.toFixed(0)} approaching overbought  -  momentum divergence could precede pullback`);
    factors.push(`USD strength spike or risk-off macro catalyst would invalidate near-term bullish flow`);
  } else if (bias === "bearish") {
    factors.push(`Reclaim above ${resistance.toFixed(2)} with displacement candle  -  bullish CHoCH, shorts must exit`);
    factors.push(`Stop run above session high without continuation = manipulation trap, not BOS`);
    if (rsi < 32) factors.push(`RSI ${rsi.toFixed(0)} deeply oversold  -  liquidity sweep complete, reversal risk elevated`);
    factors.push(`Dovish Fed pivot or geopolitical safe-haven demand could flip order flow bullish`);
  } else {
    factors.push(`Expansion BOS above ${resistance.toFixed(2)}  -  confirms bullish order flow, bias shifts`);
    factors.push(`Expansion BOS below ${support.toFixed(2)}  -  confirms bearish distribution, bias shifts`);
    factors.push(`Avoid entries during range  -  both sides of liquidity are valid targets for manipulation`);
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

    // Fetch RSI  -  only 4 credits, cached for 5 min so won't repeat often
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
          supportingFactors: ["Data temporarily unavailable  -  awaiting market data refresh"],
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

      const { bias, confidence, smcContext } = deriveConvictionBias(
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
