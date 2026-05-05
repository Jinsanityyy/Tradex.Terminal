/**
 * TradeX Signal History — Logger
 *
 * Converts AgentRunResult into a SignalRecord and saves it.
 * Called by the orchestrator after each full agent run.
 */

import type { AgentRunResult } from "@/lib/agents/schemas";
import type { SignalRecord, SignalTradePlan } from "./types";
import { saveSignal, getOpenSignals, updateSignal } from "./storage";

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

// 60-minute cooldown per symbol+direction — prevents cron from logging a new
// signal every 5 min when entry price drifts slightly but the setup is the same.
const ARMED_COOLDOWN_MS = 60 * 60 * 1000;

/**
 * Returns true if a same-direction armed signal for this symbol was already
 * logged within the last 60 minutes. This stops near-identical BOS/OB/FVG
 * setups from flooding history every time the cron ticks and price shifts slightly.
 */
async function isDuplicateArmedSignal(result: AgentRunResult): Promise<boolean> {
  const plan = result.agents.master.tradePlan;
  if (!plan) return false; // no-trade signals — don't dedup here

  try {
    const openSignals = await getOpenSignals();
    const now = Date.now();
    return openSignals.some(s => {
      if (s.symbol !== result.symbol) return false;
      if (!s.tradePlan) return false;
      if (s.tradePlan.direction !== plan.direction) return false;
      const age = now - new Date(s.timestamp).getTime();
      return age < ARMED_COOLDOWN_MS;
    });
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
 * When a new directional signal fires, mark any open signals in the opposite
 * direction for the same symbol as invalidated (bias has flipped).
 */
async function invalidateOpposingSignals(result: AgentRunResult): Promise<void> {
  const plan = result.agents.master.tradePlan;
  if (!plan) return;
  try {
    const open = await getOpenSignals();
    const opposing = open.filter(s =>
      s.symbol === result.symbol &&
      s.tradePlan !== null &&
      s.tradePlan.direction !== plan.direction
    );
    await Promise.all(opposing.map(s =>
      updateSignal(s.id, {
        status: "invalidated",
        outcome: {
          resolvedAt: new Date().toISOString(),
          priceAtResolution: result.snapshot.price.current,
          pnlPercent: 0,
          pnlR: 0,
        },
      })
    ));
  } catch {
    // non-critical — never block the main log flow
  }
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

    const saved = await saveSignal(record);

    // If this is a new directional armed signal, close out any open signals
    // in the opposite direction — the bias has flipped, those setups are gone.
    if (saved && record.tradePlan) {
      await invalidateOpposingSignals(result);
    }

    return saved;
  } catch (err) {
    console.warn("[signal-logger] Failed to log signal:", err);
    return null;
  }
}
