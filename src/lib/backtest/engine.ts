/**
 * TradeX Backtest Engine  -  walk-forward simulation
 *
 * For each M15 bar (after 200-bar warmup):
 *   1. Build a MarketSnapshot from the candle window
 *   2. Run all 6 rule-based agents (no LLM calls)
 *   3. If the master says bullish/bearish AND risk is valid AND grade >= B:
 *      - Arm a trade with entry/SL/TP from the execution agent
 *      - Walk forward to find first TP1 or SL hit
 *   4. Record the trade result
 *
 * Produces BacktestReport with stats, equity curve, and per-session/grade breakdown.
 */

import type {
  Symbol, Timeframe,
  TrendAgentOutput, SMCAgentOutput, NewsAgentOutput,
  RiskAgentOutput, ExecutionAgentOutput, ContrarianAgentOutput,
  MasterDecisionOutput,
} from "@/lib/agents/schemas";
import { DEFAULT_WEIGHTS } from "@/lib/agents/schemas";
import { runTrendAgent }      from "@/lib/agents/trend-agent";
import { runPriceActionAgent } from "@/lib/agents/price-action-agent";
import { runNewsAgent }        from "@/lib/agents/news-agent";
import { runRiskAgent }        from "@/lib/agents/risk-agent";
import { runExecutionAgent }   from "@/lib/agents/execution-agent";
import { runContrarianAgent }  from "@/lib/agents/contrarian-agent";
import { runMasterAgent }      from "@/lib/agents/master-agent";
import { precompute, buildHistoricalSnapshot } from "./snapshot-builder";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BacktestCandle {
  t: number; // Unix seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export type TradeResult = "win" | "loss" | "be" | "open";

export interface BacktestTrade {
  openTime:    string;   // ISO timestamp of entry bar
  closeTime:   string;   // ISO timestamp of exit bar (or last bar if still open)
  direction:   "long" | "short";
  entry:       number;
  stopLoss:    number;
  tp1:         number;
  rrRatio:     number;
  grade:       string;
  setupType:   string;
  session:     string;
  result:      TradeResult;
  rMultiple:   number;   // -1 = full loss, +1 = TP1, +2.5 = TP2, etc.
  barsToClose: number;
}

export interface BacktestReport {
  symbol:         Symbol;
  timeframe:      Timeframe;
  startDate:      string;
  endDate:        string;
  totalBars:      number;
  totalTrades:    number;
  wins:           number;
  losses:         number;
  breakevens:     number;
  winRate:        number;    // 0–100
  profitFactor:   number;
  netR:           number;    // net R-multiples
  maxDrawdownR:   number;
  avgRPerTrade:   number;
  byGrade:        Record<string, { trades: number; wins: number; netR: number }>;
  bySession:      Record<string, { trades: number; wins: number; netR: number }>;
  bySetup:        Record<string, { trades: number; wins: number; netR: number }>;
  equityCurve:    { time: string; equity: number }[];
  trades:         BacktestTrade[];
  skippedBars:    number;   // bars where agents errored or no signal
}

// ─────────────────────────────────────────────────────────────────────────────
// Trade resolution  -  walk forward to find TP/SL
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BARS_FORWARD = 96; // max 24h forward on M15

function resolveTrade(
  candles: BacktestCandle[],
  entryIdx: number,
  direction: "long" | "short",
  entry: number,
  sl: number,
  tp1: number,
  tp2: number | null,
): { result: TradeResult; rMultiple: number; barsToClose: number; closeTime: string } {
  const slDist = Math.abs(entry - sl);
  if (slDist <= 0) {
    return { result: "be", rMultiple: 0, barsToClose: 0, closeTime: new Date(candles[entryIdx].t * 1000).toISOString() };
  }

  for (let i = entryIdx + 1; i < candles.length && i <= entryIdx + MAX_BARS_FORWARD; i++) {
    const bar = candles[i];
    const closeTime = new Date(bar.t * 1000).toISOString();
    const bars = i - entryIdx;

    if (direction === "long") {
      // Check SL first (worse case on same bar)
      if (bar.l <= sl) return { result: "loss", rMultiple: -1, barsToClose: bars, closeTime };
      if (tp2 !== null && bar.h >= tp2) return { result: "win", rMultiple: 2.5, barsToClose: bars, closeTime };
      if (bar.h >= tp1) return { result: "win", rMultiple: 1, barsToClose: bars, closeTime };
    } else {
      if (bar.h >= sl) return { result: "loss", rMultiple: -1, barsToClose: bars, closeTime };
      if (tp2 !== null && bar.l <= tp2) return { result: "win", rMultiple: 2.5, barsToClose: bars, closeTime };
      if (bar.l <= tp1) return { result: "win", rMultiple: 1, barsToClose: bars, closeTime };
    }
  }

  // Expired: mark open at last bar
  const lastIdx = Math.min(candles.length - 1, entryIdx + MAX_BARS_FORWARD);
  return {
    result: "open",
    rMultiple: 0,
    barsToClose: lastIdx - entryIdx,
    closeTime: new Date(candles[lastIdx].t * 1000).toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main engine
// ─────────────────────────────────────────────────────────────────────────────

export async function runBacktest(
  symbol: Symbol,
  timeframe: Timeframe,
  candles: BacktestCandle[],
  onProgress?: (done: number, total: number) => void,
): Promise<BacktestReport> {
  const WARMUP = 200; // need enough bars for EMA(200) + RSI(14) + MACD(26+9)
  const series = precompute(candles);

  const trades:         BacktestTrade[] = [];
  const equityCurve:    { time: string; equity: number }[] = [{ time: new Date(candles[0]?.t * 1000).toISOString(), equity: 0 }];
  let netR          = 0;
  let peakR         = 0;
  let maxDrawdownR  = 0;
  let skippedBars   = 0;

  // Track active trade end index to avoid overlapping trades
  let activeTradeTill = -1;

  const total = candles.length - WARMUP;

  for (let i = WARMUP; i < candles.length; i++) {
    if (onProgress && (i - WARMUP) % 50 === 0) {
      onProgress(i - WARMUP, total);
    }

    // Skip if inside an active trade
    if (i <= activeTradeTill) continue;

    let snapshot;
    try {
      snapshot = buildHistoricalSnapshot(symbol, timeframe, candles, i, series);
    } catch {
      skippedBars++;
      continue;
    }

    // Run all rule-based agents (no API key → pure fallback mode)
    // Phase 1: trend + smc run first  -  contrarian depends on both
    // Phase 2: news, risk, exec, contrarian run in parallel
    // Phase 3: master aggregates all
    let trend: TrendAgentOutput;
    let smc:   SMCAgentOutput;
    let news:  NewsAgentOutput;
    let risk:  RiskAgentOutput;
    let exec:  ExecutionAgentOutput;
    let contr: ContrarianAgentOutput;
    let master: MasterDecisionOutput;

    try {
      // Phase 1: agents that depend only on snapshot
      [trend, smc, news, risk] = await Promise.all([
        runTrendAgent(snapshot),
        runPriceActionAgent(snapshot),
        runNewsAgent(snapshot),
        runRiskAgent(snapshot),
      ]) as [TrendAgentOutput, SMCAgentOutput, NewsAgentOutput, RiskAgentOutput];

      // Phase 2: agents that depend on phase-1 outputs
      [exec, contr] = await Promise.all([
        runExecutionAgent(snapshot, smc, news),
        runContrarianAgent(snapshot, trend, smc),
      ]) as [ExecutionAgentOutput, ContrarianAgentOutput];

      master = await runMasterAgent(snapshot, trend, smc, news, risk, exec, contr, DEFAULT_WEIGHTS);
    } catch {
      skippedBars++;
      continue;
    }

    // Only trade on valid, directional signals with a real setup
    if (
      master.finalBias === "no-trade" ||
      !risk.valid ||
      !exec.hasSetup ||
      exec.direction === "none" ||
      exec.entry === null ||
      exec.stopLoss === null ||
      exec.tp1 === null
    ) {
      continue;
    }

    // Minimum grade filter: skip C-grade setups
    if (exec.grade === "C") continue;

    const dir = exec.direction as "long" | "short";
    const entry = exec.entry;
    const sl    = exec.stopLoss;
    const tp1   = exec.tp1;
    const tp2   = exec.tp2;
    const rr    = exec.rrRatio ?? 1;

    const resolution = resolveTrade(candles, i, dir, entry, sl, tp1, tp2);

    const trade: BacktestTrade = {
      openTime:    snapshot.timestamp,
      closeTime:   resolution.closeTime,
      direction:   dir,
      entry,
      stopLoss:    sl,
      tp1,
      rrRatio:     rr,
      grade:       exec.grade,
      setupType:   smc.setupType,
      session:     snapshot.indicators.session,
      result:      resolution.result,
      rMultiple:   resolution.rMultiple,
      barsToClose: resolution.barsToClose,
    };

    trades.push(trade);

    // Advance past this trade
    activeTradeTill = i + resolution.barsToClose;

    // Update equity
    netR += resolution.rMultiple;
    if (netR > peakR) peakR = netR;
    const drawdown = peakR - netR;
    if (drawdown > maxDrawdownR) maxDrawdownR = drawdown;

    equityCurve.push({ time: resolution.closeTime, equity: parseFloat(netR.toFixed(2)) });
  }

  // ── Aggregate stats ──────────────────────────────────────────────────────

  const wins       = trades.filter(t => t.result === "win").length;
  const losses     = trades.filter(t => t.result === "loss").length;
  const breakevens = trades.filter(t => t.result === "be").length;
  const total_     = trades.length;

  const grossWins  = trades.filter(t => t.rMultiple > 0).reduce((s, t) => s + t.rMultiple, 0);
  const grossLoss  = Math.abs(trades.filter(t => t.rMultiple < 0).reduce((s, t) => s + t.rMultiple, 0));
  const pf         = grossLoss > 0 ? parseFloat((grossWins / grossLoss).toFixed(2)) : grossWins > 0 ? 99 : 0;
  const winRate    = total_ > 0 ? parseFloat(((wins / total_) * 100).toFixed(1)) : 0;
  const avgR       = total_ > 0 ? parseFloat((netR / total_).toFixed(2)) : 0;

  // Group by grade
  const byGrade: Record<string, { trades: number; wins: number; netR: number }> = {};
  const bySession: Record<string, { trades: number; wins: number; netR: number }> = {};
  const bySetup: Record<string, { trades: number; wins: number; netR: number }> = {};

  for (const t of trades) {
    for (const [key, val, map] of [
      [t.grade, t, byGrade],
      [t.session, t, bySession],
      [t.setupType, t, bySetup],
    ] as [string, BacktestTrade, typeof byGrade][]) {
      if (!map[key]) map[key] = { trades: 0, wins: 0, netR: 0 };
      map[key].trades++;
      if (val.result === "win") map[key].wins++;
      map[key].netR = parseFloat((map[key].netR + val.rMultiple).toFixed(2));
    }
  }

  return {
    symbol,
    timeframe,
    startDate: candles[WARMUP] ? new Date(candles[WARMUP].t * 1000).toISOString() : "",
    endDate:   candles[candles.length - 1] ? new Date(candles[candles.length - 1].t * 1000).toISOString() : "",
    totalBars:     candles.length - WARMUP,
    totalTrades:   total_,
    wins,
    losses,
    breakevens,
    winRate,
    profitFactor:  pf,
    netR:          parseFloat(netR.toFixed(2)),
    maxDrawdownR:  parseFloat(maxDrawdownR.toFixed(2)),
    avgRPerTrade:  avgR,
    byGrade,
    bySession,
    bySetup,
    equityCurve,
    trades,
    skippedBars,
  };
}
