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
