/**
 * Agent 3 — News Agent (Rule-Based + LLM)
 *
 * Analyzes macroeconomic context:
 * - Fed / central bank tone
 * - Geopolitical risk
 * - Inflation / CPI data
 * - Trade/tariff headlines
 * - Directional impact per asset class
 * - Bias-changing events
 */

import type {
  MarketSnapshot, NewsAgentOutput, DirectionalBias, CatalystEvent,
} from "./schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Keyword Classifiers
// ─────────────────────────────────────────────────────────────────────────────

const BULLISH_GOLD = [
  "inflation", "cpi", "hot inflation", "geopolitical", "war", "conflict", "iran", "russia",
  "nuclear", "rate cut", "dovish", "fed pause", "safe haven", "recession fears",
  "banking crisis", "dollar weakness", "gold demand", "central bank buying",
];

const BEARISH_GOLD = [
  "rate hike", "hawkish", "strong economy", "risk on", "dollar strength", "dxy rally",
  "yields rising", "10y", "treasury yields", "fed tightening", "inflation easing",
  "ceasefire", "peace deal", "risk appetite",
];

const BULLISH_EURUSD = [
  "ecb rate hike", "ecb hawkish", "dollar weakness", "dxy selloff", "fed dovish",
  "rate cut expected", "europe recovery", "risk on", "euro strength",
];

const BEARISH_EURUSD = [
  "dollar strength", "dxy rally", "fed hawkish", "rate hike", "eurozone recession",
  "ecb dovish", "euro weakness", "eu crisis", "parity", "dollar surges",
];

const BULLISH_GBPUSD = [
  "boe rate hike", "uk gdp beat", "dollar weakness", "risk on", "sterling strength",
  "pound rally", "uk employment", "boe hawkish",
];

const BEARISH_GBPUSD = [
  "dollar strength", "boe dovish", "uk recession", "hard brexit", "sterling weakness",
  "pound drops", "uk inflation falls", "boe pause",
];

const BULLISH_BTC = [
  "btc etf", "bitcoin etf", "crypto rally", "risk on", "liquidity injection",
  "fed pause", "rate cut", "bitcoin adoption", "institutional buying",
  "halving", "crypto regulation positive",
];

const BEARISH_BTC = [
  "crypto ban", "sec crackdown", "regulation", "risk off", "rate hike",
  "crypto crash", "bitcoin sell", "exchange hack", "stablecoin collapse",
  "china ban",
];

function textContainsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-Asset News Directional Impact
// ─────────────────────────────────────────────────────────────────────────────

function getAssetNewsImpact(
  symbol: string,
  text: string
): "bullish" | "bearish" | "neutral" {
  const upper = symbol.toUpperCase();

  if (upper === "XAUUSD") {
    const bull = textContainsAny(text, BULLISH_GOLD);
    const bear = textContainsAny(text, BEARISH_GOLD);
    if (bull && !bear) return "bullish";
    if (bear && !bull) return "bearish";
    return "neutral";
  }

  if (upper === "EURUSD") {
    const bull = textContainsAny(text, BULLISH_EURUSD);
    const bear = textContainsAny(text, BEARISH_EURUSD);
    if (bull && !bear) return "bullish";
    if (bear && !bull) return "bearish";
    return "neutral";
  }

  if (upper === "GBPUSD") {
    const bull = textContainsAny(text, BULLISH_GBPUSD);
    const bear = textContainsAny(text, BEARISH_GBPUSD);
    if (bull && !bear) return "bullish";
    if (bear && !bull) return "bearish";
    return "neutral";
  }

  if (upper === "BTCUSD") {
    const bull = textContainsAny(text, BULLISH_BTC);
    const bear = textContainsAny(text, BEARISH_BTC);
    if (bull && !bear) return "bullish";
    if (bear && !bull) return "bearish";
    return "neutral";
  }

  return "neutral";
}

