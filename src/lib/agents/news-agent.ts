/**
 * Agent 3  -  News Agent (Claude-Powered + Rule-Based Fallback)
 *
 * Analyzes macroeconomic context:
 * - Fed / central bank tone
 * - Geopolitical risk
 * - Inflation / CPI data
 * - Trade/tariff headlines
 * - Directional impact per asset class
 * - Bias-changing events
 */

import Anthropic from "@anthropic-ai/sdk";
import { anthropicCreate } from "./circuit-breaker";
import type {
  MarketSnapshot, NewsAgentOutput, DirectionalBias, CatalystEvent,
} from "./schemas";

// ─────────────────────────────────────────────────────────────────────────────
// LLM Prompt
// ─────────────────────────────────────────────────────────────────────────────

const NEWS_SYSTEM = `You are the Macro & News Analysis Agent in a professional multi-agent trading terminal. You interpret macroeconomic context, geopolitical developments, and news flow to determine market impact.

Your job: analyze real news headlines and determine how they affect the specified asset. Think like a macro-focused fund manager.

STEP 1  -  FILTER: Before analyzing, identify and EXCLUDE headlines with zero financial market relevance:
- Entertainment: movies, box office, TV shows, music, awards
- Sports: games, tournaments, player transfers
- Non-systemic corporate: airline CEO quotes, celebrity lawsuits, product launches
- Lifestyle: fashion, food, travel, health tips
Only analyze headlines that could plausibly move institutional capital or risk appetite.

STEP 2  -  WEIGHT: Not all headlines are equal.
- HIGH-impact catalyst (military attack, central bank surprise, systemic risk): counts 3× in overall direction
- MEDIUM: counts 1×; LOW: counts 0.5×
- If any HIGH-impact catalyst has a clear direction, it DOMINATES unless directly contradicted by another HIGH-impact event

MACRO REGIMES:
- geopolitical: war, sanctions, conflict → safe-haven bid (gold), risk-off
- fed-policy: Fed, FOMC, rate decisions → USD impact, rate-sensitive moves
- inflation: CPI, PCE, price data → real yield, gold, USD reactions
- tariff: trade war, import duties → risk uncertainty, commodity impact
- macro-data: GDP, NFP, employment → forward guidance, risk appetite
- calm: no major catalysts → technical price action dominates

ASSET IMPACT RULES  -  STRICT:
- XAUUSD (Gold):
  * BULLISH: military conflict, Iran escalation, oil chokepoint closure (Hormuz), nuclear threat, Fed rate cuts, dollar weakness, banking crisis, inflation surge, sanctions
  * BEARISH: ceasefire/peace deal, Fed rate hike surprise, strong USD rally, risk-on equity surge, inflation easing sharply
  * CRITICAL: Geopolitical military action (Iran attacking ships, Hormuz tension, nuclear threat) = ALWAYS BULLISH for gold. Do NOT let irrelevant neutral news cancel this.
  * CRITICAL: If riskScore >= 70 and regime is geopolitical, impact must be "bullish" for XAUUSD unless there is explicit ceasefire/de-escalation news
- EURUSD: bullish on ECB hawkish, dollar weakness, risk-on; bearish on ECB dovish, dollar strength, euro crisis
- GBPUSD: bullish on BOE hawkish, risk-on, UK data beat; bearish on BOE dovish, UK recession, dollar strength
- BTCUSD: bullish on institutional adoption, ETF news, rate cuts, risk-on; bearish on regulation, bans, rate hikes

Return ONLY valid JSON:
{
  "impact": "bullish" | "bearish" | "neutral",
  "riskScore": 0-100,
  "confidence": 0-100,
  "dominantCatalyst": "description of the key market-moving theme",
  "regime": "geopolitical" | "fed-policy" | "inflation" | "tariff" | "macro-data" | "calm",
  "catalysts": [{ "headline": "...", "impact": "high|medium|low", "direction": "bullish|bearish|neutral", "affectedAsset": true|false }],
  "biasChangers": ["event that could flip the current bias"],
  "tailRiskEvents": ["tail risk if any"],
  "reasons": ["reason1", "reason2", "reason3"]
}`;

