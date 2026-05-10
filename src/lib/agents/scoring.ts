/**
 * TradeX Multi-Agent Terminal — Scoring Engine
 *
 * Computes weighted consensus from all agent outputs.
 * The scoring is directional: bullish = positive, bearish = negative.
 */

import type {
  TrendAgentOutput,
  SMCAgentOutput,
  NewsAgentOutput,
  RiskAgentOutput,
  ExecutionAgentOutput,
  ContrarianAgentOutput,
  ScoringWeights,
  AgentConsensusItem,
  FinalBias,
  DirectionalBias,
} from "./schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function biasToSign(bias: DirectionalBias | string): number {
  if (bias === "bullish") return 1;
  if (bias === "bearish") return -1;
  return 0;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─────────────────────────────────────────────────────────────────────────────
// Weighted Score per Agent
// Converts bias + confidence + weight into a scalar on [-100, +100]
// ─────────────────────────────────────────────────────────────────────────────

function agentScore(
  agentId: string,
  bias: DirectionalBias | string,
  confidence: number,
  weight: number
): AgentConsensusItem {
  const sign = biasToSign(bias);
  const weightedScore = sign * (confidence / 100) * weight * 100;

  return {
    agentId,
    bias,
    confidence,
    weight,
    weightedScore: Math.round(weightedScore * 10) / 10,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Scoring Function
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoringResult {
  consensusScore: number;       // -100 to +100
  finalBias: FinalBias;
  confidence: number;           // 0–100
  agentConsensus: AgentConsensusItem[];
  noTradeReason?: string;
}

export function computeConsensus(
  trend: TrendAgentOutput,
  smc: SMCAgentOutput,
  news: NewsAgentOutput,
  risk: RiskAgentOutput,
  execution: ExecutionAgentOutput,
  contrarian: ContrarianAgentOutput,
  weights: ScoringWeights,
  symbol?: string
): ScoringResult {
  const items: AgentConsensusItem[] = [];

  // ── Trend Agent (directional weight) ──────────────────────────────────────
  items.push(agentScore("trend", trend.bias, trend.confidence, weights.trend));

  // ── SMC Agent (highest directional weight) ────────────────────────────────
  // Boost weight when a concrete setup is confirmed. No penalty when absent —
  // the agent's confidence is already low (40) when no setup is present, which
  // naturally reduces its contribution without a separate weight cut.
  const smcWeight = weights.smc + (smc.setupPresent ? 0.08 : 0);
  items.push(agentScore("smc", smc.bias, smc.confidence, clamp(smcWeight, 0, 0.5)));

  // ── News Agent (supports / opposes) ───────────────────────────────────────
  // Safe-haven assets (gold/silver): geopolitical risk BOOSTS news confidence.
  // All other assets: high uncertainty reduces directional conviction (but doesn't
  // eliminate the signal — a high-risk environment with bearish news is still bearish).
  // Floor the confidence at 30% to preserve the directional signal even under stress.
  const isSafeHaven = symbol === "XAUUSD" || symbol === "XAGUSD" || symbol === "XPTUSD";
  const adjustedNewsConf = isSafeHaven && news.riskScore > 40
    ? Math.min(95, news.confidence * (1 + news.riskScore / 300))
    : Math.max(30, news.confidence * (1 - news.riskScore / 250));
  items.push(agentScore("news", news.impact, Math.round(adjustedNewsConf), weights.news));

  // ── Execution Agent (confirms setup) ──────────────────────────────────────
  // Confidence scales with setup grade so an A+ and a B+ don't contribute equally.
  const execBias = execution.hasSetup
    ? execution.direction === "long" ? "bullish"
    : execution.direction === "short" ? "bearish"
    : "neutral"
    : "neutral";
  const execConf = execution.hasSetup
    ? execution.grade === "A+" ? 90
    : execution.grade === "A"  ? 78
    : execution.grade === "B+" ? 62
    : 45  // "B" — partial setup quality
    : 25; // no setup
  items.push(agentScore("execution", execBias, execConf, weights.execution));

  // ── Contrarian Agent (penalty factor) ────────────────────────────────────
  // The contrarian agent always opposes — it acts as a headwind.
  // If contrarian has strong challenge, it reduces the net score.
  const contrBias = contrarian.challengesBias ? "opposing" : "neutral";
  const contrSign = contrarian.challengesBias ? -1 : 0;
  const contrScore = contrSign * (contrarian.riskFactor / 100) * weights.contrarian * 100;
  items.push({
    agentId: "contrarian",
    bias: contrBias,
    confidence: contrarian.trapConfidence,
    weight: weights.contrarian,
    weightedScore: Math.round(contrScore * 10) / 10,
  });

  // ── Sum weighted scores ───────────────────────────────────────────────────
  const rawSum = items.reduce((acc, item) => acc + item.weightedScore, 0);

  // Normalize to -100..+100 range (max possible score with weights = 100)
  const totalWeight = weights.trend + weights.smc + weights.news + weights.execution + weights.contrarian;
  const normalizedScore = clamp(Math.round((rawSum / (totalWeight * 100)) * 100 * 100) / 100, -100, 100);

  // ── Risk Gate ─────────────────────────────────────────────────────────────
  const riskBlocks = !risk.valid;

  // ── Structure Gate (PRIORITY RULE) ────────────────────────────────────────
  // If trend is bearish AND smc has no BOS → block ALL bullish signals.
  // Price action structure takes priority over any indicator consensus.
  const trendBearish    = trend.bias === "bearish";
  const trendBullish    = trend.bias === "bullish";
  const smcBosConfirmed = smc.bosDetected && smc.chochDetected;

  // Block bullish signals in a bearish structure (no BOS = no reversal confirmation)
  const structureBlocksLong  = trendBearish && !smcBosConfirmed && normalizedScore > 0;
  // Block bearish signals in a bullish structure
  const structureBlocksShort = trendBullish && !smc.bosDetected && normalizedScore < 0;

  // Fibonacci gate: if no fib zone confluence, no trade regardless of indicators
  const noFibZone = !smc.liquiditySweepDetected && smc.setupType === "None";

  // ── Final Bias Decision ───────────────────────────────────────────────────
  const BULL_THRESHOLD = 25;
  const BEAR_THRESHOLD = -25;

  let finalBias: FinalBias;
  let noTradeReason: string | undefined;

  if (riskBlocks) {
    finalBias     = "no-trade";
    noTradeReason = `Risk gate: ${risk.warnings[0] ?? "Risk conditions not met"}`;
  } else if (structureBlocksLong) {
    finalBias     = "no-trade";
    noTradeReason = `Structure gate: Trend is BEARISH — bullish signals blocked. Require confirmed BOS to upside before going long.`;
  } else if (structureBlocksShort) {
    finalBias     = "no-trade";
    noTradeReason = `Structure gate: Trend is BULLISH — bearish signals blocked. Require confirmed BOS to downside before going short.`;
  } else if (noFibZone && Math.abs(normalizedScore) < 50) {
    finalBias     = "no-trade";
    noTradeReason = `Fib gate: No price in 0.5–0.705 retracement zone and no confirmed setup. Waiting for fib confluence.`;
  } else if (normalizedScore >= BULL_THRESHOLD) {
    finalBias = "bullish";
  } else if (normalizedScore <= BEAR_THRESHOLD) {
    finalBias = "bearish";
  } else {
    finalBias     = "no-trade";
    noTradeReason = `Consensus ${normalizedScore.toFixed(1)} within neutral band (±${BULL_THRESHOLD}). Insufficient directional agreement.`;
  }

  // ── Confidence from consensus strength ────────────────────────────────────
  const rawConfidence = Math.abs(normalizedScore);
  const confidence = clamp(Math.round(40 + rawConfidence * 0.6), 25, 98);

  return {
    consensusScore: normalizedScore,
    finalBias,
    confidence: finalBias === "no-trade" ? Math.round(rawConfidence + 20) : confidence,
    agentConsensus: items,
    noTradeReason,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy Matcher
// ─────────────────────────────────────────────────────────────────────────────

export function matchStrategy(
  smc: SMCAgentOutput,
  trend: TrendAgentOutput,
  news: NewsAgentOutput
): string | undefined {
  const { setupType, bosDetected, chochDetected, liquiditySweepDetected: inFibZone, premiumDiscount } = smc;
  const bias = smc.bias;

  if (bias === "neutral") return undefined;

  // ── New Fibonacci/PA setup types (from smc-agent.ts) ─────────────────────
  if (setupType === "FibShort") {
    return bosDetected
      ? "Fib Short + BOS Continuation — Bearish structure confirmed, price retrace to 0.618–0.705 fib zone"
      : "Fib Short — Trend Continuation (LH+LL structure, price in 0.5–0.705 fib retracement zone)";
  }

  if (setupType === "FibLong") {
    return chochDetected
      ? "Fib Long — Post-BOS Reversal (Bearish structure broken, HL formed, fib retracement entry)"
      : "Fib Long — Bullish Continuation (HH+HL structure, price in 0.5–0.705 fib pullback zone)";
  }

  if (setupType === "BOS_Continuation" && bosDetected) {
    return bias === "bullish"
      ? "BOS Continuation — Long (Upside structure break with momentum, pullback entry)"
      : "BOS Continuation — Short (Downside structure break with momentum, pullback entry)";
  }

  if (setupType === "BOS" && bosDetected) {
    return bias === "bullish"
      ? "Bullish BOS — Awaiting fib pullback for entry"
      : "Bearish BOS — Awaiting fib pullback for entry";
  }

  if (inFibZone && (setupType === "FVG" || setupType === "Sweep")) {
    return bias === "bullish"
      ? "Structure Reversal Long — price action setup confirmed, entry at imbalance zone"
      : "Structure Reversal Short — price action setup confirmed, entry at imbalance zone";
  }

  if (inFibZone) {
    return bias === "bullish"
      ? "Fib Zone Long — In 0.5–0.705 retracement, awaiting bullish candle confirmation"
      : "Fib Zone Short — In 0.5–0.705 retracement, awaiting bearish candle confirmation";
  }

  // ── Legacy PA setup types (from price-action-agent.ts) ───────────────────
  if (setupType === "Sweep" && bosDetected) {
    return bias === "bullish"
      ? "Momentum Shift — Long (Bullish structure break confirmed)"
      : "Momentum Shift — Short (Bearish structure break confirmed)";
  }

  if (setupType === "OB" && bosDetected) {
    return bias === "bullish"
      ? "Support Retest + Break — Long (Support retest after upside structure break)"
      : "Resistance Retest + Break — Short (Resistance retest after downside structure break)";
  }

  if (setupType === "FVG") {
    return bias === "bullish"
      ? "Gap Fill Continuation — Long (Price returning to fill gap below, bullish continuation)"
      : "Gap Fill Continuation — Short (Price returning to fill gap above, bearish continuation)";
  }

  if (chochDetected) {
    return bias === "bullish"
      ? "Trend Shift Re-entry — Long (Bearish-to-bullish flip, pullback entry on retest)"
      : "Trend Shift Re-entry — Short (Bullish-to-bearish flip, rally-sell on retest)";
  }

  if (premiumDiscount === "DISCOUNT" && bias === "bullish") {
    return "Lower-Range Long — Price at support, mean-reversion + continuation potential";
  }

  if (premiumDiscount === "PREMIUM" && bias === "bearish") {
    return "Upper-Range Short — Price at resistance, mean-reversion + continuation potential";
  }

  if (news.riskScore > 60 && news.impact !== "neutral") {
    return `News Continuation — ${bias === "bullish" ? "Bullish" : "Bearish"} macro catalyst aligning with technical setup`;
  }

  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk Grade Evaluator
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateRiskGrade(
  volatilityScore: number,
  sessionScore: number,
  hasSetup: boolean,
  rrRatio: number | null,
  warnings: string[]
): import("./schemas").RiskGrade {
  let score = 100;

  if (volatilityScore > 80) score -= 30;
  else if (volatilityScore > 60) score -= 15;

  if (sessionScore < 30) score -= 25;
  else if (sessionScore < 50) score -= 10;

  if (!hasSetup) score -= 20;

  if (rrRatio !== null) {
    if (rrRatio < 1.5) score -= 20;
    else if (rrRatio < 2) score -= 10;
    else if (rrRatio >= 3) score += 10;
  } else {
    score -= 15;
  }

  score -= warnings.length * 5;
  score = clamp(score, 0, 100);

  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}
