/**
 * TradeX Signal History — Logger
 *
 * Converts AgentRunResult into a SignalRecord and saves it.
 * Called by the orchestrator after each full agent run.
 */

import type { AgentRunResult } from "@/lib/agents/schemas";
import type { SignalRecord, SignalTradePlan } from "./types";
import { saveSignal, getOpenSignals } from "./storage";

/**
 * Build a stable, unique ID from agent run metadata.
 * Within the same minute, same symbol+timeframe produces the same ID — so
 * cache-hit re-renders don't create duplicate records.
 */
function buildId(result: AgentRunResult): string {
  const isNoTrade = result.agents.master.finalBias === "no-trade";
  // No-trade signals: bucket into 30-min windows to avoid spamming identical INFO rows
  const bucket = isNoTrade ? 30 : 1;
  const slot = Math.floor(new Date(result.timestamp).getTime() / (60_000 * bucket));
  return `${slot}_${result.symbol}_${result.timeframe}`;
}

/**
 * Returns true if an identical armed signal is already OPEN for this symbol.
 * Prevents the same entry/SL/TP from being logged on every hourly agent run.
 */
async function isDuplicateArmedSignal(result: AgentRunResult): Promise<boolean> {
  const plan = result.agents.master.tradePlan;
  if (!plan) return false; // no-trade signals — don't dedup here

  try {
    const openSignals = await getOpenSignals();
    return openSignals.some(s =>
      s.symbol === result.symbol &&
      s.tradePlan !== null &&
      s.tradePlan.entry     === plan.entry &&
      s.tradePlan.stopLoss  === plan.stopLoss &&
      s.tradePlan.tp1       === plan.tp1
    );
  } catch {
    return false;
  }
}

/**
 * Convert the master agent's tradePlan into the storage-friendly shape.
 */
function extractTradePlan(result: AgentRunResult): SignalTradePlan | null {
  const plan = result.agents.master.tradePlan;
  if (!plan) return null;
  return {
    direction: plan.direction,
    entry:     plan.entry,
    stopLoss:  plan.stopLoss,
    tp1:       plan.tp1,
    tp2:       plan.tp2,
    rrRatio:   plan.rrRatio,
  };
}

/**
 * Log a signal from an AgentRunResult.
 * Idempotent — same run logged twice within the same minute is deduplicated.
 * Returns the saved record, or null if logging failed (never throws).
 */
export async function logSignal(result: AgentRunResult): Promise<SignalRecord | null> {
  try {
    // Skip if an open armed signal with the exact same entry/SL/TP already exists.
    if (await isDuplicateArmedSignal(result)) {
      return null;
    }

    const master = result.agents.master;
    const snapshot = result.snapshot;

    const record: SignalRecord = {
      id: buildId(result),
      timestamp: result.timestamp,
      symbol: result.symbol,
      symbolDisplay: result.symbolDisplay,
      timeframe: result.timeframe,

      finalBias: master.finalBias,
      confidence: master.confidence,
      consensusScore: master.consensusScore,
      strategyMatch: master.strategyMatch ?? null,
      noTradeReason: master.noTradeReason ?? null,

      priceAtSignal: snapshot.price.current,

      tradePlan: extractTradePlan(result),

      status: master.finalBias === "no-trade" ? "informational" : "open",
      outcome: null,

      supports: master.supports ?? [],
      invalidations: master.invalidations ?? [],

      agents: {
        trend: {
          bias: result.agents.trend.bias,
          confidence: result.agents.trend.confidence,
        },
        smc: {
          bias: result.agents.smc.bias,
          confidence: result.agents.smc.confidence,
          setupType: result.agents.smc.setupType,
        },
        news: {
          impact: result.agents.news.impact,
          confidence: result.agents.news.confidence,
          regime: result.agents.news.regime,
        },
        risk: {
          valid: result.agents.risk.valid,
          grade: result.agents.risk.grade,
        },
        execution: {
          hasSetup: result.agents.execution.hasSetup,
          direction: result.agents.execution.direction,
        },
        contrarian: {
          challengesBias: result.agents.contrarian.challengesBias,
          riskFactor: result.agents.contrarian.riskFactor,
        },
      },
    };

    return await saveSignal(record);
  } catch (err) {
    console.warn("[signal-logger] Failed to log signal:", err);
    return null;
  }
}
