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
    goldImpact: "bearish",
    goldReasoning: "Hawkish Fed patience signals higher-for-longer rates, raising real yields and reducing gold's non-yielding appeal.",
    usdImpact: "bullish",
    usdReasoning: "Patient Fed stance maintains elevated US yields, attracting capital flows and strengthening the dollar's yield advantage.",
  },
  {
    id: "fb-2", timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    headline: "US tariff escalation raises fears of global trade slowdown  -  IMF warns",
    category: "tariffs", sentiment: "bearish", impactScore: 9,
    affectedAssets: ["SPX", "DXY", "EURUSD", "XAUUSD"],
    source: "Bloomberg",
    summary: "The IMF issued a warning that escalating US tariffs could reduce global GDP growth by 0.5% in 2025. Equity markets sold off while gold and the dollar saw safe-haven demand.",
    goldImpact: "bullish",
    goldReasoning: "IMF tariff warning drives global growth fears and safe-haven flows directly into gold as equities sell off.",
    usdImpact: "neutral",
    usdReasoning: "Tariff-driven risk-off supports USD safe-haven demand but growth damage to US economy creates offsetting headwinds.",
  },
  {
    id: "fb-3", timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    headline: "Gold surges past $3,300 as safe-haven demand intensifies on geopolitical tensions",
    category: "commodities", sentiment: "bullish", impactScore: 8,
    affectedAssets: ["XAUUSD", "DXY", "USOIL"],
    source: "FXStreet",
    summary: "Spot gold broke above $3,300/oz as investors fled to safe-haven assets amid escalating Middle East tensions and uncertainty over US trade policy. Central bank buying continued to provide a structural floor.",
    goldImpact: "bullish",
    goldReasoning: "Gold broke above key $3,300 resistance  -  central bank buying and geopolitical tensions provide dual structural support.",
    usdImpact: "bearish",
    usdReasoning: "Gold's surge at the expense of dollar-denominated assets reflects softening USD demand as safe-haven capital rotates.",
  },
  {
    id: "fb-4", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    headline: "US CPI hotter than expected  -  core inflation at 3.8% YoY, dollar surges",
    category: "inflation", sentiment: "bearish", impactScore: 9,
    affectedAssets: ["DXY", "XAUUSD", "EURUSD", "SPX"],
    source: "AP",
    summary: "US Consumer Price Index came in above forecasts, with core CPI rising 3.8% year-over-year. The hotter-than-expected print pushed back Fed rate cut expectations and sent the dollar sharply higher.",
    goldImpact: "bearish",
    goldReasoning: "Hot CPI pushes Fed rate cut timeline further out, lifting real yields and making gold less competitive vs. yield-bearing assets.",
    usdImpact: "bullish",
    usdReasoning: "Above-consensus CPI locks in higher US rates for longer, forcing aggressive USD short covering and fresh long entries.",
  },
  {
    id: "fb-5", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    headline: "Bitcoin ETF inflows hit $600M in single day as institutional demand accelerates",
    category: "crypto", sentiment: "bullish", impactScore: 7,
    affectedAssets: ["BTCUSD", "ETHUSD"],
    source: "CoinDesk",
    summary: "Spot Bitcoin ETFs recorded $600 million in net inflows in a single trading session, the third largest day on record. BlackRock's iShares Bitcoin Trust led with $380M as institutional adoption continues.",
    goldImpact: "neutral",
    goldReasoning: "Crypto inflow surge has minimal direct gold impact  -  both compete as alternative assets but serve different investor profiles.",
    usdImpact: "neutral",
    usdReasoning: "Bitcoin ETF flows reflect risk appetite but have no direct USD macro transmission mechanism.",
  },
  {
    id: "fb-6", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    headline: "Middle East tensions flare as ceasefire talks collapse  -  oil spikes 3%",
    category: "geopolitics", sentiment: "bearish", impactScore: 8,
    affectedAssets: ["USOIL", "XAUUSD", "DXY", "SPX"],
    source: "Al Jazeera",
    summary: "Oil prices surged 3% after ceasefire negotiations broke down, raising concerns about supply disruptions through the Strait of Hormuz. Gold and the dollar benefited from safe-haven flows.",
    goldImpact: "bullish",
    goldReasoning: "Ceasefire collapse and Hormuz disruption risk triggers geopolitical risk premium in gold  -  historically gold's strongest catalyst.",
    usdImpact: "bullish",
    usdReasoning: "Middle East escalation drives parallel USD safe-haven demand alongside gold as investors exit regional and EM risk exposure.",
  },
  {
    id: "fb-7", timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    headline: "US jobs report beats expectations  -  256K nonfarm payrolls added in March",
    category: "economy", sentiment: "bullish", impactScore: 8,
    affectedAssets: ["DXY", "SPX", "EURUSD", "XAUUSD"],
    source: "WSJ",
    summary: "The US economy added 256,000 jobs in March, well above the 200,000 consensus estimate. The unemployment rate ticked down to 4.0%, reinforcing the Fed's patience narrative on rate cuts.",
    goldImpact: "bearish",
    goldReasoning: "Strong NFP reduces recession risk and delays Fed cuts, eliminating two key gold bullish catalysts simultaneously.",
    usdImpact: "bullish",
    usdReasoning: "256K payrolls solidifies Fed's higher-for-longer stance and demonstrates US exceptionalism vs. peers, driving USD strength.",
  },
  {
    id: "fb-8", timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    headline: "ECB holds rates steady, Lagarde signals two more cuts in H2 2025",
    category: "central-banks", sentiment: "bullish", impactScore: 7,
    affectedAssets: ["EURUSD", "EURGBP", "DXY", "XAUUSD"],
    source: "ECB Press",
    summary: "The European Central Bank kept its deposit rate at 2.5% as expected, but President Lagarde provided forward guidance for two additional 25bp cuts in the second half of 2025 if disinflation continues.",
    goldImpact: "bullish",
    goldReasoning: "ECB dovish guidance widens US-EU rate differential, weakening EUR and indirectly supporting gold via USD softness.",
    usdImpact: "bullish",
    usdReasoning: "ECB cut signals widen the rate differential in favor of USD, making dollar assets more attractive relative to euro-denominated holdings.",
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

    const news: NewsItem[] = raw.slice(0, 30).map((item, i) => {
      const cat = categorize(item.headline);
      const sent = deriveSentiment(item.headline);
      const { goldImpact, goldReasoning, usdImpact, usdReasoning } = deriveGoldUSD(item.headline, cat, sent);
      return {
        id: `fn-${item.id ?? i}`,
        timestamp: new Date(item.datetime * 1000).toISOString(),
        headline: item.headline,
        category: cat,
        sentiment: sent,
        impactScore: deriveImpact(item.headline),
        affectedAssets: extractAssets(item.headline + " " + (item.related ?? "")),
        summary: item.summary?.slice(0, 250) ?? "",
        source: item.source,
        goldImpact,
        goldReasoning,
        usdImpact,
        usdReasoning,
      };
    });

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

type Bias = "bullish" | "bearish" | "neutral";

function deriveGoldUSD(headline: string, category: string, sentiment: Bias): {
  goldImpact: Bias; goldReasoning: string;
  usdImpact: Bias;  usdReasoning: string;
} {
  const h = headline.toLowerCase();

  // Fed / central bank
  if (category === "central-banks") {
    if (sentiment === "bearish") { // hawkish
      return {
        goldImpact: "bearish",
        goldReasoning: "Hawkish central bank tone raises real yields, increasing the opportunity cost of holding gold.",
        usdImpact: "bullish",
        usdReasoning: "Higher-for-longer rate expectations boost yield differentials, attracting capital flows into USD.",
      };
    }
    return { // dovish
      goldImpact: "bullish",
      goldReasoning: "Dovish pivot signals lower real yields, reducing the opportunity cost of gold and boosting its appeal.",
      usdImpact: "bearish",
      usdReasoning: "Rate cut expectations erode USD yield advantage, weakening the dollar against major peers.",
    };
  }

  // Tariffs / trade war
  if (category === "tariffs") {
    return {
      goldImpact: "bullish",
      goldReasoning: "Trade war escalation drives safe-haven demand into gold as risk assets sell off globally.",
      usdImpact: sentiment === "bearish" ? "neutral" : "bullish",
      usdReasoning: sentiment === "bearish"
        ? "USD faces competing forces  -  safe-haven flows in vs. growth damage from tariffs  -  resulting in mixed direction."
        : "Trade deal progress reduces safe-haven premium, but USD supported by relative US economic strength.",
    };
  }

  // Inflation
  if (category === "inflation") {
    if (h.includes("hot") || h.includes("hotter") || h.includes("surges") || h.includes("above") || sentiment === "bearish") {
      return {
        goldImpact: "bearish",
        goldReasoning: "Hotter-than-expected inflation pushes Fed toward delayed cuts, lifting real yields and pressuring gold.",
        usdImpact: "bullish",
        usdReasoning: "High inflation prints delay Fed easing, keeping US rates elevated and supporting USD demand.",
      };
    }
    return {
      goldImpact: "bullish",
      goldReasoning: "Cooling inflation opens the door to rate cuts, reducing real yields and making gold more attractive.",
      usdImpact: "bearish",
      usdReasoning: "Soft inflation data accelerates rate cut expectations, undermining the USD's yield advantage.",
    };
  }

  // Geopolitics / war
  if (category === "geopolitics") {
    return {
      goldImpact: "bullish",
      goldReasoning: "Geopolitical escalation drives flight-to-safety flows, with gold historically the primary beneficiary.",
      usdImpact: "bullish",
      usdReasoning: "USD benefits from safe-haven demand alongside gold as investors de-risk from global equities and EM assets.",
    };
  }

  // Economy (growth data)
  if (category === "economy") {
    if (sentiment === "bullish") { // strong data
      return {
        goldImpact: "bearish",
        goldReasoning: "Strong economic data reduces recession fears and rate-cut expectations, diminishing gold's safe-haven premium.",
        usdImpact: "bullish",
        usdReasoning: "Robust US growth data supports Fed's higher-for-longer stance, reinforcing USD strength.",
      };
    }
    return { // weak data
      goldImpact: "bullish",
      goldReasoning: "Weak economic data raises recession concerns and accelerates rate-cut bets, boosting gold's appeal.",
      usdImpact: "bearish",
      usdReasoning: "Soft growth prints increase Fed easing expectations, reducing USD yield advantage and weighing on the dollar.",
    };
  }

  // Commodities (oil, gold directly)
  if (category === "commodities") {
    if (h.includes("gold")) {
      return {
        goldImpact: sentiment,
        goldReasoning: sentiment === "bullish"
          ? "Direct gold catalyst  -  supply/demand dynamics or safe-haven flows supporting spot gold prices."
          : "Gold-specific headwind weighing on spot prices  -  monitor for follow-through or reversal at key levels.",
        usdImpact: sentiment === "bullish" ? "bearish" : "bullish",
        usdReasoning: sentiment === "bullish"
          ? "Gold strength typically reflects USD softness as both compete for safe-haven capital flows."
          : "Gold weakness often accompanies USD strength as dollar-denominated assets gain relative appeal.",
      };
    }
    return {
      goldImpact: "neutral",
      goldReasoning: "Commodity-specific catalyst with indirect gold impact  -  watch energy/inflation transmission into gold pricing.",
      usdImpact: "neutral",
      usdReasoning: "Commodity news has limited direct USD impact unless it significantly shifts inflation or growth expectations.",
    };
  }

  // Default fallback
  return {
    goldImpact: sentiment === "bullish" ? "bearish" : sentiment === "bearish" ? "bullish" : "neutral",
    goldReasoning: sentiment === "bullish"
      ? "Risk-on sentiment reduces safe-haven demand, marginally weighing on gold."
      : sentiment === "bearish"
      ? "Risk-off tone supports gold as investors seek safe-haven assets amid market uncertainty."
      : "Neutral macro backdrop  -  gold lacks a clear directional catalyst from this headline.",
    usdImpact: sentiment,
    usdReasoning: sentiment === "bullish"
      ? "Positive risk sentiment broadly supports USD as the world's primary reserve and safe-haven currency."
      : sentiment === "bearish"
      ? "Risk-off flows typically benefit USD short-term, though persistent weakness can trigger flight to gold instead."
      : "Mixed signals provide no clear USD directional bias  -  monitor price action at key levels.",
  };
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
