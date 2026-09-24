/**
 * Backtest for the Session Liquidity core (v2).
 *
 * Walks 5-minute candles bar by bar and calls the exact function the live app
 * uses (analyzeSessionLiquidity) on the history available at that bar, so a
 * setup is only acted on once it could have been seen. Each setup is counted
 * once, from the bar it became known:
 *   - the entry is a limit at the FVG midpoint and must actually trade;
 *   - a fill and a stop in the same candle count as a loss;
 *   - price reaching TP1 before the fill, or no fill within the window, is a
 *     missed setup, not a trade;
 *   - a win is the real R to TP1 (the whole position exits there, as the app's
 *     trade tracker does). A trade still open after a day is closed at market.
 */

import { analyzeSessionLiquidity, v2ParamsFor, type V2Candle, type V2Setup } from "@/lib/agents/core-v2";

export interface V2Trade {
  id: string;
  direction: "long" | "short";
  level: string;
  killZone: string;
  readyAt: string;
  fillAt: string;
  closeAt: string;
  entry: number;
  stopLoss: number;
  tp1: number;
  result: "win" | "loss" | "timeout";
  r: number;
}

type Bucket = { trades: number; wins: number; netR: number };

export interface V2Report {
  symbol: string;
  startDate: string;
  endDate: string;
  bars: number;
  setups: number;
  missed: number;
  trades: number;
  wins: number;
  losses: number;
  timeouts: number;
  winRate: number;
  netR: number;
  avgR: number;
  profitFactor: number;
  maxDrawdownR: number;
  longestLosingStreak: number;
  byKillZone: Record<string, Bucket>;
  byLevel: Record<string, Bucket>;
  byDirection: Record<string, Bucket>;
  byMonth: Record<string, Bucket>;
  recentTrades: V2Trade[];
}

const WINDOW = 1000;          // history handed to the analyzer (≈ 3.5 trading days)
const WARMUP = 700;           // enough for the H1 EMA50 bias and the previous day
const MAX_HOLD = 288;         // one day of 5-minute bars

function iso(t: number) { return new Date(t * 1000).toISOString(); }

function simulate(candles: V2Candle[], from: number, s: V2Setup, fillWindow: number):
  { filled: false } | { filled: true; fillIdx: number; closeIdx: number; result: V2Trade["result"]; r: number } {
  const long = s.direction === "long";
  let fillIdx = -1;
  for (let i = from; i < candles.length && i <= from + fillWindow; i++) {
    const c = candles[i];
    if (long ? c.l <= s.entry : c.h >= s.entry) { fillIdx = i; break; }
    if (long ? c.h >= s.tp1 : c.l <= s.tp1) return { filled: false };
  }
  if (fillIdx < 0) return { filled: false };

  const winR = Math.abs(s.tp1 - s.entry) / s.risk;
  const fillBar = candles[fillIdx];
  if (long ? fillBar.l <= s.stopLoss : fillBar.h >= s.stopLoss) {
    return { filled: true, fillIdx, closeIdx: fillIdx, result: "loss", r: -1 };
  }
  for (let i = fillIdx + 1; i < candles.length && i <= fillIdx + MAX_HOLD; i++) {
    const c = candles[i];
    if (long ? c.l <= s.stopLoss : c.h >= s.stopLoss) return { filled: true, fillIdx, closeIdx: i, result: "loss", r: -1 };
    if (long ? c.h >= s.tp1 : c.l <= s.tp1) return { filled: true, fillIdx, closeIdx: i, result: "win", r: winR };
  }
  const last = Math.min(candles.length - 1, fillIdx + MAX_HOLD);
  const r = ((long ? candles[last].c - s.entry : s.entry - candles[last].c) / s.risk);
  return { filled: true, fillIdx, closeIdx: last, result: "timeout", r };
}

export function runBacktestV2(symbol: string, candles: V2Candle[]): V2Report {
  const trades: V2Trade[] = [];
  const seen = new Set<string>();
  let setups = 0, missed = 0;

  for (let i = WARMUP; i < candles.length; i++) {
    const window = candles.slice(Math.max(0, i - WINDOW + 1), i + 1);
    const params = v2ParamsFor(symbol, candles[i].c);
    const res = analyzeSessionLiquidity(window, params);
    const s = res.setup;
    if (!s || seen.has(s.id)) continue;
    seen.add(s.id);
    // Only setups seen while still waiting for their fill — anything else was
    // already over before this bar could have known about it.
    if (s.state !== "pending") continue;
    setups++;

    const sim = simulate(candles, i + 1, s, params.fillWindow);
    if (!sim.filled) { missed++; continue; }
    trades.push({
      id: s.id, direction: s.direction, level: s.level, killZone: s.killZone,
      readyAt: iso(s.readyTs), fillAt: iso(candles[sim.fillIdx].t), closeAt: iso(candles[sim.closeIdx].t),
      entry: s.entry, stopLoss: s.stopLoss, tp1: s.tp1,
      result: sim.result, r: parseFloat(sim.r.toFixed(2)),
    });
  }

  return summarize(symbol, candles, trades, setups, missed);
}

function summarize(symbol: string, candles: V2Candle[], trades: V2Trade[], setups: number, missed: number): V2Report {
  const add = (map: Record<string, Bucket>, key: string, t: V2Trade) => {
    const b = (map[key] ??= { trades: 0, wins: 0, netR: 0 });
    b.trades++; if (t.r > 0) b.wins++; b.netR = parseFloat((b.netR + t.r).toFixed(2));
  };
  const byKillZone: Record<string, Bucket> = {}, byLevel: Record<string, Bucket> = {};
  const byDirection: Record<string, Bucket> = {}, byMonth: Record<string, Bucket> = {};

  let netR = 0, peak = 0, maxDD = 0, grossWin = 0, grossLoss = 0, streak = 0, worst = 0;
  for (const t of trades) {
    netR += t.r;
    peak = Math.max(peak, netR);
    maxDD = Math.max(maxDD, peak - netR);
    if (t.r > 0) { grossWin += t.r; streak = 0; } else { grossLoss += -t.r; streak++; worst = Math.max(worst, streak); }
    add(byKillZone, t.killZone, t); add(byLevel, t.level, t);
    add(byDirection, t.direction, t); add(byMonth, t.fillAt.slice(0, 7), t);
  }
  const wins = trades.filter(t => t.r > 0).length;

  return {
    symbol,
    startDate: candles.length ? iso(candles[0].t) : "",
    endDate: candles.length ? iso(candles[candles.length - 1].t) : "",
    bars: candles.length,
    setups, missed,
    trades: trades.length,
    wins,
    losses: trades.filter(t => t.result === "loss").length,
    timeouts: trades.filter(t => t.result === "timeout").length,
    winRate: trades.length ? parseFloat(((wins / trades.length) * 100).toFixed(1)) : 0,
    netR: parseFloat(netR.toFixed(2)),
    avgR: trades.length ? parseFloat((netR / trades.length).toFixed(3)) : 0,
    profitFactor: grossLoss > 0 ? parseFloat((grossWin / grossLoss).toFixed(2)) : grossWin > 0 ? 99 : 0,
    maxDrawdownR: parseFloat(maxDD.toFixed(2)),
    longestLosingStreak: worst,
    byKillZone, byLevel, byDirection, byMonth,
    recentTrades: trades.slice(-30),
  };
}
