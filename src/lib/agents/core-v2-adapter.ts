/**
 * Turns a Session Liquidity (v2) read into the agent outputs the app already
 * renders, so switching AGENT_CORE changes the decision and nothing else.
 * Every sentence here describes the market; none tells anyone to trade.
 */

import type {
  MarketSnapshot, SMCAgentOutput, ExecutionAgentOutput, NewsAgentOutput, SignalState,
} from "./schemas";
import type { V2Result, V2Setup } from "./core-v2";

const fmt = (n: number) => (n > 100 ? n.toFixed(2) : n.toFixed(5));
const hhmm = (t: number) =>
  new Date(t * 1000).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false }) + " ET";

function live(s: V2Setup | null): boolean {
  return !!s && (s.state === "pending" || s.state === "active");
}

export function v2ToSmcOutput(v2: V2Result, snapshot: MarketSnapshot, started: number): SMCAgentOutput {
  const s = v2.setup;
  const active = live(s);
  const reasons: string[] = [];
  reasons.push(
    v2.bias === "neutral"
      ? "No trend bias on the hourly chart, so the session model has no side to trade"
      : `Bias ${v2.bias} from ${v2.biasSource === "H1 EMA" ? "the hourly trend (EMA20 vs EMA50)" : "the previous day's candle"}`,
  );
  if (s) {
    reasons.push(`${s.level} (${fmt(s.levelPrice)}) swept in the ${s.killZone} kill zone at ${hhmm(s.sweepTs)}, closed back inside`);
    reasons.push(`Structure broke ${s.direction === "long" ? "up" : "down"} through ${fmt(s.bosRef)} at ${hhmm(s.bosTs)}`);
    reasons.push(`Imbalance ${fmt(s.fvgLow)}–${fmt(s.fvgHigh)}, midpoint ${fmt(s.entry)}`);
    if (!active) reasons.push(s.state === "expired" ? "Price left without returning to the imbalance — setup expired" : `Setup already resolved at ${s.outcome === "tp1" ? "TP1" : "the stop"}`);
  } else {
    reasons.push(v2.note);
  }

  return {
    agentId: "smc",
    bias: v2.bias,
    confidence: active ? 75 : v2.bias === "neutral" ? 30 : 45,
    setupType: s ? "FVG" : "None",
    setupPresent: active,
    keyLevels: {
      orderBlockHigh: null, orderBlockLow: null,
      fvgHigh: s?.fvgHigh ?? null, fvgLow: s?.fvgLow ?? null, fvgMid: s?.entry ?? null,
      liquidityTarget: s?.tp1 ?? null, sweepLevel: s?.levelPrice ?? null,
      premiumZoneTop: null, discountZoneBottom: null,
    },
    premiumDiscount: snapshot.structure.zone,
    liquiditySweepDetected: !!s,
    bosDetected: !!s,
    chochDetected: false,
    reasons: reasons.slice(0, 5),
    invalidationLevel: s?.stopLoss ?? null,
    processingTime: Date.now() - started,
  };
}

function blank(state: SignalState, reason: string, started: number): ExecutionAgentOutput {
  return {
    agentId: "execution",
    hasSetup: false, direction: "none",
    entry: null, stopLoss: null, tp1: null, tp2: null, tp3: null, rrRatio: null,
    grade: "C", confluenceCount: 0, confluenceFactors: [],
    trigger: "None",
    triggerCondition: reason,
    managementNotes: [],
    entryZone: "—", slZone: "—", tp1Zone: "—", tp3Zone: "N/A",
    signalState: state, signalStateReason: reason,
    distanceToEntry: null,
    processingTime: Date.now() - started,
  };
}

export function v2ToExecutionOutput(
  v2: V2Result, snapshot: MarketSnapshot, news: NewsAgentOutput, started: number,
): ExecutionAgentOutput {
  const s = v2.setup;
  if (!s) return blank(v2.bias === "neutral" ? "NO_TRADE" : "WAIT", v2.note, started);
  if (s.state === "expired") return blank("EXPIRED", "Price left without returning to the imbalance. The setup expired.", started);
  if (s.state === "done") return blank("NO_TRADE", `Today's setup already resolved at ${s.outcome === "tp1" ? "TP1" : "the stop"}.`, started);

  // Same macro-risk gate as the classic core.
  const gold = snapshot.symbol === "XAUUSD" || snapshot.symbol === "XAGUSD" || snapshot.symbol === "XPTUSD";
  if (gold ? news.riskScore > 95 && news.impact !== "bullish" : news.riskScore > 85) {
    return blank("NO_TRADE", `Macro risk elevated (${news.riskScore}/100). Setup on hold until it clears.`, started);
  }

  const current = snapshot.price.current;
  const distance = Math.abs(current - s.entry) / s.entry * 100;
  const long = s.direction === "long";
  let state: SignalState;
  let reason: string;
  if (s.state === "active") {
    state = "ARMED";
    reason = `Price traded into the imbalance at ${fmt(s.entry)}. Levels are live.`;
  } else if (distance <= 0.25) {
    state = "ARMED";
    reason = `Price is at the imbalance (${distance.toFixed(2)}% from ${fmt(s.entry)}).`;
  } else {
    state = "PENDING";
    reason = `Price is ${distance.toFixed(2)}% from the imbalance midpoint at ${fmt(s.entry)}.`;
  }

  const factors = [
    `${v2.bias} bias (${v2.biasSource})`,
    `${s.level} swept in ${s.killZone} kill zone`,
    "Break of structure with displacement",
    "Fair value gap entry",
  ];

  return {
    agentId: "execution",
    hasSetup: true,
    direction: s.direction,
    entry: s.entry, stopLoss: s.stopLoss, tp1: s.tp1, tp2: s.tp2, tp3: null,
    rrRatio: parseFloat((Math.abs(s.tp1 - s.entry) / s.risk).toFixed(2)),
    grade: s.killZone === "New York" ? "A+" : "A",
    confluenceCount: factors.length,
    confluenceFactors: factors,
    trigger: "Sweep + BOS + FVG",
    triggerCondition: `${s.level} swept, structure broke ${long ? "up" : "down"}, imbalance midpoint ${fmt(s.entry)}`,
    managementNotes: [
      `Stop sits beyond the sweep extreme at ${fmt(s.stopLoss)}`,
      `TP1 is 2R at ${fmt(s.tp1)}; TP2 is 3R at ${fmt(s.tp2)}`,
    ],
    entryZone: `Imbalance ${fmt(s.fvgLow)}–${fmt(s.fvgHigh)}, midpoint ${fmt(s.entry)}`,
    slZone: `Beyond the ${s.level} sweep extreme ${fmt(s.sweepExtreme)}`,
    tp1Zone: `2R at ${fmt(s.tp1)}`,
    tp3Zone: "N/A",
    signalState: state,
    signalStateReason: reason,
    distanceToEntry: parseFloat(distance.toFixed(2)),
    processingTime: Date.now() - started,
  };
}
