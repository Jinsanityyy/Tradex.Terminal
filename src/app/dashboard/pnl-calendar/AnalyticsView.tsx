"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Activity, Trophy,
  BarChart2, Target, Zap, DollarSign,
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

function fmtD(n: number): string {
  const abs = Math.abs(n);
  const s = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(2)}`;
  return n < 0 ? `-${s}` : `+${s}`;
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Equity Curve ────────────────────────────────────────────────────────────────

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
      {/* Zero line */}
      <line x1="0" y1={zerY} x2={W} y2={zerY} stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 3" />
      {/* Area fill */}
      <path
        d={`M ${toX(0)},${zerY} L ${pts} L ${toX(points.length - 1)},${zerY} Z`}
        fill={positive ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)"}
      />
      {/* Line */}
      <path
        d={`M ${pts}`}
        fill="none"
        stroke={positive ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={toX(points.length - 1)}
        cy={toY(last)}
        r="3"
        fill={positive ? "#22c55e" : "#ef4444"}
      />
    </svg>
  );
}

// ── Main Analytics Component ─────────────────────────────────────────────────────

export function AnalyticsView({
  trades,
  daily,
}: {
  trades: ManualTrade[];
  daily: DailyPnL[];
}) {
  const stats = useMemo(() => {
    const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 0) return null;

    const totalTrades = sorted.length;
    const wins        = sorted.filter(t => t.pnl > 0).length;
    const losses      = sorted.filter(t => t.pnl < 0).length;
    const winRate     = (wins / totalTrades) * 100;
    const grossProfit = sorted.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss   = Math.abs(sorted.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const netPnl      = sorted.reduce((s, t) => s + t.pnl, 0);
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;
    const avgWin  = wins   > 0 ? grossProfit / wins   : 0;
    const avgLoss = losses > 0 ? grossLoss   / losses : 0;

    // Best/worst day
    const byDate = new Map<string, number>();
    sorted.forEach(t => byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.pnl));
    const dayVals = [...byDate.values()];
    const bestDay  = dayVals.length ? Math.max(...dayVals) : 0;
    const worstDay = dayVals.length ? Math.min(...dayVals) : 0;

    // Streak (current win/loss streak)
    let streak = 0;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const w = sorted[i].pnl > 0;
      if (i === sorted.length - 1) { streak = w ? 1 : -1; continue; }
      if ((streak > 0 && w) || (streak < 0 && !w)) Math.abs(streak) < 99 && (streak += w ? 1 : -1);
      else break;
    }

    // Equity curve from manual trades (grouped by date for display)
    const equityCurve: Array<{ date: string; balance: number }> = [];
    let running = 0;
    sorted.forEach(t => {
      running += t.pnl;
      const last = equityCurve[equityCurve.length - 1];
      if (last?.date === t.date) last.balance = running;
      else equityCurve.push({ date: t.date, balance: running });
    });

    // Max drawdown computed per-trade — stored as % of peak equity
    let peak = 0, maxDDPctPct = 0, tradeRunning = 0;
    sorted.forEach(t => {
      tradeRunning += t.pnl;
      if (tradeRunning > peak) peak = tradeRunning;
      const ddPct = peak > 0 ? ((peak - tradeRunning) / peak) * 100 : 0;
      if (ddPct > maxDDPctPct) maxDDPctPct = ddPct;
    });

    // By symbol
    const symMap = new Map<string, { trades: number; wins: number; pnl: number }>();
    sorted.forEach(t => {
      const s = symMap.get(t.symbol) ?? { trades: 0, wins: 0, pnl: 0 };
      s.trades++; if (t.pnl > 0) s.wins++; s.pnl += t.pnl;
      symMap.set(t.symbol, s);
    });
    const bySymbol = [...symMap.entries()].sort((a, b) => b[1].trades - a[1].trades);

    // By day of week (use noon time to avoid UTC shift)
    const dowArr = Array.from({ length: 7 }, (_, i) => ({ day: DOW_LABELS[i], trades: 0, wins: 0, pnl: 0 }));
    sorted.forEach(t => {
      const dow = new Date(t.date + "T12:00:00").getDay();
      dowArr[dow].trades++; if (t.pnl > 0) dowArr[dow].wins++; dowArr[dow].pnl += t.pnl;
    });

    // Monthly summary
    const monthMap = new Map<string, { trades: number; wins: number; pnl: number }>();
    sorted.forEach(t => {
      const key = t.date.slice(0, 7);
      const m = monthMap.get(key) ?? { trades: 0, wins: 0, pnl: 0 };
      m.trades++; if (t.pnl > 0) m.wins++; m.pnl += t.pnl;
      monthMap.set(key, m);
    });
    const byMonth = [...monthMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);

    return {
      totalTrades, wins, losses, winRate,
      grossProfit, grossLoss, netPnl, profitFactor,
      avgWin, avgLoss, bestDay, worstDay, streak,
      equityCurve, maxDDPct,
      bySymbol, dowArr, byMonth,
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
    avgWin, avgLoss, bestDay, worstDay, streak,
    equityCurve, maxDDPct,
    bySymbol, dowArr, byMonth,
  } = stats;

  type SymStat  = { trades: number; wins: number; pnl: number };
  type DowEntry = { day: string; trades: number; wins: number; pnl: number };
  const dowMax = Math.max(...dowArr.map((d: DowEntry) => Math.abs(d.pnl)), 1);

  return (
    <div className="space-y-5">

      {/* ── Stat chips ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Net P&L",       value: fmtD(netPnl),      accent: netPnl >= 0 ? "text-emerald-400" : "text-red-400", icon: DollarSign },
          { label: "Win Rate",      value: `${winRate.toFixed(1)}%`, accent: winRate >= 50 ? "text-emerald-400" : "text-red-400", icon: Trophy },
          { label: "Profit Factor", value: profitFactor >= 99 ? "∞" : profitFactor.toFixed(2), accent: profitFactor >= 1.5 ? "text-emerald-400" : profitFactor >= 1 ? "text-amber-400" : "text-red-400", icon: TrendingUp },
          { label: "Avg Win",       value: `+$${avgWin.toFixed(2)}`,  accent: "text-emerald-400", icon: Zap },
          { label: "Avg Loss",      value: `-$${avgLoss.toFixed(2)}`, accent: "text-red-400",     icon: TrendingDown },
          { label: "Max Drawdown",  value: maxDDPct > 0 ? `-${maxDDPct.toFixed(2)}%` : "0.00%", accent: maxDDPct > 0 ? "text-orange-400" : "text-zinc-500", icon: Activity },
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

      {/* ── Secondary stats row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {[
          { label: "Trades",    value: totalTrades },
          { label: "Wins",      value: wins,   accent: "text-emerald-400" },
          { label: "Losses",    value: losses, accent: "text-red-400" },
          { label: "Best Day",  value: bestDay > 0 ? `+$${bestDay.toFixed(2)}` : "$0.00", accent: bestDay > 0 ? "text-emerald-400" : "text-zinc-500" },
          { label: "Worst Day", value: worstDay < 0 ? `-$${Math.abs(worstDay).toFixed(2)}` : "$0.00", accent: worstDay < 0 ? "text-red-400" : "text-zinc-500" },
          { label: "Gross Win", value: `+$${grossProfit.toFixed(2)}`, accent: "text-emerald-400" },
          { label: "Gross Loss",value: `-$${grossLoss.toFixed(2)}`,   accent: "text-red-400" },
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
              {fmtD(netPnl)} total
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
                      {fmtD(s.pnl)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    <span>{s.trades}T</span>
                    <span className={wr >= 50 ? "text-emerald-500" : "text-red-500"}>{wr.toFixed(0)}% WR</span>
                  </div>
                  {/* Win rate bar */}
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

        {/* By Day of Week */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> By Day of Week
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dowArr.map((d: DowEntry, i: number) => {
              if (i === 0 || i === 6) return null; // Skip Sun/Sat for forex
              const wr = d.trades > 0 ? (d.wins / d.trades) * 100 : 0;
              const barPct = dowMax > 0 ? (Math.abs(d.pnl) / dowMax) * 100 : 0;
              return (
                <div key={d.day} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 w-8 shrink-0">{d.day}</span>
                  <div className="flex-1 h-5 bg-white/4 rounded overflow-hidden relative">
                    {d.trades > 0 && (
                      <div
                        className={cn("h-full rounded", d.pnl >= 0 ? "bg-emerald-500/40" : "bg-red-500/40")}
                        style={{ width: `${barPct}%` }}
                      />
                    )}
                  </div>
                  <span className={cn("text-[10px] font-mono w-16 text-right shrink-0", d.pnl >= 0 ? "text-emerald-400" : d.pnl < 0 ? "text-red-400" : "text-zinc-600")}>
                    {d.trades > 0 ? fmtD(d.pnl) : " - "}
                  </span>
                  <span className="text-[9px] text-zinc-600 w-8 text-right shrink-0">
                    {d.trades > 0 ? `${wr.toFixed(0)}%` : ""}
                  </span>
                </div>
              );
            })}
            {/* Also show weekend totals compact */}
            {(dowArr[0].trades > 0 || dowArr[6].trades > 0) && (
              <div className="pt-1 border-t border-white/5 flex gap-3">
                {[dowArr[0], dowArr[6]].map(d => d.trades > 0 ? (
                  <span key={d.day} className="text-[9px] text-zinc-600">
                    {d.day}: {fmtD(d.pnl)} ({d.trades}T)
                  </span>
                ) : null)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <BarChart2 className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Monthly Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {byMonth.length === 0 && <p className="text-xs text-zinc-600">No data</p>}
              {byMonth.map(([month, m]: [string, SymStat]) => {
                const wr = m.trades > 0 ? (m.wins / m.trades) * 100 : 0;
                return (
                  <div key={month} className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2">
                    <span className="text-[10px] text-zinc-500 w-14 shrink-0">{month}</span>
                    <span className={cn("text-xs font-bold font-mono flex-1", m.pnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {fmtD(m.pnl)}
                    </span>
                    <span className="text-[9px] text-zinc-600">{m.trades}T</span>
                    <span className={cn("text-[9px] font-semibold", wr >= 50 ? "text-emerald-500" : "text-red-500")}>
                      {wr.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
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
