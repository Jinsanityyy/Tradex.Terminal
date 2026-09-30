/**
 * Turns the TradeX Trend setup (the same one the chart draws) into the execution
 * output the app already renders, and decides how the other agents confirm or veto it.
 * Every sentence describes the market; none tells anyone to trade.
 */

import type {
  ExecutionAgentOutput, MarketSnapshot, NewsAgentOutput, RiskAgentOutput, SignalState, FinalBias,
} from "./schemas";
import type { TrendSnapshot, TradeRecord } from "@/lib/tradexTrend";
import { FACTOR_NAMES } from "@/lib/tradexTrend";

const fmt = (n: number) => (n > 100 ? n.toFixed(2) : n.toFixed(5));

/** A live setup stays live while price is within this many R of the entry. */
export const LIVE_WITHIN_R = 0.5;

function blank(state: SignalState, reason: string, started: number, last?: TradeRecord | null): ExecutionAgentOutput {
  const lv = last
    ? { entry: last.entry, stopLoss: last.sl, tp1: last.tp1, tp2: last.tp2, tp3: last.tp3 }
    : { entry: null, stopLoss: null, tp1: null, tp2: null, tp3: null };
  return {
    agentId: "execution",
    source: "tradex-trend",
    hasSetup: false, direction: last ? (last.side === "BUY" ? "long" : "short") : "none",
    ...lv, rrRatio: null,
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

export function tradexToExecutionOutput(
  tx: TrendSnapshot, snapshot: MarketSnapshot, news: NewsAgentOutput, started: number,
): ExecutionAgentOutput {
  const latest = tx.latest;
  const t = latest?.trade ?? null;
  if (!latest || !t) return blank("WAIT", "No TradeX Trend flip on this timeframe yet.", started);

  const closedWhy =
    t.outcome === "WIN" ? "TP1 was reached"
    : t.outcome === "LOSS" ? "the stop was hit"
    : "an opposite signal replaced it";
  if (t.outcome !== "OPEN") {
    return blank("EXPIRED", `The last TradeX Trend setup is closed: ${closedWhy}. Waiting for the next flip.`, started, t);
  }

  const gold = snapshot.symbol === "XAUUSD" || snapshot.symbol === "XAGUSD" || snapshot.symbol === "XPTUSD";
  if (gold ? news.riskScore > 95 && news.impact !== "bullish" : news.riskScore > 85) {
    return blank("NO_TRADE", `Macro risk elevated (${news.riskScore}/100). Setup on hold until it clears.`, started, t);
  }

  // Price from the same candle series the setup came from (the agent quote can be a
  // different instrument, e.g. gold futures against spot candles).
  const price = latest.close;
  const away = Math.abs(price - t.entry) / t.r;
  const distancePct = Math.abs(price - t.entry) / t.entry * 100;
  const long = t.side === "BUY";
  if (away > LIVE_WITHIN_R) {
    return blank(
      "EXPIRED",
      `Price is ${away.toFixed(1)}R from the entry ${fmt(t.entry)}; the entry is behind it. Levels shown for reference.`,
      started, t,
    );
  }

  const factors: string[] = [];
  t.factors.forEach((on, i) => { if (on) factors.push(FACTOR_NAMES[i]); });
  const grade = t.grade === "A" ? "A" : t.grade === "B" ? "B" : "C";
  return {
    agentId: "execution",
    source: "tradex-trend",
    hasSetup: true,
    direction: long ? "long" : "short",
    entry: t.entry, stopLoss: t.sl, tp1: t.tp1, tp2: t.tp2, tp3: t.tp3,
    // Blended R:R of a 50% exit at TP1 (1R) and 50% at TP2 (2R), as the risk gate expects.
    rrRatio: 1.5,
    grade,
    confluenceCount: t.score,
    confluenceFactors: factors,
    trigger: t.smart ? "TradeX Trend flip (+Smart)" : "TradeX Trend flip",
    triggerCondition: `SuperTrend flipped ${long ? "up" : "down"} on the closed candle; entry ${fmt(t.entry)}, stop 1.5 ATR away`,
    managementNotes: [
      `Stop at ${fmt(t.sl)} (1.5 ATR). TP1 ${fmt(t.tp1)} = 1R, TP2 ${fmt(t.tp2)} = 2R, TP3 ${fmt(t.tp3)} = 3R`,
      `Setup score ${t.score}/5 (grade ${t.grade}). Experimental rule: check the win rate and sample size before relying on it`,
    ],
    entryZone: `Signal candle close ${fmt(t.entry)}`,
    slZone: `1.5 ATR ${long ? "below" : "above"} the entry, ${fmt(t.sl)}`,
    tp1Zone: `1R at ${fmt(t.tp1)}`,
    tp3Zone: `3R at ${fmt(t.tp3)}`,
    signalState: "ARMED",
    signalStateReason: `TradeX Trend setup is live: price is within ${LIVE_WITHIN_R}R of the entry ${fmt(t.entry)}.`,
    distanceToEntry: parseFloat(distancePct.toFixed(2)),
    processingTime: Date.now() - started,
  };
}

export interface TradexVerdict {
  go: boolean;
  bias: "bullish" | "bearish" | "no-trade";
  confidence: number;
  /** How the other agents' consensus relates to the TradeX setup. */
  stance: "confirmed" | "neutral" | "vetoed" | "none";
  reason?: string;
}

/**
 * The TradeX Trend setup proposes; the other agents confirm or veto.
 *  - consensus on the same side: confirmed
 *  - consensus neutral / no-trade: the setup stands with lower confidence
 *  - consensus on the opposite side: vetoed (no trade)
 * Confidence stays modest: the rule's own track record is in the widget.
 */
export function tradexVerdict(
  execution: ExecutionAgentOutput, risk: RiskAgentOutput, consensusBias: FinalBias,
): TradexVerdict {
  const live = execution.hasSetup && execution.entry !== null && execution.stopLoss !== null && execution.tp1 !== null;
  if (!live) {
    return { go: false, bias: "no-trade", confidence: 30, stance: "none", reason: execution.signalStateReason };
  }
  const setupBias = execution.direction === "long" ? "bullish" : "bearish";
  if (!risk.valid) {
    return { go: false, bias: "no-trade", confidence: 35, stance: "none", reason: `Risk check failed: ${risk.warnings[0] ?? "conditions outside limits"}` };
  }
  if (consensusBias !== "no-trade" && consensusBias !== setupBias) {
    return {
      go: false, bias: "no-trade", confidence: 40, stance: "vetoed",
      reason: `The other agents lean ${consensusBias} against the ${setupBias} TradeX Trend setup, so it is on hold.`,
    };
  }
  const gradeBoost = execution.grade === "A" ? 5 : 0;
  if (consensusBias === setupBias) {
    return { go: true, bias: setupBias, confidence: 65 + gradeBoost, stance: "confirmed" };
  }
  return { go: true, bias: setupBias, confidence: 50 + gradeBoost, stance: "neutral" };
}
