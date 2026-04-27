/**
 * TradeX Multi-Agent Terminal — Schema Definitions
 *
 * All agent inputs and outputs are strictly typed.
 * Every agent receives the same MarketSnapshot and returns a typed AgentOutput.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Shared Primitives
// ─────────────────────────────────────────────────────────────────────────────

export type Timeframe = "M5" | "M15" | "H1" | "H4";
export type Symbol =
  // Metals
  | "XAUUSD" | "XAGUSD" | "XPTUSD"
  // Major Forex
  | "EURUSD" | "GBPUSD" | "USDJPY" | "USDCHF" | "USDCAD" | "AUDUSD" | "NZDUSD"
  // Cross / Minor Forex
  | "EURJPY" | "GBPJPY" | "EURGBP" | "AUDJPY" | "CADJPY" | "CHFJPY" | "EURCAD" | "GBPCAD" | "AUDCAD" | "AUDNZD"
  // Indices
  | "US500" | "US100" | "US30" | "GER40" | "UK100" | "JPN225" | "AUS200" | "HK50"
  // Crypto
  | "BTCUSD" | "ETHUSD" | "SOLUSD" | "XRPUSD" | "BNBUSD" | "ADAUSD" | "DOTUSD" | "LNKUSD"
  // Commodities
  | "USOIL" | "UKOIL" | "NATGAS" | "CORN" | "WHEAT" | "COPPER";
export type DirectionalBias = "bullish" | "bearish" | "neutral";
export type TradeDirection = "long" | "short" | "none";
export type FinalBias = "bullish" | "bearish" | "no-trade";
export type PriceZone = "PREMIUM" | "EQUILIBRIUM" | "DISCOUNT";
export type SetupType = "OB" | "FVG" | "BOS" | "CHoCH" | "Sweep" | "None";
export type MarketPhase = "Accumulation" | "Manipulation" | "Expansion" | "Distribution" | "Pullback" | "Range";

// ─────────────────────────────────────────────────────────────────────────────
// Market Snapshot — normalized input for all agents
// ─────────────────────────────────────────────────────────────────────────────

export interface PriceData {
  current: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  change: number;
  changePercent: number;
  dayRange: number;
  positionInDay: number; // 0–100
}

export interface StructureData {
  pos52w: number;        // 0–100, percent through 52-week range
  high52w: number;
  low52w: number;
  zone: PriceZone;
  htfBias: DirectionalBias;
  htfConfidence: number;
  smcContext: string;
  equilibrium: number;
  inDiscount: boolean;
  inPremium: boolean;
}

export interface IndicatorData {
  rsi: number;           // 14-period RSI
  macdHist: number;
  atrProxy: number;      // abs % change as ATR proxy
  session: string;       // "Asia" | "London" | "New York" | "Closed"
  sessionHour: number;   // UTC hour
}

export interface NewsSnapshot {
  headline: string;
  summary: string;
  timestamp: number;
}

export interface MarketSnapshot {
  symbol: Symbol;
  symbolDisplay: string;
  timeframe: Timeframe;
  timestamp: string;
  price: PriceData;
  structure: StructureData;
  indicators: IndicatorData;
  recentNews: NewsSnapshot[];
  // Derived convenience flags
  volatilityHigh: boolean;   // atrProxy > 1.0
  isExtended: boolean;       // rsi > 70 or rsi < 30
  hasNewsCatalyst: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent 1 — Trend Agent
// ─────────────────────────────────────────────────────────────────────────────

export interface TimeframeBias {
  M5: DirectionalBias;
  M15: DirectionalBias;
  H1: DirectionalBias;
  H4: DirectionalBias;
  aligned: boolean;      // true if all TFs agree
}

export interface TrendAgentOutput {
  agentId: "trend";
  bias: DirectionalBias;
  confidence: number;     // 0–100
  timeframeBias: TimeframeBias;
  maAlignment: boolean;
  momentumDirection: "expanding" | "contracting" | "flat";
  marketPhase: MarketPhase;
  reasons: string[];
  invalidationLevel: number | null;
  processingTime: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent 2 — SMC Agent
// ─────────────────────────────────────────────────────────────────────────────

export interface SMCKeyLevels {
  orderBlockHigh: number | null;
  orderBlockLow: number | null;
  fvgHigh: number | null;
  fvgLow: number | null;
  fvgMid: number | null;
  liquidityTarget: number | null;    // nearest equal highs/lows
  sweepLevel: number | null;         // recent liquidity sweep level
  premiumZoneTop: number | null;
  discountZoneBottom: number | null;
}

export interface SMCAgentOutput {
  agentId: "smc";
  bias: DirectionalBias;
  confidence: number;
  setupType: SetupType;
  setupPresent: boolean;
  keyLevels: SMCKeyLevels;
  premiumDiscount: PriceZone;
  liquiditySweepDetected: boolean;
  bosDetected: boolean;
  chochDetected: boolean;
  reasons: string[];
  invalidationLevel: number | null;
  processingTime: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent 3 — News Agent
// ─────────────────────────────────────────────────────────────────────────────

export interface CatalystEvent {
  headline: string;
  impact: "high" | "medium" | "low";
  direction: "bullish" | "bearish" | "neutral";
  affectedAsset: boolean;
}

export interface NewsAgentOutput {
  agentId: "news";
  impact: DirectionalBias;
  riskScore: number;       // 0–100: higher = more macro risk/uncertainty
  confidence: number;
  dominantCatalyst: string;
  regime: string;          // "geopolitical" | "fed-policy" | "inflation" | "tariff" | "calm"
  catalysts: CatalystEvent[];
  biasChangers: string[];  // events that could flip the current bias
  tailRiskEvents: string[];
  reasons: string[];
  processingTime: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent 4 — Risk Agent
// ─────────────────────────────────────────────────────────────────────────────

export type RiskGrade = "A" | "B" | "C" | "D" | "F";

export interface RiskAgentOutput {
  agentId: "risk";
  valid: boolean;          // true = trade quality passes risk threshold
  grade: RiskGrade;        // overall risk grade
  warnings: string[];
  maxRiskPercent: number;  // recommended max account risk %
  volatilityScore: number; // 0–100
  sessionScore: number;    // 0–100: how favorable current session is
  stopDistance: number | null;    // in price points
  estimatedRR: number | null;
  reasons: string[];
  processingTime: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent 5 — Execution Agent
// ─────────────────────────────────────────────────────────────────────────────

export type SignalState = "ARMED" | "PENDING" | "EXPIRED" | "NO_TRADE";

export interface ExecutionAgentOutput {
  agentId: "execution";
  hasSetup: boolean;
  direction: TradeDirection;
  entry: number | null;
  stopLoss: number | null;
  tp1: number | null;
  tp2: number | null;
  rrRatio: number | null;
  trigger: string;
  triggerCondition: string;
  managementNotes: string[];
  entryZone: string;
  slZone: string;
  tp1Zone: string;
  signalState: SignalState;         // NEW: ARMED | PENDING | EXPIRED | NO_TRADE
  signalStateReason: string;        // NEW: human-readable explanation
  distanceToEntry: number | null;   // NEW: % distance from current price to entry
  processingTime: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent 6 — Contrarian Agent
// ─────────────────────────────────────────────────────────────────────────────

export interface ContrarianAgentOutput {
  agentId: "contrarian";
  challengesBias: boolean;    // true = has strong counter-thesis
  trapType: string | null;    // "bull trap" | "bear trap" | "false breakout" | "stop hunt" | null
  trapConfidence: number;     // 0–100
  oppositeLiquidity: number | null;  // price level of opposite-side liquidity
  failureReasons: string[];          // why the primary setup might fail
  alternativeScenario: string;       // what happens if primary thesis is wrong
  riskFactor: number;                // 0–100: how much contrarian risk exists
  processingTime: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent 7 — Master Decision Agent
// ─────────────────────────────────────────────────────────────────────────────

export interface TradePlan {
  direction: "long" | "short";
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number | null;
  rrRatio: number;
  maxRiskPercent: number;
  trigger: string;
  triggerCondition: string;
  entryZone: string;
  slZone: string;
  tp1Zone: string;
  managementNotes: string[];
}

export interface AgentConsensusItem {
  agentId: string;
  bias: string;
  confidence: number;
  weight: number;
  weightedScore: number;   // bias * confidence * weight, normalized -100 to +100
}

export interface MasterDecisionOutput {
  agentId: "master";
  finalBias: FinalBias;
  confidence: number;         // 0–100
  consensusScore: number;     // -100 to +100
  tradePlan: TradePlan | null;
  supports: string[];         // what supports the final bias
  invalidations: string[];    // what could invalidate the bias
  agentConsensus: AgentConsensusItem[];
  noTradeReason?: string;
  strategyMatch?: string;     // e.g. "OB Sweep + BOS Continuation"
  processingTime: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Debate System — agent-vs-agent debate log
// ─────────────────────────────────────────────────────────────────────────────

export interface DebateEntry {
  agentId: string;
  displayName: string;
  stance: "bullish" | "bearish" | "neutral" | "no-trade" | "valid" | "invalid" | "opposing";
  confidence: number;
  position: string;       // 2-3 sentence opening argument
  challenge?: string;     // 1-2 sentence challenge to opposing agents (null if fully aligned)
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator Output — full session result
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentRunResult {
  symbol: Symbol;
  symbolDisplay: string;
  timeframe: Timeframe;
  timestamp: string;
  snapshot: MarketSnapshot;
  agents: {
    trend: TrendAgentOutput;
    smc: SMCAgentOutput;
    news: NewsAgentOutput;
    risk: RiskAgentOutput;
    execution: ExecutionAgentOutput;
    contrarian: ContrarianAgentOutput;
    master: MasterDecisionOutput;
  };
  debate?: DebateEntry[];
  totalProcessingTime: number;
  cached?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Config — configurable weights
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoringWeights {
  trend: number;       // default 0.25
  smc: number;         // default 0.30
  news: number;        // default 0.15
  execution: number;   // default 0.10
  contrarian: number;  // default 0.10 (reduces score when challenging)
  riskGate: number;    // default 0.10 (risk agent gates, not biases)
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  trend: 0.25,
  smc: 0.30,
  news: 0.15,
  execution: 0.10,
  contrarian: 0.10,
  riskGate: 0.10,
};

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Catalog — named setups the system recognizes
// ─────────────────────────────────────────────────────────────────────────────

export const STRATEGY_CATALOG = [
  { id: "ob-bos", name: "OB + BOS Continuation", description: "Order block retest after break of structure" },
  { id: "fvg-fill", name: "FVG Fill + Momentum", description: "Fair value gap mitigation with momentum alignment" },
  { id: "sweep-reversal", name: "Sweep & Reverse", description: "Liquidity sweep below/above equal highs/lows then reversal" },
  { id: "choch-reentry", name: "CHoCH Re-entry", description: "Change of character followed by pullback entry" },
  { id: "premium-short", name: "Premium Zone Short", description: "Sell into premium zone with bearish structure" },
  { id: "discount-long", name: "Discount Zone Long", description: "Buy from discount zone with bullish structure" },
  { id: "session-open", name: "Session Open Break", description: "Directional break at London or NY open" },
  { id: "news-continuation", name: "News Continuation", description: "High-impact news aligning with technical setup" },
] as const;
