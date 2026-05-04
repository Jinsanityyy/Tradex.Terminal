/**
 * Agent 5 — Execution Agent (Rule-Based)
 *
 * Produces the exact trade execution plan using:
 * - Fibonacci zones (0.5 / 0.618 / 0.705) from the Structure+Fib agent
 * - RSI + MACD confirmation for entry quality
 * - Swing high/low for Stop Loss placement
 * - Previous swing low/high for Take Profit targeting
 * - Signal state: ARMED / PENDING / TRIGGERED / INVALIDATED / NO_TRADE
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
    const { session, rsi, macdHist } = indicators;
    const createNoTrade = (reason: string, notes?: string[]): ExecutionAgentOutput => ({
      agentId: "execution",
      hasSetup: false,
      direction: "none",
      entry: null,
      stopLoss: null,
      tp1: null,
      tp2: null,
      rrRatio: null,
      trigger: "None",
      triggerCondition: reason,
      managementNotes: notes ?? [
        "Wait for price to reach the Fibonacci entry zone (0.5–0.705 retracement)",
        "Only arm execution when the stop is structural and the reward-to-risk is acceptable",
      ],
      entryZone: "No valid entry zone",
      slZone: "No SL — no trade",
      tp1Zone: "No target — no trade",
      signalState: "NO_TRADE",
      signalStateReason: reason,
      distanceToEntry: null,
      processingTime: Date.now() - start,
    });

    // ── Pre-conditions ────────────────────────────────────────────────────
    if (htfBias === "neutral" || htfConfidence < 45 || !smc.setupPresent) {
      const noTradeMsg = !smc.setupPresent
        ? `No valid Fibonacci setup — ${smc.reasons[0] ?? "stand aside"}`
        : "Insufficient directional conviction — stand aside";
      return createNoTrade(noTradeMsg, [
        "Wait for price to reach the Fibonacci entry zone (0.5–0.705 retracement)",
        "Monitor RSI and MACD for alignment with trend direction",
      ]);
    }

    const isBullish  = htfBias === "bullish";
    const direction: TradeDirection = isBullish ? "long" : "short";

    // ── Extract Fibonacci levels from structure agent ─────────────────────
    // Field mapping from SMCKeyLevels (renamed for clarity in this agent):
    //   fvgMid  = Fib 61.8% — optimal entry level
    //   fvgLow  = Fib 50%   — entry zone bottom (short) / top (long)
    //   fvgHigh = Fib 70.5% — entry zone top (short) / bottom (long)
    //   orderBlockHigh = resistance / last swing high (SL ref for short)
    //   orderBlockLow  = support   / last swing low   (SL ref for long)
    //   liquidityTarget = TP target (previous swing low for short, high for long)
    //   sweepLevel = BOS level
    const { keyLevels, setupType, bosDetected, invalidationLevel } = smc;
    const fib618 = keyLevels.fvgMid;
    const fib50  = keyLevels.fvgLow;
    const fib705 = keyLevels.fvgHigh;

    // ── RSI + MACD confirmation context ──────────────────────────────────
    const rsiBearishOk  = rsi < 55 && rsi > 20; // not overbought, bearish momentum acceptable
    const rsiBullishOk  = rsi > 45 && rsi < 80; // not oversold, bullish momentum acceptable
    const macdConfirms  = isBullish ? macdHist > 0 : macdHist < 0;
    const indicatorOk   = isBullish ? rsiBullishOk : rsiBearishOk;

    let entry: number;
    let stopLoss: number;
    let trigger: string;
    let entryZone: string;
    let slZone: string;

    if (setupType === "FibShort" || setupType === "FibLong") {
      // ── Fibonacci zone entry ──────────────────────────────────────────
      // Prefer fib61.8 (golden ratio); fallback to current if already in zone
      const fibEntry = fib618 ?? fib705 ?? fib50;

      if (fibEntry !== null) {
        entry = fibEntry;
        entryZone = `Fib 61.8% zone ${fib50 !== null ? `(50%: ${fib50.toFixed(fib50 > 100 ? 1 : 4)}` : "("}–70.5%: ${fib705 !== null ? fib705.toFixed(fib705 > 100 ? 1 : 4) : "N/A"}) | Ideal entry: ${fibEntry.toFixed(fibEntry > 100 ? 1 : 4)}`;
      } else {
        // No fib levels computed yet — use current price as entry
        entry     = current;
        entryZone = `Current price ${current.toFixed(current > 100 ? 1 : 4)} — entering at market (fib levels not resolved)`;
      }

      // SL just outside fib 70.5% zone boundary — if price exits the valid
      // retracement zone, the setup is invalidated. Much tighter than using
      // the full swing high/low, which creates unnecessarily wide stops.
      const buffer = current * 0.003; // 0.3% buffer beyond fib zone edge
      if (isBullish) {
        // Long: fib705 is the deepest valid pullback. SL below it.
        const slRef = fib705 ?? keyLevels.orderBlockLow ?? low;
        stopLoss = slRef - buffer;
        slZone   = `Below Fib 70.5% at ${slRef.toFixed(slRef > 100 ? 1 : 4)} — pullback beyond valid zone, setup invalid`;
      } else {
        // Short: fib705 is the highest valid retracement. SL above it.
        const slRef = fib705 ?? keyLevels.orderBlockHigh ?? high;
        stopLoss = slRef + buffer;
        slZone   = `Above Fib 70.5% at ${slRef.toFixed(slRef > 100 ? 1 : 4)} — retracement beyond valid zone, setup invalid`;
      }

      trigger = setupType === "FibShort"
        ? `Fib zone short — RSI ${rsi.toFixed(0)}, MACD ${macdHist > 0 ? "+" : ""}${macdHist.toFixed(4)}`
        : `Fib zone long (post-BOS) — RSI ${rsi.toFixed(0)}, MACD ${macdHist > 0 ? "+" : ""}${macdHist.toFixed(4)}`;

    } else if (setupType === "BOS_Continuation" && bosDetected) {
      // ── BOS pullback entry ────────────────────────────────────────────
      const pullback = dayRange * 0.38;
      entry     = isBullish ? current - pullback : current + pullback;
      // SL at the BOS breakout level — if price closes back through it, BOS failed
      const bosLevel  = keyLevels.sweepLevel;
      const bosBuffer = current * 0.002;
      stopLoss  = isBullish
        ? (bosLevel !== null ? bosLevel - bosBuffer : entry * 0.997)
        : (bosLevel !== null ? bosLevel + bosBuffer : entry * 1.003);
      trigger   = `BOS pullback — enter on retracement after ${isBullish ? "bullish" : "bearish"} structure break`;
      entryZone = `BOS pullback ~${entry.toFixed(entry > 100 ? 1 : 4)} — 38% retrace of break candle`;
      slZone    = `${isBullish ? "Below" : "Above"} BOS level ${bosLevel !== null ? bosLevel.toFixed(bosLevel > 100 ? 1 : 4) : "breakout origin"} — structure break fails on close through`;

    } else {
      return createNoTrade(
        `Unsupported setup type "${setupType}" — wait for FibShort, FibLong, or BOS pullback confirmation before executing.`,
        [
          `Current setup type "${setupType}" is not allowed to auto-execute because it can produce oversized stops.`,
          "Wait for a clean Fibonacci entry or a BOS continuation pullback before arming the trade.",
        ]
      );
    }

    // ── Enforce minimum SL distance (avoid noise-stops) ─────────────────
    const minRisk = current * 0.0015; // 0.15% minimum
    if (Math.abs(entry - stopLoss) < minRisk) {
      stopLoss = isBullish ? entry - minRisk : entry + minRisk;
    }

    // ── TP Levels ─────────────────────────────────────────────────────────
    const riskDist    = Math.abs(entry - stopLoss);
    const minTp1Dist  = riskDist * 1.5; // TP1 must be at least 1.5R — never less
    const tp1MaxDist  = riskDist * 5;   // use natural swing target up to 5R away
    const tp2Dist     = riskDist * 3;   // TP2 always at 3R from entry

    let tp1: number;
    let tp2: number;
    let tp1Zone: string;

    if (isBullish) {
      const target    = keyLevels.liquidityTarget;
      // Use swing target only if it's far enough (≥ 1.5R) and not too far (≤ 5R)
      const useTarget = target !== null
        && target > entry
        && (target - entry) >= minTp1Dist
        && (target - entry) <= tp1MaxDist;
      tp1     = useTarget ? target! : entry + riskDist * 2;
      tp2     = entry + tp2Dist;
      tp1Zone = useTarget
        ? `Previous swing high / resistance ${tp1.toFixed(tp1 > 100 ? 1 : 4)} — TP1 target`
        : `2R target ${tp1.toFixed(tp1 > 100 ? 1 : 4)}`;
    } else {
      const target    = keyLevels.liquidityTarget;
      const useTarget = target !== null
        && target < entry
        && (entry - target) >= minTp1Dist
        && (entry - target) <= tp1MaxDist;
      tp1     = useTarget ? target! : entry - riskDist * 2;
      tp2     = entry - tp2Dist;
      tp1Zone = useTarget
        ? `Previous swing low / support ${tp1.toFixed(tp1 > 100 ? 1 : 4)} — TP1 target`
        : `2R target ${tp1.toFixed(tp1 > 100 ? 1 : 4)}`;
    }

    // Precision rounding
    entry    = roundToPrecision(entry, current);
    stopLoss = roundToPrecision(stopLoss, current);
    tp1      = roundToPrecision(tp1, current);
    tp2      = roundToPrecision(tp2, current);

    const risk    = Math.abs(entry - stopLoss);
    const reward  = Math.abs(tp1 - entry);
    const rrRatio = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : null;

    if (rrRatio !== null && rrRatio < 1) {
      return createNoTrade(
        `Reward-to-risk too weak (${rrRatio}:1) — skip execution until stop placement tightens or TP improves.`,
        [
          `Current setup only offers ${rrRatio}:1 to TP1, which is too weak for execution.`,
          "Wait for a deeper retracement or a tighter structural invalidation before taking the trade.",
        ]
      );
    }

    // ── Trigger condition ─────────────────────────────────────────────────
    const triggerCondition =
      (setupType === "FibShort" || setupType === "FibLong")
        ? `Wait for price to enter fib zone ${entryZone}. Confirm with ${isBullish ? "bullish" : "bearish"} rejection wick or momentum candle on M5/M15. RSI must be ${isBullish ? ">45 and rising" : "<55 and falling"}. MACD histogram must be ${isBullish ? "positive or crossing up" : "negative or crossing down"}.`
        : trigger === "BOS pullback"
          ? `Enter on first pullback after BOS (38% retrace). Confirm ${isBullish ? "bullish" : "bearish"} candle on M15 before entering.`
          : `Stand aside until a valid execution setup forms.`;

    // ── Management notes ──────────────────────────────────────────────────
    const managementNotes: string[] = [
      `Scale out 50% at TP1 (${tp1.toFixed(tp1 > 100 ? 1 : 4)}) — reduce position risk`,
      `Move SL to breakeven after TP1 hit`,
      `Let remainder run to TP2 (${tp2.toFixed(tp2 > 100 ? 1 : 4)}) with trailing stop`,
    ];

    if (!macdConfirms) managementNotes.push("MACD not fully aligned — consider reduced position size (50%)");
    if (!indicatorOk)  managementNotes.push("RSI at extreme — consider waiting for indicator reset before entering");
    if (session === "Asia") managementNotes.push("Asia session — tighter targets, expect range until London open");
    if (session === "London") managementNotes.push("London session — highest probability window, full size valid");
    if (session === "New York") managementNotes.push("NY session — watch for London high/low reversal before TP2");

    // ── Signal state ──────────────────────────────────────────────────────
    const distanceToEntry = Math.abs(current - entry) / entry * 100;
    const pricePastEntry  = isBullish ? current > entry : current < entry;

    let signalState: import("./schemas").SignalState;
    let signalStateReason: string;

    if (pricePastEntry && distanceToEntry > 0.3) {
      signalState       = "EXPIRED";
      signalStateReason = `Price moved ${distanceToEntry.toFixed(2)}% past entry. Do NOT chase — wait for next setup.`;
    } else if (distanceToEntry <= 0.5) {
      signalState       = "ARMED";
      signalStateReason = `Price ${distanceToEntry.toFixed(2)}% from entry. Setup ACTIVE — confirm candle trigger before executing.`;
    } else if (distanceToEntry <= 2.0) {
      signalState       = "PENDING";
      signalStateReason = `Price ${distanceToEntry.toFixed(2)}% from entry zone. Wait for price to reach ${entry.toFixed(entry > 100 ? 1 : 4)}.`;
    } else {
      signalState       = "PENDING";
      signalStateReason = `Price ${distanceToEntry.toFixed(2)}% away from fib entry at ${entry.toFixed(entry > 100 ? 1 : 4)}. Monitor — no action yet.`;
    }

    // Invalidate if BOS in wrong direction occurred
    if (smc.chochDetected && !smc.bosDetected) {
      signalState       = "EXPIRED";
      signalStateReason = "Structure shifted in opposite direction — setup invalidated. Stand aside.";
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