// Headlines with no financial market relevance  -  filter before LLM call
const IRRELEVANT_PATTERNS = [
  /box office|movie season|film opens|blockbuster|\boscars?\b|\bemmys?\b|\bgrammys?\b/i,
  /\bspirit airlines\b.*ceo|airline ceo.*collapse|airline.*runway/i,
  // Only suppress Elon Musk stories specifically about Twitter/X social drama (not Tesla, SpaceX, DOGE, xAI)
  /elon musk.*(twitter|tweet|x\.com).*(lawsuit|buyout|banned|suspended)|twitter.*buyout.*lawsuit|twitter.*2022/i,
  /celebrity|actress|actor|reality tv|nfl draft|nba playoffs|world cup|olympics/i,
  /fashion week|restaurant|recipe|travel guide|hotel review/i,
];

function isMarketRelevant(text: string): boolean {
  return !IRRELEVANT_PATTERNS.some(r => r.test(text));
}

async function runLLMNews(client: Anthropic, snapshot: MarketSnapshot): Promise<NewsAgentOutput> {
  const start = Date.now();
  const { recentNews, symbol } = snapshot;

  // Pre-filter irrelevant headlines so LLM focuses only on market-moving news
  const relevantNews = recentNews.filter(n => isMarketRelevant(`${n.headline} ${n.summary}`));
  const headlineList = relevantNews.slice(0, 10).map((n, i) =>
    `${i + 1}. "${n.headline}"  -  ${n.summary.slice(0, 100)}`
  ).join("\n");

  const msg = `
Analyze macro/news impact for ${snapshot.symbolDisplay} (${snapshot.symbol}).

MARKET-RELEVANT NEWS (irrelevant headlines already filtered out):
${headlineList || "No relevant market news available  -  assume calm macro environment"}

MARKET CONTEXT:
- Asset: ${snapshot.symbolDisplay}
- Current price: ${snapshot.price.current}
- Price change: ${snapshot.price.changePercent > 0 ? "+" : ""}${snapshot.price.changePercent.toFixed(2)}%
- HTF Bias from structure: ${snapshot.structure.htfBias.toUpperCase()} at ${snapshot.structure.htfConfidence}%
- Session: ${snapshot.indicators.session}

REMINDER: Apply the HIGH-impact dominance rule. If any HIGH-impact geopolitical event (military conflict, Iran, nuclear, Hormuz) is present for XAUUSD, the overall impact must be "bullish" unless contradicted by explicit de-escalation.
Determine: macro regime, weighted directional impact for this asset, and what could flip the bias.`.trim();

  const response = await anthropicCreate(client, {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 700,
    system: NEWS_SYSTEM,
    messages: [{ role: "user", content: msg }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    agentId: "news",
    impact: parsed.impact as DirectionalBias,
    riskScore: parsed.riskScore,
    confidence: parsed.confidence,
    dominantCatalyst: parsed.dominantCatalyst,
    regime: parsed.regime,
    catalysts: (parsed.catalysts ?? []) as CatalystEvent[],
    biasChangers: parsed.biasChangers ?? [],
    tailRiskEvents: parsed.tailRiskEvents ?? [],
    reasons: (parsed.reasons ?? []).slice(0, 5),
    processingTime: Date.now() - start,
  };
}

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

// USDJPY: bullish = USD strength / JPY weakness; bearish = JPY safe-haven demand / USD weakness
const BULLISH_USDJPY = [
  "dollar strength", "dxy rally", "fed hawkish", "rate hike", "risk on",
  "boj dovish", "boj yield curve control", "japan inflation low", "yen weakness",
];

const BEARISH_USDJPY = [
  "dollar weakness", "fed dovish", "rate cut", "risk off", "safe haven",
  "boj hawkish", "boj rate hike", "yen intervention", "japan rate hike",
  "geopolitical", "war", "recession fears",
];

// USOIL / UKOIL: bullish = supply disruption / geopolitical risk; bearish = demand drop / supply glut
const BULLISH_OIL = [
  "opec cut", "oil supply cut", "iran sanctions", "hormuz", "oil embargo",
  "russia oil", "energy crisis", "oil shortage", "demand surge", "geopolitical",
  "war", "conflict", "military",
];

const BEARISH_OIL = [
  "opec increase", "oil glut", "demand slowdown", "recession fears", "china slowdown",
  "strategic reserve release", "us oil output", "shale production", "ceasefire",
  "peace deal", "opec deal", "demand destruction",
];

// US equity indices (US500, US100, US30): bullish = risk-on / strong economy; bearish = risk-off / recession
const BULLISH_INDICES = [
  "risk on", "strong gdp", "jobs beat", "nfp beat", "fed pause", "rate cut",
  "earnings beat", "soft landing", "consumer spending", "economic expansion",
  "trade deal", "tariff removed",
];

const BEARISH_INDICES = [
  "risk off", "recession", "rate hike", "fed hawkish", "earnings miss",
  "tariff escalation", "trade war", "banking crisis", "inflation surge",
  "hard landing", "layoffs", "unemployment rise", "market crash",
];

// Crypto alts (ETHUSD, SOLUSD, XRPUSD, etc.): closely correlated with BTC macro sentiment
const BULLISH_CRYPTO_ALT = [
  ...BULLISH_BTC,
  "ethereum etf", "solana adoption", "defi growth", "nft demand", "layer 2",
  "crypto bull", "altcoin rally",
];

const BEARISH_CRYPTO_ALT = [
  ...BEARISH_BTC,
  "ethereum regulation", "defi hack", "protocol exploit", "rug pull",
  "altcoin crash", "crypto winter",
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

  const resolve = (bullKw: string[], bearKw: string[]): "bullish" | "bearish" | "neutral" => {
    const bull = textContainsAny(text, bullKw);
    const bear = textContainsAny(text, bearKw);
    if (bull && !bear) return "bullish";
    if (bear && !bull) return "bearish";
    return "neutral";
  };

  if (upper === "XAUUSD" || upper === "XAGUSD" || upper === "XPTUSD") {
    return resolve(BULLISH_GOLD, BEARISH_GOLD);
  }
  if (upper === "EURUSD") return resolve(BULLISH_EURUSD, BEARISH_EURUSD);
  if (upper === "GBPUSD") return resolve(BULLISH_GBPUSD, BEARISH_GBPUSD);

  // JPY pairs: USDJPY bullish = USD up, JPY down; for JPY-quoted pairs flip the result
  if (upper === "USDJPY" || upper === "EURJPY" || upper === "GBPJPY" || upper === "AUDJPY" || upper === "CADJPY" || upper === "CHFJPY") {
    return resolve(BULLISH_USDJPY, BEARISH_USDJPY);
  }

  // USD-base forex: USDCAD, USDCHF  -  bullish = USD strength
  if (upper === "USDCAD" || upper === "USDCHF") {
    return resolve(BULLISH_USDJPY, BEARISH_USDJPY); // same drivers as USDJPY (USD strength)
  }

  // AUD / NZD pairs  -  risk-sensitive; bullish on risk-on, bearish on risk-off
  if (upper === "AUDUSD" || upper === "NZDUSD" || upper === "AUDCAD" || upper === "AUDNZD") {
    return resolve(BULLISH_INDICES, BEARISH_INDICES);
  }

  // Oil
  if (upper === "USOIL" || upper === "UKOIL") return resolve(BULLISH_OIL, BEARISH_OIL);

  // Equity indices
  if (["US500", "US100", "US30", "GER40", "UK100", "JPN225", "AUS200", "HK50"].includes(upper)) {
    return resolve(BULLISH_INDICES, BEARISH_INDICES);
  }

  // BTC
  if (upper === "BTCUSD") return resolve(BULLISH_BTC, BEARISH_BTC);

  // Crypto alts  -  driven by same macro as BTC with alt-specific keywords
  if (["ETHUSD", "SOLUSD", "XRPUSD", "BNBUSD", "ADAUSD", "DOTUSD", "LNKUSD"].includes(upper)) {
    return resolve(BULLISH_CRYPTO_ALT, BEARISH_CRYPTO_ALT);
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
  const regimeScores: Record<string, number> = {
    "geopolitical": 75,
    "inflation": 60,
    "fed-policy": 55,
    "tariff": 65,
    "macro-data": 50,
    "calm": 20,
  };
  let score = regimeScores[regime] ?? 20;
  if (hasHighImpact) score = Math.min(95, score + 15);
  if (newsCount > 10) score = Math.min(90, score + 5);
  return Math.round(score);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Agent Function
// ─────────────────────────────────────────────────────────────────────────────

export async function runNewsAgent(snapshot: MarketSnapshot, anthropicApiKey?: string): Promise<NewsAgentOutput> {
  const start = Date.now();

  if (anthropicApiKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicApiKey });
      return await runLLMNews(client, snapshot);
    } catch (err) {
      console.warn("News Agent LLM fallback:", err);
    }
  }

  try {
    const { recentNews, symbol } = snapshot;

    if (recentNews.length === 0) {
      return {
        agentId: "news",
        impact: "neutral",
        riskScore: 20,
        confidence: 30,
        dominantCatalyst: "No news data available  -  monitoring for catalysts",
        regime: "calm",
        catalysts: [],
        biasChangers: ["Any high-impact news event could shift bias"],
        tailRiskEvents: [],
        reasons: ["No news data  -  defaulting to neutral macro stance"],
        processingTime: Date.now() - start,
      };
    }

    // Filter out irrelevant headlines before analysis
    const relevantNews = recentNews.filter(n => isMarketRelevant(`${n.headline} ${n.summary}`));
    const newsToProcess = relevantNews.length > 0 ? relevantNews : recentNews;

    const combinedText = newsToProcess
      .map(n => `${n.headline} ${n.summary}`)
      .join(" ");

    const regime = detectRegime(combinedText);

    // Classify each news item
    const HIGH_IMPACT_KEYWORDS = [
      "fed", "fomc", "rate", "cpi", "nfp", "payrolls", "gdp", "war", "tariff", "trump",
      "iran", "hormuz", "nuclear", "military", "attack", "conflict", "escalation",
      "ceasefire", "sanctions", "missile", "explosion", "firing",
    ];

    const catalysts: CatalystEvent[] = newsToProcess.slice(0, 8).map(n => {
      const text = `${n.headline} ${n.summary}`;
      const direction = getAssetNewsImpact(symbol, text);
      const isHighImpact = textContainsAny(text, HIGH_IMPACT_KEYWORDS);
      return {
        headline: n.headline.slice(0, 100),
        impact: isHighImpact ? "high" : "medium",
        direction,
        affectedAsset: direction !== "neutral",
      };
    });

    const hasHighImpact = catalysts.some(c => c.impact === "high");

    // Weighted voting: HIGH = 3×, MEDIUM = 1×  (not flat counting)
    let bullWeight = 0;
    let bearWeight = 0;
    let neutralWeight = 0;
    for (const c of catalysts) {
      const w = c.impact === "high" ? 3 : 1;
      if (c.direction === "bullish") bullWeight += w;
      else if (c.direction === "bearish") bearWeight += w;
      else neutralWeight += w;
    }
    const bullCount = catalysts.filter(c => c.direction === "bullish").length;
    const bearCount = catalysts.filter(c => c.direction === "bearish").length;
    const neutralCount = catalysts.length - bullCount - bearCount;

    let impact: DirectionalBias = "neutral";
    if (bullWeight > bearWeight && bullWeight > neutralWeight) impact = "bullish";
    else if (bearWeight > bullWeight && bearWeight > neutralWeight) impact = "bearish";

    // Geopolitical override: military escalation events always make gold bullish
    // unless there's an equally-weighted explicit de-escalation/ceasefire signal
    if (symbol === "XAUUSD" && regime === "geopolitical" && bullWeight >= bearWeight) {
      const hasEscalation = textContainsAny(combinedText, [
        "iran", "hormuz", "nuclear", "military", "attack", "fired at", "conflict", "escalation", "missile", "war",
      ]);
      const hasCeasefire = textContainsAny(combinedText, ["ceasefire", "peace deal", "de-escalation", "agreement reached"]);
      if (hasEscalation && !hasCeasefire) impact = "bullish";
    }

    // Confidence based on weighted directional clarity
    const totalWeight = bullWeight + bearWeight + neutralWeight || 1;
    const dominanceWeight = Math.max(bullWeight, bearWeight);
    const rawConf = (dominanceWeight / totalWeight) * 100;
    const confidence = Math.round(Math.min(90, Math.max(30, rawConf)));

    // Dominant catalyst
    const topBullish = catalysts.find(c => c.direction === "bullish");
    const topBearish = catalysts.find(c => c.direction === "bearish");
    const dominantCatalyst = impact === "bullish" && topBullish
      ? topBullish.headline
      : impact === "bearish" && topBearish
      ? topBearish.headline
      : "Mixed signals  -  no single dominant catalyst";

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
    if (textContainsAny(combinedText, ["nuclear", "escalation", "sanctions expanded", "missile strike", "military offensive"])) {
      tailRiskEvents.push("Nuclear/military escalation risk  -  tail event with extreme volatility potential");
    }
    if (textContainsAny(combinedText, ["bank failure", "financial crisis", "contagion", "bank run", "credit crunch", "systemic risk"])) {
      tailRiskEvents.push("Systemic financial risk signals  -  potential liquidity crisis");
    }
    if (textContainsAny(combinedText, ["black swan", "flash crash", "circuit breaker", "market halt", "trading suspended"])) {
      tailRiskEvents.push("Market structure stress indicators detected");
    }
    if (textContainsAny(combinedText, ["pandemic", "outbreak", "lockdown", "quarantine", "who emergency"])) {
      tailRiskEvents.push("Pandemic/health emergency risk  -  potential demand shock and supply chain disruption");
    }
    if (textContainsAny(combinedText, ["sovereign default", "debt ceiling", "government shutdown", "credit downgrade", "imf bailout"])) {
      tailRiskEvents.push("Sovereign credit risk  -  potential currency and bond market dislocation");
    }
    if (textContainsAny(combinedText, ["oil embargo", "energy crisis", "pipeline attack", "refinery explosion", "opec surprise"])) {
      tailRiskEvents.push("Energy supply shock  -  commodity volatility spike expected");
    }

    // Reasoning
    const reasons: string[] = [
      `Macro regime: ${regime.replace("-", " ").toUpperCase()}  -  ${
        regime === "geopolitical" ? "risk premium elevated, safe-haven assets bid" :
        regime === "fed-policy"   ? "rate expectation headlines driving USD and fixed income" :
        regime === "inflation"    ? "CPI/PCE data sensitive  -  watch real yield moves" :
        regime === "tariff"       ? "trade uncertainty creating two-way volatility" :
        regime === "macro-data"   ? "economic data releases dominating short-term direction" :
        "quiet macro backdrop, technical setups driving price action"
      }`,
      `News flow: ${bullCount} bullish, ${bearCount} bearish, ${neutralCount} neutral signals for ${symbol}`,
      `Risk score ${computeRiskScore(regime, recentNews.length, hasHighImpact)}/100  -  ${
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
      reasons: ["News analysis failed  -  defaulting to neutral"],
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
