import { NextResponse } from "next/server";
import type { NewsItem } from "@/types";

export const dynamic = "force-dynamic";

// Cache news for 2 minutes
let cache: { data: NewsItem[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 120_000;

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
      category: string;
      related: string;
      url: string;
      image: string;
    }[] = await res.json();

    const news: NewsItem[] = raw.slice(0, 30).map((item, i) => ({
      id: `fn-${item.id ?? i}`,
      timestamp: new Date(item.datetime * 1000).toISOString(),
      headline: item.headline,
      category: categorize(item.headline),
      sentiment: deriveSentiment(item.headline),
      impactScore: deriveImpact(item.headline),
      affectedAssets: extractAssets(item.headline + " " + (item.related ?? "")),
      summary: item.summary?.slice(0, 250) ?? "",
      source: item.source,
    }));

    if (news.length > 0) {
      cache = { data: news, ts: Date.now() };
    }

    return NextResponse.json({ data: news, timestamp: Date.now(), count: news.length });
  } catch (error) {
    console.error("News error:", error);
    return NextResponse.json({ data: cache.data, timestamp: Date.now(), error: "fetch failed" });
  }
}

function categorize(headline: string): string {
  const h = headline.toLowerCase();
  if (h.includes("tariff") || h.includes("trade war") || h.includes("trade deal")) return "tariffs";
  if (h.includes("fed ") || h.includes("ecb") || h.includes("boj") || h.includes("central bank") || h.includes("rate cut") || h.includes("rate hike")) return "central-banks";
  if (h.includes("cpi") || h.includes("inflation") || h.includes("pce") || h.includes("prices")) return "inflation";
  if (h.includes("trump") || h.includes("white house") || h.includes("president")) return "politics";
  if (h.includes("oil") || h.includes("gold") || h.includes("commodity") || h.includes("copper")) return "commodities";
  if (h.includes("bitcoin") || h.includes("crypto") || h.includes("ethereum") || h.includes("etf")) return "crypto";
  if (h.includes("geopolit") || h.includes("war") || h.includes("military") || h.includes("sanction")) return "geopolitics";
  if (h.includes("gdp") || h.includes("jobs") || h.includes("employment") || h.includes("consumer") || h.includes("recession")) return "economy";
  if (h.includes("earnings") || h.includes("revenue") || h.includes("profit")) return "earnings";
  return "general";
}

function deriveSentiment(headline: string): "bullish" | "bearish" | "neutral" {
  const h = headline.toLowerCase();
  const bull = ["surge", "rally", "gain", "rise", "jump", "boost", "soar", "bull", "positive", "beat", "strong", "record", "upgrade"];
  const bear = ["drop", "fall", "decline", "crash", "plunge", "loss", "bear", "negative", "miss", "weak", "slump", "fear", "risk", "concern", "warning", "downgrade"];
  const b = bull.filter(w => h.includes(w)).length;
  const s = bear.filter(w => h.includes(w)).length;
  return b > s ? "bullish" : s > b ? "bearish" : "neutral";
}

function deriveImpact(headline: string): number {
  const h = headline.toLowerCase();
  const high = ["fed", "tariff", "cpi", "gdp", "trump", "war", "crash", "crisis", "emergency", "recession", "rate cut", "rate hike", "inflation"];
  const hits = high.filter(w => h.includes(w)).length;
  return Math.min(10, 3 + hits * 2);
}

function extractAssets(text: string): string[] {
  const t = text.toUpperCase();
  const map: Record<string, string> = {
    GOLD: "XAUUSD", OIL: "USOIL", BITCOIN: "BTCUSD", CRYPTO: "BTCUSD",
    "S&P": "SPX", NASDAQ: "NDX", DOLLAR: "DXY", EURO: "EURUSD",
    YEN: "USDJPY", STERLING: "GBPUSD", POUND: "GBPUSD",
  };
  const found: string[] = [];
  for (const [keyword, symbol] of Object.entries(map)) {
    if (t.includes(keyword)) found.push(symbol);
  }
  return [...new Set(found)];
}
