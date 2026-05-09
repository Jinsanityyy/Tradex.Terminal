/**
 * Agent 5 — Execution Agent
 *
 * Grades every setup against JADE CAP A+ criteria before producing a trade plan.
 * Only A+ and A grade setups generate executable plans.
 * B+/B → WAIT state. C → NO_TRADE.
 *
 * Grade requirements:
 *   A+ = R:R ≥ 1:3  + confluence ≥ 4 + SL in range + killzone active
 *   A  = R:R ≥ 1:2.5 + confluence ≥ 3 + SL in range
 *   B+ = R:R ≥ 1:2  + confluence ≥ 3                 → WAIT
 *   B  = R:R ≥ 1:2  + confluence ≥ 2                 → WAIT
 *   C  = anything below                               → NO TRADE
 */

import type {
  MarketSnapshot, ExecutionAgentOutput, TradeDirection,
  SMCAgentOutput, NewsAgentOutput, SetupGrade, SignalState,
} from "./schemas";

// ── SL Limits — Gold absolute (pts), others %-based ──────────────────────────
const GOLD_SL_LIMITS: Record<string, { min: number; max: number }> = {
  M5:  { min: 3,  max: 8   },
  M15: { min: 5,  max: 12  },
  H1:  { min: 8,  max: 20  },
  H4:  { min: 20, max: 45  },
};

const PCT_SL_MAX: Record<string, number> = {
  M5:  0.003,
  M15: 0.004,
  H1:  0.008,
  H4:  0.020,
};

const GOLD_SYMS = new Set(["XAUUSD", "XAGUSD", "XPTUSD"]);

