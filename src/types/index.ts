// ==========================================
// TradeX Terminal — Core Type Definitions
// ==========================================

export type Bias = "bullish" | "bearish" | "neutral";
export type Sentiment = "risk-on" | "risk-off" | "mixed";
export type Impact = "high" | "medium" | "low";
export type EventStatus = "upcoming" | "live" | "completed";
export type Session = "asia" | "london" | "new-york" | "closed";
export type AssetClass = "forex" | "commodity" | "index" | "crypto" | "bond";

export type MarketRegime =
  | "inflation-sensitive"
  | "risk-off"
  | "usd-dominant"
  | "yield-driven"
  | "geopolitical"
  | "policy-headline"
  | "risk-on"
  | "liquidity-driven";

export interface AssetSnapshot {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  bias: Bias;
  class: AssetClass;
  momentum: "strong" | "moderate" | "weak";
}

// ── AI Analysis (per asset, from /api/market/ai-analysis) ──────────────────────
export interface AssetAIAnalysis {
  // Action callout
  action: string;               // "Look for BUY Setups" | "Look for SELL Setups" | "Wait for Confirmation" | "Avoid Trading"
  actionSub: string;            // one-line description
  actionIntent: "buy" | "sell" | "wait" | "avoid";

  // Market phase
  marketPhase: string;          // "Accumulation" | "Expansion" | "Distribution" | "Pullback" | "Manipulation" | "Range"
  phaseDescription: string;     // one sentence

  // Narrative
  narrative: string;            // 2-3 sentence macro + price action analysis

  // Factors
  supportingFactors: string[];  // 3-5 SMC/macro bullet points
  invalidationFactors: string[]; // 3-5 bullet points

  // Execution guidance
  waitFor: string;
  confirms: string;
  invalidates: string;

  // Trade status
  tradeStatus: "TRADE READY" | "WATCHLIST" | "NO TRADE";
  setupNarrative: string;       // 1-2 sentence setup rationale

  // ── Structural bias (Claude's own structural assessment) ─────────────────────
  // structuralBias: HTF trend read from price structure (52w position, displacement)
  // setupBias: direction of the current LTF setup
  structuralBias: "bullish" | "bearish" | "neutral";
  setupBias: "bullish" | "bearish" | "neutral";

  // ── AI-derived price levels ──────────────────────────────────────────────────
  // Claude places these based on market structure, OB/FVG/liquidity — NOT formulas.
  // null = no clean setup exists (NO TRADE) or too uncertain to specify (WATCHLIST).
  entry: number | null;
  stopLoss: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;

  // Reasoning for each level — shown in the expanded Key Levels card view
  entryZone: string;   // e.g. "Bullish OB 2678–2682 — last bearish candle before rally"
  slZone: string;      // e.g. "Below swing low 2661 — thesis invalid on close below"
  tp1Zone: string;     // e.g. "Equal highs 2710 — prior session liquidity pool"
  tp2Zone: string;     // e.g. "Weekly resistance 2735 — external liquidity"
}

export interface BiasData {
  asset: string;
  bias: Bias;
  confidence: number; // 0-100
  supportingFactors: string[];
  invalidationFactors: string[];
  keyLevels: { support: number; resistance: number };
  macroDrivers: string[];
  correlatedAssets: string[];
  sessionBehavior: string;
}

export interface Catalyst {
  id: string;
  title: string;
  timestamp: string;
  affectedMarkets: string[];
  importance: Impact;
  status: EventStatus;
  explanation: string;
  marketImplication: string;
  sentimentTag: Bias;
  goldImpact?: "bullish" | "bearish" | "neutral";
  goldReasoning?: string;
  usdImpact?: "bullish" | "bearish" | "neutral";
  usdReasoning?: string;
  analysis?: {
    eventOverview: string;
    whyMarketsCare: string;
    assets: { name: string; ticker: string; bias: string; context: string }[];
    marketLogic: string;
    conditions: string;
  } | null;
}

export interface EconomicEvent {
  id: string;
  time: string;
  date?: string;
  currency: string;
  country: string;
  event: string;
  impact: Impact;
  forecast: string;
  previous: string;
  actual?: string;
  deviation?: string;
  interpretation?: string;
  affectedAssets: string[];
  status: EventStatus;
  goldImpact?: "bullish" | "bearish" | "neutral";
  goldReasoning?: string;
  usdImpact?: "bullish" | "bearish" | "neutral";
  usdReasoning?: string;
  tradeImplication?: string;
  postEventSummary?: string;   // Narrative for completed events
  postEventBullets?: string[]; // "Now watch" checklist for completed events
  preEventSummary?: string;    // Narrative for upcoming/live events
  preEventBullets?: string[];  // "What to watch" checklist for upcoming/live events
  utcTimestamp?: number;       // Unix ms — used for countdown timer
}

// Extended news item with optional URL/image from live feeds
export interface LiveNewsItem extends NewsItem {
  url?: string;
  image?: string;
}

export interface TrumpPost {
  id: string;
  timestamp: string;
  content: string;
  source: string;
  sentimentClassification: Bias;
  impactScore: number; // 1-10
  affectedAssets: string[];
  policyCategory: string;
  whyItMatters: string;
  potentialReaction: string;
  tags: string[];
  goldImpact?: "bullish" | "bearish" | "neutral";
  goldReasoning?: string;
  usdImpact?: "bullish" | "bearish" | "neutral";
  usdReasoning?: string;
}

export interface SessionSummary {
  session: Session;
  status: "active" | "closed" | "upcoming";
  keyMoves: string[];
  volatilityTone: "high" | "moderate" | "low";
  liquidityNotes: string;
  keyLevels: string[];
  whatChanged: string;
  carriesForward: string;
}

export interface NewsItem {
  id: string;
  timestamp: string;
  headline: string;
  category: string;
  sentiment: Bias;
  impactScore: number;
  affectedAssets: string[];
  summary: string;
  source: string;
  goldImpact?: "bullish" | "bearish" | "neutral";
  goldReasoning?: string;
  usdImpact?: "bullish" | "bearish" | "neutral";
  usdReasoning?: string;
}

export interface AIBriefing {
  id: string;
  type: "market-open" | "mid-session" | "pre-ny" | "end-of-day";
  title: string;
  timestamp: string;
  whatHappened: string;
  whyItMatters: string;
  whatChanged: string;
  whatToWatch: string[];
  biasSupport: string[];
  biasInvalidation: string[];
}

export interface MarketNarrative {
  summary: string;
  regime: MarketRegime;
  dominantTheme: string;
  conviction: number; // 0-100
}

export interface AssetCorrelation {
  asset1: string;
  asset2: string;
  correlation: number; // -1 to 1
  note: string;
}

export interface TradeContext {
  condition: string;
  directionalLean: string;
  cautionFactors: string[];
  idealMindset: string;
}
