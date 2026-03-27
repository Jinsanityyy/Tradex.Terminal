import { NextResponse } from "next/server";
import type { Catalyst } from "@/types";

export const dynamic = "force-dynamic";

let cache: { data: Catalyst[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 180_000; // 3 minutes

// Keywords that signal high-impact market catalysts
const HIGH_IMPACT = [
  "tariff", "trade war", "fed ", "federal reserve", "rate cut", "rate hike",
  "cpi", "inflation", "gdp", "nfp", "employment", "recession", "sanctions",
  "war", "military", "nuclear", "crash", "crisis", "executive order",
  "shutdown", "default", "opec", "oil", "gold",
];

const MEDIUM_IMPACT = [
  "earnings", "revenue", "ipo", "merger", "acquisition", "regulation",
  "bitcoin", "crypto", "housing", "retail sales", "consumer", "pmi",
  "manufacturing", "trade deal", "geopolit", "election",
];

function classifyImportance(headline: string, summary: string): "high" | "medium" | "low" {
  const text = (headline + " " + summary).toLowerCase();
  if (HIGH_IMPACT.some(k => text.includes(k))) return "high";
  if (MEDIUM_IMPACT.some(k => text.includes(k))) return "medium";
  return "low";
}

function deriveSentiment(headline: string): "bullish" | "bearish" | "neutral" {
  const h = headline.toLowerCase();
  const bull = ["surge", "rally", "gain", "rise", "jump", "boost", "soar", "deal", "agree", "peace", "beat", "strong", "record", "support"];
  const bear = ["drop", "fall", "decline", "crash", "plunge", "threat", "war", "sanction", "fear", "risk", "weak", "miss", "slump", "concern", "downgrade", "ban", "block"];
  const b = bull.filter(w => h.includes(w)).length;
  const s = bear.filter(w => h.includes(w)).length;
  return b > s ? "bullish" : s > b ? "bearish" : "neutral";
}

function extractAffectedMarkets(headline: string, summary: string): string[] {
  const text = (headline + " " + summary).toUpperCase();
  const map: Record<string, string> = {
    GOLD: "XAUUSD", OIL: "USOIL", BITCOIN: "BTCUSD", CRYPTO: "BTCUSD",
    "S&P": "SPX", NASDAQ: "NDX", DOLLAR: "DXY", EURO: "EURUSD",
    YEN: "USDJPY", STERLING: "GBPUSD", POUND: "GBPUSD", SILVER: "XAGUSD",
    BOND: "US10Y", TREASURY: "US10Y", YIELD: "US10Y", COPPER: "Copper",
    CHINA: "USDCNH", JAPAN: "USDJPY", EUROPE: "EURUSD", CANADA: "USDCAD",
  };
  const found: string[] = [];
  for (const [keyword, symbol] of Object.entries(map)) {
    if (text.includes(keyword)) found.push(symbol);
  }
  // Default affected markets based on category
  if (found.length === 0) {
    const h = headline.toLowerCase();
    if (h.includes("fed") || h.includes("rate")) found.push("DXY", "US10Y", "XAUUSD");
    else if (h.includes("tariff") || h.includes("trade")) found.push("SPX", "DXY", "EURUSD");
    else found.push("SPX", "DXY");
  }
  return [...new Set(found)].slice(0, 5);
}

function generateMarketImplication(headline: string, sentiment: "bullish" | "bearish" | "neutral", markets: string[]): string {
  const h = headline.toLowerCase();
  const marketStr = markets.slice(0, 3).join(", ");

  if (h.includes("tariff") || h.includes("trade war")) {
    return sentiment === "bearish"
      ? `Risk-off: equities pressured, USD volatile on safe-haven flows. ${marketStr} most exposed to trade policy repricing.`
      : `Trade optimism: equities supported, risk currencies bid. Potential relief rally in ${marketStr}.`;
  }
  if (h.includes("fed") || h.includes("rate cut") || h.includes("rate hike")) {
    return sentiment === "bullish"
      ? `Dovish signal: USD weakens, gold/equities supported. Yields dip — watch ${marketStr} for rate-sensitive moves.`
      : `Hawkish repricing: USD bid, gold pressured, yields rise. ${marketStr} vulnerable to tightening expectations.`;
  }
  if (h.includes("oil") || h.includes("opec") || h.includes("energy")) {
    return `Energy sector catalyst affecting inflation expectations and petro-currencies. Direct impact on ${marketStr}.`;
  }
  if (h.includes("bitcoin") || h.includes("crypto")) {
    return `Crypto market catalyst — ${sentiment === "bullish" ? "institutional demand narrative strengthens" : "regulatory/sentiment headwind"}. Watch ${marketStr}.`;
  }
  if (h.includes("war") || h.includes("military") || h.includes("geopolit")) {
    return `Geopolitical risk premium: safe-havens bid (gold, USD, treasuries), equities under pressure. ${marketStr} on alert.`;
  }

  return sentiment === "bullish"
    ? `Positive catalyst for ${marketStr}. Risk appetite improving — monitor for follow-through.`
    : sentiment === "bearish"
    ? `Negative catalyst weighing on ${marketStr}. Risk-off positioning likely near-term.`
    : `Mixed signal for ${marketStr}. Markets awaiting confirmation or follow-up developments.`;
}

function deriveStatus(datetime: number): "live" | "completed" {
  const ageHours = (Date.now() / 1000 - datetime) / 3600;
  return ageHours < 4 ? "live" : "completed";
}

export async function GET() {
  if (cache.data.length > 0 && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ data: cache.data, timestamp: cache.ts, cached: true });
  }

  try {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) {
      return NextResponse.json({ data: [], timestamp: Date.now(), error: "No API key" });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${key}`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Finnhub: ${res.status}`);

    const raw: {
      id: number;
      headline: string;
      summary: string;
      source: string;
      datetime: number;
      url: string;
    }[] = await res.json();

    // Filter for market-moving catalysts (high/medium importance only)
    const catalysts: Catalyst[] = [];
    for (let i = 0; i < raw.length && catalysts.length < 20; i++) {
      const item = raw[i];
      const importance = classifyImportance(item.headline, item.summary);
      if (importance === "low") continue;

      const sentiment = deriveSentiment(item.headline);
      const affectedMarkets = extractAffectedMarkets(item.headline, item.summary);
      const status = deriveStatus(item.datetime);

      catalysts.push({
        id: `cat-${item.id ?? i}`,
        title: item.headline,
        timestamp: new Date(item.datetime * 1000).toISOString(),
        affectedMarkets,
        importance,
        status,
        explanation: item.summary?.slice(0, 300) || item.headline,
        marketImplication: generateMarketImplication(item.headline, sentiment, affectedMarkets),
        sentimentTag: sentiment,
      });
    }

    if (catalysts.length > 0) {
      cache = { data: catalysts, ts: Date.now() };
    }

    return NextResponse.json({ data: catalysts, timestamp: Date.now(), count: catalysts.length });
  } catch (error) {
    console.error("Catalysts API error:", error);
    return NextResponse.json({ data: cache.data, timestamp: Date.now(), error: "fetch failed" });
  }
}
