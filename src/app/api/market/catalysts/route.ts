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

type GoldUSD = {
  goldImpact: "bullish" | "bearish" | "neutral";
  goldReasoning: string;
  usdImpact: "bullish" | "bearish" | "neutral";
  usdReasoning: string;
};

function deriveGoldUSDFallback(headline: string, sentiment: "bullish" | "bearish" | "neutral"): GoldUSD {
  const h = headline.toLowerCase();

  if (h.includes("fed") || h.includes("rate cut") || h.includes("rate hike") || h.includes("powell") || h.includes("fomc")) {
    return sentiment === "bearish"
      ? { goldImpact: "bearish", goldReasoning: "Hawkish Fed tone raises real yields, reducing gold's non-yielding appeal and pressuring spot prices.", usdImpact: "bullish", usdReasoning: "Higher-for-longer rate expectations attract capital flows into USD, strengthening the dollar's yield advantage." }
      : { goldImpact: "bullish", goldReasoning: "Dovish Fed signals lower real yields ahead, making gold more attractive as a non-yielding safe-haven asset.", usdImpact: "bearish", usdReasoning: "Rate cut expectations erode USD yield advantage, weakening the dollar against major currency pairs." };
  }
  if (h.includes("tariff") || h.includes("trade war") || h.includes("trade deal")) {
    return sentiment === "bearish"
      ? { goldImpact: "bullish", goldReasoning: "Trade war escalation triggers risk-off safe-haven flows into gold as global growth fears intensify.", usdImpact: "neutral", usdReasoning: "Tariff escalation creates competing forces — safe-haven inflows vs. growth damage — leaving USD directionless short-term." }
      : { goldImpact: "bearish", goldReasoning: "Trade deal progress improves global risk sentiment, reducing gold's safe-haven premium and weighing on prices.", usdImpact: "bullish", usdReasoning: "Trade optimism supports USD via improved US growth outlook and reduced recession risk from trade disruptions." };
  }
  if (h.includes("cpi") || h.includes("inflation") || h.includes("pce") || h.includes("price")) {
    return sentiment === "bearish"
      ? { goldImpact: "bearish", goldReasoning: "Hot inflation data pushes Fed rate-cut timeline further out, lifting real yields and making gold less competitive.", usdImpact: "bullish", usdReasoning: "Above-consensus inflation locks in higher US rates for longer, forcing USD short-covering and attracting yield-seeking capital." }
      : { goldImpact: "bullish", goldReasoning: "Cooling inflation accelerates rate-cut expectations, reducing real yields and boosting gold's relative appeal.", usdImpact: "bearish", usdReasoning: "Soft inflation prints increase probability of Fed cuts, eroding USD's yield premium against other major currencies." };
  }
  if (h.includes("war") || h.includes("military") || h.includes("geopolit") || h.includes("iran") || h.includes("nuclear") || h.includes("sanction") || h.includes("attack")) {
    return { goldImpact: "bullish", goldReasoning: "Geopolitical escalation drives flight-to-safety flows into gold — historically the primary beneficiary of global conflict risk.", usdImpact: "bullish", usdReasoning: "USD benefits alongside gold from safe-haven demand as investors exit regional risk exposure and EM assets." };
  }
  if (h.includes("nfp") || h.includes("payroll") || h.includes("employment") || h.includes("jobs")) {
    return sentiment === "bullish"
      ? { goldImpact: "bearish", goldReasoning: "Strong jobs data removes Fed urgency to cut rates, eliminating a key gold bullish catalyst and raising real yield expectations.", usdImpact: "bullish", usdReasoning: "Robust payrolls reinforce the US economic exceptionalism narrative, driving USD higher on reduced rate-cut expectations." }
      : { goldImpact: "bullish", goldReasoning: "Weak jobs report raises recession fears and brings forward rate-cut expectations, boosting gold's safe-haven and rate-sensitive appeal.", usdImpact: "bearish", usdReasoning: "Disappointing employment data accelerates Fed dovish pricing, reducing USD yield advantage and triggering broad dollar selling." };
  }
  if (h.includes("oil") || h.includes("opec") || h.includes("energy")) {
    return { goldImpact: "neutral", goldReasoning: "Oil/energy catalyst has indirect gold impact via inflation transmission — watch for CPI implications in 4-6 weeks.", usdImpact: "neutral", usdReasoning: "Energy price moves affect petro-currencies (CAD, NOK) more directly; USD impact depends on net inflation/growth effect." };
  }

  // Default by sentiment
  return sentiment === "bearish"
    ? { goldImpact: "bullish", goldReasoning: "Risk-off catalyst drives safe-haven demand into gold as investors reduce exposure to risk assets.", usdImpact: "bullish", usdReasoning: "Negative sentiment supports USD safe-haven demand as a flight-to-quality play alongside gold." }
    : sentiment === "bullish"
    ? { goldImpact: "bearish", goldReasoning: "Positive risk catalyst reduces safe-haven demand, marginally weighing on gold as risk appetite improves.", usdImpact: "bullish", usdReasoning: "Risk-on backdrop supports USD via improved US growth narrative and reduced demand for alternative safe-havens." }
    : { goldImpact: "neutral", goldReasoning: "Mixed catalyst with no clear directional bias for gold — await price action confirmation at key levels.", usdImpact: "neutral", usdReasoning: "Neutral backdrop provides no strong USD directional signal — monitor DXY reaction at structural support/resistance." };
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
    goldImpact: "neutral",
    goldReasoning: "Outcome-dependent — hawkish hold pressures gold via higher real yields; dovish pivot or rate cut signal triggers a gold rally as USD weakens.",
    usdImpact: "bullish",
    usdReasoning: "Any hold or hawkish tone reinforces USD yield advantage; only a surprise cut or explicitly dovish forward guidance would weaken the dollar.",
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
    goldImpact: "neutral",
    goldReasoning: "Hot CPI beats push Fed rate-cut timelines out, raising real yields and crushing gold; a soft miss accelerates rate-cut bets and fuels a gold breakout.",
    usdImpact: "neutral",
    usdReasoning: "CPI above consensus = USD surge as traders reprice fewer cuts; CPI below consensus = USD selloff as rate cut probability jumps sharply.",
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
    goldImpact: "neutral",
    goldReasoning: "Strong NFP above 200K removes urgency for rate cuts, reducing gold's appeal; a weak print below 150K sparks recession fears and drives safe-haven gold demand.",
    usdImpact: "neutral",
    usdReasoning: "Blowout jobs number = dollar breakout as Fed patience narrative is confirmed; disappointing NFP = dollar selloff as markets front-run a rate cut cycle.",
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
    goldImpact: "bullish",
    goldReasoning: "Active trade war escalation drives risk-off safe-haven flows directly into gold — every tariff headline adds a geopolitical risk premium to spot prices.",
    usdImpact: "neutral",
    usdReasoning: "USD faces two opposing forces: safe-haven demand pushes it higher, but growth damage from tariffs on the US economy creates a meaningful offsetting headwind.",
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

    const catalysts: Catalyst[] = raw_catalysts.map((c, i) => {
      const ai = analysisResults[i].status === "fulfilled" ? analysisResults[i].value : null;
      type AssetEntry = { name: string; ticker: string; bias: string; context: string };
      const assets: AssetEntry[] = Array.isArray(ai?.assets) ? ai.assets : [];

      const goldAsset = assets.find(a => a.ticker === "XAUUSD" || a.ticker.includes("XAU") || a.name.toLowerCase().includes("gold"));
      const usdAsset  = assets.find(a => a.ticker === "DXY"    || a.ticker.includes("DXY") || a.name.toLowerCase().includes("dollar") || a.name.toLowerCase().includes("usd index"));

      const toBias = (b: string): "bullish" | "bearish" | "neutral" =>
        b?.toLowerCase() === "bullish" ? "bullish" : b?.toLowerCase() === "bearish" ? "bearish" : "neutral";

      // Use AI-extracted gold/USD if available, else rule-based fallback
      const fallback = deriveGoldUSDFallback(c.title, c.sentimentTag);
      return {
        ...c,
        analysis: ai,
        goldImpact:    goldAsset ? toBias(goldAsset.bias) : fallback.goldImpact,
        goldReasoning: goldAsset?.context                 ?? fallback.goldReasoning,
        usdImpact:     usdAsset  ? toBias(usdAsset.bias)  : fallback.usdImpact,
        usdReasoning:  usdAsset?.context                  ?? fallback.usdReasoning,
      };
    });

    if (catalysts.length > 0) {
      cache = { data: catalysts, ts: Date.now() };
    }

    return NextResponse.json({ data: catalysts, timestamp: Date.now(), count: catalysts.length });
  } catch (error) {
    console.error("Catalysts API error:", error);
    return NextResponse.json({ data: cache.data, timestamp: Date.now(), error: "fetch failed" });
  }
}
