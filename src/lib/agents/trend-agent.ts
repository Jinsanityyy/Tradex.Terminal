/**
 * Agent 1 — Trend Agent (Rule-Based)
 *
 * Determines trend bias using:
 * - Market structure (BOS/CHoCH from conviction engine)
 * - Momentum (RSI + MACD proxy + % change)
 * - MA alignment (simulated from 52w position + daily momentum)
 * - Timeframe confluence
 */

import type { MarketSnapshot, TrendAgentOutput, TimeframeBias, DirectionalBias, MarketPhase } from "./schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Timeframe Bias Simulation
// Real-world: each TF would have its own candle data.
// Here we simulate using daily % change magnitude and position.
// ─────────────────────────────────────────────────────────────────────────────

function simulateTimeframeBias(snapshot: MarketSnapshot): TimeframeBias {
  const { htfBias, htfConfidence, pos52w } = snapshot.structure;
  const { changePercent, positionInDay } = snapshot.price;
  const { rsi } = snapshot.indicators;

  // H4 = same as HTF bias (daily data)
  const H4: DirectionalBias = htfBias;

  // H1 = slightly more sensitive to intraday momentum
  const H1: DirectionalBias =
    htfConfidence >= 60
      ? htfBias
      : changePercent > 0.15 ? "bullish" : changePercent < -0.15 ? "bearish" : "neutral";

  // M15 = intraday momentum based on % change and RSI
  const M15: DirectionalBias =
    changePercent > 0.3 && rsi > 52 ? "bullish"
    : changePercent < -0.3 && rsi < 48 ? "bearish"
    : "neutral";

  // M5 = most granular — position within day's range
  const M5: DirectionalBias =
    positionInDay > 65 && changePercent > 0 ? "bullish"
    : positionInDay < 35 && changePercent < 0 ? "bearish"
    : "neutral";

  const votes = [H4, H1, M15, M5];
  const bullCount = votes.filter(v => v === "bullish").length;
  const bearCount = votes.filter(v => v === "bearish").length;
  const aligned = bullCount >= 3 || bearCount >= 3;

  return { M5, M15, H1, H4, aligned };
}

// ─────────────────────────────────────────────────────────────────────────────
// Momentum Direction
// ─────────────────────────────────────────────────────────────────────────────

