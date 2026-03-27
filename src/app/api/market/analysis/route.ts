import { NextResponse } from "next/server";
import type { MarketNarrative, TradeContext, Sentiment } from "@/types";

export const dynamic = "force-dynamic";

interface AnalysisResult {
  narrative: MarketNarrative;
  tradeContext: TradeContext;
  sentiment: Sentiment;
  generatedAt: string;
}

let cache: { data: AnalysisResult; ts: number } | null = null;
const CACHE_TTL = 180_000; // 3 min

interface QuoteData {
  close: string;
  change: string;
  percent_change: string;
  high: string;
  low: string;
  previous_close: string;
  fifty_two_week?: { high: string; low: string };
}

interface NewsData {
  headline: string;
  summary: string;
  datetime: number;
}

async function fetchQuotes(): Promise<Record<string, QuoteData>> {
  try {
    // Use shared cache (warm it if needed)
    const { ensureCacheWarm, getQuotesForSymbols } = await import("@/lib/api/quotes-cache");
    await ensureCacheWarm();
    const cached = getQuotesForSymbols(["XAU/USD", "EUR/USD", "USD/JPY", "BTC/USD", "GBP/USD"]);
    if (Object.keys(cached).length > 0) return cached as unknown as Record<string, QuoteData>;

    // Fallback: direct fetch
    const key = process.env.TWELVEDATA_API_KEY;
    if (!key) return {};
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://api.twelvedata.com/quote?symbol=XAU/USD,EUR/USD,USD/JPY,BTC/USD,GBP/USD&apikey=${key}`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);
    if (!res.ok) return {};
    const data = await res.json();
    if (data.code === 429) return {};
    return data;
  } catch { return {}; }
}

