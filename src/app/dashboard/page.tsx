"use client";

import React, { useState, useCallback } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import {
  RefreshCw, Zap, CalendarDays, ArrowRight,
  ChevronDown, ChevronUp, Shield, TrendingDown, TrendingUp,
  Clock, BarChart3,
} from "lucide-react";
import Link from "next/link";
import { TradingViewChart } from "@/components/shared/TradingViewChart";
import { CatalystFeed } from "@/components/shared/CatalystFeed";
import { AssetSnapshotGrid } from "@/components/shared/AssetSnapshotGrid";
import { EconomicEventTable } from "@/components/shared/EconomicEventTable";
import { TrumpImpactPreview } from "@/components/shared/TrumpFeedPanel";
import { TradeContextBox } from "@/components/shared/TradeContextBox";
import { SessionSummaryCard } from "@/components/shared/SessionSummaryCard";
import {
  useQuotes, useEconomicCalendar, useTrumpPosts,
  useCatalysts, useSessions, useMarketAnalysis,
} from "@/hooks/useMarketData";
import type { AgentRunResult, Symbol, Timeframe } from "@/lib/agents/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SYMBOLS: { id: Symbol; tv: string; label: string; short: string }[] = [
  { id: "XAUUSD", tv: "OANDA:XAUUSD",    label: "Gold",    short: "XAU" },
  { id: "EURUSD", tv: "OANDA:EURUSD",    label: "EUR/USD", short: "EUR" },
  { id: "GBPUSD", tv: "OANDA:GBPUSD",    label: "GBP/USD", short: "GBP" },
  { id: "BTCUSD", tv: "BITSTAMP:BTCUSD", label: "Bitcoin", short: "BTC" },
];

const TIMEFRAMES: Timeframe[] = ["M5", "M15", "H1", "H4"];

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error("Failed");
  return r.json() as Promise<AgentRunResult>;
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function biasColor(bias: string) {
  if (bias === "bullish") return "text-emerald-400";
  if (bias === "bearish") return "text-red-400";
  return "text-zinc-500";
}