// ─────────────────────────────────────────────────────────────────────────────
// Regime Detection
// ─────────────────────────────────────────────────────────────────────────────

function detectRegime(combinedText: string): string {
  if (textContainsAny(combinedText, ["war", "military", "nuclear", "iran", "russia", "sanction", "geopolitical"])) {
    return "geopolitical";
  }
  if (textContainsAny(combinedText, ["cpi", "inflation", "pce", "deflation", "price pressure"])) {
    return "inflation";
  }
  if (textContainsAny(combinedText, ["fed", "rate cut", "rate hike", "powell", "fomc", "central bank", "boe", "ecb"])) {
    return "fed-policy";
  }
  if (textContainsAny(combinedText, ["tariff", "trade war", "trade deal", "import duty", "trump tariff"])) {
    return "tariff";
  }
  if (textContainsAny(combinedText, ["recession", "gdp", "unemployment", "jobs report", "nfp", "payrolls"])) {
    return "macro-data";
  }
  return "calm";
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk Score
// ─────────────────────────────────────────────────────────────────────────────

function computeRiskScore(regime: string, newsCount: number, hasHighImpact: boolean): number {
  let score = 20; // base
  const regimeScores: Record<string, number> = {
    "geopolitical": 75,
    "inflation": 60,
    "fed-policy": 55,
    "tariff": 65,
    "macro-data": 50,
    "calm": 20,
  };
  score = regimeScores[regime] ?? 20;
  if (hasHighImpact) score = Math.min(95, score + 15);
  if (newsCount > 10) score = Math.min(90, score + 5);
  return Math.round(score);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Agent Function
// ─────────────────────────────────────────────────────────────────────────────

export async function runNewsAgent(snapshot: MarketSnapshot): Promise<NewsAgentOutput> {
  const start = Date.now();

  try {
    const { recentNews, symbol } = snapshot;

    if (recentNews.length === 0) {
      return {
        agentId: "news",
        impact: "neutral",
        riskScore: 20,
        confidence: 30,
        dominantCatalyst: "No news data available — monitoring for catalysts",
        regime: "calm",
        catalysts: [],
        biasChangers: ["Any high-impact news event could shift bias"],
        tailRiskEvents: [],
        reasons: ["No news data — defaulting to neutral macro stance"],
        processingTime: Date.now() - start,
      };
    }

    const combinedText = recentNews
      .map(n => `${n.headline} ${n.summary}`)
      .join(" ");

    const regime = detectRegime(combinedText);

    // Classify each news item
    const catalysts: CatalystEvent[] = recentNews.slice(0, 8).map(n => {
      const text = `${n.headline} ${n.summary}`;
      const direction = getAssetNewsImpact(symbol, text);
      const isHighImpact =
        textContainsAny(text, ["fed", "fomc", "rate", "cpi", "nfp", "payrolls", "gdp", "war", "tariff", "trump"]);
      return {
        headline: n.headline.slice(0, 100),
        impact: isHighImpact ? "high" : "medium",
        direction,
        affectedAsset: direction !== "neutral",
      };
    });

    const hasHighImpact = catalysts.some(c => c.impact === "high");

    // Dominant directional impact
    const bullCount = catalysts.filter(c => c.direction === "bullish").length;
    const bearCount = catalysts.filter(c => c.direction === "bearish").length;
    const neutralCount = catalysts.length - bullCount - bearCount;

    let impact: DirectionalBias = "neutral";
    if (bullCount > bearCount && bullCount > neutralCount) impact = "bullish";
    else if (bearCount > bullCount && bearCount > neutralCount) impact = "bearish";

    // Confidence based on directional clarity
    const dominance = Math.max(bullCount, bearCount);
    const total = catalysts.length || 1;
    const rawConf = (dominance / total) * 100;
    const confidence = Math.round(Math.min(90, Math.max(30, rawConf)));

    // Dominant catalyst
    const topBullish = catalysts.find(c => c.direction === "bullish");
    const topBearish = catalysts.find(c => c.direction === "bearish");
    const dominantCatalyst = impact === "bullish" && topBullish
      ? topBullish.headline
      : impact === "bearish" && topBearish
      ? topBearish.headline
      : "Mixed signals — no single dominant catalyst";

    // Bias changers: headlines that could flip the current bias
    const biasChangers: string[] = [];
    if (regime === "fed-policy") {
      biasChangers.push("Unexpected Fed hawkish/dovish pivot could reverse current bias");
      biasChangers.push("FOMC minutes or Powell speech may shift rate expectations abruptly");
    }
    if (regime === "geopolitical") {
      biasChangers.push("De-escalation or ceasefire announcement would pressure gold, boost risk assets");
      biasChangers.push("Escalation to conflict would spike safe-haven demand immediately");
    }
    if (regime === "inflation") {
      biasChangers.push("Hot CPI print would pressure rate-cut expectations, USD bullish");
      biasChangers.push("Cool inflation data = dovish pivot speculation, gold/EUR bullish");
    }
    if (regime === "tariff") {
      biasChangers.push("Trade deal announcement = risk-on, USD weakness, gold under pressure");
      biasChangers.push("New tariff escalation = risk-off, safe-haven demand spikes");
    }
    if (biasChangers.length === 0) {
      biasChangers.push("No obvious near-term bias-changing events identified");
    }

    // Tail risk events
    const tailRiskEvents: string[] = [];
    if (textContainsAny(combinedText, ["nuclear", "escalation", "sanctions expanded"])) {
      tailRiskEvents.push("Nuclear/military escalation risk — tail event with extreme volatility potential");
    }
    if (textContainsAny(combinedText, ["bank failure", "financial crisis", "contagion"])) {
      tailRiskEvents.push("Systemic financial risk signals — potential liquidity crisis");
    }
    if (textContainsAny(combinedText, ["black swan", "flash crash", "circuit breaker"])) {
      tailRiskEvents.push("Market structure stress indicators detected");
    }

    // Reasoning
    const reasons: string[] = [
      `Macro regime: ${regime.replace("-", " ").toUpperCase()} — ${
        regime === "geopolitical" ? "risk premium elevated, safe-haven assets bid" :
        regime === "fed-policy"   ? "rate expectation headlines driving USD and fixed income" :
        regime === "inflation"    ? "CPI/PCE data sensitive — watch real yield moves" :
        regime === "tariff"       ? "trade uncertainty creating two-way volatility" :
        regime === "macro-data"   ? "economic data releases dominating short-term direction" :
        "quiet macro backdrop, technical setups driving price action"
      }`,
      `News flow: ${bullCount} bullish, ${bearCount} bearish, ${neutralCount} neutral signals for ${symbol}`,
      `Risk score ${computeRiskScore(regime, recentNews.length, hasHighImpact)}/100 — ${
        hasHighImpact ? "high-impact events present, wider stops required" :
        "moderate risk environment"
      }`,
    ];

    if (catalysts.length > 0) {
      reasons.push(`Top catalyst: "${dominantCatalyst.slice(0, 80)}"`);
    }

    const riskScore = computeRiskScore(regime, recentNews.length, hasHighImpact);

    return {
      agentId: "news",
      impact,
      riskScore,
      confidence,
      dominantCatalyst,
      regime,
      catalysts,
      biasChangers,
      tailRiskEvents,
      reasons: reasons.slice(0, 5),
      processingTime: Date.now() - start,
    };
  } catch (err) {
    return {
      agentId: "news",
      impact: "neutral",
      riskScore: 50,
      confidence: 25,
      dominantCatalyst: "News analysis failed",
      regime: "calm",
      catalysts: [],
      biasChangers: [],
      tailRiskEvents: [],
      reasons: ["News analysis failed — defaulting to neutral"],
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
