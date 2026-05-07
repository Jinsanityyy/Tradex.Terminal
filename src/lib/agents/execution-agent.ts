/**
 * Agent 5 — Execution Agent (Rule-Based)
 *
 * Produces exact trade execution plan:
 * - Entry price (OB/FVG/sweep level)
 * - Stop Loss (structural invalidation)
 * - TP1, TP2 (liquidity targets)
 * - Trigger condition
 * - Management notes
 *
 * Does NOT force a setup if conditions are weak.
 */

import type {
  MarketSnapshot, ExecutionAgentOutput, TradeDirection, SMCAgentOutput,
} from "./schemas";

function roundToPrecision(value: number, price: number): number {
  if (price > 10000) return Math.round(value);
  if (price > 1000)  return Math.round(value * 10) / 10;
  if (price > 10)    return Math.round(value * 100) / 100;
  return Math.round(value * 100000) / 100000;
}

// ── JADE CAP Timeframe Risk Limits ────────────────────────────────────────────
// fallbackSlPct : SL % used when no structural level exists
// maxSlPct      : reject setup if SL exceeds this % of price (R:R would be unworkable)
const TF_SL_PCT: Record<string, { fallback: number; max: number }> = {
  M15: { fallback: 0.003, max: 0.005 },  // ~10 pts / max ~16 pts  @ $3300 Gold
  H1:  { fallback: 0.006, max: 0.012 },  // ~20 pts / max ~40 pts  @ $3300 Gold
  H4:  { fallback: 0.015, max: 0.030 },  // ~50 pts / max ~99 pts  @ $3300 Gold
  D1:  { fallback: 0.030, max: 0.075 },  // ~99 pts / max ~248 pts @ $3300 Gold
};

