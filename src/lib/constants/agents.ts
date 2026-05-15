/**
 * TradeX Terminal  -  Agent Registry
 * Single source of truth for all 7 agent definitions.
 */

export type AgentType = "rule-based" | "llm" | "hybrid";
export type AgentStatus = "active" | "scanning" | "gating" | "adjudicating";

export interface AgentDefinition {
  id: string;
  index: number;
  name: string;
  shortName: string;
  icon: string;
  type: AgentType;
  model: string | null;
  status: AgentStatus;
  statusLabel: string;
  role: string;
  description: string;
  outputs: string[];
  accent: string;         // Tailwind color class for glow/border
  accentHex: string;      // Raw hex for SVG / canvas use
  isMaster?: boolean;
  isGate?: boolean;
}

export const AGENTS: AgentDefinition[] = [
  {
    id: "trend",
    index: 1,
    name: "Trend Agent",
    shortName: "TREND",
    icon: "📈",
    type: "hybrid",
    model: "claude-haiku-4-5",
    status: "scanning",
    statusLabel: "Scanning",
    role: "Multi-timeframe directional bias",
    description:
      "Computes directional bias across M5/M15/H1/H4 using RSI, MACD histogram, and MA stack alignment. Assigns a confidence score and market phase. Feeds the consensus engine.",
    outputs: ["bias", "confidence", "marketPhase", "timeframeBias", "invalidationLevel"],
    accent: "blue",
    accentHex: "#3b82f6",
  },
  {
    id: "smc",
    index: 2,
    name: "Price Action Agent",
    shortName: "PA",
    icon: "🔍",
    type: "llm",
    model: "claude-sonnet-4-6",
    status: "active",
    statusLabel: "Active",
    role: "NY session liquidity sweep detection",
    description:
      "Detects session-level liquidity sweeps (London Low, PDH, Asian High/Low) within the NY window (13:00–18:00 UTC). Identifies FVGs post-sweep, validates sweep direction against daily bias. Primary gatekeeper for entry eligibility.",
    outputs: ["liquiditySweepDetected", "sweepLevel", "setupType", "fvgMid", "invalidationLevel"],
    accent: "emerald",
    accentHex: "#10b981",
  },
  {
    id: "news",
    index: 3,
    name: "News Agent",
    shortName: "NEWS",
    icon: "📰",
    type: "llm",
    model: "claude-haiku-4-5",
    status: "scanning",
    statusLabel: "Scanning",
    role: "Macro & geopolitical risk scoring",
    description:
      "Parses live news feed and economic calendar. Classifies each event as bullish/bearish/neutral with an impact score. Computes a composite riskScore (0–100). High-risk events dampen neutral signals; directional signals retain full weight.",
    outputs: ["impact", "riskScore", "regime", "dominantCatalyst", "biasChangers"],
    accent: "amber",
    accentHex: "#f59e0b",
  },
  {
    id: "risk",
    index: 4,
    name: "Risk Gate",
    shortName: "RISK",
    icon: "🛡️",
    type: "rule-based",
    model: null,
    status: "gating",
    statusLabel: "Gating",
    role: "Hard-block validator  -  overrides all signals",
    description:
      "Rule-based gate with no AI path. Evaluates volatility score, session quality, actual RR ratio from Execution Agent, RSI extremes, and 52-week position. Five hard-block conditions: session closed, ATR >2.5%, RR <1:1, 5+ warnings. Grade A–F issued to Master Agent.",
    outputs: ["valid", "grade", "volatilityScore", "sessionScore", "warnings", "maxRiskPercent"],
    accent: "red",
    accentHex: "#ef4444",
    isGate: true,
  },
  {
    id: "execution",
    index: 5,
    name: "Execution Agent",
    shortName: "EXEC",
    icon: "⚡",
    type: "rule-based",
    model: null,
    status: "scanning",
    statusLabel: "Scanning",
    role: "Entry / SL / TP computation",
    description:
      "Generates precise execution plan only when a sweep is confirmed. Entry at FVG midpoint or sweep level. SL = sweep extreme + instrument-specific buffer. TP capped at 1.5R / 2.5R. Outputs signal state: ARMED / PENDING / EXPIRED / NO_TRADE.",
    outputs: ["entry", "stopLoss", "tp1", "tp2", "rrRatio", "signalState", "triggerCondition"],
    accent: "violet",
    accentHex: "#8b5cf6",
  },
  {
    id: "contrarian",
    index: 6,
    name: "Contrarian Agent",
    shortName: "CONTRA",
    icon: "⚠️",
    type: "llm",
    model: "claude-haiku-4-5",
    status: "scanning",
    statusLabel: "Scanning",
    role: "Devil's advocate  -  trap & failure detection",
    description:
      "Challenges the primary thesis. Scans for bull/bear traps, false BOS, stop-hunt magnets at 52-week extremes, HTF-LTF divergence, and CHoCH uncertainty. Returns riskFactor (0–100) that acts as a headwind in consensus scoring.",
    outputs: ["challengesBias", "trapType", "riskFactor", "oppositeLiquidity", "alternativeScenario"],
    accent: "orange",
    accentHex: "#f97316",
  },
  {
    id: "master",
    index: 7,
    name: "Master Agent",
    shortName: "MASTER",
    icon: "👑",
    type: "llm",
    model: "claude-sonnet-4-6",
    status: "adjudicating",
    statusLabel: "Adjudicating",
    role: "Final verdict  -  sees all agents + debate",
    description:
      "Final adjudicator. Receives all 6 agent outputs plus the structured inter-agent debate. Applies weighted consensus scoring, structural gates (BOS/sweep override), and sweep-first enforcement before issuing a final directional verdict with supporting rationale.",
    outputs: ["finalBias", "confidence", "verdict", "rationale", "keyLevels", "supports"],
    accent: "sky",
    accentHex: "#0ea5e9",
    isMaster: true,
  },
];

// Pipeline phases  -  used by the flow diagram
export const PIPELINE_PHASES = [
  {
    phase: "Phase 1",
    label: "Independent Analysis",
    agentIds: ["trend", "smc", "news"],
    parallel: true,
    description: "All three run concurrently against the same MarketSnapshot.",
  },
  {
    phase: "Phase 2a",
    label: "Setup Validation",
    agentIds: ["execution", "contrarian"],
    parallel: true,
    description: "Execution & Contrarian depend on Phase 1 outputs. Run in parallel.",
  },
  {
    phase: "Phase 2b",
    label: "Risk Gate",
    agentIds: ["risk"],
    parallel: false,
    description: "Sequential  -  requires actual RR ratio from Execution Agent.",
  },
  {
    phase: "Phase 3",
    label: "Debate",
    agentIds: [],
    parallel: false,
    description: "6 agents challenge each other. Disagreements are surfaced to Master.",
  },
  {
    phase: "Phase 4",
    label: "Final Verdict",
    agentIds: ["master"],
    parallel: false,
    description: "Master sees all outputs + debate → issues LONG / SHORT / NO TRADE.",
  },
] as const;

// Sweep level definitions
export const SWEEP_LEVELS = [
  { label: "London Low",  direction: "bullish", boost: 15, tradeable: true,  priority: 1 },
  { label: "PDH",         direction: "bearish", boost: 10, tradeable: true,  priority: 2 },
  { label: "Asian High",  direction: "bearish", boost: 10, tradeable: true,  priority: 3 },
  { label: "Asian Low",   direction: "bullish", boost:  5, tradeable: true,  priority: 4 },
  { label: "London High", direction: "bearish", boost:  0, tradeable: false, priority: 5 },
] as const;