async function fetchNews(): Promise<NewsData[]> {
  try {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) return [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${key}`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);
    if (!res.ok) return [];
    return (await res.json()).slice(0, 25);
  } catch { return []; }
}

function analyzeMarket(quotes: Record<string, QuoteData>, news: NewsData[]): AnalysisResult {
  const gold = quotes["XAU/USD"];
  const eur = quotes["EUR/USD"];
  const jpy = quotes["USD/JPY"];
  const btc = quotes["BTC/USD"];
  const gbp = quotes["GBP/USD"];

  const pct = (q?: QuoteData) => parseFloat(q?.percent_change ?? "0");
  const price = (q?: QuoteData) => parseFloat(q?.close ?? "0");

  const goldPct = pct(gold);
  const eurPct = pct(eur);
  const jpyPct = pct(jpy);
  const btcPct = pct(btc);
  const gbpPct = pct(gbp);

  // ── Derive overall sentiment ──────────────────────
  const riskAssets = [eurPct, gbpPct, btcPct]; // risk-on assets
  const safeHaven = [goldPct, -jpyPct]; // safe haven (JPY inverted because USDJPY)
  const avgRisk = riskAssets.reduce((a, b) => a + b, 0) / riskAssets.length;
  const avgSafe = safeHaven.reduce((a, b) => a + b, 0) / safeHaven.length;

  let sentiment: Sentiment;
  if (avgRisk > 0.3 && avgSafe < 0.2) sentiment = "risk-on";
  else if (avgSafe > 0.3 && avgRisk < 0.2) sentiment = "risk-off";
  else sentiment = "mixed";

  // ── Derive market regime ──────────────────────────
  const newsText = news.map(n => (n.headline + " " + n.summary).toLowerCase()).join(" ");
  const hasInflation = newsText.includes("cpi") || newsText.includes("inflation") || newsText.includes("pce");
  const hasFed = newsText.includes("fed") || newsText.includes("rate cut") || newsText.includes("rate hike") || newsText.includes("powell");
  const hasTariff = newsText.includes("tariff") || newsText.includes("trade war") || newsText.includes("trade deal");
  const hasGeo = newsText.includes("war") || newsText.includes("military") || newsText.includes("iran") || newsText.includes("nuclear") || newsText.includes("sanction");
  const hasUSD = Math.abs(eurPct) > 0.5 || newsText.includes("dollar") || newsText.includes("dxy");

  let regime: MarketNarrative["regime"] = "policy-headline";
  if (hasGeo && goldPct > 0.3) regime = "geopolitical";
  else if (hasInflation) regime = "inflation-sensitive";
  else if (sentiment === "risk-off" && goldPct > 0.2) regime = "risk-off";
  else if (sentiment === "risk-on" && btcPct > 1) regime = "risk-on";
  else if (hasFed) regime = "yield-driven";
  else if (hasUSD) regime = "usd-dominant";
  else if (hasTariff) regime = "policy-headline";

  // ── Derive dominant theme ─────────────────────────
  const themes: { theme: string; score: number }[] = [
    { theme: "Geopolitical Risk Premium", score: hasGeo ? 3 : 0 },
    { theme: "Fed Policy Expectations", score: hasFed ? 3 : 0 },
    { theme: "Trade/Tariff Uncertainty", score: hasTariff ? 3 : 0 },
    { theme: "Inflation Watch", score: hasInflation ? 2 : 0 },
    { theme: "USD Dominance", score: hasUSD ? 2 : 0 },
    { theme: "Risk Appetite Shift", score: Math.abs(avgRisk) > 0.5 ? 2 : 0 },
    { theme: "Safe-Haven Rotation", score: goldPct > 0.5 ? 2 : 0 },
  ];
  const dominantTheme = themes.sort((a, b) => b.score - a.score)[0]?.theme || "Multi-Catalyst Environment";

  // ── Conviction score ──────────────────────────────
  const volatility = [goldPct, eurPct, jpyPct, btcPct, gbpPct].map(Math.abs);
  const avgVol = volatility.reduce((a, b) => a + b, 0) / volatility.length;
  const directionalAlignment = Math.abs(avgRisk - avgSafe); // how aligned are signals
  const conviction = Math.min(90, Math.max(25, Math.round(35 + directionalAlignment * 20 + avgVol * 10)));

  // ── Generate narrative summary ────────────────────
  const summaryParts: string[] = [];

  // Market overview
  if (gold && price(gold) > 0) {
    summaryParts.push(`Gold ${goldPct >= 0 ? "up" : "down"} ${Math.abs(goldPct).toFixed(2)}% at $${price(gold).toFixed(0)}`);
  }
  if (btc && price(btc) > 0) {
    summaryParts.push(`Bitcoin ${btcPct >= 0 ? "up" : "down"} ${Math.abs(btcPct).toFixed(2)}% at $${price(btc).toFixed(0)}`);
  }
  if (eur) {
    summaryParts.push(`EUR/USD ${eurPct >= 0 ? "firmer" : "softer"} at ${price(eur).toFixed(4)}`);
  }

  const movesSummary = summaryParts.join(", ");

  // Headlines summary
  const topHeadlines = news.slice(0, 3).map(n => n.headline.slice(0, 60)).join("; ");

  const summary = `Markets trading in a ${sentiment.replace("-", " ")} environment with ${regime.replace(/-/g, " ")} dynamics dominating. ${movesSummary}. Key drivers: ${topHeadlines}. ${
    sentiment === "risk-off"
      ? "Safe-haven demand elevated — gold and treasuries bid. Defensive positioning recommended."
      : sentiment === "risk-on"
      ? "Risk appetite improving — equities and crypto supported. Momentum-favoring environment."
      : "Mixed signals across asset classes. Headline-driven volatility creating two-way risk. Selective execution advised."
  }`;

  // ── Generate trade context ────────────────────────
  const condition = avgVol > 1
    ? "High volatility, headline-driven environment. Multiple catalysts creating sharp intraday reversals."
    : avgVol > 0.4
    ? "Moderate volatility, multi-catalyst environment. Directional moves possible but headline risk elevated."
    : "Low volatility, consolidation phase. Markets awaiting next catalyst for directional conviction.";

  const directionalLean = sentiment === "risk-off"
    ? `Bullish gold, bearish risk assets. ${hasGeo ? "Geopolitical risk premium supporting safe-havens." : "Defensive positioning favored."} ${hasFed ? "Fed expectations adding to USD uncertainty." : ""}`
    : sentiment === "risk-on"
    ? `Bullish equities and crypto, cautious on safe-havens. ${hasFed ? "Dovish Fed expectations supporting risk appetite." : ""} Watch for momentum continuation.`
    : `Mixed bias — bullish gold on ${hasGeo ? "geopolitical uncertainty" : "macro hedging"}, cautious on equities. ${hasTariff ? "Tariff headlines the wildcard." : "Data-dependent positioning."} Selective execution required.`;

  const cautionFactors: string[] = [];
  if (hasTariff) cautionFactors.push("Tariff headlines can flip sentiment in seconds");
  if (hasGeo) cautionFactors.push("Geopolitical escalation risk remains elevated");
  if (hasFed) cautionFactors.push("Fed commentary may shift rate expectations abruptly");
  if (avgVol > 0.8) cautionFactors.push("High volatility — wider stops and smaller position sizes recommended");
  if (Math.abs(goldPct) > 1) cautionFactors.push("Gold extended — mean reversion risk building");
  if (Math.abs(btcPct) > 2) cautionFactors.push("Crypto volatility elevated — momentum may exhaust quickly");
  cautionFactors.push("Month-end rebalancing flows may distort price action");
  if (cautionFactors.length < 3) cautionFactors.push("Liquidity may thin during session transitions");

  const idealMindset = avgVol > 1
    ? "Patient, selective execution. Focus on high-conviction setups with clear invalidation. Don't chase headline reactions — wait for the secondary move. This is a market for prepared traders, not reactive ones."
    : avgVol > 0.4
    ? "Balanced approach. Take setups that align with the dominant narrative but keep position sizes moderate. Wait for pullbacks rather than chasing breakouts. Risk management is paramount."
    : "Patient accumulation mode. Markets are coiling for a directional move. Use this consolidation to build positions at key levels with tight risk. Wait for the catalyst before committing size.";

  const narrative: MarketNarrative = {
    summary,
    regime,
    dominantTheme,
    conviction,
  };

  const tradeCtx: TradeContext = {
    condition,
    directionalLean,
    cautionFactors: cautionFactors.slice(0, 5),
    idealMindset,
  };

  return {
    narrative,
    tradeContext: tradeCtx,
    sentiment,
    generatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ ...cache.data, cached: true });
  }

  try {
    const [quotes, news] = await Promise.all([fetchQuotes(), fetchNews()]);
    const result = analyzeMarket(quotes, news);

    cache = { data: result, ts: Date.now() };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis API error:", error);
    if (cache) {
      return NextResponse.json({ ...cache.data, cached: true, error: "fetch failed" });
    }
    // Fallback minimal response
    return NextResponse.json({
      narrative: {
        summary: "Analysis temporarily unavailable. Awaiting market data refresh.",
        regime: "policy-headline",
        dominantTheme: "Data Pending",
        conviction: 50,
      },
      tradeContext: {
        condition: "Awaiting data refresh.",
        directionalLean: "Neutral until data available.",
        cautionFactors: ["Market data temporarily unavailable"],
        idealMindset: "Stand aside until analysis refreshes.",
      },
      sentiment: "mixed",
      generatedAt: new Date().toISOString(),
    });
  }
}

// POST endpoint for manual "Generate Analysis" — forces fresh data
export async function POST() {
  try {
    // Clear cache to force fresh analysis
    cache = null;
    const [quotes, news] = await Promise.all([fetchQuotes(), fetchNews()]);
    const result = analyzeMarket(quotes, news);
    cache = { data: result, ts: Date.now() };
    return NextResponse.json({ ...result, fresh: true });
  } catch (error) {
    console.error("Analysis POST error:", error);
    return NextResponse.json({ error: "Failed to generate analysis" }, { status: 500 });
  }
}
