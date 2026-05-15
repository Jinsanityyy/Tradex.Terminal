/**
 * TradeX Signal History  -  Stats Aggregator
 *
 * Computes win rate, avg RR, total R, and per-symbol breakdowns.
 */

import type { SignalRecord, SignalStats } from "./types";
import type { Symbol } from "@/lib/agents/schemas";
import { getSignals } from "./storage";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function periodToMs(period: SignalStats["period"]): number | null {
  switch (period) {
    case "24h": return 24 * 60 * 60 * 1000;
    case "7d":  return 7  * 24 * 60 * 60 * 1000;
    case "30d": return 30 * 24 * 60 * 60 * 1000;
    case "all": return null;
  }
}

function isWin(r: SignalRecord): boolean {
  return r.status === "win_tp1" || r.status === "win_tp2";
}
function isLoss(r: SignalRecord): boolean {
  return r.status === "loss_sl";
}
function isBreakeven(r: SignalRecord): boolean {
  if (r.status !== "expired") return false;
  const r_val = r.outcome?.pnlR ?? 0;
  return Math.abs(r_val) < 0.3;
}
function isArmed(r: SignalRecord): boolean {
  return r.tradePlan !== null;
}
function isDirectional(r: SignalRecord): boolean {
  return r.finalBias !== "no-trade";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main compute
// ─────────────────────────────────────────────────────────────────────────────

export async function computeStats(
  symbol: Symbol | "ALL" = "ALL",
  period: SignalStats["period"] = "30d"
): Promise<SignalStats> {
  const periodMs = periodToMs(period);
  const sinceTimestamp = periodMs
    ? new Date(Date.now() - periodMs).toISOString()
    : undefined;

  const records = await getSignals({
    symbol: symbol === "ALL" ? undefined : symbol,
    sinceTimestamp,
  });

  const totalSignals = records.length;
  const directional = records.filter(isDirectional);
  const armed = records.filter(isArmed);
  const wins = records.filter(isWin);
  const losses = records.filter(isLoss);
  const breakeven = records.filter(isBreakeven);
  const stillOpen = records.filter(r => r.status === "open");

  const resolvedCount = wins.length + losses.length;
  const hitRate = resolvedCount > 0
    ? Math.round((wins.length / resolvedCount) * 1000) / 10
    : 0;

  // Avg RR  -  target RR of armed signals (what was planned)
  const armedWithRR = armed.filter(r => r.tradePlan !== null);
  const avgRR = armedWithRR.length > 0
    ? parseFloat(
        (armedWithRR.reduce((acc, r) => acc + (r.tradePlan!.rrRatio ?? 0), 0)
         / armedWithRR.length).toFixed(2)
      )
    : 0;

  // Total R  -  wins contribute +R (their pnlR), losses contribute -1R each
  const totalPnlR = parseFloat(
    (
      wins.reduce((acc, r) => acc + (r.outcome?.pnlR ?? 0), 0)
      + losses.reduce((acc, r) => acc + (r.outcome?.pnlR ?? -1), 0)
    ).toFixed(2)
  );

  // Per-symbol breakdown (only when viewing ALL)
  let bySymbol: SignalStats["bySymbol"] | undefined;
  if (symbol === "ALL") {
    bySymbol = {};
    for (const r of records) {
      const s = r.symbol;
      const cur = bySymbol[s] ?? { total: 0, wins: 0, losses: 0, hitRate: 0 };
      cur.total += 1;
      if (isWin(r))  cur.wins  += 1;
      if (isLoss(r)) cur.losses += 1;
      bySymbol[s] = cur;
    }
    // Compute hit rates
    for (const s of Object.keys(bySymbol)) {
      const { wins: w, losses: l } = bySymbol[s];
      const resolved = w + l;
      bySymbol[s].hitRate = resolved > 0
        ? Math.round((w / resolved) * 1000) / 10
        : 0;
    }
  }

  return {
    symbol,
    period,
    totalSignals,
    directionalSignals: directional.length,
    armedSignals: armed.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    stillOpen: stillOpen.length,
    hitRate,
    avgRR,
    totalPnlR,
    bySymbol,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent signals feed (for UI)
// ─────────────────────────────────────────────────────────────────────────────

export async function getRecentSignals(limit = 50): Promise<SignalRecord[]> {
  return getSignals({ limit });
}