export async function runExecutionAgent(
  snapshot: MarketSnapshot,
  smc: SMCAgentOutput
): Promise<ExecutionAgentOutput> {
  const start = Date.now();

  try {
    const { price, structure, indicators } = snapshot;
    const { current, high, low, dayRange } = price;
    const { htfBias, htfConfidence } = structure;
    const { session } = indicators;

    // Allow Jade Cap confirmed sweeps through even when HTF is neutral/low-confidence
    const jadeCapSweepActive = smc.liquiditySweepDetected && smc.setupPresent && smc.bias !== "neutral";
    if (!jadeCapSweepActive && (htfBias === "neutral" || htfConfidence < 45)) {
      return {
        agentId: "execution",
        hasSetup: false,
        direction: "none",
        entry: null,
        stopLoss: null,
        tp1: null,
        tp2: null,
        rrRatio: null,
        trigger: "None",
        triggerCondition: "No directional bias — stand aside, no execution plan generated",
        managementNotes: [
          "Wait for clear BOS + HTF bias confirmation",
          "Monitor for session open catalyst",
        ],
        entryZone: "No valid entry zone",
        slZone: "No SL required — no trade",
        tp1Zone: "No target — no trade",
        signalState: "NO_TRADE",
        signalStateReason: "No directional bias detected. Stand aside and wait for clear setup.",
        distanceToEntry: null,
        processingTime: Date.now() - start,
      };
    }

    const { keyLevels, setupType, bosDetected, liquiditySweepDetected } = smc;
    // Jade Cap: when sweep confirmed, direction follows sweep bias; otherwise use HTF
    const isBullish = (liquiditySweepDetected && smc.bias !== "neutral")
      ? smc.bias === "bullish"
      : htfBias === "bullish";
    const direction: TradeDirection = isBullish ? "long" : "short";
    let entry: number;
    let stopLoss: number;
    let trigger: string;
    let entryZone: string;
    let slZone: string;

    if (setupType === "OB" && keyLevels.orderBlockHigh !== null && keyLevels.orderBlockLow !== null) {
      entry = isBullish ? keyLevels.orderBlockLow : keyLevels.orderBlockHigh;
      stopLoss = isBullish
        ? keyLevels.orderBlockLow * 0.997
        : keyLevels.orderBlockHigh * 1.003;
      trigger = "OB retest";
      entryZone = `${isBullish ? "Bullish" : "Bearish"} OB ${keyLevels.orderBlockLow?.toFixed(4)}–${keyLevels.orderBlockHigh?.toFixed(4)}`;
      slZone = `${isBullish ? "Below" : "Above"} OB ${isBullish ? "low" : "high"} — thesis invalid on close through`;
    } else if (setupType === "FVG" && keyLevels.fvgMid !== null) {
      entry = keyLevels.fvgMid;
      // Jade Cap: prefer pre-computed invalidationLevel (sweep extreme + $5 buffer)
      stopLoss = smc.invalidationLevel !== null
        ? smc.invalidationLevel
        : isBullish
          ? (keyLevels.fvgLow ?? entry) * 0.998
          : (keyLevels.fvgHigh ?? entry) * 1.002;
      trigger = liquiditySweepDetected ? "Structure Reversal" : "Imbalance Fill";
      entryZone = `${isBullish ? "Buy" : "Sell"} zone ${keyLevels.fvgMid.toFixed(4)} — price action imbalance area`;
      slZone = smc.invalidationLevel !== null
        ? `Structural invalidation at ${smc.invalidationLevel.toFixed(4)} — close through negates the setup`
        : `${isBullish ? "Below" : "Above"} entry zone — structure must hold`;
    } else if (setupType === "Sweep" && liquiditySweepDetected) {
      const sweepRef = keyLevels.sweepLevel ?? (isBullish ? low : high);
      entry = isBullish ? sweepRef * 1.001 : sweepRef * 0.999;
      stopLoss = smc.invalidationLevel !== null
        ? smc.invalidationLevel
        : isBullish ? low * 0.997 : high * 1.003;
      trigger = "Momentum Shift";
      entryZone = `${isBullish ? "Buy" : "Sell"} entry at key structural level ${entry.toFixed(4)}`;
      slZone = smc.invalidationLevel !== null
        ? `Structural invalidation at ${smc.invalidationLevel.toFixed(4)} — thesis invalid on break`
        : `${isBullish ? "Below" : "Above"} key level — ${isBullish ? "support" : "resistance"} must hold`;
    } else if (bosDetected) {
      const pullback = dayRange * 0.38;
      entry = isBullish ? current - pullback : current + pullback;
      stopLoss = isBullish ? entry * 0.997 : entry * 1.003;
      trigger = "BOS pullback";
      entryZone = `BOS pullback zone ~${entry.toFixed(4)} — ${isBullish ? "38% retracement of bullish BOS" : "38% retrace of bearish BOS"}`;
      slZone = `${isBullish ? "Below" : "Above"} BOS origin — ${isBullish ? "low" : "high"} of displacement candle`;
    } else {
      const slPct = (TF_SL_PCT[snapshot.timeframe ?? "H1"] ?? TF_SL_PCT.H1).fallback;
      entry    = current;
      stopLoss = isBullish ? entry * (1 - slPct) : entry * (1 + slPct);
      trigger  = "Market order";
      entryZone = `Current price ${current.toFixed(4)} — no premium structure entry available`;
      slZone    = `${isBullish ? "Below" : "Above"} ${stopLoss.toFixed(4)} — structural floor/ceiling`;
    }

    const riskDist = Math.abs(entry - stopLoss);

    // Guard: if entry === SL (riskDist = 0), PA agent returned bad levels — no valid setup
    if (riskDist === 0) {
      return {
        agentId: "execution",
        hasSetup: false,
        direction: "none",
        entry: null,
        stopLoss: null,
        tp1: null,
        tp2: null,
        rrRatio: null,
        trigger: "None",
        triggerCondition: "Entry and stop loss are at the same price level — invalid setup data",
        managementNotes: ["Wait for a valid setup with clear SL separation from entry"],
        entryZone: "Invalid",
        slZone: "Invalid",
        tp1Zone: "No target",
        signalState: "NO_TRADE",
        signalStateReason: "Invalid setup: entry equals stop loss. PA agent returned conflicting levels.",
        distanceToEntry: null,
        processingTime: Date.now() - start,
      };
    }

    // ── JADE CAP: reject setup if SL is too wide for the timeframe ───────────
    const tfLimits   = TF_SL_PCT[snapshot.timeframe ?? "H1"] ?? TF_SL_PCT.H1;
    const maxRiskDist = current * tfLimits.max;
    if (riskDist > maxRiskDist) {
      return {
        agentId: "execution",
        hasSetup: false,
        direction: "none",
        entry: null, stopLoss: null, tp1: null, tp2: null, rrRatio: null,
        trigger: "None",
        triggerCondition: `SL distance ${riskDist.toFixed(1)} pts exceeds ${snapshot.timeframe ?? "H1"} max (${maxRiskDist.toFixed(1)} pts) — R:R unworkable`,
        managementNotes: ["SL too far from entry for this timeframe — skip setup and wait for a tighter structure"],
        entryZone: "Invalid — SL exceeds timeframe maximum",
        slZone: "Invalid", tp1Zone: "No target",
        signalState: "NO_TRADE",
        signalStateReason: `SL of ${riskDist.toFixed(1)} pts is too wide for ${snapshot.timeframe ?? "H1"} (max ${maxRiskDist.toFixed(1)} pts). Stand aside and wait for a tighter structure.`,
        distanceToEntry: null,
        processingTime: Date.now() - start,
      };
    }

    // ── JADE CAP TP levels ────────────────────────────────────────────────────
    // TP1 = nearest opposing liquidity target (1.0R–1.5R typical)
    // TP2 = next major liquidity pool       (2.0R–2.5R typical)
    // Only use liquidityTarget from PA agent if it falls within 0.5R–2.0R band
    const tp1MaxDist  = riskDist * 2.0;
    const tp2Distance = riskDist * 2.5;

    let tp1: number;
    let tp2: number;
    let tp1Zone: string;

    if (isBullish) {
      const target    = keyLevels.liquidityTarget;
      const tgtDist   = target !== null ? target - entry : -1;
      const useTarget = target !== null && tgtDist > riskDist * 0.5 && tgtDist <= tp1MaxDist;
      tp1 = useTarget ? target : entry + riskDist * 1.5;
      const rawTp2 = entry + tp2Distance;
      tp2 = rawTp2 > tp1 ? rawTp2 : tp1 + riskDist;
      tp1Zone = useTarget
        ? `First target ${tp1.toFixed(4)} — nearest resistance above`
        : `1.5R target ${tp1.toFixed(4)} — nearest structural resistance`;
    } else {
      const target    = keyLevels.liquidityTarget;
      const tgtDist   = target !== null ? entry - target : -1;
      const useTarget = target !== null && tgtDist > riskDist * 0.5 && tgtDist <= tp1MaxDist;
      tp1 = useTarget ? target : entry - riskDist * 1.5;
      const rawTp2 = entry - tp2Distance;
      tp2 = rawTp2 < tp1 ? rawTp2 : tp1 - riskDist;
      tp1Zone = useTarget
        ? `First target ${tp1.toFixed(4)} — nearest support below`
        : `1.5R target ${tp1.toFixed(4)} — nearest structural support`;
    }

    entry    = roundToPrecision(entry, current);
    stopLoss = roundToPrecision(stopLoss, current);
    tp1      = roundToPrecision(tp1, current);
    tp2      = roundToPrecision(tp2, current);

    // R:R is expressed as TP2 potential (full trade target per JADE CAP)
    const risk    = Math.abs(entry - stopLoss);
    const reward  = Math.abs(tp2 - entry);
    const rrRatio = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : null;

    // JADE CAP: minimum 1:2 R:R required — if TP2 can't reach 2R, skip the trade
    if (rrRatio !== null && rrRatio < 2.0) {
      return {
        agentId: "execution",
        hasSetup: false,
        direction: "none",
        entry: null, stopLoss: null, tp1: null, tp2: null, rrRatio,
        trigger: "None",
        triggerCondition: `R:R ${rrRatio}:1 below minimum 1:2 — skip trade`,
        managementNotes: ["Nearest price target does not offer 1:2 R:R — stand aside"],
        entryZone: "Invalid — insufficient R:R",
        slZone: "Invalid", tp1Zone: "No target",
        signalState: "NO_TRADE",
        signalStateReason: `R:R ${rrRatio}:1 below minimum 1:2 — do not trade setups with insufficient reward potential.`,
        distanceToEntry: null,
        processingTime: Date.now() - start,
      };
    }

    const p = entry > 100 ? 1 : 4;
    const triggerCondition =
      trigger === "OB retest"
        ? `Wait for price to return to ${entryZone}, then confirm with ${isBullish ? "bullish" : "bearish"} rejection candle (engulfing, pin bar, or strong close) on M5/M15 before entering`
        : trigger === "Structure Reversal"
          ? `${isBullish ? "Bullish" : "Bearish"} price action structure confirmed. Enter at ${entry.toFixed(p)} on confirmed ${isBullish ? "bullish" : "bearish"} M15 close. SL at ${stopLoss.toFixed(p)}.`
          : trigger === "Momentum Shift"
            ? `${isBullish ? "Bullish" : "Bearish"} momentum shift confirmed. Wait for ${isBullish ? "bullish" : "bearish"} M15 candle close to confirm direction, then enter at ${entry.toFixed(p)}. SL at ${stopLoss.toFixed(p)}.`
            : trigger === "Imbalance Fill"
              ? `Wait for price to fill into the imbalance zone ${entryZone}. Look for ${isBullish ? "bullish" : "bearish"} displacement candle to confirm reversal within the zone`
              : trigger === "BOS pullback"
                ? `Enter on first pullback after structure break. Confirm with ${isBullish ? "bullish" : "bearish"} momentum resumption on M15`
                : `Market order execution — entry at current price ${current.toFixed(4)} with structural stop ${stopLoss.toFixed(4)}`;

    const managementNotes: string[] = [
      `Scale out 50% at TP1 (${tp1.toFixed(4)}) — reduce risk-to-zero on remaining position`,
      "Move SL to breakeven after TP1 is reached",
      `Let remainder run to TP2 (${tp2.toFixed(4)}) with trailing stop`,
    ];

    if (session === "Asia") managementNotes.push("Asia session entry — tighter targets, expect ranging until next major session opens");
    if (session === "London") managementNotes.push("London session — highest-probability window, full position size valid");
    if (session === "New York") managementNotes.push("New York session — monitor prior session highs/lows as potential reversal areas before TP2");
    if (liquiditySweepDetected) managementNotes.push("Enter only on confirmed M15 candle close in the direction of the setup — do not enter mid-candle");
    if (smc.chochDetected && !liquiditySweepDetected) managementNotes.push("CHoCH detected — consider partial entry (50%) until full confirmation");

    const distanceToEntry = Math.abs(current - entry) / entry * 100;
    const pricePastEntry = isBullish ? current > entry : current < entry;

    let signalState: import("./schemas").SignalState;
    let signalStateReason: string;

    if (pricePastEntry && distanceToEntry > 0.3) {
      signalState = "EXPIRED";
      signalStateReason = `Price already moved ${distanceToEntry.toFixed(2)}% past entry zone. Do NOT chase — wait for the next setup.`;
    } else if (distanceToEntry <= 0.5) {
      signalState = "ARMED";
      signalStateReason = `Price is ${distanceToEntry.toFixed(2)}% from entry zone. Setup is active — confirm trigger and execute.`;
    } else if (distanceToEntry <= 2.0) {
      signalState = "PENDING";
      signalStateReason = `Price is ${distanceToEntry.toFixed(2)}% from entry zone. Wait for price to return to ${entry.toFixed(entry > 100 ? 1 : 4)} before entering.`;
    } else {
      signalState = "PENDING";
      signalStateReason = `Price is ${distanceToEntry.toFixed(2)}% away from entry zone at ${entry.toFixed(entry > 100 ? 1 : 4)}. Monitor — no action yet.`;
    }

    return {
      agentId: "execution",
      hasSetup: true,
      direction,
      entry,
      stopLoss,
      tp1,
      tp2,
      rrRatio,
      trigger,
      triggerCondition,
      managementNotes,
      entryZone,
      slZone,
      tp1Zone,
      signalState,
      signalStateReason,
      distanceToEntry: parseFloat(distanceToEntry.toFixed(2)),
      processingTime: Date.now() - start,
    };
  } catch (err) {
    return {
      agentId: "execution",
      hasSetup: false,
      direction: "none",
      entry: null,
      stopLoss: null,
      tp1: null,
      tp2: null,
      rrRatio: null,
      trigger: "None",
      triggerCondition: "Execution planning failed",
      managementNotes: ["Fallback neutral execution"],
      entryZone: "No entry",
      slZone: "No SL",
      tp1Zone: "No TP",
      signalState: "NO_TRADE",
      signalStateReason: "Execution planning failed. Stand aside.",
      distanceToEntry: null,
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
