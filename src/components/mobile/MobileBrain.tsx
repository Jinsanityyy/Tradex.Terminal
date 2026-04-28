"use client";

import React, { useState, useCallback } from "react";
import useSWR from "swr";
import { RefreshCw, Shield, TrendingUp, TrendingDown, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRunResult, Symbol, Timeframe } from "@/lib/agents/schemas";
import { DebateLog } from "@/components/brain/DebateLog";
import { TradexNewsroom } from "@/components/brain/TradexNewsroom";
import { AgentCommandRoom } from "@/components/brain/AgentCommandRoom";

const SYMBOLS: { id: Symbol; label: string; tv: string }[] = [
  { id: "XAUUSD", label: "Gold",    tv: "OANDA:XAUUSD" },
  { id: "EURUSD", label: "EUR/USD", tv: "FX:EURUSD" },
  { id: "GBPUSD", label: "GBP/USD", tv: "FX:GBPUSD" },
  { id: "BTCUSD", label: "BTC",     tv: "COINBASE:BTCUSD" },
];

const TIMEFRAMES: Timeframe[] = ["M5", "M15", "H1", "H4"];

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error("Failed");
  return r.json() as Promise<AgentRunResult>;
});

function biasColor(bias?: string) {
  if (bias === "bullish") return "text-emerald-400";
  if (bias === "bearish") return "text-red-400";
  return "text-zinc-500";
}

