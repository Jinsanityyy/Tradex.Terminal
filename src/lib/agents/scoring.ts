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
  weights: ScoringWeights
): ScoringResult {
  const items: AgentConsensusItem[] = [];

  // ── Trend Agent (directional weight) ──────────────────────────────────────
  items.push(agentScore("trend", trend.bias, trend.confidence, weights.trend));

  // ── SMC Agent (highest directional weight) ────────────────────────────────
  // Extra boost if a concrete setup is present
  const smcWeight = weights.smc * (smc.setupPresent ? 1.2 : 0.8);
  items.push(agentScore("smc", smc.bias, smc.confidence, clamp(smcWeight, 0, 0.5)));

  // ── News Agent (supports / opposes) ───────────────────────────────────────
  // High riskScore reduces news agent confidence
  const adjustedNewsConf = news.confidence * (1 - news.riskScore / 200);
  items.push(agentScore("news", news.impact, Math.round(adjustedNewsConf), weights.news));

  // ── Execution Agent (confirms setup) ──────────────────────────────────────
  // Only counts if execution has a valid setup
  const execBias = execution.hasSetup
    ? execution.direction === "long" ? "bullish"
    : execution.direction === "short" ? "bearish"
    : "neutral"
    : "neutral";
  const execConf = execution.hasSetup ? 70 : 30;
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
  // If risk agent invalidates, force no-trade
  const riskBlocks = !risk.valid;

  // ── Final Bias Decision ───────────────────────────────────────────────────
  // Threshold: ±25 for a directional signal (requires meaningful consensus)
  const BULL_THRESHOLD = 25;
  const BEAR_THRESHOLD = -25;

  let finalBias: FinalBias;
  let noTradeReason: string | undefined;

  if (riskBlocks) {
    finalBias = "no-trade";
    noTradeReason = `Risk gate: ${risk.warnings[0] ?? "Risk conditions not met"}`;
  } else if (normalizedScore >= BULL_THRESHOLD) {
    finalBias = "bullish";
  } else if (normalizedScore <= BEAR_THRESHOLD) {
    finalBias = "bearish";
  } else {
    finalBias = "no-trade";
    noTradeReason = `Consensus score ${normalizedScore.toFixed(1)} within neutral band (±${BULL_THRESHOLD}). Insufficient directional agreement across agents.`;
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
  const { setupType, liquiditySweepDetected, bosDetected, chochDetected, premiumDiscount } = smc;
  const bias = smc.bias;

  if (liquiditySweepDetected && bosDetected) {
    if (bias === "neutral") return undefined;
    return bias === "bullish"
      ? "Stop-Run Reversal — Long (Lows swept, bullish structure break confirmed)"
      : "Stop-Run Reversal — Short (Highs swept, bearish structure break confirmed)";
  }

  if (setupType === "OB" && bosDetected) {
    if (bias === "neutral") return undefined;
    return bias === "bullish"
      ? "Support Retest + Break — Long (Support retest after upside structure break)"
      : "Resistance Retest + Break — Short (Resistance retest after downside structure break)";
  }

  if (setupType === "FVG") {
    if (bias === "neutral") return undefined;
    return bias === "bullish"
      ? "Gap Fill Continuation — Long (Price returning to fill gap below, bullish continuation)"
      : "Gap Fill Continuation — Short (Price returning to fill gap above, bearish continuation)";
  }

  if (chochDetected) {
    if (bias === "neutral") return undefined;
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
