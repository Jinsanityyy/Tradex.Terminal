/**
 * Agent 4 — Risk Agent (Rule-Based Gate)
 *
 * Validates trade quality using:
 * - Volatility conditions
 * - Session suitability
 * - RR threshold enforcement
 * - Stop distance validation
 * - Risk constraint checks
 *
 * Returns valid/invalid status. Acts as a gate for the master agent.
 */

import type { MarketSnapshot, RiskAgentOutput, RiskGrade } from "./schemas";
import { evaluateRiskGrade } from "./scoring";
import { getSessionScore } from "./market-snapshot";

// ─────────────────────────────────────────────────────────────────────────────
// Volatility Score
// ─────────────────────────────────────────────────────────────────────────────

function computeVolatilityScore(snapshot: MarketSnapshot): number {
  const { atrProxy } = snapshot.indicators;

  // Low: < 0.2% | Moderate: 0.2-0.8% | High: 0.8-1.5% | Extreme: > 1.5%
  if (atrProxy > 1.5) return 90;
  if (atrProxy > 1.0) return 75;
  if (atrProxy > 0.5) return 55;
  if (atrProxy > 0.2) return 35;
  return 20;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stop Distance Estimate
// ─────────────────────────────────────────────────────────────────────────────

function estimateStopDistance(snapshot: MarketSnapshot): number {
  const { current, dayRange } = snapshot.price;
  const { atrProxy } = snapshot.indicators;
  // Use 1.5x ATR proxy of daily range as stop distance estimate
  return parseFloat((current * (atrProxy / 100) * 1.5).toFixed(4));
}

// ─────────────────────────────────────────────────────────────────────────────
// RR Ratio Estimate
// ─────────────────────────────────────────────────────────────────────────────

function estimateRR(snapshot: MarketSnapshot, stopDistance: number): number | null {
  const { current } = snapshot.price;
  const { pos52w } = snapshot.structure;

  // Target distance: 2x stop for typical SMC setups
  const targetDistance = stopDistance * 2;
  if (stopDistance <= 0) return null;
  return parseFloat((targetDistance / stopDistance).toFixed(2));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Agent Function
// ─────────────────────────────────────────────────────────────────────────────

export async function runRiskAgent(snapshot: MarketSnapshot): Promise<RiskAgentOutput> {
  const start = Date.now();

  try {
    const { indicators, price, structure } = snapshot;
    const { session, rsi, atrProxy } = indicators;
    const { changePercent, current } = price;

    const volatilityScore = computeVolatilityScore(snapshot);
    const sessionScore    = getSessionScore(session);
    const stopDistance    = estimateStopDistance(snapshot);
    const rrEstimate      = estimateRR(snapshot, stopDistance);
    const warnings: string[] = [];

    // ── Volatility checks ─────────────────────────────────────────────────
    if (snapshot.volatilityHigh) {
      warnings.push(`Extreme volatility: ${Math.abs(changePercent).toFixed(2)}% move — widen stops 50%, reduce position size to 0.5% max`);
    } else if (atrProxy > 0.5) {
      warnings.push(`Elevated volatility: ${Math.abs(changePercent).toFixed(2)}% — use wider stops and standard size`);
    }

    // ── Session checks ────────────────────────────────────────────────────
    if (session === "Closed") {
      warnings.push("Between-session low liquidity — avoid new positions, spreads widened");
    } else if (session === "Asia") {
      warnings.push("Asia session: accumulation phase — lower conviction moves, wait for London open for directional entries");
    }

    // ── RSI extremes ──────────────────────────────────────────────────────
    if (rsi > 78) {
      warnings.push(`RSI ${rsi.toFixed(0)}: deeply overbought — distribution risk high, avoid chasing longs`);
    } else if (rsi < 22) {
      warnings.push(`RSI ${rsi.toFixed(0)}: deeply oversold — capitulation risk, avoid adding shorts`);
    }

    // ── Premium/Discount alignment risk ──────────────────────────────────
    if (structure.inPremium && structure.htfBias === "bullish") {
      warnings.push("Buying in premium zone — suboptimal entry location, wait for discount pullback");
    }
    if (structure.inDiscount && structure.htfBias === "bearish") {
      warnings.push("Shorting in discount zone — suboptimal entry location, wait for premium rally");
    }

    // ── 52-week extremes ──────────────────────────────────────────────────
    if (structure.pos52w > 90) {
      warnings.push(`Price near 52-week high (${structure.pos52w}% of range) — external liquidity above, stop-hunt risk elevated`);
    }
    if (structure.pos52w < 10) {
      warnings.push(`Price near 52-week low (${structure.pos52w}% of range) — external liquidity below, stop-hunt risk elevated`);
    }

    // ── RR check ──────────────────────────────────────────────────────────
    if (rrEstimate !== null && rrEstimate < 1.5) {
      warnings.push(`Estimated RR ${rrEstimate.toFixed(1)}:1 below minimum threshold (1.5:1) — trade not worth the risk`);
    }

    // ── Valid / Invalid decision ──────────────────────────────────────────
    // Trade is invalid if: session closed OR extreme volatility OR too many warnings
    const isClosed = session === "Closed";
    const extremeVol = volatilityScore >= 90;
    const tooManyWarnings = warnings.length >= 4;
    const rrTooLow = rrEstimate !== null && rrEstimate < 1.0;

    const valid = !isClosed && !extremeVol && !tooManyWarnings && !rrTooLow;

    // ── Max risk ──────────────────────────────────────────────────────────
    let maxRiskPercent = 1.0; // default 1% account risk
    if (volatilityScore > 70) maxRiskPercent = 0.5;
    if (volatilityScore > 85) maxRiskPercent = 0.25;
    if (sessionScore < 50)    maxRiskPercent = Math.min(maxRiskPercent, 0.75);
    if (warnings.length >= 2) maxRiskPercent = Math.min(maxRiskPercent, 0.5);

    const grade = evaluateRiskGrade(
      volatilityScore, sessionScore, true, rrEstimate, warnings
    );

    // ── Reasons ───────────────────────────────────────────────────────────
    const reasons: string[] = [
      `Session: ${session} (quality score ${sessionScore}/100) — ${
        sessionScore >= 80 ? "optimal trading window, institutional liquidity present" :
        sessionScore >= 50 ? "acceptable liquidity, directional moves possible" :
        "sub-optimal session, reduce size and be selective"
      }`,
      `Volatility: ${atrProxy.toFixed(2)}% daily move (score ${volatilityScore}/100) — ${
        volatilityScore >= 75 ? "high — widen stops and reduce position size" :
        volatilityScore >= 40 ? "moderate — standard risk parameters apply" :
        "low — tight stops, potentially coiling for a move"
      }`,
      `Estimated stop distance: ${stopDistance.toFixed(4)} | Estimated RR: ${rrEstimate?.toFixed(1) ?? "N/A"}:1`,
      `Risk grade: ${grade} | Max risk: ${maxRiskPercent}% of account`,
    ];

    if (!valid) {
      reasons.unshift(`TRADE INVALID: ${
        isClosed ? "Session closed" :
        extremeVol ? "Extreme volatility" :
        rrTooLow ? "RR below 1:1" :
        "Multiple risk warnings"
      }`);
    } else {
      reasons.unshift(`TRADE VALID: Risk conditions met — proceed with confirmed setup`);
    }

    return {
      agentId: "risk",
      valid,
      grade,
      warnings,
      maxRiskPercent,
      volatilityScore,
      sessionScore,
      stopDistance,
      estimatedRR: rrEstimate,
      reasons: reasons.slice(0, 5),
      processingTime: Date.now() - start,
    };
  } catch (err) {
    return {
      agentId: "risk",
      valid: false,
      grade: "F",
      warnings: ["Risk analysis failed"],
      maxRiskPercent: 0,
      volatilityScore: 50,
      sessionScore: 50,
      stopDistance: null,
      estimatedRR: null,
      reasons: ["Risk analysis failed — defaulting to invalid"],
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
