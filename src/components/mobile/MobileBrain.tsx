"use client";

import React, { useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import {
  RefreshCw, Shield, TrendingUp, TrendingDown, Newspaper,
  ChevronDown, ChevronUp, Target, Clock, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRunResult, Symbol, Timeframe, SignalState } from "@/lib/agents/schemas";
import { DebateLog } from "@/components/brain/DebateLog";
import { AgentCommandRoom } from "@/components/brain/AgentCommandRoom";

const SYMBOLS: { id: Symbol; label: string }[] = [
  { id: "XAUUSD", label: "Gold"    },
  { id: "EURUSD", label: "EUR/USD" },
  { id: "GBPUSD", label: "GBP/USD" },
  { id: "BTCUSD", label: "BTC"     },
];

const TIMEFRAMES: Timeframe[] = ["M5", "M15", "H1", "H4"];

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error("Failed");
  return r.json() as Promise<AgentRunResult>;
});

// ── Primitives ────────────────────────────────────────────────────────────────

function biasColor(bias?: string) {
  if (bias === "bullish") return "text-emerald-400";
  if (bias === "bearish") return "text-red-400";
  return "text-zinc-500";
}

function GradeBadge({ grade }: { grade?: string }) {
  if (!grade) return null;
  const cfg: Record<string, string> = {
    "A+": "text-emerald-200 bg-emerald-500/25 border-emerald-400/50",
    "A":  "text-emerald-300 bg-emerald-500/15 border-emerald-500/35",
    "B+": "text-amber-300   bg-amber-500/15   border-amber-400/35",
    "B":  "text-amber-400   bg-amber-500/10   border-amber-500/25",
    "C":  "text-zinc-500    bg-zinc-800        border-zinc-700",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-black tracking-widest", cfg[grade] ?? cfg["C"])}>
      {grade}
    </span>
  );
}