function signalStateConfig(state?: string) {
  switch (state) {
    case "ARMED":   return { bg: "bg-emerald-500/15 border-emerald-500/40", text: "text-emerald-300", dot: "bg-emerald-400 animate-pulse", label: "ARMED — ENTER NOW" };
    case "PENDING": return { bg: "bg-amber-500/10 border-amber-500/30",    text: "text-amber-300",   dot: "bg-amber-400",                  label: "PENDING — WAIT" };
    case "EXPIRED": return { bg: "bg-zinc-800/60 border-zinc-600/30",       text: "text-zinc-400",    dot: "bg-zinc-500",                   label: "EXPIRED — STAND ASIDE" };
    default:        return { bg: "bg-zinc-900/60 border-zinc-700/20",       text: "text-zinc-500",    dot: "bg-zinc-600",                   label: "NO TRADE" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro components
// ─────────────────────────────────────────────────────────────────────────────

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-zinc-600 font-medium leading-none">{label}</span>
      <span className={cn("text-[11px] font-mono font-semibold leading-none", color ?? "text-zinc-200")}>{value}</span>
    </div>
  );
}

function AgentRow({ label, bias, conf, color }: { label: string; bias: string; conf: number; color: string }) {
  return (
    <div className="flex items-center gap-2 py-[3px]">
      <span className="text-[10px] text-zinc-500 w-[72px] shrink-0 truncate">{label}</span>
      <div className="flex-1 h-[3px] bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${conf}%`, backgroundColor: color }} />
      </div>
      <span className={cn("text-[10px] font-mono w-7 text-right shrink-0", biasColor(bias))}>
        {bias === "bullish" ? "+" : bias === "bearish" ? "−" : "·"}{conf}
      </span>
    </div>
  );
}

function SectionHeader({ icon, label, action }: { icon: React.ReactNode; label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-semibold">{label}</span>
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [symbol, setSymbol]     = useState<Symbol>("XAUUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showBottom, setShowBottom] = useState(true);

  const symCfg = SYMBOLS.find(s => s.id === symbol)!;

  // Agent data
  const { data, isLoading, mutate } = useSWR<AgentRunResult>(
    `/api/agents/run?symbol=${symbol}&timeframe=${timeframe}&t=${refreshKey}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  const handleRefresh = useCallback(async () => {
    setRefreshKey(k => k + 1);
    await mutate();
  }, [mutate]);

  // Context data
  const { quotes }       = useQuotes();
  const { events }       = useEconomicCalendar();
  const { posts: trump } = useTrumpPosts();
  const { catalysts }    = useCatalysts();
  const { sessions }     = useSessions();
  const { tradeContext } = useMarketAnalysis();

  const upcomingEvts = events.filter(e => e.status === "upcoming" || e.status === "live");
  const calPreview   = upcomingEvts.length > 0 ? upcomingEvts.slice(0, 4) : events.slice(0, 4);

  // Derived
  const master     = data?.agents.master;
  const exec       = data?.agents.execution;
  const risk       = data?.agents.risk;
  const trend      = data?.agents.trend;
  const smc        = data?.agents.smc;
  const news       = data?.agents.news;
  const contrarian = data?.agents.contrarian;
  const snap       = data?.snapshot;
  const tradePlan  = master?.tradePlan;

  const finalBias  = master?.finalBias ?? "no-trade";
  const isNoTrade  = finalBias === "no-trade";
  const sigState   = isNoTrade ? "NO_TRADE" : exec?.signalState;
  const sigCfg     = signalStateConfig(sigState);

  const curPrice   = snap?.price.current ?? 0;
  const priceFmt   = curPrice > 0
    ? curPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: curPrice > 100 ? 2 : 5 })
    : "—";

  return (
    <div className="flex flex-col h-full min-h-0" style={{ fontSize: "11px", color: "#e4e4e7" }}>

      {/* ── TOP BAR ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 bg-[#0a0b0f] shrink-0 flex-wrap gap-y-1">

        {/* Symbol selector */}
        <div className="flex gap-0.5">
          {SYMBOLS.map(s => (
            <button key={s.id} onClick={() => setSymbol(s.id)}
              className={cn("px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-all",
                symbol === s.id
                  ? "bg-[hsl(var(--primary))]/20 border-[hsl(var(--primary))]/40 text-[hsl(var(--primary))]"
                  : "border-transparent text-zinc-600 hover:text-zinc-300"
              )}>
              {s.short}
            </button>
          ))}
        </div>

        <span className="w-px h-3.5 bg-white/10" />

        {/* Timeframe */}
        <div className="flex gap-0.5">
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => setTimeframe(tf)}
              className={cn("px-2 py-1 rounded text-[10px] font-mono transition-all",
                timeframe === tf ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-300"
              )}>
              {tf}
            </button>
          ))}
        </div>

        <span className="w-px h-3.5 bg-white/10" />

        {/* Live price */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] text-zinc-500">{symCfg.label}</span>
          <span className="font-mono font-bold text-[14px] text-zinc-100">{priceFmt}</span>
          {snap && (
            <>
              <StatCell label="RSI" value={String(snap.indicators?.rsi ?? 50)}
                color={(snap.indicators?.rsi ?? 50) > 70 ? "text-red-400" : (snap.indicators?.rsi ?? 50) < 30 ? "text-emerald-400" : "text-zinc-300"} />
              <StatCell label="Session" value={snap.indicators?.session ?? "—"} />
              <StatCell label="Zone" value={snap.structure?.zone ?? "—"} />
            </>
          )}
        </div>

        {/* Signal badge + refresh — right */}
        <div className="ml-auto flex items-center gap-2">
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider", sigCfg.bg, sigCfg.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", sigCfg.dot)} />
            {sigCfg.label}{master?.confidence ? ` · ${master.confidence}%` : ""}
          </div>
          <button onClick={handleRefresh} disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 rounded border border-white/10 text-[10px] text-zinc-500 hover:text-zinc-200 hover:border-white/20 transition-all">
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            {isLoading ? "Running…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── 3-COLUMN MAIN AREA ───────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT PANEL — agents (25%) */}
        <div className="w-60 xl:w-64 shrink-0 border-r border-white/5 overflow-y-auto bg-[#0a0b0f]">

          {/* Agent bars */}
          <div className="px-3 py-2.5 border-b border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-semibold">Agents</span>
              <span className={cn("text-[10px] font-bold", biasColor(finalBias))}>
                {isNoTrade ? "NO TRADE" : finalBias.toUpperCase()}
              </span>
            </div>
            {isLoading && !data
              ? <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-3.5 bg-white/5 rounded animate-pulse" />)}</div>
              : <div>
                  <AgentRow label="Trend"        bias={trend?.bias ?? "neutral"}      conf={trend?.confidence ?? 0}    color="#f87171" />
                  <AgentRow label="Price Action" bias={smc?.bias ?? "neutral"}        conf={smc?.confidence ?? 0}      color="#f87171" />
                  <AgentRow label="News"         bias={news?.impact ?? "neutral"}     conf={news?.confidence ?? 0}     color="#94a3b8" />
                  <AgentRow label="Execution"    bias={exec?.direction === "long" ? "bullish" : exec?.direction === "short" ? "bearish" : "neutral"} conf={exec?.hasSetup ? 75 : 30} color="#f87171" />
                  <AgentRow label="Contrarian"   bias={contrarian?.challengesBias ? "bearish" : "neutral"} conf={contrarian?.riskFactor ?? 0} color="#fbbf24" />
                </div>
            }
          </div>

          {/* Consensus score */}
          {master && (
            <div className="px-3 py-2 border-b border-white/5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Score</span>
                <span className={cn("text-[11px] font-mono font-bold", master.consensusScore < 0 ? "text-red-400" : "text-emerald-400")}>
                  {master.consensusScore > 0 ? "+" : ""}{master.consensusScore.toFixed(1)}
                </span>
              </div>
              <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-600 z-10" />
                <div className={cn("absolute h-full rounded-full", master.consensusScore < 0 ? "bg-red-500" : "bg-emerald-500")}
                  style={{ width: `${Math.min(50, Math.abs(master.consensusScore) / 2)}%`, left: master.consensusScore < 0 ? `${50 - Math.min(50, Math.abs(master.consensusScore) / 2)}%` : "50%" }} />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-zinc-700">BEAR</span>
                <span className="text-[9px] text-zinc-700">BULL</span>
              </div>
            </div>
          )}

          {/* Risk gate */}
          {risk && (
            <div className="px-3 py-2 border-b border-white/5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Risk Gate</span>
                <span className={cn("text-[10px] font-bold", risk.valid ? "text-emerald-400" : "text-red-400")}>
                  {risk.valid ? "VALID" : "BLOCKED"} · {risk.grade}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-600 w-12">Vol</span>
                  <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${risk.volatilityScore}%` }} />
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 w-5 text-right">{risk.volatilityScore}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-600 w-12">Session</span>
                  <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${risk.sessionScore}%` }} />
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 w-5 text-right">{risk.sessionScore}</span>
                </div>
              </div>
              {!risk.valid && risk.warnings?.[0] && (
                <p className="text-[9px] text-red-400/60 mt-1.5 leading-snug">{risk.warnings[0]}</p>
              )}
            </div>
          )}

          {/* News */}
          {news && (
            <div className="px-3 py-2 border-b border-white/5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest">News</span>
                <span className={cn("text-[10px] font-bold", biasColor(news.impact))}>{news.impact.toUpperCase()}</span>
              </div>
              <div className="flex gap-3">
                <StatCell label="Regime"     value={news.regime ?? "—"} />
                <StatCell label="Risk"       value={`${news.riskScore ?? 0}/100`} color={(news.riskScore ?? 0) > 70 ? "text-red-400" : (news.riskScore ?? 0) > 40 ? "text-amber-400" : "text-emerald-400"} />
                <StatCell label="Catalysts"  value={String(news.catalysts?.length ?? 0)} />
              </div>
            </div>
          )}

          {/* Contrarian */}
          {contrarian && (
            <div className="px-3 py-2 border-b border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Contrarian</span>
                <span className={cn("text-[10px] font-bold", contrarian.challengesBias ? "text-amber-400" : "text-zinc-600")}>
                  {contrarian.challengesBias ? "⚠ ALERT" : "CLEAR"}
                </span>
              </div>
              {contrarian.trapType && contrarian.trapType !== "None" && (
                <p className="text-[9px] text-amber-400/60 mt-1 leading-snug">{contrarian.trapType}</p>
              )}
            </div>
          )}

          {/* Brain terminal link */}
          <div className="px-3 py-3">
            <Link href="/dashboard/brain" className="flex items-center justify-between text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors py-1.5 px-2 rounded hover:bg-white/5">
              <span>Full Brain Terminal</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* CENTER PANEL — Chart + trade plan (fill remaining) */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-white/5 overflow-hidden">

          {/* Chart — fills space */}
          <div className="flex-1 min-h-0">
            <TradingViewChart symbol={symCfg.tv} />
          </div>

          {/* Execution strip below chart */}
          <div className="shrink-0 border-t border-white/5 bg-[#0a0b0f] px-3 py-2">
            {isLoading && !data
              ? <div className="flex gap-4">{[...Array(5)].map((_, i) => <div key={i} className="h-7 w-20 bg-white/5 rounded animate-pulse" />)}</div>
              : tradePlan
                ? (
                  <div>
                    <div className="flex items-center gap-4 flex-wrap gap-y-1">
                      <div className="flex items-center gap-1.5">
                        {tradePlan.direction === "long"
                          ? <TrendingUp className="h-3 w-3 text-emerald-400" />
                          : <TrendingDown className="h-3 w-3 text-red-400" />}
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", tradePlan.direction === "long" ? "text-emerald-400" : "text-red-400")}>
                          {tradePlan.direction} · {tradePlan.trigger}
                        </span>
                      </div>
                      <span className="w-px h-3 bg-white/10" />
                      <StatCell label="Entry" value={tradePlan.entry.toFixed(tradePlan.entry > 100 ? 1 : 4)} color="text-zinc-100" />
                      <StatCell label="SL"    value={tradePlan.stopLoss.toFixed(tradePlan.stopLoss > 100 ? 1 : 4)} color="text-red-400" />
                      <StatCell label="TP1"   value={tradePlan.tp1.toFixed(tradePlan.tp1 > 100 ? 1 : 4)} color="text-emerald-400" />
                      {tradePlan.tp2 && <StatCell label="TP2" value={tradePlan.tp2.toFixed(tradePlan.tp2 > 100 ? 1 : 4)} color="text-emerald-300" />}
                      <StatCell label="RR" value={`${tradePlan.rrRatio}:1`} color={(tradePlan.rrRatio ?? 0) >= 2 ? "text-emerald-400" : "text-amber-400"} />
                      <StatCell label="Max Risk" value={`${tradePlan.maxRiskPercent}%`} />
                      <Link href="/dashboard/brain" className="ml-auto text-[9px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1">
                        Full plan <ArrowRight className="h-2.5 w-2.5" />
                      </Link>
                    </div>
                    {exec?.signalStateReason && !isNoTrade && (
                      <p className={cn("text-[10px] mt-1", sigCfg.text)}>{exec.signalStateReason}</p>
                    )}
                  </div>
                )
                : (
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-zinc-700 shrink-0" />
                    <span className="text-[10px] text-zinc-600">{master?.noTradeReason ?? "No active trade plan — stand aside and monitor"}</span>
                    <Link href="/dashboard/brain" className="ml-auto text-[9px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 shrink-0">
                      Brain Terminal <ArrowRight className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                )
            }
          </div>
        </div>

        {/* RIGHT PANEL — context (fixed width) */}
        <div className="w-64 xl:w-72 shrink-0 overflow-y-auto bg-[#0a0b0f]">

          {/* Catalysts */}
          <div className="px-3 py-2 border-b border-white/5">
            <SectionHeader
              icon={<Zap className="h-3 w-3 text-amber-400" />}
              label="Top Catalysts"
              action={<Link href="/dashboard/catalysts" className="text-[9px] text-zinc-600 hover:text-zinc-400">All →</Link>}
            />
            <CatalystFeed catalysts={catalysts} limit={3} compact />
          </div>

          {/* Events */}
          <div className="px-3 py-2 border-b border-white/5">
            <SectionHeader
              icon={<CalendarDays className="h-3 w-3 text-blue-400" />}
              label="Upcoming Events"
              action={<Link href="/dashboard/economic-calendar" className="text-[9px] text-zinc-600 hover:text-zinc-400">Cal →</Link>}
            />
            <EconomicEventTable events={calPreview} compact />
          </div>

          {/* Trump */}
          <div className="px-3 py-2 border-b border-white/5">
            <TrumpImpactPreview posts={trump} />
          </div>

          {/* AI Trade Context */}
          <div className="px-3 py-2 border-b border-white/5">
            <TradeContextBox context={tradeContext} />
          </div>

          {/* Sessions */}
          <div className="px-3 py-2">
            <SectionHeader icon={<Clock className="h-3 w-3 text-zinc-500" />} label="Sessions" />
            <div className="space-y-1.5">
              {sessions.filter(s => s.status === "active" || s.status === "closed").slice(0, 3).map(s => (
                <SessionSummaryCard key={s.session} session={s} compact />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Collapsible cross-asset ──────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/5 bg-[#08090c]">
        <button onClick={() => setShowBottom(v => !v)}
          className="w-full flex items-center justify-between px-3 py-1 text-zinc-600 hover:text-zinc-400 transition-colors">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3" />
            <span className="text-[9px] uppercase tracking-widest font-semibold">Cross-Asset Snapshot</span>
          </div>
          {showBottom ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>
        {showBottom && (
          <div className="px-3 pb-2">
            <AssetSnapshotGrid assets={quotes} />
          </div>
        )}
      </div>
    </div>
  );
}
