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
  const noPlan    = !result.agents.master.tradePlan;
  // Informational signals (no-trade or directional-but-no-plan): 30-min buckets
  // to avoid spamming identical INFO rows on every home refresh.
  const bucket = (isNoTrade || noPlan) ? 30 : 1;
  const slot = Math.floor(new Date(result.timestamp).getTime() / (60_000 * bucket));
  return `${slot}_${result.symbol}_${result.timeframe}`;
}

// 4-hour cooldown per symbol+direction+entry zone — prevents re-logging the same
// setup across multiple home refreshes within the same trading session.
// A different entry (> 0.15% away = ~$7 on gold) is treated as a new setup.
const ARMED_COOLDOWN_MS = 4 * 60 * 60 * 1000;
const ARMED_ENTRY_TOLERANCE = 0.0015; // 0.15% (~$7 on $4500 gold)

/**
 * Returns true if a same-direction armed signal for this symbol was already
 * logged within the last 60 minutes. This stops near-identical BOS/OB/FVG
 * setups from flooding history every time the cron ticks and price shifts slightly.
 */
async function isDuplicateArmedSignal(result: AgentRunResult): Promise<boolean> {
  const plan = result.agents.master.tradePlan;
  if (!plan) return false; // no-trade signals  -  don't dedup here

  try {
    const openSignals = await getOpenSignals();
    const now = Date.now();
    return openSignals.some(s => {
      if (s.symbol !== result.symbol) return false;
      if (!s.tradePlan) return false;
      if (s.tradePlan.direction !== plan.direction) return false;
      const age = now - new Date(s.timestamp).getTime();
      if (age >= ARMED_COOLDOWN_MS) return false;
      // Only suppress if entry price is within 0.03% (~1.5 pips on XAU)
      // Anything further apart is a genuinely different setup and must be logged.
      const entryDiff = Math.abs(s.tradePlan.entry - plan.entry) / plan.entry;
      return entryDiff < ARMED_ENTRY_TOLERANCE;
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
    // non-critical  -  never block the main log flow
  }
}

/**
 * When there's no valid setup, mark any open armed signals for this symbol as
 * "expired" if they're more than 1 hour old and price has drifted > 0.5% away
 * from their entry. Prevents stale open signals from showing forever on home.
 */
async function closeStaleOpenSignals(symbol: string, currentPrice: number): Promise<void> {
  try {
    const open = await getOpenSignals();
    const stale = open.filter(s => {
      if (s.symbol !== symbol || !s.tradePlan) return false;
      const ageMs = Date.now() - new Date(s.timestamp).getTime();
      if (ageMs < 60 * 60 * 1000) return false; // < 1 hour: give it time
      const drift = Math.abs(currentPrice - s.tradePlan.entry) / s.tradePlan.entry;
      return drift > 0.005; // price moved > 0.5% from entry = setup no longer valid
    });
    await Promise.all(stale.map(s =>
      updateSignal(s.id, {
        status: "expired",
        outcome: {
          resolvedAt: new Date().toISOString(),
          priceAtResolution: currentPrice,
          pnlPercent: 0,
          pnlR: 0,
        },
      })
    ));
  } catch {
    // non-critical
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

    // Skip if an open armed signal with the exact same entry/SL/TP already exists.
    if (await isDuplicateArmedSignal(result)) {
      return null;
    }

    // Don't log armed signals for instruments whose market is closed.
    // Agent data during weekends is stale (last Friday prices) and would
    // generate false setups that get immediately mis-resolved by the tracker.
    const hasArmedPlan = master.finalBias !== "no-trade" && !!master.tradePlan;
    if (hasArmedPlan && !ALWAYS_OPEN_SYMBOLS.has(result.symbol) && !isForexMarketOpen()) {
      return null;
    }

    // Directional bias but no trade plan = execution agent found no clean entry (B/B+/C grade).
    // Treat as informational so the home screen shows "NO TRADE" instead of keeping the old
    // expired signal visible.
    const hasActionablePlan = master.finalBias !== "no-trade" && !!master.tradePlan;
    const isInformational   = !hasActionablePlan;

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
      noTradeReason: master.noTradeReason ?? (isInformational && master.finalBias !== "no-trade"
        ? "No valid entry setup — bias detected but execution grade too low"
        : null),

      priceAtSignal: snapshot.price.current,

      tradePlan: extractTradePlan(result),

      status: isInformational ? "informational" : "open",
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
      // Armed signal: close opposing open signals (bias flip) + push notify
      await invalidateOpposingSignals(result);
      void notifyNewSignal(saved).catch(() => {});
    } else if (saved && isInformational) {
      // No-trade / no-plan: close any stale same-symbol open signals so they don't
      // stay "open" forever on the home screen when there's no longer a valid setup.
      void closeStaleOpenSignals(result.symbol, snapshot.price.current).catch(() => {});
    }

    return saved;
  } catch (err) {
    console.warn("[signal-logger] Failed to log signal:", err);
    return null;
  }
}