function AgentBar({ label, bias, conf, color }: { label: string; bias: string; conf: number; color: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] text-zinc-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${conf}%`, backgroundColor: color }} />
      </div>
      <span className={cn("text-[10px] font-mono w-8 text-right shrink-0", biasColor(bias))}>
        {bias === "bullish" ? "+" : bias === "bearish" ? "−" : "·"}{conf}
      </span>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span className={cn("text-[11px] font-mono font-semibold", color ?? "text-zinc-200")}>{value}</span>
    </div>
  );
}

export function MobileBrain() {
  const [symbol, setSymbol] = useState<Symbol>("XAUUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, mutate } = useSWR<AgentRunResult>(
    `/api/agents/run?symbol=${symbol}&timeframe=${timeframe}&t=${refreshKey}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  const handleRefresh = useCallback(async () => {
    setRefreshKey(k => k + 1);
    await mutate();
  }, [mutate]);

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

  // Signal state
  const sigState = isNoTrade ? "NO_TRADE" : exec?.signalState;
  const sigLabel = sigState === "ARMED" ? "🟢 ARMED — ENTER NOW"
    : sigState === "PENDING" ? "🟡 PENDING — WAIT"
    : sigState === "EXPIRED" ? "⚪ EXPIRED — STAND ASIDE"
    : "⛔ NO TRADE";
  const sigColor = sigState === "ARMED" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    : sigState === "PENDING" ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
    : sigState === "EXPIRED" ? "text-zinc-400 bg-zinc-800/60 border-zinc-600/30"
    : "text-zinc-500 bg-zinc-900/60 border-zinc-700/20";

  const [view, setView] = useState<"brain" | "newsroom">("brain");

  return (
    <div className="flex flex-col h-full">
      {/* View toggle */}
      <div className="flex shrink-0 border-b border-white/5 px-4 pt-2">
        {[
          { id: "brain" as const, label: "Brain", icon: Shield },
          { id: "newsroom" as const, label: "Agent HQ", icon: Newspaper },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setView(id)}
            className={cn("flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider border-b-2 transition-all -mb-px",
              view === id ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]" : "border-transparent text-zinc-500")}>
            <Icon className="w-3 h-3" />{label}
          </button>
        ))}
      </div>

      {/* Newsroom / Agent HQ view */}
      {view === "newsroom" && (
        <div className="flex-1 overflow-y-auto">
          <AgentCommandRoom data={data ?? null} loading={isLoading && !data} />
        </div>
      )}

      {/* Brain view */}
      {view === "brain" && (
    <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4 pb-24">

      {/* Symbol + TF selector */}
      <div className="flex gap-2 flex-wrap">
        {SYMBOLS.map(s => (
          <button key={s.id} onClick={() => setSymbol(s.id)}
            className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all",
              symbol === s.id
                ? "bg-[hsl(var(--primary))]/20 border-[hsl(var(--primary))]/40 text-[hsl(var(--primary))]"
                : "border-white/10 text-zinc-500"
            )}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {TIMEFRAMES.map(tf => (
          <button key={tf} onClick={() => setTimeframe(tf)}
            className={cn("px-2.5 py-1 rounded text-[10px] font-mono transition-all",
              timeframe === tf ? "bg-white/10 text-white" : "text-zinc-600"
            )}>
            {tf}
          </button>
        ))}
        <button onClick={handleRefresh} disabled={isLoading}
          className="ml-auto flex items-center gap-1 px-3 py-1 rounded-lg border border-white/10 text-[10px] text-zinc-500">
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          {isLoading ? "Running…" : "Refresh"}
        </button>
      </div>

      {/* Signal State Banner */}
      <div className={cn("rounded-xl border px-4 py-3 text-[11px] font-bold uppercase tracking-wider", sigColor)}>
        {sigLabel}
        {master?.confidence ? ` · ${master.confidence}%` : ""}
        {exec?.distanceToEntry && !isNoTrade ? (
          <div className="text-[9px] font-normal normal-case tracking-normal mt-1 opacity-70">
            {exec.signalStateReason}
          </div>
        ) : null}
        {isNoTrade && master?.noTradeReason ? (
          <div className="text-[9px] font-normal normal-case tracking-normal mt-1 opacity-70">
            {master.noTradeReason}
          </div>
        ) : null}
      </div>

      {/* Trade Plan */}
      {tradePlan && (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-white/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            {tradePlan.direction === "long"
              ? <TrendingUp className="h-4 w-4 text-emerald-400" />
              : <TrendingDown className="h-4 w-4 text-red-400" />}
            <span className={cn("text-[12px] font-bold uppercase", tradePlan.direction === "long" ? "text-emerald-400" : "text-red-400")}>
              {tradePlan.direction} · {tradePlan.trigger}
            </span>
          </div>
          <StatRow label="Entry"    value={tradePlan.entry.toFixed(tradePlan.entry > 100 ? 2 : 4)} color="text-zinc-100" />
          <StatRow label="Stop Loss" value={tradePlan.stopLoss.toFixed(tradePlan.stopLoss > 100 ? 2 : 4)} color="text-red-400" />
          <StatRow label="TP1"      value={tradePlan.tp1.toFixed(tradePlan.tp1 > 100 ? 2 : 4)} color="text-emerald-400" />
          {tradePlan.tp2 && <StatRow label="TP2" value={tradePlan.tp2.toFixed(tradePlan.tp2 > 100 ? 2 : 4)} color="text-emerald-300" />}
          <StatRow label="R:R Ratio" value={`${tradePlan.rrRatio}:1`} color={(tradePlan.rrRatio ?? 0) >= 2 ? "text-emerald-400" : "text-amber-400"} />
          <StatRow label="Max Risk"  value={`${tradePlan.maxRiskPercent}%`} />
          {master?.strategyMatch && !isNoTrade && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-[10px] text-amber-400">{master.strategyMatch}</p>
            </div>
          )}
        </div>
      )}

      {/* Agent Breakdown */}
      <div className="bg-[hsl(var(--card))] rounded-xl border border-white/5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">Agent Consensus</p>
        {isLoading && !data
          ? <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-white/5 rounded animate-pulse" />)}</div>
          : <>
              <AgentBar label="Trend"        bias={trend?.bias ?? "neutral"}      conf={trend?.confidence ?? 0}    color="#f87171" />
              <AgentBar label="Price Action" bias={smc?.bias ?? "neutral"}        conf={smc?.confidence ?? 0}      color="#f87171" />
              <AgentBar label="News"         bias={news?.impact ?? "neutral"}     conf={news?.confidence ?? 0}     color="#94a3b8" />
              <AgentBar label="Execution"    bias={exec?.direction === "long" ? "bullish" : exec?.direction === "short" ? "bearish" : "neutral"} conf={exec?.hasSetup ? 75 : 30} color="#f87171" />
              <AgentBar label="Contrarian"   bias={contrarian?.challengesBias ? "bearish" : "neutral"} conf={contrarian?.riskFactor ?? 0} color="#fbbf24" />

              {master && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-500">Consensus Score</span>
                    <span className={cn("text-[11px] font-mono font-bold", master.consensusScore < 0 ? "text-red-400" : "text-emerald-400")}>
                      {master.consensusScore > 0 ? "+" : ""}{master.consensusScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1.5 relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-zinc-600 z-10" />
                    <div className={cn("absolute h-full rounded-full", master.consensusScore < 0 ? "bg-red-500" : "bg-emerald-500")}
                      style={{ width: `${Math.min(50, Math.abs(master.consensusScore) / 2)}%`, left: master.consensusScore < 0 ? `${50 - Math.min(50, Math.abs(master.consensusScore) / 2)}%` : "50%" }} />
                  </div>
                </div>
              )}
            </>
        }
      </div>

      {/* Risk Gate */}
      {risk && (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-white/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-zinc-400" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Risk Gate</p>
            </div>
            <span className={cn("text-[11px] font-bold", risk.valid ? "text-emerald-400" : "text-red-400")}>
              {risk.valid ? "VALID" : "BLOCKED"} · {risk.grade}
            </span>
          </div>
          <StatRow label="Volatility Score" value={`${risk.volatilityScore}/100`} />
          <StatRow label="Session Score"    value={`${risk.sessionScore}/100`} />
          {!risk.valid && risk.warnings?.[0] && (
            <p className="text-[10px] text-red-400/70 mt-2 leading-snug">{risk.warnings[0]}</p>
          )}
        </div>
      )}

      {/* News + Contrarian */}
      {(news || contrarian) && (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-white/5 p-4 space-y-2">
          {news && (
            <>
              <StatRow label="News Impact" value={news.impact.toUpperCase()} color={biasColor(news.impact)} />
              <StatRow label="News Regime" value={news.regime ?? "—"} />
              <StatRow label="Risk Level"  value={`${news.riskScore ?? 0}/100`} />
            </>
          )}
          {contrarian && (
            <>
              <StatRow label="Contrarian"  value={contrarian.challengesBias ? "⚠ ALERT" : "CLEAR"} color={contrarian.challengesBias ? "text-amber-400" : "text-zinc-500"} />
              {contrarian.trapType && contrarian.trapType !== "None" && (
                <p className="text-[10px] text-amber-400/70">{contrarian.trapType}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Agent Debate Log */}
      {(data?.debate || isLoading) && (
        <div className="bg-[hsl(var(--card))] rounded-xl border border-white/5 p-4">
          <DebateLog
            debate={data?.debate ?? []}
            loading={isLoading && !data}
          />
        </div>
      )}

      {!data && !isLoading && (
        <div className="text-center py-8">
          <p className="text-[12px] text-zinc-600">Tap Refresh to run agent analysis</p>
        </div>
      )}
    </div>
    )}
    </div>
  );
}
