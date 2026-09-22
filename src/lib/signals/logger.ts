/**
 * TradeX Signal History  -  Logger
 *
 * Converts AgentRunResult into a SignalRecord and saves it.
 * Called by the orchestrator after each full agent run.
 */

import type { AgentRunResult } from "@/lib/agents/schemas";
import type { SignalRecord, SignalTradePlan } from "./types";
import { saveSignal, getOpenSignals, updateSignal } from "./storage";
import { notifyNewSignal } from "@/lib/push/notify";

const ALWAYS_OPEN_SYMBOLS = new Set(["BTCUSD"]);

function isForexMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay();
  if (day === 6) return false;
  if (day === 0 && now.getUTCHours() < 21) return false;
  return true;
}

/**
 * Build a stable, unique ID from agent run metadata.
 * Within the same minute, same symbol+timeframe produces the same ID  -  so
 * cache-hit re-renders don't create duplicate records.
 */
function buildId(result: AgentRunResult): string {
  const isNoTrade = result.agents.master.finalBias === "no-trade";
  const bucket = isNoTrade ? 30 : 1;
  const slot = Math.floor(new Date(result.timestamp).getTime() / (60_000 * bucket));
  const direction = result.agents.master.tradePlan?.direction ?? "none";
  return isNoTrade
    ? `${slot}_${result.symbol}_${result.timeframe}`
    : `${slot}_${result.symbol}_${result.timeframe}_${direction}`;
}

// 15-minute cooldown per symbol+timeframe+direction.
//
// This used to allow a new signal through whenever the entry moved more than
// 0.03% away. On gold at ~$3,700 that threshold is $1.11  -  a distance the
// market covers in seconds  -  so effectively every cron tick minted a fresh
// "new setup". Those all stayed open in parallel and later resolved in the same
// tracker run, firing one push each (the TP/SL alert storm).
//
// The cooldown is now the rule, not the exception: inside the window a
// same-direction setup on the same symbol+timeframe is simply a repeat, however
// far the entry has drifted.
const ARMED_COOLDOWN_MS = 15 * 60 * 1000;

// Two signals pointing opposite ways at the same price is a contradiction, not
// two trades. Widened from 0.03% for the same reason as above.
const CONTRADICTION_ENTRY_PCT = 0.0025; // 0.25%

/**
 * Returns true when this armed signal is a repeat of one that is already open.
 *
 * Scoped to symbol + timeframe so an H1 and an H4 read can legitimately coexist;
 * only the same chart is deduplicated.
 */
async function isDuplicateArmedSignal(result: AgentRunResult): Promise<boolean> {
  const plan = result.agents.master.tradePlan;
  if (!plan) return false; // no-trade signals  -  don't dedup here

  try {
    const openSignals = await getOpenSignals();
    const now = Date.now();
    return openSignals.some(s => {
      if (s.symbol !== result.symbol) return false;
      if (s.timeframe !== result.timeframe) return false;
      if (!s.tradePlan) return false;
      const age = now - new Date(s.timestamp).getTime();
      if (age >= ARMED_COOLDOWN_MS) return false;
      // Same direction inside the cooldown is a repeat regardless of entry drift.
      if (s.tradePlan.direction === plan.direction) return true;
      // Opposite direction at effectively the same price is a contradiction.
      const entryDiff = Math.abs(s.tradePlan.entry - plan.entry) / plan.entry;
      return entryDiff < CONTRADICTION_ENTRY_PCT;
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
 * Exactly one armed setup stays live per symbol + timeframe.
 *
 * When a new directional signal fires, every other open setup on that same chart
 * is superseded  -  an opposite direction means the bias flipped, and a
 * same-direction one older than the cooldown has been replaced by a fresher
 * read. Previously only opposing signals were cleared, so same-direction setups
 * piled up and each one fired its own outcome alert when price finally moved.
 */
async function invalidateSupersededSignals(result: AgentRunResult, keepId: string): Promise<void> {
  const plan = result.agents.master.tradePlan;
  if (!plan) return;
  try {
    const open = await getOpenSignals();
    const superseded = open.filter(s =>
      s.id !== keepId &&
      s.symbol === result.symbol &&
      s.timeframe === result.timeframe &&
      s.tradePlan !== null
    );
    await Promise.all(superseded.map(s =>
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
    // non-critical  -  never block the main log flow
  }
}

/**
 * Log a signal from an AgentRunResult.
 * Idempotent  -  same run logged twice within the same minute is deduplicated.
 * Returns the saved record, or null if logging failed (never throws).
 */
export async function logSignal(result: AgentRunResult): Promise<SignalRecord | null> {
  try {
    const master = result.agents.master;
    const snapshot = result.snapshot;

    // Don't log directional signals without a trade plan  -  no entry/SL/TP = nothing actionable.
    // These occur when execution agent has no valid setup (e.g. wrong session, no structure).
    // Only informational no-trade signals are allowed without a trade plan.
    if (master.finalBias !== "no-trade" && !master.tradePlan) {
      return null;
    }

    // Skip if an open armed signal with the exact same entry/SL/TP already exists.
    if (await isDuplicateArmedSignal(result)) {
      return null;
    }

    // Don't log armed signals when the market is closed — stale weekend prices
    // produce junk setups that get immediately mis-resolved by the tracker.
    const hasArmedPlan = master.finalBias !== "no-trade" && !!master.tradePlan;
    if (hasArmedPlan && !ALWAYS_OPEN_SYMBOLS.has(result.symbol) && !isForexMarketOpen()) {
      return null;
    }

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

    if (saved && record.tradePlan) {
      await invalidateSupersededSignals(result, saved.id);
      void notifyNewSignal(saved).catch(() => {});
    }

    return saved;
  } catch (err) {
    console.warn("[signal-logger] Failed to log signal:", err);
    return null;
  }
}
