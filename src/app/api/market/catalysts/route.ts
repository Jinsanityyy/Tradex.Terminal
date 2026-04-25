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

async function generateAnalysis(title: string, summary: string, markets: string[], importance: string) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: `You are a senior macro market analyst. Write fundamental market analysis — not trading signals, not technical analysis.
RULES:
- Analyze THIS specific headline. Never use generic templates.
- German/EU news → EUR, DAX, ECB focus. UK news → GBP, BoE. Fed news → USD, rates, gold.
- Only include assets genuinely affected by this specific event.
- Be specific about economic mechanisms: growth, inflation, rates, risk sentiment, supply.
- Valid JSON only, no markdown.`,
        messages: [{
          role: "user",
          content: `Analyze: "${title}"
Context: "${summary?.slice(0, 200) || ""}"
Markets: ${markets.join(", ")}
Importance: ${importance}

Return ONLY this JSON:
{"eventOverview":"2-3 sentences what this means in plain language","whyMarketsCare":"2-3 sentences on the specific macro mechanism","assets":[{"name":"asset name","ticker":"e.g. XAUUSD","bias":"Bullish|Bearish|Neutral|Mixed","context":"2-3 sentences specific causal chain from THIS event"}],"marketLogic":"2 sentences cause-effect chain specific to this event","conditions":"1-2 sentences what confirms or invalidates this"}`
        }]
      })
    });
    const data = await res.json();
    const text = (data.content?.[0]?.text ?? "").replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function deriveStatus(datetime: number): "live" | "completed" {
  const ageHours = (Date.now() / 1000 - datetime) / 3600;
  return ageHours < 4 ? "live" : "completed";
}

// ── Static fallback when Finnhub key is unavailable ────────────────────────
const FALLBACK_CATALYSTS: Catalyst[] = [
  {
    id: "fallback-1",
    title: "Fed Interest Rate Decision — Next FOMC Meeting",
    timestamp: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    affectedMarkets: ["DXY", "XAUUSD", "US10Y", "SPX"],
    importance: "high",
    status: "upcoming",
    explanation: "Federal Open Market Committee meeting where rate decision and forward guidance will be announced. Gold and USD will move sharply on outcome.",
    marketImplication: "Hawkish hold = USD bid, Gold pressured. Rate cut signal = USD sell, Gold rally.",
    sentimentTag: "neutral",
  },
  {
    id: "fallback-2",
    title: "US CPI Inflation Data Release",
    timestamp: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    affectedMarkets: ["DXY", "XAUUSD", "US10Y"],
    importance: "high",
    status: "upcoming",
    explanation: "Consumer Price Index — the most important gold driver. Hot CPI = bearish gold (hawkish Fed). Cold CPI = bullish gold (rate cuts).",
    marketImplication: "CPI beat = sell Gold rallies. CPI miss = buy Gold dips aggressively.",
    sentimentTag: "neutral",
  },
  {
    id: "fallback-3",
    title: "US Non-Farm Payrolls Report",
    timestamp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    affectedMarkets: ["DXY", "XAUUSD", "SPX", "EURUSD"],
    importance: "high",
    status: "upcoming",
    explanation: "Monthly employment report — strong jobs = delayed rate cuts = bearish Gold. Weak jobs = recession fears + rate cuts = bullish Gold.",
    marketImplication: "Strong NFP = sell Gold. Weak NFP = buy Gold. Trade the 30-min retest for cleaner entry.",
    sentimentTag: "neutral",
  },
  {
    id: "fallback-4",
    title: "US-China Trade Tensions — Tariff Developments",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    affectedMarkets: ["SPX", "DXY", "XAUUSD", "USDCNH"],
    importance: "high",
    status: "live",
    explanation: "Ongoing trade war developments continue to drive safe-haven demand for Gold. Any escalation boosts Gold; any deal progress weighs on it.",
    marketImplication: "Trade escalation = buy Gold dips. Trade deal progress = risk-on, sell Gold rallies.",
    sentimentTag: "bearish",
  },
];

export async function GET() {
  if (cache.data.length > 0 && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ data: cache.data, timestamp: cache.ts, cached: true });
  }

  try {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) {
      // Return static fallback — better than empty when API key not configured
      return NextResponse.json({ data: FALLBACK_CATALYSTS, timestamp: Date.now(), fallback: true });
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
    const raw_catalysts: Catalyst[] = [];
    for (let i = 0; i < raw.length && raw_catalysts.length < 12; i++) {
      const item = raw[i];
      const importance = classifyImportance(item.headline, item.summary);
      if (importance === "low") continue;

      const sentiment = deriveSentiment(item.headline);
      const affectedMarkets = extractAffectedMarkets(item.headline, item.summary);
      const status = deriveStatus(item.datetime);

      raw_catalysts.push({
        id: `cat-${item.id ?? i}`,
        title: item.headline,
        timestamp: new Date(item.datetime * 1000).toISOString(),
        affectedMarkets,
        importance,
        status,
        explanation: item.summary?.slice(0, 300) || item.headline,
        marketImplication: generateMarketImplication(item.headline, sentiment, affectedMarkets),
        sentimentTag: sentiment,
        analysis: null,
      });
    }

    // Generate AI analysis for each catalyst in parallel
    const analysisResults = await Promise.allSettled(
      raw_catalysts.map(c => generateAnalysis(c.title, c.explanation, c.affectedMarkets, c.importance))
    );

    const catalysts: Catalyst[] = raw_catalysts.map((c, i) => ({
      ...c,
      analysis: analysisResults[i].status === "fulfilled" ? analysisResults[i].value : null,
    }));

    if (catalysts.length > 0) {
      cache = { data: catalysts, ts: Date.now() };
    }

    return NextResponse.json({ data: catalysts, timestamp: Date.now(), count: catalysts.length });
  } catch (error) {
    console.error("Catalysts API error:", error);
    return NextResponse.json({ data: cache.data, timestamp: Date.now(), error: "fetch failed" });
  }
}
