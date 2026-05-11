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

    // Jade Cap: ONLY generate an execution plan when a sweep is confirmed.
    // No sweep = no structural trade trigger = no trade, regardless of HTF bias.
    const jadeCapSweepActive = smc.liquiditySweepDetected && smc.setupPresent && smc.bias !== "neutral";
    if (!jadeCapSweepActive) {
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
        triggerCondition: "No confirmed sweep in NY session — stand aside, no execution plan generated",
        managementNotes: [
          "Wait for NY session sweep (13:00–18:00 UTC) to form",
          "Monitor London Low, Asian High/Low, PDH/PDL for sweep candidates",
        ],
        entryZone: "No valid entry zone",
        slZone: "No SL required — no trade",
        tp1Zone: "No target — no trade",
        signalState: "NO_TRADE",
        signalStateReason: "No confirmed liquidity sweep. Jade Cap requires a sweep before entry.",
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
      trigger = liquiditySweepDetected ? "Jade Cap sweep + FVG" : "FVG fill";
      entryZone = `FVG midpoint ${keyLevels.fvgMid.toFixed(4)} (${keyLevels.fvgLow?.toFixed(4)}–${keyLevels.fvgHigh?.toFixed(4)})`;
      slZone = smc.invalidationLevel !== null
        ? `Sweep extreme + buffer at ${smc.invalidationLevel.toFixed(4)} — close through invalidates setup`
        : `${isBullish ? "Below" : "Above"} FVG ${isBullish ? "low" : "high"} — imbalance invalidated`;
    } else if (setupType === "Sweep" && liquiditySweepDetected) {
      const sweepRef = keyLevels.sweepLevel ?? (isBullish ? low : high);
      entry = isBullish ? sweepRef * 1.001 : sweepRef * 0.999;
      // Jade Cap: SL = sweep extreme + buffer (pre-computed as invalidationLevel)
      stopLoss = smc.invalidationLevel !== null
        ? smc.invalidationLevel
        : isBullish ? low * 0.997 : high * 1.003;
      trigger = "Jade Cap sweep";
      entryZone = `Post-sweep ${isBullish ? "buy" : "sell"} — swept level ${sweepRef.toFixed(4)}`;
      slZone = smc.invalidationLevel !== null
        ? `Sweep extreme + buffer at ${smc.invalidationLevel.toFixed(4)} — thesis invalid on break`
        : `${isBullish ? "Below" : "Above"} sweep level — ${isBullish ? "lows" : "highs"} must hold`;
    } else if (bosDetected) {
      const pullback = dayRange * 0.38;
      entry = isBullish ? current - pullback : current + pullback;
      stopLoss = isBullish ? entry * 0.997 : entry * 1.003;
      trigger = "BOS pullback";
      entryZone = `BOS pullback zone ~${entry.toFixed(4)} — ${isBullish ? "38% retracement of bullish BOS" : "38% retrace of bearish BOS"}`;
      slZone = `${isBullish ? "Below" : "Above"} BOS origin — ${isBullish ? "low" : "high"} of displacement candle`;
    } else {
      entry = current;
      stopLoss = isBullish ? current * 0.985 : current * 1.015;
      trigger = "Market order";
      entryZone = `Current price ${current.toFixed(4)} — no premium structure entry available`;
      slZone = `${isBullish ? "Below" : "Above"} ${stopLoss.toFixed(4)} — structural floor/ceiling`;
    }

    // Hard guard: SL must be on the correct side of entry.
    // smc.invalidationLevel from the LLM path can land on the wrong side
    // (e.g. low-sweep formula applied to a short signal). Fix before riskDist
    // drives every downstream TP/RR calculation.
    if (isBullish && stopLoss >= entry) stopLoss = low * 0.998;    // long: SL below candle low
    if (!isBullish && stopLoss <= entry) stopLoss = high * 1.002;  // short: SL above candle high

    const riskDist = Math.abs(entry - stopLoss);
    const tp1MaxDist = riskDist * 2.5;
    const tp2Distance = riskDist * 4;

    let tp1: number;
    let tp2: number;
    let tp1Zone: string;

    if (isBullish) {
      const target = keyLevels.liquidityTarget;
      const useTarget = target !== null && target > entry && (target - entry) <= tp1MaxDist;
      tp1 = useTarget ? target : entry + riskDist * 2;
      const rawTp2 = entry + tp2Distance;
      tp2 = rawTp2 > tp1 ? rawTp2 : tp1 + riskDist;
      tp1Zone = useTarget
        ? `Session high / resistance ${tp1.toFixed(4)} — nearest liquidity above`
        : `2R target ${tp1.toFixed(4)} — nearest structural resistance`;
    } else {
      const target = keyLevels.liquidityTarget;
      const useTarget = target !== null && target < entry && (entry - target) <= tp1MaxDist;
      tp1 = useTarget ? target : entry - riskDist * 2;
      const rawTp2 = entry - tp2Distance;
      tp2 = rawTp2 < tp1 ? rawTp2 : tp1 - riskDist;
      tp1Zone = useTarget
        ? `Session low / support ${tp1.toFixed(4)} — nearest liquidity below`
        : `2R target ${tp1.toFixed(4)} — nearest structural support`;
    }

    // Hard caps: TP1 ≤ 1.5R, TP2 ≤ 2.5R from entry
    if (isBullish) {
      tp1 = Math.min(tp1, entry + riskDist * 1.5);
      tp2 = Math.min(tp2, entry + riskDist * 2.5);
    } else {
      tp1 = Math.max(tp1, entry - riskDist * 1.5);
      tp2 = Math.max(tp2, entry - riskDist * 2.5);
    }

    // Direction guard: TP must be on the correct side of entry
    if (isBullish  && tp1 <= entry) tp1 = entry + riskDist * 1.5;
    if (!isBullish && tp1 >= entry) tp1 = entry - riskDist * 1.5;
    if (isBullish  && tp2 <= entry) tp2 = entry + riskDist * 2.5;
    if (!isBullish && tp2 >= entry) tp2 = entry - riskDist * 2.5;

    entry = roundToPrecision(entry, current);
    stopLoss = roundToPrecision(stopLoss, current);
    tp1 = roundToPrecision(tp1, current);
    tp2 = roundToPrecision(tp2, current);

    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(tp1 - entry);
    const rrRatio = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : null;

    const p = entry > 100 ? 1 : 4;
    const triggerCondition =
      trigger === "OB retest"
        ? `Wait for price to return to ${entryZone}, then confirm with ${isBullish ? "bullish" : "bearish"} rejection candle (engulfing, pin bar, or strong close) on M5/M15 before entering`
        : trigger === "Jade Cap sweep + FVG"
          ? `Jade Cap confirmed — NY session ${isBullish ? "lows" : "highs"} swept, FVG formed. Enter at FVG midpoint ${entry.toFixed(p)}. Confirm with ${isBullish ? "bullish" : "bearish"} M15 close back inside swept level. SL at sweep extreme + buffer (${stopLoss.toFixed(p)}).`
          : trigger === "Jade Cap sweep"
            ? `Jade Cap sweep confirmed in NY session. Wait for ${isBullish ? "bullish" : "bearish"} M15 candle close back inside swept level, then enter at ${entry.toFixed(p)}. SL at ${stopLoss.toFixed(p)}.`
            : trigger === "FVG fill"
              ? `Wait for price to fill into FVG zone ${entryZone}. Look for ${isBullish ? "bullish" : "bearish"} displacement candle to confirm reversal within the gap`
              : trigger === "Sweep reversal"
                ? `Enter once ${isBullish ? "equal lows" : "equal highs"} are swept and price shows strong reversal candle closing back above/below sweep level`
                : trigger === "BOS pullback"
                  ? `Enter on first pullback to discount/premium after BOS. Confirm with ${isBullish ? "bullish" : "bearish"} momentum resumption on M15`
                  : `Market order execution — entry at current price ${current.toFixed(4)} with structural stop ${stopLoss.toFixed(4)}`;

    const managementNotes: string[] = [
      `Scale out 50% at TP1 (${tp1.toFixed(4)}) — reduce risk-to-zero on remaining position`,
      "Move SL to breakeven after TP1 is reached",
      `Let remainder run to TP2 (${tp2.toFixed(4)}) with trailing stop`,
    ];

    if (session === "Asia") managementNotes.push("Asia session entry — tighter targets, expect ranging until London open");
    if (session === "London") managementNotes.push("London session — highest-probability window, full position size valid");
    if (session === "New York") managementNotes.push("NY session — watch for reversal at London high/low before TP2");
    if (liquiditySweepDetected) managementNotes.push("Jade Cap setup — enter only on M15 candle close back inside swept session level; do not enter mid-wick");
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
