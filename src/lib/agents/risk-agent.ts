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

  // Calibrated for XAUUSD (gold moves 0.5–2% daily on normal days)
  // Low: < 0.3% | Moderate: 0.3–1.0% | High: 1.0–2.0% | Extreme: > 2.5%
  if (atrProxy > 2.5) return 92;  // truly extreme — news shock / circuit breaker
  if (atrProxy > 2.0) return 82;  // very high — war/fed decision day
  if (atrProxy > 1.5) return 70;  // elevated — active gold session (normal range)
  if (atrProxy > 1.0) return 55;  // moderate-high
  if (atrProxy > 0.5) return 38;  // moderate
  if (atrProxy > 0.3) return 22;  // low-moderate
  return 12;                       // low / quiet session
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
  if (stopDistance <= 0) return null;
  const { atrProxy } = snapshot.indicators;

  // TP2 = 2.5R. On volatile days liquidity pools are wider (better RR).
  // On quiet sessions targets compress toward 1.5R minimum.
  const targetMultiplier =
    atrProxy > 1.5 ? 2.5 :   // active NY session — full 2.5R potential
    atrProxy > 0.8 ? 2.0 :   // moderate vol — standard 2R
    1.5;                       // quiet / Asia — minimum viable

  return parseFloat(targetMultiplier.toFixed(2));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Agent Function
// ─────────────────────────────────────────────────────────────────────────────

export async function runRiskAgent(
  snapshot: MarketSnapshot,
  executionRR?: number | null,
  executionHasSetup?: boolean
): Promise<RiskAgentOutput> {
  const start = Date.now();

  try {
    const { indicators, price, structure } = snapshot;
    const { session, rsi, atrProxy } = indicators;
    const { changePercent, current } = price;

    const volatilityScore = computeVolatilityScore(snapshot);
    const sessionScore    = getSessionScore(session);
    const stopDistance    = estimateStopDistance(snapshot);
    // Use actual execution RR when available; fall back to null (no estimate)
    const rrEstimate      = executionRR ?? null;
    const warnings: string[] = [];

    // ── Volatility checks ─────────────────────────────────────────────────
    if (atrProxy > 2.5) {
      warnings.push(`Extreme volatility: ${Math.abs(changePercent).toFixed(2)}% move — news/macro shock, avoid new positions`);
    } else if (atrProxy > 2.0) {
      warnings.push(`Very high volatility: ${Math.abs(changePercent).toFixed(2)}% move — widen stops 50%, reduce size to 0.5%`);
    } else if (atrProxy > 1.5) {
      warnings.push(`Elevated volatility: ${Math.abs(changePercent).toFixed(2)}% move — active gold session, use standard stops`);
    } else if (atrProxy > 1.0) {
      warnings.push(`Moderate-high volatility: ${Math.abs(changePercent).toFixed(2)}% — normal range, standard parameters`);
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

    // ── RR check (uses actual execution RR, not an estimate) ─────────────
    if (rrEstimate !== null && rrEstimate < 1.5) {
      warnings.push(`RR ${rrEstimate.toFixed(1)}:1 below minimum threshold (1.5:1) — trade not worth the risk`);
    }

    // ── Valid / Invalid decision ──────────────────────────────────────────
    // Hard blocks: session closed, truly extreme volatility (>2.5%), or RR < 1:1
    // High volatility (1.5–2.5%) is a warning only — adjust size, don't block
    const isClosed    = session === "Closed";
    const extremeVol  = volatilityScore >= 92;   // only blocks on >2.5% moves
    const tooManyWarnings = warnings.length >= 5; // raised from 4 → 5
    const rrTooLow    = rrEstimate !== null && rrEstimate < 1.6;  // minimum = 1.6R hard block

    // Kill zone enforcement — only trade during high-probability session windows.
    // NY Kill Zone:     09:30–11:30 AM EST = 13:30–15:30 UTC
    // London Kill Zone: 08:00–11:00 AM GMT = 08:00–11:00 UTC
    const isNYSession     = session === "New York";
    const isLondonSession = session === "London";
    const nowUTC          = new Date(snapshot.timestamp);
    const nowUTCHour      = nowUTC.getUTCHours();
    const nowUTCMin       = nowUTC.getUTCMinutes();

    const inNYKillZone = isNYSession &&
      (nowUTCHour > 13 || (nowUTCHour === 13 && nowUTCMin >= 30)) &&
      (nowUTCHour < 15  || (nowUTCHour === 15 && nowUTCMin <  30));
    const outsideNYKillZone = isNYSession && !inNYKillZone;

    const inLondonKillZone  = isLondonSession && nowUTCHour >= 8 && nowUTCHour < 11;
    const outsideLondonKillZone = isLondonSession && !inLondonKillZone;

    const outsideKillZone = outsideNYKillZone || outsideLondonKillZone;

    // If execution found a setup, the sweep formed during the kill zone by definition.
    // Don't block based on time — the setup remains valid until price invalidates it.
    const setupConfirmed = executionHasSetup === true;

    if (outsideNYKillZone && !setupConfirmed) {
      warnings.push(
        `Outside NY Kill Zone (9:30–11:30 AM EST). ` +
        `Current UTC: ${nowUTCHour}:${String(nowUTCMin).padStart(2, "0")}. ` +
        `Valid window: 13:30–15:30 UTC. Win rate drops significantly outside this window.`
      );
    }
    if (outsideLondonKillZone && !setupConfirmed) {
      warnings.push(
        `Outside London Kill Zone (08:00–11:00 UTC). ` +
        `Current UTC: ${nowUTCHour}:${String(nowUTCMin).padStart(2, "0")}. ` +
        `Valid window: 08:00–11:00 UTC. Avoid entries during London consolidation hours.`
      );
    }

    const valid = !isClosed && !extremeVol && !tooManyWarnings && !rrTooLow && (!outsideKillZone || setupConfirmed);

    // ── Max risk ──────────────────────────────────────────────────────────
    let maxRiskPercent = 1.0; // default 1% account risk
    if (volatilityScore > 82) maxRiskPercent = 0.5;   // very high vol (>2%)
    if (volatilityScore > 92) maxRiskPercent = 0.25;  // extreme vol (>2.5%)
    if (sessionScore < 40)    maxRiskPercent = Math.min(maxRiskPercent, 0.75);
    if (warnings.length >= 3) maxRiskPercent = Math.min(maxRiskPercent, 0.5);

    const grade = evaluateRiskGrade(
      volatilityScore, sessionScore, executionHasSetup ?? false, rrEstimate, warnings
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
      `Stop distance: ${stopDistance.toFixed(4)} | RR: ${rrEstimate?.toFixed(1) ?? "N/A"}:1${rrEstimate != null ? " (actual)" : " (no setup)"}`,
      `Risk grade: ${grade} | Max risk: ${maxRiskPercent}% of account`,
    ];

    if (!valid) {
      reasons.unshift(`TRADE INVALID: ${
        isClosed ? "Session closed" :
        extremeVol ? "Extreme volatility" :
        rrTooLow ? "RR below 1:1" :
        outsideKillZone ? "Outside kill zone window" :
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
