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

// ── SL Limits — Gold absolute (pts), others %-based ──────────────────────────────
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

// ── Helpers ─────────────────────────────────────────────────────────────────────────────

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

// ── Confluence Scoring — 10 factors ──────────────────────────────────────────────

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
    // Gold long: any elevated risk environment supports safe-haven bid
    // Gold short: requires explicit bearish macro (ceasefire, strong USD rally, etc.)
    ? (isBullish ? news.riskScore > 25 : news.impact === "bearish")
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
    // CHoCH is intentionally omitted here — in this codebase chochDetected === fvgDetected,
    // so counting it alongside the FVG factor would double-count the same signal.
    // The structural shift is already captured via bosDetected + fvgMid.
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

// ── Grade Calculation ──────────────────────────────────────────────────────────────────

function gradeSetup(
  rrRatio: number,
  confluenceCount: number,
  slInRange: boolean,
  inKillzone: boolean,
  entryInStructure: boolean,
): SetupGrade {
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

// ── Result constructors ─────────────────────────────────────────────────────────────────

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

// ── Main Export ─────────────────────────────────────────────────────────────────────────────

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

    // ── Killzone ────────────────────────────────────────────────────────────────
    // Both London and NY kill zones derived from snapshot.timestamp for consistency.
    // sessionHour from indicators is also derived from the same timestamp, but
    // using the Date object directly ensures minute-level precision for both windows.
    const snapDate   = new Date(snapshot.timestamp);
    const nowHourUTC = snapDate.getUTCHours();
    const nowMinUTC  = snapDate.getUTCMinutes();
    const inLondonKZ = session === "London" &&
      nowHourUTC >= LONDON_KZ.start && nowHourUTC < LONDON_KZ.end;
    const inNYKZ     = session === "New York" &&
      (nowHourUTC > NY_KZ.startHour || (nowHourUTC === NY_KZ.startHour && nowMinUTC >= NY_KZ.startMin)) &&
      (nowHourUTC < NY_KZ.endHour   || (nowHourUTC === NY_KZ.endHour   && nowMinUTC <  NY_KZ.endMin));
    const inKillzone = inLondonKZ || inNYKZ;

    // ── Major news check ─────────────────────────────────────────────────────────
    const riskBlocksExec = GOLD_SYMS.has(symbol)
      ? news.riskScore > 95 && news.impact !== "bullish"
      : news.riskScore > 80;
    if (riskBlocksExec) {
      return noTradeResult(start, `Elevated macro risk (${news.riskScore}/100) — stand aside until risk clears`);
    }

    // ── HTF bias check ──────────────────────────────────────────────────────────
    const sweepActive = smc.liquiditySweepDetected && smc.setupPresent && smc.bias !== "neutral";
    if (!sweepActive && (htfBias === "neutral" || htfConfidence < 45)) {
      return noTradeResult(start, "No directional bias confirmed — stand aside");
    }

    // ── Direction ─────────────────────────────────────────────────────────────────
    const { keyLevels, setupType, bosDetected, liquiditySweepDetected } = smc;
    const isBullish = (liquiditySweepDetected && smc.bias !== "neutral")
      ? smc.bias === "bullish"
      : htfBias === "bullish";
    const direction: TradeDirection = isBullish ? "long" : "short";
    const buf    = slBuffer(symbol);
    // For non-gold assets slBuffer returns 0, causing SL = entry on fallback paths — use 0.1% floor
    const minBuf = buf > 0 ? buf : Math.max(current * 0.001, 0.0001);

    // ── Entry / SL construction ───────────────────────────────────────────────────
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

      const obRange  = keyLevels.orderBlockHigh - keyLevels.orderBlockLow;
      const depthPct = obRange > 0
        ? (isBullish
            ? (current - keyLevels.orderBlockLow)  / obRange
            : (keyLevels.orderBlockHigh - current) / obRange)
        : 0;
      if (depthPct > 0.3) {
        // OB depth disqualifies this entry but the structure is still valid — B+ not B
        return waitResult(start, "B+", "Price >30% into OB — wait for a fresh OB test");
      }

    } else if (setupType === "FVG" && keyLevels.fvgMid !== null) {
      entry    = keyLevels.fvgMid;
      // Only use invalidationLevel if it's on the correct side
      const fvgInvLevel = smc.invalidationLevel;
      const fvgInvValid = fvgInvLevel !== null &&
        (isBullish ? fvgInvLevel < entry : fvgInvLevel > entry);
      if (fvgInvValid && fvgInvLevel !== null) {
        stopLoss = fvgInvLevel;
        slZone   = `Structural invalidation at ${fvgInvLevel.toFixed(4)} — close through negates setup`;
      } else if (isBullish) {
        const fvgFloor = keyLevels.fvgLow !== null && keyLevels.fvgLow < entry ? keyLevels.fvgLow : entry - minBuf * 2;
        stopLoss = fvgFloor - minBuf;
        slZone   = `Below FVG low ${fvgFloor.toFixed(4)} — structure must hold`;
      } else {
        const fvgCeil = keyLevels.fvgHigh !== null && keyLevels.fvgHigh > entry ? keyLevels.fvgHigh : entry + minBuf * 2;
        stopLoss = fvgCeil + minBuf;
        slZone   = `Above FVG high ${fvgCeil.toFixed(4)} — structure must hold`;
      }
      trigger  = liquiditySweepDetected ? "Structure Reversal" : "Imbalance Fill";
      entryZone = `${isBullish ? "Buy" : "Sell"} zone ${keyLevels.fvgMid.toFixed(4)} — price action imbalance area`;
      entryInStructure = true;

    } else if (setupType === "Sweep" && liquiditySweepDetected) {
      const sweepRef    = keyLevels.sweepLevel ?? (isBullish ? low : high);
      entry             = isBullish ? sweepRef * 1.001 : sweepRef * 0.999;
      const sweepInvLvl = smc.invalidationLevel;
      const sweepInvValid = sweepInvLvl !== null &&
        (isBullish ? sweepInvLvl < entry : sweepInvLvl > entry);
      stopLoss = sweepInvValid && sweepInvLvl !== null
        ? sweepInvLvl
        : isBullish ? sweepRef * 0.999 - buf : sweepRef * 1.001 + buf;
      trigger  = "Momentum Shift";
      entryZone = `${isBullish ? "Buy" : "Sell"} entry at key structural level ${entry.toFixed(4)}`;
      slZone   = sweepInvValid && sweepInvLvl !== null
        ? `Structural invalidation at ${sweepInvLvl.toFixed(4)} — thesis invalid on break`
        : `${isBullish ? "Below" : "Above"} key sweep level — structure must hold`;
      entryInStructure = false;

    } else if (bosDetected) {
      // Prefer a real structural level (FVG midpoint or sweep level) as the pullback entry.
      // Fall back to a 38.2% Fibonacci approximation of the day range only when no level is available.
      const structuralEntry =
        keyLevels.fvgMid ??
        (keyLevels.sweepLevel !== null
          ? (isBullish ? keyLevels.sweepLevel * 1.001 : keyLevels.sweepLevel * 0.999)
          : null);
      const pullback = dayRange * 0.382;
      entry    = structuralEntry ?? (isBullish ? current - pullback : current + pullback);
      stopLoss = isBullish ? entry - minBuf : entry + minBuf;
      trigger  = "BOS pullback";
      entryZone = structuralEntry
        ? `BOS pullback to structural level ${entry.toFixed(4)}`
        : `BOS pullback zone ~${entry.toFixed(4)} (38.2% fib estimate)`;
      slZone   = `${isBullish ? "Below" : "Above"} BOS origin — displacement candle ${isBullish ? "low" : "high"}`;
      entryInStructure = structuralEntry !== null;

    } else {
      return noTradeResult(start, "No valid structural setup — no OB, FVG, or confirmed sweep present");
    }

    // ── SL directional guard — catch any remaining inversions ─────────────────
    if ((isBullish && stopLoss >= entry) || (!isBullish && stopLoss <= entry)) {
      return noTradeResult(start,
        `Invalid stop loss: ${direction} entry ${entry.toFixed(1)} but SL ${stopLoss.toFixed(1)} is on wrong side — structural levels inconsistent`
      );
    }

    // ── SL validation ─────────────────────────────────────────────────────────────────
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

    // ── Round entry/SL before TP so all levels are on the same precision grid ──
    entry    = roundToPrecision(entry,    current);
    stopLoss = roundToPrecision(stopLoss, current);
    const riskDistRounded = Math.abs(entry - stopLoss);

    // ── TP Levels ─────────────────────────────────────────────────────────────────
    const tp2Distance = riskDistRounded * 3.0;
    const tp3Distance = riskDistRounded * 5.0;
    const tp1MaxDist  = riskDistRounded * 2.0;

    let tp1: number;
    let tp2: number;
    let tp3: number | null = null;
    let tp1Zone: string;
    let tp3Zone = "N/A";

    if (isBullish) {
      const target    = keyLevels.liquidityTarget;
      const tgtDist   = target !== null ? target - entry : -1;
      const useTarget = target !== null && tgtDist > riskDistRounded * 0.5 && tgtDist <= tp1MaxDist;
      tp1     = useTarget ? target : entry + riskDistRounded * 1.5;
      const rawTp2 = entry + tp2Distance;
      tp2     = rawTp2 > tp1 ? rawTp2 : tp1 + riskDistRounded * 1.5;
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
      const useTarget = target !== null && tgtDist > riskDistRounded * 0.5 && tgtDist <= tp1MaxDist;
      tp1     = useTarget ? target : entry - riskDistRounded * 1.5;
      const rawTp2 = entry - tp2Distance;
      tp2     = rawTp2 < tp1 ? rawTp2 : tp1 - riskDistRounded * 1.5;
      tp1Zone = useTarget
        ? `First target ${tp1.toFixed(4)} — nearest support below`
        : `1.5R target ${tp1.toFixed(4)} — nearest structural support`;
      if (timeframe === "H4") {
        tp3 = entry - tp3Distance;
        tp3Zone = `5R extended target ${tp3.toFixed(1)} — macro liquidity below`;
      }
    }

    // entry and stopLoss already rounded above; round TP levels to same grid
    tp1 = roundToPrecision(tp1, current);
    tp2 = roundToPrecision(tp2, current);
    if (tp3 !== null) tp3 = roundToPrecision(tp3, current);

    const reward  = Math.abs(tp2 - entry);
    const rrRatio = riskDistRounded > 0 ? parseFloat((reward / riskDistRounded).toFixed(2)) : null;

    if (rrRatio === null) {
      return noTradeResult(start, "R:R calculation failed — zero risk distance");
    }

    // ── Confluence scoring ──────────────────────────────────────────────────────────────
    const factors         = scoreConfluence(snapshot, smc, news, isBullish, inKillzone);
    const passedFactors   = factors.filter(f => f.pass);
    const confluenceCount = passedFactors.length;
    const confluenceFactors = passedFactors.map(f => f.label);

    // ── Grade ────────────────────────────────────────────────────────────────────────
    const grade = gradeSetup(rrRatio, confluenceCount, slInRange, inKillzone, entryInStructure);

    // ── Grade filter ──────────────────────────────────────────────────────────────────
    if (grade === "B+" || grade === "B") {
      const detail = grade === "B+"
        ? `R:R 1:${rrRatio} with ${confluenceCount}/10 confluence — needs stronger entry alignment`
        : `R:R 1:${rrRatio} with only ${confluenceCount}/10 confluence`;
      return waitResult(start, grade, detail);
    }
    if (grade === "C") {
      return noTradeResult(start, `R:R 1:${rrRatio} / ${confluenceCount}/10 confluence — setup rejected`);
    }

    // ── Trigger condition ──────────────────────────────────────────────────────────────
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

    // ── Management notes ──────────────────────────────────────────────────────────────
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
