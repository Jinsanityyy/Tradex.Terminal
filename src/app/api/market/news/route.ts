import { NextResponse } from "next/server";
import type { NewsItem } from "@/types";

export const dynamic = "force-dynamic";

// Cache news for 2 minutes
let cache: { data: NewsItem[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 120_000;

// ── Static fallback news when Finnhub key unavailable ─────────────────────
const FALLBACK_NEWS: NewsItem[] = [
  {
    id: "fb-1", timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    headline: "Fed officials signal patience on rate cuts amid sticky inflation data",
    category: "central-banks", sentiment: "bearish", impactScore: 9,
    affectedAssets: ["DXY", "XAUUSD", "SPX", "US10Y"],
    source: "Reuters",
    summary: "Federal Reserve officials reiterated a cautious stance on monetary easing, noting that inflation remains above target and the labor market continues to show resilience. Markets repriced rate cut expectations to late 2025.",
  },
  {
    id: "fb-2", timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    headline: "US tariff escalation raises fears of global trade slowdown — IMF warns",
    category: "tariffs", sentiment: "bearish", impactScore: 9,
    affectedAssets: ["SPX", "DXY", "EURUSD", "XAUUSD"],
    source: "Bloomberg",
    summary: "The IMF issued a warning that escalating US tariffs could reduce global GDP growth by 0.5% in 2025. Equity markets sold off while gold and the dollar saw safe-haven demand.",
  },
  {
    id: "fb-3", timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    headline: "Gold surges past $3,300 as safe-haven demand intensifies on geopolitical tensions",
    category: "commodities", sentiment: "bullish", impactScore: 8,
    affectedAssets: ["XAUUSD", "DXY", "USOIL"],
    source: "FXStreet",
    summary: "Spot gold broke above $3,300/oz as investors fled to safe-haven assets amid escalating Middle East tensions and uncertainty over US trade policy. Central bank buying continued to provide a structural floor.",
  },
  {
    id: "fb-4", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    headline: "US CPI hotter than expected — core inflation at 3.8% YoY, dollar surges",
    category: "inflation", sentiment: "bearish", impactScore: 9,
    affectedAssets: ["DXY", "XAUUSD", "EURUSD", "SPX"],
    source: "AP",
    summary: "US Consumer Price Index came in above forecasts, with core CPI rising 3.8% year-over-year. The hotter-than-expected print pushed back Fed rate cut expectations and sent the dollar sharply higher.",
  },
  {
    id: "fb-5", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    headline: "Bitcoin ETF inflows hit $600M in single day as institutional demand accelerates",
    category: "crypto", sentiment: "bullish", impactScore: 7,
    affectedAssets: ["BTCUSD", "ETHUSD"],
    source: "CoinDesk",
    summary: "Spot Bitcoin ETFs recorded $600 million in net inflows in a single trading session, the third largest day on record. BlackRock's iShares Bitcoin Trust led with $380M as institutional adoption continues.",
  },
  {
    id: "fb-6", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    headline: "Middle East tensions flare as ceasefire talks collapse — oil spikes 3%",
    category: "geopolitics", sentiment: "bearish", impactScore: 8,
    affectedAssets: ["USOIL", "XAUUSD", "DXY", "SPX"],
    source: "Al Jazeera",
    summary: "Oil prices surged 3% after ceasefire negotiations broke down, raising concerns about supply disruptions through the Strait of Hormuz. Gold and the dollar benefited from safe-haven flows.",
  },
  {
    id: "fb-7", timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    headline: "US jobs report beats expectations — 256K nonfarm payrolls added in March",
    category: "economy", sentiment: "bullish", impactScore: 8,
    affectedAssets: ["DXY", "SPX", "EURUSD", "XAUUSD"],
    source: "WSJ",
    summary: "The US economy added 256,000 jobs in March, well above the 200,000 consensus estimate. The unemployment rate ticked down to 4.0%, reinforcing the Fed's patience narrative on rate cuts.",
  },
  {
    id: "fb-8", timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    headline: "ECB holds rates steady, Lagarde signals two more cuts in H2 2025",
    category: "central-banks", sentiment: "bullish", impactScore: 7,
    affectedAssets: ["EURUSD", "EURGBP", "DXY", "XAUUSD"],
    source: "ECB Press",
    summary: "The European Central Bank kept its deposit rate at 2.5% as expected, but President Lagarde provided forward guidance for two additional 25bp cuts in the second half of 2025 if disinflation continues.",
  },
];

export async function GET() {
  if (cache.data.length > 0 && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ data: cache.data, timestamp: cache.ts, cached: true });
  }

  try {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) {
      return NextResponse.json({ data: FALLBACK_NEWS, timestamp: Date.now(), fallback: true });
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
      return NextResponse.json({ data: news, timestamp: Date.now(), count: news.length });
    }

    return NextResponse.json({ data: FALLBACK_NEWS, timestamp: Date.now(), fallback: true });
  } catch (error) {
    console.error("News error:", error);
    const fallback = cache.data.length > 0 ? cache.data : FALLBACK_NEWS;
    return NextResponse.json({ data: fallback, timestamp: Date.now(), error: "fetch failed" });
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