function StatRow({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-white/5 last:border-0 gap-2">
      <span className="text-[11px] text-zinc-500 shrink-0">{label}</span>
      <div className="text-right min-w-0">
        <span className={cn("text-[11px] font-mono font-semibold", color ?? "text-zinc-200")}>{value}</span>
        {sub && <p className="text-[9px] text-zinc-600 mt-0.5 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

function AgentBar({ label, bias, conf, color }: { label: string; bias: string; conf: number; color: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-[10px] text-zinc-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${conf}%`, backgroundColor: color }} />
      </div>
      <div className="w-16 text-right shrink-0 flex items-center justify-end gap-1">
        <span className={cn("text-[10px] font-bold", biasColor(bias))}>
          {bias === "bullish" ? "▲" : bias === "bearish" ? "▼" : "–"}
        </span>
        <span className="text-[10px] font-mono text-zinc-500">{conf}%</span>
      </div>
    </div>
  );
}

// ── Signal State Banner ───────────────────────────────────────────────────────

const SIG_CFG: Record<SignalState, { label: string; emoji: string; bg: string; border: string; text: string; sub: string }> = {
  ARMED:    { label: "ENTER NOW",        emoji: "🟢", bg: "bg-emerald-500/12", border: "border-emerald-500/35", text: "text-emerald-300", sub: "text-emerald-300/60" },
  PENDING:  { label: "PENDING",          emoji: "🟡", bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-300",   sub: "text-amber-300/60"   },
  EXPIRED:  { label: "EXPIRED",          emoji: "⚪", bg: "bg-zinc-800/50",    border: "border-zinc-600/25",    text: "text-zinc-400",    sub: "text-zinc-600"       },
  WAIT:     { label: "WAIT",             emoji: "🟠", bg: "bg-orange-500/10",  border: "border-orange-500/30",  text: "text-orange-300",  sub: "text-orange-300/60"  },
  NO_TRADE: { label: "NO TRADE",         emoji: "⛔", bg: "bg-zinc-900/60",    border: "border-zinc-700/20",    text: "text-zinc-500",    sub: "text-zinc-600"       },
};

function SignalBanner({
  state,
  reason,
  grade,
  confidence,
  confluenceCount,
  distanceToEntry,
}: {
  state: SignalState;
  reason?: string;
  grade?: string;
  confidence?: number;
  confluenceCount?: number;
  distanceToEntry?: number | null;
}) {
  const c = SIG_CFG[state] ?? SIG_CFG.NO_TRADE;
  return (
    <div className={cn("rounded-2xl border px-4 py-3.5", c.bg, c.border)}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-base">{c.emoji}</span>
        <span className={cn("text-[13px] font-black uppercase tracking-wider", c.text)}>{c.label}</span>
        {grade && <GradeBadge grade={grade} />}
        {confidence != null && (
          <span className="ml-auto text-[11px] font-mono text-zinc-500">{confidence}% conf</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
        {confluenceCount != null && (
          <span className={cn("font-semibold", c.sub)}>
            Confluence {confluenceCount}/10
          </span>
        )}
        {distanceToEntry != null && state !== "NO_TRADE" && state !== "WAIT" && (
          <span className={cn("font-mono", c.sub)}>
            {distanceToEntry.toFixed(2)}% from entry
          </span>
        )}
      </div>
      {reason && (
        <p className={cn("mt-2 text-[10px] leading-snug", c.sub)}>{reason}</p>
      )}
    </div>
  );
}

// ── Trade Plan Card ───────────────────────────────────────────────────────────

function TradePlanCard({ tradePlan }: { tradePlan: NonNullable<AgentRunResult["agents"]["master"]["tradePlan"]> }) {
  const [showDetails, setShowDetails] = useState(false);
  const isLong = tradePlan.direction === "long";
  const dirColor = isLong ? "text-emerald-400" : "text-red-400";
  const dirBg    = isLong ? "bg-emerald-500/8 border-emerald-500/20" : "bg-red-500/8 border-red-500/20";
  const p        = tradePlan.entry > 100 ? 2 : 4;
  const riskPts  = Math.abs(tradePlan.entry - tradePlan.stopLoss);

  const tpRows = [
    { label: "TP1", value: tradePlan.tp1,  color: "text-emerald-400", r: (Math.abs(tradePlan.tp1 - tradePlan.entry) / riskPts).toFixed(1) },
    tradePlan.tp2 ? { label: "TP2", value: tradePlan.tp2, color: "text-emerald-300", r: (Math.abs(tradePlan.tp2 - tradePlan.entry) / riskPts).toFixed(1) } : null,
    tradePlan.tp3 ? { label: "TP3", value: tradePlan.tp3, color: "text-sky-400",     r: (Math.abs(tradePlan.tp3 - tradePlan.entry) / riskPts).toFixed(1) } : null,
  ].filter(Boolean) as { label: string; value: number; color: string; r: string }[];

  return (
    <div className={cn("rounded-2xl border overflow-hidden", dirBg)}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          {isLong
            ? <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
            : <TrendingDown className="h-4 w-4 text-red-400 shrink-0" />}
          <span className={cn("text-[13px] font-black uppercase tracking-wide", dirColor)}>
            {tradePlan.direction} · {tradePlan.trigger}
          </span>
          <GradeBadge grade={tradePlan.grade} />
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-black/20 rounded-xl border border-white/6 px-3 py-2 text-center">
            <p className="text-[9px] uppercase tracking-wider text-zinc-500">R:R</p>
            <p className={cn("text-[14px] font-black font-mono mt-0.5",
              (tradePlan.rrRatio ?? 0) >= 3 ? "text-emerald-400" : "text-amber-400")}>
              1:{tradePlan.rrRatio?.toFixed(1)}
            </p>
          </div>
          <div className="bg-black/20 rounded-xl border border-white/6 px-3 py-2 text-center">
            <p className="text-[9px] uppercase tracking-wider text-zinc-500">Conf</p>
            <p className="text-[14px] font-black font-mono mt-0.5 text-zinc-200">
              {tradePlan.confluenceCount ?? " - "}<span className="text-[10px] text-zinc-500">/10</span>
            </p>
          </div>
          <div className="bg-black/20 rounded-xl border border-white/6 px-3 py-2 text-center">
            <p className="text-[9px] uppercase tracking-wider text-zinc-500">Risk</p>
            <p className="text-[14px] font-black font-mono mt-0.5 text-zinc-200">{tradePlan.maxRiskPercent}%</p>
          </div>
        </div>

        {/* Entry / SL */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-black/15 rounded-xl border border-white/5 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="h-3 w-3 text-zinc-500" />
              <span className="text-[9px] uppercase tracking-wider text-zinc-500">Entry</span>
            </div>
            <p className={cn("text-[15px] font-black font-mono", dirColor)}>
              {tradePlan.entry.toFixed(p)}
            </p>
          </div>
          <div className="bg-black/15 rounded-xl border border-red-500/10 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="h-3 w-3 text-red-500/60" />
              <span className="text-[9px] uppercase tracking-wider text-zinc-500">Stop Loss</span>
            </div>
            <p className="text-[15px] font-black font-mono text-red-400">
              {tradePlan.stopLoss.toFixed(p)}
            </p>
            <p className="text-[9px] text-zinc-600 mt-0.5">−{riskPts.toFixed(p > 2 ? 1 : 0)} pts</p>
          </div>
        </div>

        {/* TP targets */}
        <div className={cn("grid gap-2", tpRows.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {tpRows.map(tp => (
            <div key={tp.label} className="bg-black/15 rounded-xl border border-emerald-500/10 px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500">{tp.label}</span>
                <span className="text-[9px] font-mono text-zinc-600">+{tp.r}R</span>
              </div>
              <p className={cn("text-[13px] font-black font-mono", tp.color)}>
                {tp.value.toFixed(p)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Confluence chips */}
      {tradePlan.confluenceFactors && tradePlan.confluenceFactors.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-2">Confluence factors</p>
          <div className="flex flex-wrap gap-1.5">
            {tradePlan.confluenceFactors.map(f => (
              <span key={f} className="text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 text-emerald-400">
                ✓ {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expandable details */}
      <button
        onClick={() => setShowDetails(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 border-t border-white/5 text-[10px] text-zinc-500 active:bg-white/3"
      >
        <span className="uppercase tracking-wider font-semibold">Trigger & Management</span>
        {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {showDetails && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5">
          <div className="pt-3">
            <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1.5">Trigger Condition</p>
            <p className="text-[11px] text-zinc-400 leading-relaxed">{tradePlan.triggerCondition}</p>
          </div>
          {tradePlan.managementNotes.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1.5">Trade Management</p>
              <div className="space-y-2">
                {tradePlan.managementNotes.map((note, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-zinc-600 mt-0.5 shrink-0">›</span>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── No-trade / Wait card ──────────────────────────────────────────────────────

function StandAsideCard({ exec, isWait }: {
  exec?: AgentRunResult["agents"]["execution"];
  isWait: boolean;
}) {
  return (
    <div className={cn(
      "rounded-2xl border px-4 py-4",
      isWait
        ? "bg-orange-500/5 border-orange-500/20"
        : "bg-zinc-900/50 border-zinc-700/20"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          isWait ? "bg-orange-500/15 border border-orange-500/25" : "bg-zinc-800 border border-zinc-700")}>
          {isWait
            ? <Clock className="h-4 w-4 text-orange-400" />
            : <Shield className="h-4 w-4 text-zinc-500" />}
        </div>
        <div>
          <p className={cn("text-[12px] font-bold", isWait ? "text-orange-300" : "text-zinc-400")}>
            {isWait ? "Monitoring  -  Suboptimal Setup" : "No Valid Setup"}
          </p>
          <p className="text-[11px] text-zinc-600 mt-1 leading-snug">
            {isWait
              ? "A setup was detected but doesn't meet A+ criteria. Waiting for better entry conditions."
              : "No structural setup confirmed. Stand aside and wait for price action confirmation."}
          </p>
          {exec?.grade && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Current grade:</span>
              <GradeBadge grade={exec.grade} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MobileBrain() {
  const [symbol, setSymbol] = useState<Symbol>("XAUUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [refreshing, setRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 5_000);
    return () => window.clearInterval(id);
  }, []);

  const { data, isLoading, mutate } = useSWR<AgentRunResult>(
    `/api/agents/run?symbol=${symbol}&timeframe=${timeframe}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await mutate(
        fetch("/api/agents/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol, timeframe, forceRefresh: true }),
        }).then(r => {
          if (!r.ok) throw new Error("Agent run failed");
          return r.json() as Promise<AgentRunResult>;
        }),
        { revalidate: false }
      );
    } finally {
      setRefreshing(false);
    }
  }, [mutate, symbol, timeframe]);

  const master     = data?.agents.master;
  const exec       = data?.agents.execution;
  const risk       = data?.agents.risk;
  const trend      = data?.agents.trend;
  const smc        = data?.agents.smc;
  const news       = data?.agents.news;
  const contrarian = data?.agents.contrarian;
  const tradePlan  = master?.tradePlan;
  const finalBias  = master?.finalBias ?? "no-trade";
  const isNoTrade  = finalBias === "no-trade";

  const sigState: SignalState = isNoTrade
    ? "NO_TRADE"
    : (exec?.signalState ?? "NO_TRADE");

  const isWaitState = sigState === "WAIT";

  const [view, setView] = useState<"brain" | "newsroom">("brain");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-white/5 px-4 pt-2">
        {[
          { id: "brain"    as const, label: "Brain",    icon: Shield   },
          { id: "newsroom" as const, label: "Agent HQ", icon: Newspaper },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setView(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider border-b-2 transition-all -mb-px",
              view === id
                ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                : "border-transparent text-zinc-500"
            )}>
            <Icon className="w-3 h-3" />{label}
          </button>
        ))}
      </div>

      {/* Agent HQ */}
      {view === "newsroom" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <AgentCommandRoom data={data ?? null} loading={isLoading && !data} />
        </div>
      )}

      {/* Brain view */}
      {view === "brain" && (
        <div className="overflow-y-auto overflow-x-hidden flex-1 px-4 py-4 space-y-4 pb-24 min-w-0">

          {/* Symbol + TF row */}
          <div className="flex gap-2 flex-wrap">
            {SYMBOLS.map(s => (
              <button key={s.id} onClick={() => setSymbol(s.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all",
                  symbol === s.id
                    ? "bg-[hsl(var(--primary))]/20 border-[hsl(var(--primary))]/40 text-[hsl(var(--primary))]"
                    : "border-white/10 text-zinc-500"
                )}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {TIMEFRAMES.map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-mono transition-all",
                  timeframe === tf ? "bg-white/10 text-white" : "text-zinc-600"
                )}>
                {tf}
              </button>
            ))}
            {data && nowMs - new Date(data.timestamp).getTime() > 90_000 && !(isLoading || refreshing) && (
              <span className="ml-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] border border-amber-500/20 text-amber-500">STALE</span>
            )}
            <button onClick={handleRefresh} disabled={isLoading || refreshing}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-[10px] text-zinc-500 disabled:opacity-60">
              <RefreshCw className={cn("h-3 w-3", (isLoading || refreshing) && "animate-spin")} />
              {(isLoading || refreshing) ? "Running…" : "Refresh"}
            </button>
          </div>

          {/* Loading skeleton */}
          {isLoading && !data && (
            <div className="space-y-3 animate-pulse">
              <div className="h-20 rounded-2xl bg-white/5" />
              <div className="h-64 rounded-2xl bg-white/5" />
              <div className="h-32 rounded-2xl bg-white/5" />
            </div>
          )}

          {/* Signal State Banner */}
          {data && (
            <SignalBanner
              state={sigState}
              reason={exec?.signalStateReason ?? master?.noTradeReason}
              grade={exec?.grade}
              confidence={master?.confidence}
              confluenceCount={exec?.confluenceCount}
              distanceToEntry={exec?.distanceToEntry}
            />
          )}

          {/* Trade Plan / Stand aside  -  skeleton during refresh so stale state isn't shown */}
          {(isLoading || refreshing) && data ? (
            <div className="h-48 rounded-2xl bg-white/5 animate-pulse" />
          ) : tradePlan ? (
            <TradePlanCard tradePlan={tradePlan} />
          ) : data ? (
            <StandAsideCard exec={exec} isWait={isWaitState} />
          ) : null}

          {/* Agent Consensus */}
          {data && (
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-white/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">Agent Consensus</p>
              <AgentBar label="Trend"        bias={trend?.bias ?? "neutral"}      conf={trend?.confidence ?? 0}    color="#10b981" />
              <AgentBar label="Price Action" bias={smc?.bias ?? "neutral"}        conf={smc?.confidence ?? 0}      color="#10b981" />
              <AgentBar label="News"         bias={news?.impact ?? "neutral"}     conf={news?.confidence ?? 0}     color="#94a3b8" />
              <AgentBar label="Execution"    bias={exec?.direction === "long" ? "bullish" : exec?.direction === "short" ? "bearish" : "neutral"} conf={exec?.hasSetup ? (exec.confluenceCount ?? 0) * 10 : 20} color="#10b981" />
              <AgentBar label="Contrarian"   bias={contrarian?.challengesBias ? "bearish" : "neutral"} conf={contrarian?.riskFactor ?? 0} color="#f59e0b" />

              {master && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-zinc-500">Consensus Score</span>
                    <span className={cn("text-[12px] font-black font-mono", master.consensusScore < 0 ? "text-red-400" : "text-emerald-400")}>
                      {master.consensusScore > 0 ? "+" : ""}{master.consensusScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-2 relative h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-600 z-10" />
                    <div
                      className={cn("absolute h-full rounded-full", master.consensusScore < 0 ? "bg-red-500" : "bg-emerald-500")}
                      style={{
                        width: `${Math.min(50, Math.abs(master.consensusScore) / 2)}%`,
                        left: master.consensusScore < 0
                          ? `${50 - Math.min(50, Math.abs(master.consensusScore) / 2)}%`
                          : "50%",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Risk Gate */}
          {risk && (
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Risk Gate</span>
                </div>
                <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded border",
                  risk.valid
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                    : "text-red-400 bg-red-500/10 border-red-500/25"
                )}>
                  {risk.valid ? "VALID" : "BLOCKED"} · {risk.grade}
                </span>
              </div>
              <StatRow label="Volatility" value={`${risk.volatilityScore}/100`}
                color={risk.volatilityScore > 70 ? "text-amber-400" : "text-zinc-200"} />
              <StatRow label="Session"    value={`${risk.sessionScore}/100`}
                color={risk.sessionScore > 70 ? "text-emerald-400" : "text-zinc-200"} />
              {!risk.valid && risk.warnings?.[0] && (
                <div className="mt-2 flex items-start gap-2 text-[10px] text-red-400/70">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  <p className="leading-snug">{risk.warnings[0]}</p>
                </div>
              )}
            </div>
          )}

          {/* News + Contrarian */}
          {(news || contrarian) && (
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-white/5 p-4 space-y-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">Market Context</p>
              {news && (
                <>
                  <StatRow label="News Impact"   value={news.impact.toUpperCase()}          color={biasColor(news.impact)} />
                  <StatRow label="Regime"         value={news.regime ?? " - "} />
                  <StatRow label="Macro Risk"     value={`${news.riskScore ?? 0}/100`}
                    color={(news.riskScore ?? 0) > 70 ? "text-red-400" : (news.riskScore ?? 0) > 40 ? "text-amber-400" : "text-zinc-200"} />
                </>
              )}
              {contrarian && (
                <>
                  <StatRow
                    label="Contrarian"
                    value={contrarian.challengesBias ? "⚠ ALERT" : "CLEAR"}
                    color={contrarian.challengesBias ? "text-amber-400" : "text-zinc-500"}
                    sub={contrarian.trapType && contrarian.trapType !== "None" ? contrarian.trapType : undefined}
                  />
                </>
              )}
            </div>
          )}

          {/* Agent Debate Log */}
          {data?.debate && data.debate.length > 0 && (
            <div className="bg-[hsl(var(--card))] rounded-2xl border border-white/5 p-4">
              <DebateLog debate={data.debate} loading={false} />
            </div>
          )}

          {/* Empty state */}
          {!data && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-12 w-12 rounded-full border border-white/10 bg-white/3 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-zinc-600" />
              </div>
              <p className="text-[12px] text-zinc-600">Tap Refresh to run agent analysis</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