function deriveMomentumDirection(rsi: number, pctChange: number, macdHist: number): "expanding" | "contracting" | "flat" {
  const rsiAbove50 = rsi > 50;
  const moveStrong = Math.abs(pctChange) > 0.5;
  const macdPositive = macdHist > 0;

  if (moveStrong && ((rsiAbove50 && macdPositive) || (!rsiAbove50 && !macdPositive))) {
    return "expanding";
  }
  if (Math.abs(pctChange) < 0.2 && Math.abs(rsi - 50) < 10) {
    return "flat";
  }
  return "contracting";
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Phase
// ─────────────────────────────────────────────────────────────────────────────

function derivePhase(snapshot: MarketSnapshot): MarketPhase {
  const { pos52w, zone, htfBias } = snapshot.structure;
  const { rsi, atrProxy } = snapshot.indicators;
  const { changePercent } = snapshot.price;

  if (atrProxy > 1.2 && Math.abs(changePercent) > 0.8) return "Expansion";
  if (rsi > 68 && zone === "PREMIUM" && htfBias === "bullish") return "Distribution";
  if (rsi < 32 && zone === "DISCOUNT" && htfBias === "bearish") return "Accumulation";
  if (Math.abs(changePercent) < 0.15 && atrProxy < 0.3) return "Range";
  if (zone === "DISCOUNT" && htfBias === "bullish") return "Accumulation";
  if (zone === "PREMIUM" && htfBias === "bearish") return "Distribution";
  if (htfBias !== "neutral" && zone !== "EQUILIBRIUM") return "Pullback";
  return "Range";
}

// ─────────────────────────────────────────────────────────────────────────────
// MA Alignment (simulated)
// ─────────────────────────────────────────────────────────────────────────────

function deriveMaAlignment(snapshot: MarketSnapshot): boolean {
  const { pos52w, htfBias, inPremium, inDiscount } = snapshot.structure;
  const { rsi, macdHist } = snapshot.indicators;

  // Bullish MA alignment: price above 200MA analog (upper 52w) + momentum positive
  if (htfBias === "bullish" && pos52w > 50 && rsi > 50 && macdHist > 0) return true;
  // Bearish MA alignment: price below 200MA analog + momentum negative
  if (htfBias === "bearish" && pos52w < 50 && rsi < 50 && macdHist < 0) return true;

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Supporting Reasons
// ─────────────────────────────────────────────────────────────────────────────

function buildReasons(
  snapshot: MarketSnapshot,
  timeframeBias: TimeframeBias,
  phase: MarketPhase,
  momentum: "expanding" | "contracting" | "flat"
): string[] {
  const { htfBias, htfConfidence, smcContext, zone, pos52w } = snapshot.structure;
  const { rsi, session } = snapshot.indicators;
  const { changePercent } = snapshot.price;
  const reasons: string[] = [];

  reasons.push(`HTF bias ${htfBias.toUpperCase()} at ${htfConfidence}% conviction — ${smcContext.split(" | ")[0]}`);

  if (timeframeBias.aligned) {
    const dominant = timeframeBias.H4 === "bullish" ? "bullish" : "bearish";
    reasons.push(`Multi-timeframe confluence: M5/M15/H1/H4 all ${dominant} — strong trend alignment`);
  } else {
    const bullTFs = [timeframeBias.H4, timeframeBias.H1, timeframeBias.M15, timeframeBias.M5]
      .filter(b => b === "bullish").length;
    reasons.push(`Mixed TF alignment: ${bullTFs}/4 timeframes bullish — partial confluence only`);
  }

  reasons.push(`${phase} phase detected — ${
    phase === "Expansion" ? "institutional order flow in progress, momentum trades valid" :
    phase === "Accumulation" ? "smart money building positions at discount, reversal potential building" :
    phase === "Distribution" ? "smart money distributing at premium, counter-move risk elevated" :
    phase === "Pullback" ? "corrective move within trend, pullback entries aligning" :
    "consolidation range, avoid breakout trades, fade extremes"
  }`);

  reasons.push(`RSI ${rsi.toFixed(0)} — ${
    rsi > 70 ? "overbought extreme, distribution phase, stop-run risk above highs" :
    rsi > 60 ? "above midline, bullish momentum confirmed with room to expand" :
    rsi > 50 ? "marginally above midline, trend present but weak" :
    rsi > 40 ? "below midline, bearish lean" :
    rsi > 30 ? "approaching oversold, bearish momentum dominant" :
    "oversold extreme, potential reversal zone, stop-run below lows"
  }`);

  reasons.push(`Price at ${pos52w}% of 52-week range (${zone} zone) during ${session} session — ${
    zone === "PREMIUM" ? "sell pressure zone" :
    zone === "DISCOUNT" ? "buy pressure zone" :
    "equilibrium, no directional edge"
  }`);

  return reasons;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Agent Function
// ─────────────────────────────────────────────────────────────────────────────

export async function runTrendAgent(snapshot: MarketSnapshot): Promise<TrendAgentOutput> {
  const start = Date.now();

  try {
    const { htfBias, htfConfidence, zone, pos52w, high52w, low52w } = snapshot.structure;
    const { rsi, macdHist, atrProxy } = snapshot.indicators;
    const { changePercent, current, low, high } = snapshot.price;

    const timeframeBias = simulateTimeframeBias(snapshot);
    const momentum      = deriveMomentumDirection(rsi, changePercent, macdHist);
    const phase         = derivePhase(snapshot);
    const maAlignment   = deriveMaAlignment(snapshot);

    // ── Final Trend Bias ───────────────────────────────────────────────────
    // Primary signal: HTF conviction (from conviction engine)
    // Modifiers: TF alignment, momentum, MA alignment
    let biasScore = 0;

    biasScore += htfBias === "bullish" ? htfConfidence : htfBias === "bearish" ? -htfConfidence : 0;

    if (timeframeBias.aligned) {
      biasScore += timeframeBias.H4 === "bullish" ? 15 : -15;
    }

    if (momentum === "expanding") {
      biasScore += biasScore > 0 ? 10 : -10;
    } else if (momentum === "contracting") {
      biasScore *= 0.8;
    }

    if (maAlignment) biasScore *= 1.15;

    const bias: DirectionalBias =
      biasScore > 10 ? "bullish" :
      biasScore < -10 ? "bearish" :
      "neutral";

    const confidence = Math.min(95, Math.max(20, Math.abs(biasScore)));
    const reasons = buildReasons(snapshot, timeframeBias, phase, momentum);

    // Invalidation level: structural level that negates the bias
    const step = current > 1000 ? 10 : current > 100 ? 1 : 0.001;
    const invalidationLevel =
      bias === "bullish"
        ? parseFloat((Math.floor((current * 0.985) / step) * step).toFixed(4))
        : bias === "bearish"
        ? parseFloat((Math.ceil((current * 1.015) / step) * step).toFixed(4))
        : null;

    return {
      agentId: "trend",
      bias,
      confidence: Math.round(confidence),
      timeframeBias,
      maAlignment,
      momentumDirection: momentum,
      marketPhase: phase,
      reasons,
      invalidationLevel,
      processingTime: Date.now() - start,
    };
  } catch (err) {
    return {
      agentId: "trend",
      bias: "neutral",
      confidence: 30,
      timeframeBias: { M5: "neutral", M15: "neutral", H1: "neutral", H4: "neutral", aligned: false },
      maAlignment: false,
      momentumDirection: "flat",
      marketPhase: "Range",
      reasons: ["Trend analysis failed — defaulting to neutral"],
      invalidationLevel: null,
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
