"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Activity, Trophy,
  BarChart2, Target, Zap, DollarSign,
  Percent, Clock, ArrowRightLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ManualTrade {
  id: string;
  date: string;
  symbol: string;
  direction: "long" | "short";
  pnl: number;
  fees: number;
  notes?: string | null;
}

interface DailyPnL {
  date: string;
  pnl: number;
  trades: number;
  wins: number;
  fees: number;
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW_LABELS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DOW_ORDER    = [1, 2, 3, 4, 5, 6, 0]; // Mon→Sat→Sun (trading-week order)

type PnlMode = "currency" | "percent";

function fmtD(n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(2)}`;
  return n < 0 ? `-${s}` : `+${s}`;
}

// Mode-aware value formatter — base = totalVolume (grossProfit + grossLoss)
function fmtV(n: number, mode: PnlMode, base: number): string {
  if (mode === "percent") {
    if (base === 0 || n === 0) return "0.00%";
    const pct = (n / base) * 100;
    return (pct >= 0 ? "+" : "-") + Math.abs(pct).toFixed(2) + "%";
  }
  return fmtD(n);
}

// Compact cell formatter for the monthly grid
function fmtCell(n: number, mode: PnlMode, base: number): string {
  if (mode === "percent") {
    if (base === 0 || n === 0) return "0%";
    const pct = (n / base) * 100;
    return (pct >= 0 ? "+" : "-") + Math.abs(pct).toFixed(1) + "%";
  }
  const abs = Math.abs(n);
  return (n < 0 ? "-" : "+") + (abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : `${abs.toFixed(0)}`);
}

// ── Equity Curve (unchanged) ─────────────────────────────────────────────────────
function EquityCurve({ points }: { points: Array<{ date: string; balance: number }> }) {
  if (points.length < 2) return null;
  const W = 600, H = 100;
  const vals = points.map(p => p.balance);
  const min = Math.min(...vals, 0);
  const max = Math.max(...vals, 0);
  const range = max - min || 1;
  const toY = (v: number) => H - ((v - min) / range) * (H - 8) - 4;
  const toX = (i: number) => (i / (points.length - 1)) * W;
  const zerY = toY(0);
  const pts = points.map((p, i) => `${toX(i).toFixed(1)},${toY(p.balance).toFixed(1)}`).join(" L ");
  const last = points[points.length - 1].balance;
  const positive = last >= 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 110 }} preserveAspectRatio="none">
      <line x1="0" y1={zerY} x2={W} y2={zerY} stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 3" />
      <path
        d={`M ${toX(0)},${zerY} L ${pts} L ${toX(points.length - 1)},${zerY} Z`}
        fill={positive ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)"}
      />
      <path
        d={`M ${pts}`}
        fill="none"
        stroke={positive ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx={toX(points.length - 1)}
        cy={toY(last)}
        r="3"
        fill={positive ? "#22c55e" : "#ef4444"}
      />
    </svg>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────────
type SymStat  = { trades: number; wins: number; pnl: number };
type DowEntry = { day: string; trades: number; wins: number; pnl: number };

type Stats = {
  totalTrades: number; wins: number; losses: number; winRate: number;
  grossProfit: number; grossLoss: number; netPnl: number; profitFactor: number;
  avgWin: number; avgLoss: number; bestDay: number; worstDay: number; worstTrade: number; streak: number;
  equityCurve: Array<{ date: string; balance: number }>;
  maxDDPct: number;
  bySymbol: Array<[string, SymStat]>;
  dowArr: DowEntry[];
  byMonth: Array<[string, SymStat]>;
  expectancy: number;
  rrRatio: number;
  sharpeRatio: number;
  totalVolume: number;
  monthlyGrid: Record<number, Record<number, number>>;
  monthlyYTD: Record<number, number>;
  gridYears: number[];
} | null;

// ── Main Component ───────────────────────────────────────────────────────────────
export function AnalyticsView({
  trades,
  daily,
}: {
  trades: ManualTrade[];
  daily: DailyPnL[];
}) {
  const [pnlMode, setPnlMode] = useState<PnlMode>("currency");

  const stats: Stats = useMemo((): Stats => {
    const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 0) return null;

    const totalTrades = sorted.length;
    const wins        = sorted.filter(t => t.pnl > 0).length;
    const losses      = sorted.filter(t => t.pnl < 0).length;
    const winRate     = (wins / totalTrades) * 100;
    const grossProfit = sorted.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss   = Math.abs(sorted.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const netPnl      = sorted.reduce((s, t) => s + t.pnl, 0);
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgWin  = wins   > 0 ? grossProfit / wins   : 0;
    const avgLoss = losses > 0 ? grossLoss   / losses : 0;
    const totalVolume = grossProfit + grossLoss;

    // Advanced metrics
    const lossRate   = totalTrades > 0 ? losses / totalTrades : 0;
    const expectancy = (winRate / 100) * avgWin - lossRate * avgLoss;
    const rrRatio    = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

    // Best/worst day
    const byDate = new Map<string, number>();
    sorted.forEach(t => byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.pnl));
    const dayVals    = [...byDate.values()];
    const bestDay    = dayVals.length ? Math.max(...dayVals) : 0;
    const worstDay   = dayVals.length ? Math.min(...dayVals) : 0;
    const worstTrade = sorted.filter(t => t.pnl < 0).reduce((min, t) => Math.min(min, t.pnl), 0);

    // Simplified annualized Sharpe from daily P&L
    const dailyReturns = [...byDate.values()];
    const mean = dailyReturns.reduce((s, v) => s + v, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / dailyReturns.length;
    const std = Math.sqrt(variance);
    const sharpeRatio = std > 0 ? (mean / std) * Math.sqrt(252) : 0;

    // Streak
    let streak = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const w = sorted[i].pnl > 0;
      if (i === sorted.length - 1) { streak = w ? 1 : -1; continue; }
      if ((streak > 0 && w) || (streak < 0 && !w)) Math.abs(streak) < 99 && (streak += w ? 1 : -1);
      else break;
    }

    // Equity curve
    const equityCurve: Array<{ date: string; balance: number }> = [];
    let running = 0;
    sorted.forEach(t => {
      running += t.pnl;
      const last = equityCurve[equityCurve.length - 1];
      if (last?.date === t.date) last.balance = running;
      else equityCurve.push({ date: t.date, balance: running });
    });

    // Max drawdown
    let peak = 0, maxDDPct = 0, tradeRunning = 0;
    sorted.forEach(t => {
      tradeRunning += t.pnl;
      if (tradeRunning > peak) peak = tradeRunning;
      const ddPct = peak > 0 ? ((peak - tradeRunning) / peak) * 100 : 0;
      if (ddPct > maxDDPct) maxDDPct = ddPct;
    });

    // By symbol
    const symMap = new Map<string, SymStat>();
    sorted.forEach(t => {
      const s = symMap.get(t.symbol) ?? { trades: 0, wins: 0, pnl: 0 };
      s.trades++; if (t.pnl > 0) s.wins++; s.pnl += t.pnl;
      symMap.set(t.symbol, s);
    });
    const bySymbol = [...symMap.entries()].sort((a, b) => b[1].trades - a[1].trades);

    // By day of week
    const dowArr = Array.from({ length: 7 }, (_, i) => ({ day: DOW_LABELS[i], trades: 0, wins: 0, pnl: 0 }));
    sorted.forEach(t => {
      const dow = new Date(t.date + "T12:00:00").getDay();
      dowArr[dow].trades++; if (t.pnl > 0) dowArr[dow].wins++; dowArr[dow].pnl += t.pnl;
    });

    // By month (legacy list)
    const monthMap = new Map<string, SymStat>();
    sorted.forEach(t => {
      const key = t.date.slice(0, 7);
      const m = monthMap.get(key) ?? { trades: 0, wins: 0, pnl: 0 };
      m.trades++; if (t.pnl > 0) m.wins++; m.pnl += t.pnl;
      monthMap.set(key, m);
    });
    const byMonth = [...monthMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);

    // Monthly returns grid: year → monthIndex(0-11) → pnl
    const monthlyGrid: Record<number, Record<number, number>> = {};
    const monthlyYTD:  Record<number, number> = {};
    sorted.forEach(t => {
      const year  = parseInt(t.date.slice(0, 4));
      const month = parseInt(t.date.slice(5, 7)) - 1;
      if (!monthlyGrid[year]) monthlyGrid[year] = {};
      monthlyGrid[year][month] = (monthlyGrid[year][month] ?? 0) + t.pnl;
      monthlyYTD[year] = (monthlyYTD[year] ?? 0) + t.pnl;
    });
    const gridYears = Object.keys(monthlyGrid).map(Number).sort((a, b) => b - a);

    return {
      totalTrades, wins, losses, winRate,
      grossProfit, grossLoss, netPnl, profitFactor,
      avgWin, avgLoss, bestDay, worstDay, worstTrade, streak,
      equityCurve, maxDDPct,
      bySymbol, dowArr, byMonth,
      expectancy, rrRatio, sharpeRatio, totalVolume,
      monthlyGrid, monthlyYTD, gridYears,
    };
  }, [trades]);

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart2 className="h-10 w-10 text-zinc-700 mb-3" />
        <p className="text-sm font-semibold text-zinc-400">No trades to analyze yet</p>
        <p className="text-xs text-zinc-600 mt-1">Log some trades manually to see your analytics</p>
      </div>
    );
  }

  const {
    totalTrades, wins, losses, winRate,
    grossProfit, grossLoss, netPnl, profitFactor,
    avgWin, avgLoss, bestDay, worstDay, worstTrade, streak,
    equityCurve, maxDDPct,
    bySymbol, dowArr,
    expectancy, rrRatio, sharpeRatio, totalVolume,
    monthlyGrid, monthlyYTD, gridYears,
  } = stats;

  const dowMax = Math.max(...dowArr.map((d: DowEntry) => Math.abs(d.pnl)), 1);
  const base   = totalVolume; // denominator for % mode

  return (
    <div className="space-y-5">

      {/* ── P&L Mode Toggle ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
          Performance Overview
        </p>
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-white/10 bg-white/4">
          <button
            onClick={() => setPnlMode("currency")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all",
              pnlMode === "currency" ? "bg-white/12 text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <DollarSign className="h-3 w-3" /> USD
          </button>
          <button
            onClick={() => setPnlMode("percent")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all",
              pnlMode === "percent" ? "bg-white/12 text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Percent className="h-3 w-3" /> %
          </button>
        </div>
      </div>

      {/* ── Primary KPI chips ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Net P&L",
            value: fmtV(netPnl, pnlMode, base),
            accent: netPnl >= 0 ? "text-emerald-400" : "text-red-400",
            icon: DollarSign,
          },
          {
            label: "Win Rate",
            value: `${winRate.toFixed(1)}%`,
            accent: winRate >= 50 ? "text-emerald-400" : "text-red-400",
            icon: Trophy,
          },
          {
            label: "Profit Factor",
            value: !isFinite(profitFactor) || profitFactor >= 99 ? "∞" : profitFactor.toFixed(2),
            accent: profitFactor >= 1.5 ? "text-emerald-400" : profitFactor >= 1 ? "text-amber-400" : "text-red-400",
            icon: TrendingUp,
          },
          {
            label: "Avg Win",
            value: fmtV(avgWin, pnlMode, base),
            accent: "text-emerald-400",
            icon: Zap,
          },
          {
            label: "Avg Loss",
            value: fmtV(-avgLoss, pnlMode, base),
            accent: "text-red-400",
            icon: TrendingDown,
          },
          {
            label: "Max Drawdown",
            value: maxDDPct > 0 ? `-${maxDDPct.toFixed(2)}%` : "0.00%",
            accent: maxDDPct > 0 ? "text-orange-400" : "text-zinc-500",
            icon: Activity,
          },
        ].map(({ label, value, accent, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3 w-3 text-zinc-500" />
              <p className="text-[9px] uppercase tracking-widest text-zinc-500">{label}</p>
            </div>
            <p className={cn("text-lg font-bold font-mono", accent)}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Advanced Metrics Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Expectancy */}
        <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="h-3 w-3 text-zinc-500" />
            <p className="text-[9px] uppercase tracking-widest text-zinc-500">Expectancy</p>
          </div>
          <p className={cn("text-base font-bold font-mono", expectancy >= 0 ? "text-emerald-400" : "text-red-400")}>
            {fmtV(expectancy, pnlMode, base)}
          </p>
          <p className="text-[9px] text-zinc-600 mt-0.5">per trade avg</p>
        </div>

        {/* Risk-to-Reward */}
        <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowRightLeft className="h-3 w-3 text-zinc-500" />
            <p className="text-[9px] uppercase tracking-widest text-zinc-500">Risk-to-Reward</p>
          </div>
          <p className={cn(
            "text-base font-bold font-mono",
            !isFinite(rrRatio) || rrRatio >= 1.5 ? "text-emerald-400" : rrRatio >= 1 ? "text-amber-400" : "text-red-400"
          )}>
            {!isFinite(rrRatio) ? "∞ R" : `${rrRatio.toFixed(2)} R`}
          </p>
          <p className="text-[9px] text-zinc-600 mt-0.5">avg win / avg loss</p>
        </div>

        {/* Sharpe Ratio */}
        <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <BarChart2 className="h-3 w-3 text-zinc-500" />
            <p className="text-[9px] uppercase tracking-widest text-zinc-500">Sharpe Ratio</p>
          </div>
          <p className={cn(
            "text-base font-bold font-mono",
            sharpeRatio >= 1 ? "text-emerald-400" : sharpeRatio > 0 ? "text-amber-400" : "text-red-400"
          )}>
            {sharpeRatio !== 0 ? sharpeRatio.toFixed(2) : "—"}
          </p>
          <p className="text-[9px] text-zinc-600 mt-0.5">annualized (approx)</p>
        </div>

        {/* Avg Hold Time */}
        <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="h-3 w-3 text-zinc-500" />
            <p className="text-[9px] uppercase tracking-widest text-zinc-500">Avg Hold Time</p>
          </div>
          <p className="text-base font-bold font-mono text-zinc-500">N/A</p>
          <p className="text-[9px] text-zinc-600 mt-0.5">no timestamp data</p>
        </div>
      </div>

      {/* ── Secondary stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {[
          { label: "Trades",     value: String(totalTrades) },
          { label: "Wins",       value: String(wins),   accent: "text-emerald-400" },
          { label: "Losses",     value: String(losses), accent: "text-red-400" },
          {
            label: "Best Day",
            value: bestDay > 0 ? fmtV(bestDay, pnlMode, base) : pnlMode === "percent" ? "0.00%" : "$0.00",
            accent: bestDay > 0 ? "text-emerald-400" : "text-zinc-500",
          },
          {
            label: "Worst Day",
            value: (() => {
              const v = worstDay < 0 ? worstDay : worstTrade;
              return v < 0 ? fmtV(v, pnlMode, base) : pnlMode === "percent" ? "0.00%" : "$0.00";
            })(),
            accent: (worstDay < 0 || worstTrade < 0) ? "text-red-400" : "text-zinc-500",
          },
          { label: "Gross Win",  value: fmtV(grossProfit, pnlMode, base),  accent: "text-emerald-400" },
          { label: "Gross Loss", value: fmtV(-grossLoss,  pnlMode, base),  accent: "text-red-400"     },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-lg border border-white/6 bg-white/2 px-3 py-2 text-center">
            <p className="text-[8px] text-zinc-600 uppercase tracking-wider mb-0.5">{label}</p>
            <p className={cn("text-xs font-bold font-mono", accent ?? "text-zinc-200")}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Equity Curve ─────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Equity Curve
              <span className="text-zinc-600 font-normal">(manual trades only)</span>
            </span>
            <span className={cn("text-xs font-bold font-mono", netPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
              {fmtV(netPnl, pnlMode, base)} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          {equityCurve.length >= 2 ? (
            <>
              <EquityCurve points={equityCurve} />
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-zinc-600">{equityCurve[0].date}</span>
                <span className="text-[9px] text-zinc-600">{equityCurve[equityCurve.length - 1].date}</span>
              </div>
            </>
          ) : (
            <p className="text-xs text-zinc-600 py-4 text-center">Need at least 2 trade days to show curve</p>
          )}
        </CardContent>
      </Card>

      {/* ── Breakdowns ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* By Symbol */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> By Symbol
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bySymbol.length === 0 && <p className="text-xs text-zinc-600">No data</p>}
            {bySymbol.map(([sym, s]: [string, SymStat]) => {
              const wr = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
              return (
                <div key={sym} className="rounded-lg border border-white/6 bg-white/2 px-3 py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-zinc-200">{sym}</span>
                    <span className={cn("text-xs font-bold font-mono", s.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {fmtV(s.pnl, pnlMode, base)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    <span>{s.trades}T</span>
                    <span className={wr >= 50 ? "text-emerald-500" : "text-red-500"}>{wr.toFixed(0)}% WR</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", wr >= 50 ? "bg-emerald-500/60" : "bg-red-500/60")}
                      style={{ width: `${wr}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* By Day of Week — all 7 days, Mon→Sun order, no clipping */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> By Day of Week
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {DOW_ORDER.map(idx => {
              const d = dowArr[idx];
              const wr = d.trades > 0 ? (d.wins / d.trades) * 100 : 0;
              const barPct = dowMax > 0 ? (Math.abs(d.pnl) / dowMax) * 100 : 0;
              const isWeekend = idx === 0 || idx === 6;
              return (
                <div key={d.day} className={cn("flex items-center gap-2", isWeekend && "opacity-60")}>
                  <span className={cn(
                    "text-[10px] w-8 shrink-0",
                    d.trades > 0 ? "text-zinc-400" : "text-zinc-700"
                  )}>
                    {d.day}
                  </span>
                  <div className="flex-1 h-5 bg-white/4 rounded overflow-hidden relative">
                    {d.trades > 0 ? (
                      <div
                        className={cn(
                          "h-full rounded transition-all",
                          d.pnl >= 0 ? "bg-emerald-500/40" : "bg-red-500/40"
                        )}
                        style={{ width: `${barPct}%` }}
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center px-2 text-[9px] text-zinc-700">
                        no data
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-mono w-16 text-right shrink-0",
                    d.pnl > 0 ? "text-emerald-400" : d.pnl < 0 ? "text-red-400" : "text-zinc-600"
                  )}>
                    {d.trades > 0 ? fmtV(d.pnl, pnlMode, base) : "—"}
                  </span>
                  <span className="text-[9px] text-zinc-600 w-8 text-right shrink-0">
                    {d.trades > 0 ? `${wr.toFixed(0)}%` : ""}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Monthly Returns — Myfxbook-style matrix grid */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <BarChart2 className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Monthly Returns
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-3">
            {gridYears.length === 0 ? (
              <p className="text-xs text-zinc-600 px-4 py-2">No data</p>
            ) : (
              <div className="overflow-x-auto px-3">
                <table
                  className="w-full"
                  style={{ borderSpacing: "2px 2px", borderCollapse: "separate" }}
                >
                  <thead>
                    <tr>
                      <th className="text-[8px] text-zinc-600 text-left pr-1 py-0.5 w-7 font-normal">Yr</th>
                      {MONTH_LABELS.map(m => (
                        <th key={m} className="text-[7px] text-zinc-600 text-center px-px py-0.5 font-normal">
                          {m}
                        </th>
                      ))}
                      <th className="text-[7px] text-zinc-500 text-center px-px py-0.5 font-semibold">YTD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gridYears.map(year => (
                      <tr key={year}>
                        <td className="text-[9px] text-zinc-500 font-semibold pr-1 py-px align-middle">
                          {year}
                        </td>
                        {Array.from({ length: 12 }, (_, mi) => {
                          const val = monthlyGrid[year]?.[mi];
                          if (val === undefined) {
                            return (
                              <td key={mi} className="p-px">
                                <div className="h-5 rounded bg-zinc-900/80" />
                              </td>
                            );
                          }
                          const pos = val >= 0;
                          return (
                            <td key={mi} className="p-px">
                              <div
                                title={`${MONTH_LABELS[mi]} ${year}: ${fmtD(val)}`}
                                className={cn(
                                  "h-5 rounded flex items-center justify-center text-[7px] font-bold font-mono leading-none cursor-default select-none",
                                  pos
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-red-500/20 text-red-400"
                                )}
                              >
                                {fmtCell(val, pnlMode, base)}
                              </div>
                            </td>
                          );
                        })}
                        {/* YTD column */}
                        <td className="p-px">
                          <div
                            className={cn(
                              "h-5 rounded flex items-center justify-center text-[7px] font-bold font-mono leading-none",
                              (monthlyYTD[year] ?? 0) >= 0
                                ? "bg-emerald-500/30 text-emerald-300 ring-1 ring-inset ring-emerald-500/40"
                                : "bg-red-500/30 text-red-300 ring-1 ring-inset ring-red-500/40"
                            )}
                          >
                            {fmtCell(monthlyYTD[year] ?? 0, pnlMode, base)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Streak indicator ─────────────────────────────────────────────────────── */}
      {streak !== 0 && (
        <div className={cn(
          "rounded-xl border px-4 py-3 flex items-center gap-3",
          streak > 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
        )}>
          <Zap className={cn("h-4 w-4", streak > 0 ? "text-emerald-400" : "text-red-400")} />
          <div>
            <p className={cn("text-xs font-bold", streak > 0 ? "text-emerald-400" : "text-red-400")}>
              {Math.abs(streak)} {streak > 0 ? "Win" : "Loss"} Streak
            </p>
            <p className="text-[10px] text-zinc-500">Current streak based on last {Math.abs(streak)} trades</p>
          </div>
        </div>
      )}

    </div>
  );
}