// Killzone windows (UTC hours, inclusive start, exclusive end)
const LONDON_KZ = { start: 8,  end: 11 };
// JadeCap NY Kill Zone = 9:30–11:30 AM EST = 13:30–15:30 UTC exactly
const NY_KZ = { startHour: 13, startMin: 30, endHour: 15, endMin: 30 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundToPrecision(value: number, price: number): number {
  if (price > 10000) return Math.round(value);
  if (price > 1000)  return Math.round(value * 10) / 10;
  if (price > 10)    return Math.round(value * 100) / 100;
  return Math.round(value * 100000) / 100000;
}

function slBuffer(symbol: string): number {
  if (symbol === "XAUUSD") return 1;   // JadeCap: SL just $1 beyond sweep wick
  if (symbol === "XAGUSD") return 0.05;
  if (symbol === "XPTUSD") return 3;
  if (symbol === "BTCUSD" || symbol === "ETHUSD") return 50;
  return 0;
}

function isSLInRange(riskDist: number, timeframe: string, symbol: string, price: number): boolean {
  if (GOLD_SYMS.has(symbol)) {
    const lim = GOLD_SL_LIMITS[timeframe] ?? GOLD_SL_LIMITS.H1;
    return riskDist >= lim.min && riskDist <= lim.max;
  }
  const maxPct = PCT_SL_MAX[timeframe] ?? PCT_SL_MAX.H1;
  return riskDist <= price * maxPct;
}

// ── Confluence Scoring — 10 factors ──────────────────────────────────────────

interface ConfluenceFactor { id: string; label: string; pass: boolean }

function scoreConfluence(
  snapshot: MarketSnapshot,
  smc: SMCAgentOutput,
  news: NewsAgentOutput,
  isBullish: boolean,
  inKillzone: boolean,
): ConfluenceFactor[] {
  const { structure, symbol } = snapshot;

  const macroAligned = GOLD_SYMS.has(symbol)
    ? (isBullish ? news.riskScore > 25 : news.riskScore < 55)
    : ["EURUSD", "GBPUSD", "AUDUSD", "NZDUSD"].includes(symbol)
      ? (isBullish ? news.impact !== "bearish" : news.impact !== "bullish")
      : true;

  return [
    {
      id: "htf_ob",
      label: "HTF Order Block respected",
      pass: smc.keyLevels.orderBlockHigh !== null && smc.keyLevels.orderBlockLow !== null,
    },
    {
      id: "fvg",
      label: "Fair Value Gap present",
      pass: smc.keyLevels.fvgMid !== null,
    },
    {
      id: "sweep",
      label: "Liquidity sweep confirmed",
      pass: smc.liquiditySweepDetected,
    },
    {
      id: "bos",
      label: "BOS confirmed",
      pass: smc.bosDetected,
    },
    {
      id: "choch",
      label: "CHoCH confirmed",
      pass: smc.chochDetected,
    },
    {
      id: "fib_zone",
      label: isBullish ? "Price in discount retracement zone" : "Price in premium retracement zone",
      pass: isBullish ? structure.inDiscount : structure.inPremium,
    },
    {
      id: "killzone",
      label: "Session killzone active",
      pass: inKillzone,
    },
    {
      id: "macro",
      label: "Macro bias aligned",
      pass: macroAligned,
    },
    {
      id: "inducement",
      label: "Inducement / equal H-L swept",
      pass: smc.liquiditySweepDetected && smc.setupType !== "None",
    },
    {
      id: "liq_pool",
      label: "Clean liquidity pool as TP target",
      pass: smc.keyLevels.liquidityTarget !== null,
    },
  ];
}

// ── Grade Calculation ─────────────────────────────────────────────────────────

function gradeSetup(
  rrRatio: number,
  confluenceCount: number,
  slInRange: boolean,
  inKillzone: boolean,
  entryInStructure: boolean,
): SetupGrade {
  // Hard requirement: entry must be in OB or FVG for A+/A
  if (!entryInStructure) {
    if (rrRatio >= 2.0 && confluenceCount >= 3) return "B+";
    if (rrRatio >= 2.0 && confluenceCount >= 2) return "B";
    return "C";
  }
  if (rrRatio >= 3.0 && confluenceCount >= 4 && slInRange && inKillzone) return "A+";
  if (rrRatio >= 2.5 && confluenceCount >= 3 && slInRange) return "A";
  if (rrRatio >= 2.0 && confluenceCount >= 3) return "B+";
  if (rrRatio >= 2.0 && confluenceCount >= 2) return "B";
  return "C";
}

// ── Result constructors ───────────────────────────────────────────────────────

function noTradeResult(start: number, reason: string): ExecutionAgentOutput {
  return {
    agentId: "execution",
    hasSetup: false,
    direction: "none",
    entry: null, stopLoss: null, tp1: null, tp2: null, tp3: null, rrRatio: null,
    grade: "C",
    confluenceCount: 0,
    confluenceFactors: [],
    trigger: "None",
    triggerCondition: `NO TRADE — ${reason}`,
    managementNotes: ["Stand aside — setup does not meet minimum quality criteria"],
    entryZone: "No valid entry zone",
    slZone: "No SL required",
    tp1Zone: "No target",
    tp3Zone: "N/A",
    signalState: "NO_TRADE",
    signalStateReason: `NO TRADE — ${reason}`,
    distanceToEntry: null,
    processingTime: Date.now() - start,
  };
}

function waitResult(start: number, grade: "B+" | "B", reason: string): ExecutionAgentOutput {
  return {
    agentId: "execution",
    hasSetup: false,
    direction: "none",
    entry: null, stopLoss: null, tp1: null, tp2: null, tp3: null, rrRatio: null,
    grade,
    confluenceCount: 0,
    confluenceFactors: [],
    trigger: "None",
    triggerCondition: `WAIT — ${reason}`,
    managementNotes: ["Suboptimal setup detected — monitoring for better entry conditions"],
    entryZone: "Monitoring",
    slZone: "No SL — waiting",
    tp1Zone: "No target yet",
    tp3Zone: "N/A",
    signalState: "WAIT",
    signalStateReason: `WAIT — Suboptimal setup. ${reason}`,
    distanceToEntry: null,
    processingTime: Date.now() - start,
  };
}

// ── Main Export ───────────────────────────────────────────────────────────────

export async function runExecutionAgent(
  snapshot: MarketSnapshot,
  smc: SMCAgentOutput,
  news: NewsAgentOutput,
): Promise<ExecutionAgentOutput> {
  const start = Date.now();

  try {
    const { price, structure, indicators, symbol } = snapshot;
    const timeframe = snapshot.timeframe ?? "H1";
    const { current, high, low, dayRange } = price;
    const { htfBias, htfConfidence } = structure;
    const { session, sessionHour } = indicators;

    // ── Killzone ──────────────────────────────────────────────────────────
    const inLondonKZ = session === "London" && sessionHour >= LONDON_KZ.start && sessionHour < LONDON_KZ.end;
    // Minute-aware JadeCap NY Kill Zone check (13:30–15:30 UTC)
    const nowDate   = new Date(snapshot.timestamp);
    const nowMinUTC = nowDate.getUTCMinutes();
    const inNYKZ    = session === "New York" &&
      (sessionHour > NY_KZ.startHour || (sessionHour === NY_KZ.startHour && nowMinUTC >= NY_KZ.startMin)) &&
      (sessionHour < NY_KZ.endHour   || (sessionHour === NY_KZ.endHour   && nowMinUTC <  NY_KZ.endMin));
    const inKillzone = inLondonKZ || inNYKZ;

    // ── Major news check ───────────────────────────────────────────────────
    // Safe-haven assets (XAU/XAG/XPT): high geopolitical risk is BULLISH for gold.
    // Only block when risk is extreme (>95) AND news is not bullish.
    // All other assets: block above 80 as usual.
    const riskBlocksExec = GOLD_SYMS.has(symbol)
      ? news.riskScore > 95 && news.impact !== "bullish"
      : news.riskScore > 80;
    if (riskBlocksExec) {
      return noTradeResult(start, `Elevated macro risk (${news.riskScore}/100) — stand aside until risk clears`);
    }

    // ── HTF bias check ────────────────────────────────────────────────────
    const sweepActive = smc.liquiditySweepDetected && smc.setupPresent && smc.bias !== "neutral";
    if (!sweepActive && (htfBias === "neutral" || htfConfidence < 45)) {
      return noTradeResult(start, "No directional bias confirmed — stand aside");
    }

    // ── Direction ─────────────────────────────────────────────────────────
    const { keyLevels, setupType, bosDetected, liquiditySweepDetected } = smc;
    const isBullish = (liquiditySweepDetected && smc.bias !== "neutral")
      ? smc.bias === "bullish"
      : htfBias === "bullish";
    const direction: TradeDirection = isBullish ? "long" : "short";
    const buf = slBuffer(symbol);

    // ── Entry / SL construction ───────────────────────────────────────────
    let entry: number;
    let stopLoss: number;
    let trigger: string;
    let entryZone: string;
    let slZone: string;
    let entryInStructure = false;

    if (setupType === "OB" && keyLevels.orderBlockHigh !== null && keyLevels.orderBlockLow !== null) {
      entry    = isBullish ? keyLevels.orderBlockLow : keyLevels.orderBlockHigh;
      stopLoss = isBullish
        ? keyLevels.orderBlockLow  - buf
        : keyLevels.orderBlockHigh + buf;
      trigger  = "OB retest";
      entryZone = `${isBullish ? "Bullish" : "Bearish"} OB ${keyLevels.orderBlockLow.toFixed(4)}–${keyLevels.orderBlockHigh.toFixed(4)}`;
      slZone   = `${isBullish ? "Below" : "Above"} OB ${isBullish ? "low" : "high"} — thesis invalid on close through`;
      entryInStructure = true;

      // Skip if price moved more than 30% inside the OB
      const obRange  = keyLevels.orderBlockHigh - keyLevels.orderBlockLow;
      const depthPct = obRange > 0
        ? (isBullish
            ? (current - keyLevels.orderBlockLow)  / obRange
            : (keyLevels.orderBlockHigh - current) / obRange)
        : 0;
      if (depthPct > 0.3) {
        return waitResult(start, "B", "Price >30% into OB — wait for a fresh OB test");
      }

    } else if (setupType === "FVG" && keyLevels.fvgMid !== null) {
      entry    = keyLevels.fvgMid;
      // Validate invalidationLevel is on the correct side before using it
      const fvgInvValid = smc.invalidationLevel !== null &&
        (isBullish ? smc.invalidationLevel < entry : smc.invalidationLevel > entry);
      if (fvgInvValid) {
        stopLoss = smc.invalidationLevel!;
        slZone   = `Structural invalidation at ${smc.invalidationLevel!.toFixed(4)} — close through negates setup`;
      } else if (isBullish) {
        const fvgFloor = keyLevels.fvgLow !== null && keyLevels.fvgLow < entry ? keyLevels.fvgLow : entry - buf * 2;
        stopLoss = fvgFloor - buf;
        slZone   = `Below FVG low ${fvgFloor.toFixed(4)} — structure must hold`;
      } else {
        const fvgCeil = keyLevels.fvgHigh !== null && keyLevels.fvgHigh > entry ? keyLevels.fvgHigh : entry + buf * 2;
        stopLoss = fvgCeil + buf;
        slZone   = `Above FVG high ${fvgCeil.toFixed(4)} — structure must hold`;
      }
      trigger  = liquiditySweepDetected ? "Structure Reversal" : "Imbalance Fill";
      entryZone = `${isBullish ? "Buy" : "Sell"} zone ${keyLevels.fvgMid.toFixed(4)} — price action imbalance area`;
      entryInStructure = true;

    } else if (setupType === "Sweep" && liquiditySweepDetected) {
      const sweepRef = keyLevels.sweepLevel ?? (isBullish ? low : high);
      entry    = isBullish ? sweepRef * 1.001 : sweepRef * 0.999;
      // Validate invalidationLevel direction before using
      const sweepInvValid = smc.invalidationLevel !== null &&
        (isBullish ? smc.invalidationLevel < entry : smc.invalidationLevel > entry);
      stopLoss = sweepInvValid
        ? smc.invalidationLevel!
        : isBullish ? sweepRef * 0.999 - buf : sweepRef * 1.001 + buf;
      trigger  = "Momentum Shift";
      entryZone = `${isBullish ? "Buy" : "Sell"} entry at key structural level ${entry.toFixed(4)}`;
      slZone   = sweepInvValid
        ? `Structural invalidation at ${smc.invalidationLevel!.toFixed(4)} — thesis invalid on break`
        : `${isBullish ? "Below" : "Above"} key level — structure must hold`;
      entryInStructure = false; // sweep without OB/FVG

    } else if (bosDetected) {
      const pullback = dayRange * 0.38;
      entry    = isBullish ? current - pullback : current + pullback;
      stopLoss = isBullish ? entry - buf : entry + buf;
      trigger  = "BOS pullback";
      entryZone = `BOS pullback zone ~${entry.toFixed(4)}`;
      slZone   = `${isBullish ? "Below" : "Above"} BOS origin — displacement candle ${isBullish ? "low" : "high"}`;
      entryInStructure = false;

    } else {
      return noTradeResult(start, "No valid structural setup — no OB, FVG, or confirmed sweep present");
    }

    // ── SL directional validation — catch any remaining inversions ───────
    if ((isBullish && stopLoss >= entry) || (!isBullish && stopLoss <= entry)) {
      return noTradeResult(start,
        `Invalid stop loss: ${direction} entry ${entry.toFixed(1)} but SL ${stopLoss.toFixed(1)} is on the wrong side — structural levels are inconsistent`
      );
    }

    // ── SL validation ─────────────────────────────────────────────────────
    const riskDist = Math.abs(entry - stopLoss);

    if (riskDist === 0) {
      return noTradeResult(start, "Invalid setup: entry equals stop loss");
    }

    const slInRange = isSLInRange(riskDist, timeframe, symbol, current);

    if (!slInRange) {
      const limitMsg = GOLD_SYMS.has(symbol)
        ? `Gold ${timeframe} SL limit is ${GOLD_SL_LIMITS[timeframe]?.max ?? 20} pts max — got ${riskDist.toFixed(1)} pts`
        : `SL ${riskDist.toFixed(4)} exceeds ${((PCT_SL_MAX[timeframe] ?? 0.008) * 100).toFixed(1)}% max for ${timeframe}`;
      return waitResult(start, "B", `${limitMsg} — wait for tighter structure`);
    }

    // ── TP Levels ─────────────────────────────────────────────────────────
    // TP1 = 1.5R or nearest liquidity (scale 50%)
    // TP2 = 3.0R (A+ minimum target)
    // TP3 = 5.0R (H4 only, let 25% run)
    const tp2Distance = riskDist * 3.0;
    const tp3Distance = riskDist * 5.0;
    const tp1MaxDist  = riskDist * 2.0;

    let tp1: number;
    let tp2: number;
    let tp3: number | null = null;
    let tp1Zone: string;
    let tp3Zone = "N/A";

    if (isBullish) {
      const target    = keyLevels.liquidityTarget;
      const tgtDist   = target !== null ? target - entry : -1;
      const useTarget = target !== null && tgtDist > riskDist * 0.5 && tgtDist <= tp1MaxDist;
      tp1     = useTarget ? target : entry + riskDist * 1.5;
      const rawTp2 = entry + tp2Distance;
      tp2     = rawTp2 > tp1 ? rawTp2 : tp1 + riskDist * 1.5;
      tp1Zone = useTarget
        ? `First target ${tp1.toFixed(4)} — nearest resistance above`
        : `1.5R target ${tp1.toFixed(4)} — nearest structural resistance`;
      if (timeframe === "H4") {
        tp3 = entry + tp3Distance;
        tp3Zone = `5R extended target ${tp3.toFixed(1)} — macro liquidity above`;
      }
    } else {
      const target    = keyLevels.liquidityTarget;
      const tgtDist   = target !== null ? entry - target : -1;
      const useTarget = target !== null && tgtDist > riskDist * 0.5 && tgtDist <= tp1MaxDist;
      tp1     = useTarget ? target : entry - riskDist * 1.5;
      const rawTp2 = entry - tp2Distance;
      tp2     = rawTp2 < tp1 ? rawTp2 : tp1 - riskDist * 1.5;
      tp1Zone = useTarget
        ? `First target ${tp1.toFixed(4)} — nearest support below`
        : `1.5R target ${tp1.toFixed(4)} — nearest structural support`;
      if (timeframe === "H4") {
        tp3 = entry - tp3Distance;
        tp3Zone = `5R extended target ${tp3.toFixed(1)} — macro liquidity below`;
      }
    }

    entry    = roundToPrecision(entry,    current);
    stopLoss = roundToPrecision(stopLoss, current);
    tp1      = roundToPrecision(tp1,      current);
    tp2      = roundToPrecision(tp2,      current);
    if (tp3 !== null) tp3 = roundToPrecision(tp3, current);

    const risk    = Math.abs(entry - stopLoss);
    const reward  = Math.abs(tp2 - entry);
    const rrRatio = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : null;

    if (rrRatio === null) {
      return noTradeResult(start, "R:R calculation failed — zero risk distance");
    }

    // ── Confluence scoring ────────────────────────────────────────────────
    const factors         = scoreConfluence(snapshot, smc, news, isBullish, inKillzone);
    const passedFactors   = factors.filter(f => f.pass);
    const confluenceCount = passedFactors.length;
    const confluenceFactors = passedFactors.map(f => f.label);

    // ── Grade ─────────────────────────────────────────────────────────────
    const grade = gradeSetup(rrRatio, confluenceCount, slInRange, inKillzone, entryInStructure);

    // ── Grade filter ──────────────────────────────────────────────────────
    if (grade === "B+" || grade === "B") {
      const detail = grade === "B+"
        ? `R:R 1:${rrRatio} with ${confluenceCount}/10 confluence — needs stronger entry alignment`
        : `R:R 1:${rrRatio} with only ${confluenceCount}/10 confluence`;
      return waitResult(start, grade, detail);
    }
    if (grade === "C") {
      return noTradeResult(start, `R:R 1:${rrRatio} / ${confluenceCount}/10 confluence — setup rejected`);
    }

    // ── Trigger condition ─────────────────────────────────────────────────
    const p = entry > 100 ? 1 : 4;
    const triggerCondition =
      trigger === "OB retest"
        ? `Wait for price to return to ${entryZone}, then confirm with ${isBullish ? "bullish" : "bearish"} rejection candle (engulfing, pin bar, or strong close) on M5/M15 before entering`
        : trigger === "Structure Reversal"
          ? `${isBullish ? "Bullish" : "Bearish"} price action structure confirmed. Enter at ${entry.toFixed(p)} on confirmed ${isBullish ? "bullish" : "bearish"} M15 candle close. SL at ${stopLoss.toFixed(p)}.`
          : trigger === "Momentum Shift"
            ? `${isBullish ? "Bullish" : "Bearish"} momentum shift confirmed. Wait for ${isBullish ? "bullish" : "bearish"} M15 close to confirm direction, then enter at ${entry.toFixed(p)}. SL at ${stopLoss.toFixed(p)}.`
            : trigger === "Imbalance Fill"
              ? `Wait for price to fill into the imbalance zone ${entryZone}. Look for ${isBullish ? "bullish" : "bearish"} displacement candle to confirm reversal within the zone`
              : trigger === "BOS pullback"
                ? `Enter on first pullback after structure break. Confirm with ${isBullish ? "bullish" : "bearish"} momentum resumption on M15`
                : `Market order entry at ${current.toFixed(p)} with structural stop ${stopLoss.toFixed(p)}`;

    // ── Management notes ──────────────────────────────────────────────────
    const managementNotes: string[] = [
      `Scale out 50% at TP1 (${tp1.toFixed(p)}) — move SL to breakeven immediately after`,
      timeframe === "H4" && tp3 !== null
        ? `Trail 25% to TP3 (${tp3.toFixed(1)}) with trailing stop — let extended position run`
        : `Let remaining 50% run to TP2 (${tp2.toFixed(p)}) with trailing stop`,
      "Exit ALL if candle closes beyond SL level — no averaging into losing trades",
      "Do not re-enter same setup after SL hit — wait for next confirmed signal",
    ];

    if (session === "Asia")     managementNotes.push("Asia session entry — tighter targets, expect ranging until next major session opens");
    if (session === "London")   managementNotes.push("London session — highest-probability window, full position size valid");
    if (session === "New York") managementNotes.push("New York session — monitor prior session highs/lows as potential reversal areas before TP2");
    if (liquiditySweepDetected) managementNotes.push("Enter only on confirmed M15 candle close in the direction of the setup — do not enter mid-candle");
    if (smc.chochDetected && !liquiditySweepDetected) managementNotes.push("CHoCH detected — consider partial entry (50%) until full confirmation");
    if (news.riskScore > 60) managementNotes.push(`Elevated macro risk (${news.riskScore}/100) — reduce position size by 50%`);

    // ── Signal state — ARMED threshold tightened to 0.15% ─────────────────
    const distanceToEntry = Math.abs(current - entry) / entry * 100;
    const pricePastEntry  = isBullish ? current > entry : current < entry;

    let signalState: SignalState;
    let signalStateReason: string;

    if (pricePastEntry && distanceToEntry > 0.3) {
      signalState       = "EXPIRED";
      signalStateReason = `Price already moved ${distanceToEntry.toFixed(2)}% past entry zone. Do NOT chase — wait for the next setup.`;
    } else if (distanceToEntry <= 0.15) {
      signalState       = "ARMED";
      signalStateReason = `${grade} setup — price is ${distanceToEntry.toFixed(2)}% from entry. Confirm trigger and execute.`;
    } else if (distanceToEntry <= 1.0) {
      signalState       = "PENDING";
      signalStateReason = `Price is ${distanceToEntry.toFixed(2)}% from entry zone at ${entry.toFixed(p)}. Wait for price to return before entering.`;
    } else {
      signalState       = "PENDING";
      signalStateReason = `Price is ${distanceToEntry.toFixed(2)}% away from entry at ${entry.toFixed(p)}. Monitor — no action yet.`;
    }

    return {
      agentId: "execution",
      hasSetup: true,
      direction,
      entry,
      stopLoss,
      tp1,
      tp2,
      tp3,
      rrRatio,
      grade,
      confluenceCount,
      confluenceFactors,
      trigger,
      triggerCondition,
      managementNotes,
      entryZone,
      slZone,
      tp1Zone,
      tp3Zone,
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
      entry: null, stopLoss: null, tp1: null, tp2: null, tp3: null, rrRatio: null,
      grade: "C",
      confluenceCount: 0,
      confluenceFactors: [],
      trigger: "None",
      triggerCondition: "Execution planning failed",
      managementNotes: ["Fallback neutral execution"],
      entryZone: "No entry",
      slZone: "No SL",
      tp1Zone: "No TP",
      tp3Zone: "N/A",
      signalState: "NO_TRADE",
      signalStateReason: "Execution planning failed. Stand aside.",
      distanceToEntry: null,
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
