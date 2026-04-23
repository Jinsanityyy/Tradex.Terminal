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
  if (price > 10000) return Math.round(value);       // BTC: round to whole
  if (price > 1000)  return Math.round(value * 10) / 10;  // Gold: 1 decimal
  if (price > 10)    return Math.round(value * 100) / 100; // normal FX: 2dp
  return Math.round(value * 100000) / 100000;        // nano FX: 5dp
}

export async function runExecutionAgent(
  snapshot: MarketSnapshot,
  smc: SMCAgentOutput
): Promise<ExecutionAgentOutput> {
  const start = Date.now();

  try {
    const { price, structure, indicators } = snapshot;
    const { current, high, low, prevClose, dayRange } = price;
    const { htfBias, htfConfidence, zone } = structure;
    const { session } = indicators;

    // ── Pre-conditions check ───────────────────────────────────────────────
    // No execution plan if bias is neutral or confidence too low
    if (htfBias === "neutral" || htfConfidence < 45) {
      return {
        agentId: "execution",
        hasSetup: false,
        direction: "none",
        entry: null, stopLoss: null, tp1: null, tp2: null, rrRatio: null,
        trigger: "None",
        triggerCondition: "No directional bias — stand aside, no execution plan generated",
        managementNotes: ["Wait for clear BOS + HTF bias confirmation", "Monitor for session open catalyst"],
        entryZone: "No valid entry zone",
        slZone: "No SL required — no trade",
        tp1Zone: "No target — no trade",
        signalState: "NO_TRADE",
        signalStateReason: "No directional bias detected. Stand aside and wait for clear setup.",
        distanceToEntry: null,
        processingTime: Date.now() - start,
      };
    }

    const isBullish = htfBias === "bullish";
    const direction: TradeDirection = isBullish ? "long" : "short";

    // ── Use SMC levels if available ────────────────────────────────────────
    const { keyLevels, setupType, bosDetected, liquiditySweepDetected } = smc;
    let entry: number;
    let stopLoss: number;
    let trigger: string;
    let entryZone: string;
    let slZone: string;

    if (setupType === "OB" && keyLevels.orderBlockHigh !== null && keyLevels.orderBlockLow !== null) {
      entry    = isBullish ? keyLevels.orderBlockLow  : keyLevels.orderBlockHigh;
      stopLoss = isBullish
        ? keyLevels.orderBlockLow  * 0.997  // 0.3% below OB low
        : keyLevels.orderBlockHigh * 1.003;  // 0.3% above OB high
      trigger    = "OB retest";
      entryZone  = `${isBullish ? "Bullish" : "Bearish"} OB ${keyLevels.orderBlockLow?.toFixed(4)}–${keyLevels.orderBlockHigh?.toFixed(4)}`;
      slZone     = `${isBullish ? "Below" : "Above"} OB ${isBullish ? "low" : "high"} — thesis invalid on close through`;
    } else if (setupType === "FVG" && keyLevels.fvgMid !== null) {
      entry    = keyLevels.fvgMid;
      stopLoss = isBullish
        ? (keyLevels.fvgLow ?? entry) * 0.998
        : (keyLevels.fvgHigh ?? entry) * 1.002;
      trigger    = "FVG fill";
      entryZone  = `FVG midpoint ${keyLevels.fvgMid?.toFixed(4)} (${keyLevels.fvgLow?.toFixed(4)}–${keyLevels.fvgHigh?.toFixed(4)})`;
      slZone     = `${isBullish ? "Below" : "Above"} FVG ${isBullish ? "low" : "high"} — imbalance invalidated`;
    } else if (setupType === "Sweep" && liquiditySweepDetected) {
      entry    = isBullish ? low * 1.001 : high * 0.999; // entry just after sweep
      stopLoss = isBullish ? low * 0.997 : high * 1.003;
      trigger    = "Sweep reversal";
      entryZone  = `Post-sweep ${isBullish ? "buy" : "sell"} — entry above/below swept level ${isBullish ? low.toFixed(4) : high.toFixed(4)}`;
      slZone     = `${isBullish ? "Below" : "Above"} sweep level — ${isBullish ? "lows" : "highs"} must hold`;
    } else if (bosDetected) {
      // BOS pullback entry
      const pullback = dayRange * 0.38; // 38% Fibonacci of day range
      entry    = isBullish ? current - pullback : current + pullback;
      stopLoss = isBullish ? entry * 0.997 : entry * 1.003;
      trigger    = "BOS pullback";
      entryZone  = `BOS pullback zone ~${entry.toFixed(4)} — ${isBullish ? "38% retracement of bullish BOS" : "38% retrace of bearish BOS"}`;
      slZone     = `${isBullish ? "Below" : "Above"} BOS origin — ${isBullish ? "low" : "high"} of displacement candle`;
    } else {
      // Market order / current price entry
      entry    = current;
      stopLoss = isBullish ? current * 0.985 : current * 1.015;
      trigger    = "Market order";
      entryZone  = `Current price ${current.toFixed(4)} — no premium structure entry available`;
      slZone     = `${isBullish ? "Below" : "Above"} ${stopLoss.toFixed(4)} — structural floor/ceiling`;
    }

    // ── TP Levels ──────────────────────────────────────────────────────────
    // TP1 = nearest structural level, capped at 2.5R (realistic partial exit)
    // TP2 = secondary target at 4R, always beyond TP1
    const riskDist    = Math.abs(entry - stopLoss);
    const tp1MaxDist  = riskDist * 2.5;  // hard cap: TP1 never more than 2.5R away
    const tp2Distance = riskDist * 4;    // TP2 at 4R

    let tp1: number;
    let tp2: number;
    let tp1Zone: string;

    if (isBullish) {
      // Use liquidityTarget only if it's within 2.5R — otherwise fall back to 2R
      const target = keyLevels.liquidityTarget;
      const useTarget = target !== null && target > entry && (target - entry) <= tp1MaxDist;
      tp1 = useTarget ? target! : entry + riskDist * 2;
      // TP2 must always be above TP1
      const rawTp2 = entry + tp2Distance;
      tp2 = rawTp2 > tp1 ? rawTp2 : tp1 + riskDist;
      tp1Zone = useTarget
        ? `Session high / resistance ${tp1.toFixed(4)} — nearest liquidity above`
        : `2R target ${tp1.toFixed(4)} — nearest structural resistance`;
    } else {
      const target = keyLevels.liquidityTarget;
      const useTarget = target !== null && target < entry && (entry - target) <= tp1MaxDist;
      tp1 = useTarget ? target! : entry - riskDist * 2;
      // TP2 must always be below TP1
      const rawTp2 = entry - tp2Distance;
      tp2 = rawTp2 < tp1 ? rawTp2 : tp1 - riskDist;
      tp1Zone = useTarget
        ? `Session low / support ${tp1.toFixed(4)} — nearest liquidity below`
        : `2R target ${tp1.toFixed(4)} — nearest structural support`;
    }

    // Precision rounding
    entry    = roundToPrecision(entry, current);
    stopLoss = roundToPrecision(stopLoss, current);
    tp1      = roundToPrecision(tp1, current);
    tp2      = roundToPrecision(tp2, current);

    // RR ratio
    const risk   = Math.abs(entry - stopLoss);
    const reward = Math.abs(tp1 - entry);
    const rrRatio = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : null;

    // ── Trigger Condition ──────────────────────────────────────────────────
    const triggerCondition =
      trigger === "OB retest"
        ? `Wait for price to return to ${entryZone}, then confirm with ${isBullish ? "bullish" : "bearish"} rejection candle (engulfing, pin bar, or strong close) on M5/M15 before entering`
        : trigger === "FVG fill"
        ? `Wait for price to fill into FVG zone ${entryZone}. Look for ${isBullish ? "bullish" : "bearish"} displacement candle to confirm reversal within the gap`
        : trigger === "Sweep reversal"
        ? `Enter once ${isBullish ? "equal lows" : "equal highs"} are swept and price shows strong reversal candle closing back above/below sweep level`
        : trigger === "BOS pullback"
        ? `Enter on first pullback to discount/premium after BOS. Confirm with ${isBullish ? "bullish" : "bearish"} momentum resumption on M15`
        : `Market order execution — entry at current price ${current.toFixed(4)} with structural stop ${stopLoss.toFixed(4)}`;

    // ── Management Notes ──────────────────────────────────────────────────
    const managementNotes: string[] = [
      `Scale out 50% at TP1 (${tp1.toFixed(4)}) — reduce risk-to-zero on remaining position`,
      `Move SL to breakeven after TP1 is reached`,
      `Let remainder run to TP2 (${tp2.toFixed(4)}) with trailing stop`,
    ];

    if (session === "Asia") managementNotes.push("Asia session entry — tighter targets, expect ranging until London open");
    if (session === "London") managementNotes.push("London session — highest-probability window, full position size valid");
    if (session === "New York") managementNotes.push("NY session — watch for reversal at London high/low before TP2");
    if (smc.chochDetected) managementNotes.push("CHoCH detected — consider partial entry (50%) until full confirmation");

    // ── Signal State ──────────────────────────────────────────────────────────
    // Tells traders WHEN to act — not just what the setup is.
    // ARMED:   price is within 0.5% of entry → enter now
    // PENDING: price is away from entry but within 2% → wait for pullback
    // EXPIRED: price has moved >2% away from entry → setup invalidated, don't chase
    const distanceToEntry = Math.abs(current - entry) / entry * 100;
    const pricePastEntry  = isBullish ? current > entry : current < entry;

    let signalState: import("./schemas").SignalState;
    let signalStateReason: string;

    if (pricePastEntry && distanceToEntry > 0.3) {
      // Price already moved past entry in the right direction — missed, don't chase
      signalState = "EXPIRED";
      signalStateReason = `Price already moved ${distanceToEntry.toFixed(2)}% past entry zone. Do NOT chase — wait for the next setup.`;
    } else if (distanceToEntry <= 0.5) {
      // Price is at or very near entry zone → execute now
      signalState = "ARMED";
      signalStateReason = `Price is ${distanceToEntry.toFixed(2)}% from entry zone. Setup is active — confirm trigger and execute.`;
    } else if (distanceToEntry <= 2.0) {
      // Price is approaching entry zone → monitor and prepare
      signalState = "PENDING";
      signalStateReason = `Price is ${distanceToEntry.toFixed(2)}% from entry zone. Wait for price to return to ${entry.toFixed(entry > 100 ? 1 : 4)} before entering.`;
    } else {
      // Price is far from entry zone → wait, not urgent
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
      entry: null, stopLoss: null, tp1: null, tp2: null, rrRatio: null,
      trigger: "Error",
      triggerCondition: "Execution analysis failed",
      managementNotes: [],
      entryZone: "N/A",
      slZone: "N/A",
      tp1Zone: "N/A",
      signalState: "NO_TRADE",
      signalStateReason: "Execution analysis failed",
      distanceToEntry: null,
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
