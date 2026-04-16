"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp, Activity, Newspaper, Target,
  FlipHorizontal2, Shield, Brain, RefreshCw, Clock,
} from "lucide-react";
import useSWR from "swr";
import type { AgentRunResult, Symbol, Timeframe } from "@/lib/agents/schemas";
import { AgentCard } from "./AgentCard";
import { ConsensusPanel } from "./ConsensusPanel";
import { TradePlan } from "./TradePlan";
import { SnapshotBar } from "./SnapshotBar";
import { BrainOverviewDrawer } from "./BrainOverviewDrawer";
import { AgentCommandRoom } from "./AgentCommandRoom";
import { AgentActivityLog } from "./AgentActivityLog";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SYMBOLS: { id: Symbol; label: string; sub: string }[] = [
  { id: "XAUUSD", label: "XAU/USD", sub: "Gold" },
  { id: "EURUSD", label: "EUR/USD", sub: "Euro" },
  { id: "GBPUSD", label: "GBP/USD", sub: "Pound" },
  { id: "BTCUSD", label: "BTC/USD", sub: "Bitcoin" },
];

const TIMEFRAMES: Timeframe[] = ["M5", "M15", "H1", "H4"];

// ─────────────────────────────────────────────────────────────────────────────
// Fetcher
// ─────────────────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error("Failed to fetch agents");
  return r.json() as Promise<AgentRunResult>;
});

// ─────────────────────────────────────────────────────────────────────────────
// Selector Components
// ─────────────────────────────────────────────────────────────────────────────

function SymbolSelector({
  value, onChange,
}: {
  value: Symbol;
  onChange: (s: Symbol) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8">
      {SYMBOLS.map(s => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={cn(
            "flex flex-col items-center px-3 py-2 rounded-lg text-center transition-all",
            value === s.id
              ? "bg-white/10 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <span className="text-xs font-bold">{s.label}</span>
          <span className="text-[10px] opacity-60 mt-0.5">{s.sub}</span>
        </button>
      ))}
    </div>
  );
}

function TimeframeSelector({
  value, onChange,
}: {
  value: Timeframe;
  onChange: (t: Timeframe) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8">
      {TIMEFRAMES.map(tf => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={cn(
            "px-3 py-2 rounded-lg text-xs font-bold transition-all",
            value === tf
              ? "bg-white/10 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Config
// ─────────────────────────────────────────────────────────────────────────────

function getAgentCards(data: AgentRunResult) {
  const { agents } = data;
  const tfBias = agents.trend.timeframeBias;
  const tfCount = (["M5", "M15", "H1", "H4"] as const)
    .filter(tf => tfBias[tf] === agents.trend.bias).length;

  return [
    {
      agentId: "trend",
      label: "Trend Agent",
      icon: <TrendingUp className="h-4 w-4" />,
      bias: agents.trend.bias,
      confidence: agents.trend.confidence,
      reasons: agents.trend.reasons,
      invalidationLevel: agents.trend.invalidationLevel,
      extra: {
        "Phase":    agents.trend.marketPhase as string,
        "Momentum": agents.trend.momentumDirection as string,
        "MA Align": agents.trend.maAlignment ? "Yes" : "No",
        "TF Sync":  agents.trend.timeframeBias.aligned ? "All 4" : `${tfCount}/4`,
      } as Record<string, string | number | boolean | null>,
    },
    {
      agentId: "smc",
      label: "Price Action Agent",
      icon: <Activity className="h-4 w-4" />,
      bias: agents.smc.bias,
      confidence: agents.smc.confidence,
      reasons: agents.smc.reasons,
      invalidationLevel: agents.smc.invalidationLevel,
      extra: {
        "Setup":  agents.smc.setupType as string,
        "Zone":   agents.smc.premiumDiscount as string,
        "Break":  agents.smc.bosDetected ? "Yes" : "No",
        "Sweep":  agents.smc.liquiditySweepDetected ? "Detected" : "No",
      } as Record<string, string | number | boolean | null>,
    },
    {
      agentId: "news",
      label: "News Agent",
      icon: <Newspaper className="h-4 w-4" />,
      bias: agents.news.impact,
      confidence: agents.news.confidence,
      reasons: agents.news.reasons,
      extra: {
        "Regime":    agents.news.regime,
        "Risk":      `${agents.news.riskScore}/100`,
        "Catalysts": `${agents.news.catalysts.length} found`,
      } as Record<string, string | number | boolean | null>,
    },
    {
      agentId: "execution",
      label: "Execution Agent",
      icon: <Target className="h-4 w-4" />,
      bias: !agents.execution.hasSetup
        ? "neutral"
        : agents.execution.direction === "long" ? "bullish" : "bearish",
      confidence: agents.execution.hasSetup ? 75 : 30,
      reasons: [
        agents.execution.triggerCondition,
        ...agents.execution.managementNotes.slice(0, 2),
      ].filter((s): s is string => Boolean(s)),
      extra: {
        "Entry":  agents.execution.entry?.toFixed(4) ?? "—",
        "SL":     agents.execution.stopLoss?.toFixed(4) ?? "—",
        "TP1":    agents.execution.tp1?.toFixed(4) ?? "—",
        "RR":     agents.execution.rrRatio ? `${agents.execution.rrRatio}:1` : "—",
      } as Record<string, string | number | boolean | null>,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function BrainTerminal() {
  const [symbol, setSymbol] = useState<Symbol>("XAUUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [highlightAgentId, setHighlightAgentId] = useState<string | undefined>();

  const openDrawer = useCallback((agentId?: string) => {
    setHighlightAgentId(agentId);
    setDrawerOpen(true);
  }, []);

  const apiUrl = `/api/agents/run?symbol=${symbol}&timeframe=${timeframe}`;

  const { data, isLoading, error } = useSWR<AgentRunResult>(
    [apiUrl, refreshKey],
    ([url]) => fetcher(url as string),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, timeframe, forceRefresh: true }),
      });
      setRefreshKey(k => k + 1);
    } finally {
      setIsRefreshing(false);
    }
  }, [symbol, timeframe]);

  const loading = isLoading || isRefreshing;

  return (
    <div className="w-full space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
            <Brain className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Multi-Agent Brain</h1>
            <p className="text-xs text-zinc-400">7-agent consensus engine · Price Action + Macro + Risk</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SymbolSelector value={symbol} onChange={v => { setSymbol(v); setRefreshKey(k => k + 1); }} />
          <TimeframeSelector value={timeframe} onChange={v => { setTimeframe(v); setRefreshKey(k => k + 1); }} />
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold",
              "border border-white/10 bg-white/4 text-zinc-400 hover:text-white hover:bg-white/8 transition-all",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Snapshot Bar ────────────────────────────────────────────────── */}
      {data?.snapshot && !loading && (
        <div className="rounded-xl border border-white/6 bg-[#0d0d0d]/60 px-2 py-3">
          <SnapshotBar snapshot={data.snapshot} />
        </div>
      )}

      {loading && !data && (
        <div className="rounded-xl border border-white/6 bg-[#0d0d0d]/60 px-5 py-4 animate-pulse">
          <div className="h-8 w-full bg-white/4 rounded" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
          <p className="text-sm text-red-400">Failed to load agent data. Check API keys and try again.</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          VISUAL LAYER — COMMAND ROOM + ACTIVITY LOG
      ══════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold px-2">
            AI Operations Center
          </span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        {/* Command room — horizontal scroll on mobile */}
        <div className="overflow-x-auto rounded-xl mb-4">
          <div style={{ minWidth: 640 }}>
            <AgentCommandRoom data={data ?? null} loading={loading && !data} />
          </div>
        </div>
        {/* Activity log — full width below */}
        <AgentActivityLog
          data={data ?? null}
          loading={loading && !data}
          timestamp={data?.timestamp}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LAYER 1 — AGENT GRID (full width, all 6 agents)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {loading && !data
          ? [...Array(6)].map((_, i) => (
              <AgentCard key={i} agentId="" label="" icon={null} bias="neutral" confidence={0} loading />
            ))
          : data
          ? [
              ...getAgentCards(data).map(card => (
                <AgentCard key={card.agentId} {...card} onClick={() => openDrawer(card.agentId)} />
              )),
              /* Risk Gate */
              <AgentCard
                key="risk"
                agentId="risk"
                label="Risk Gate"
                icon={<Shield className="h-4 w-4" />}
                bias={data.agents.risk.valid ? "valid" : "invalid"}
                confidence={data.agents.risk.sessionScore}
                reasons={data.agents.risk.reasons}
                warnings={data.agents.risk.warnings}
                extra={{
                  "Grade":    data.agents.risk.grade,
                  "Session":  `${data.agents.risk.sessionScore}/100`,
                  "Vol":      `${data.agents.risk.volatilityScore}/100`,
                  "Max Risk": `${data.agents.risk.maxRiskPercent}%`,
                }}
                isGate
                onClick={() => openDrawer("risk")}
              />,
              /* Contrarian Agent */
              <AgentCard
                key="contrarian"
                agentId="contrarian"
                label="Contrarian Agent"
                icon={<FlipHorizontal2 className="h-4 w-4" />}
                bias={data.agents.contrarian.challengesBias ? "opposing" : "neutral"}
                confidence={data.agents.contrarian.trapConfidence}
                reasons={data.agents.contrarian.failureReasons}
                extra={{
                  "Trap":    data.agents.contrarian.trapType ?? "None",
                  "Risk":    `${data.agents.contrarian.riskFactor}%`,
                  "Opp Liq": data.agents.contrarian.oppositeLiquidity?.toFixed(4) ?? "—",
                }}
                onClick={() => openDrawer("contrarian")}
              />,
            ]
          : null
        }
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LAYER 2 — MASTER CONSENSUS (full width, final decision)
      ══════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-400" />
            <span className="text-xs text-zinc-300 uppercase tracking-wider font-semibold">Master Consensus</span>
          </div>
          {data && (
            <button
              onClick={() => openDrawer()}
              className="text-xs text-violet-400/70 hover:text-violet-400 transition-colors flex items-center gap-1"
            >
              Full breakdown →
            </button>
          )}
        </div>
        <ConsensusPanel
          finalBias={data?.agents.master.finalBias ?? "no-trade"}
          confidence={data?.agents.master.confidence ?? 0}
          consensusScore={data?.agents.master.consensusScore ?? 0}
          agentConsensus={data?.agents.master.agentConsensus ?? []}
          strategyMatch={data?.agents.master.strategyMatch}
          noTradeReason={data?.agents.master.noTradeReason}
          loading={loading && !data}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LAYER 3 — EXECUTION PLAN (full width, actionable output)
      ══════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-zinc-400" />
          <span className="text-xs text-zinc-300 uppercase tracking-wider font-semibold">Execution Plan</span>
        </div>
        <TradePlan tradePlan={data?.agents.master.tradePlan ?? null} loading={loading && !data} />
      </div>

      {/* Processing metadata */}
      {data && (
        <div className="flex items-center justify-between text-[11px] text-zinc-500 -mt-2">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>{data.totalProcessingTime}ms</span>
          </div>
          {data.cached && (
            <span className="px-2 py-0.5 rounded bg-white/4 text-zinc-500">CACHED</span>
          )}
          <span>{new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
      )}

      {/* ── Overview Drawer ─────────────────────────────────────────────── */}
      {data && (
        <BrainOverviewDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          data={data}
          highlightAgentId={highlightAgentId}
        />
      )}
    </div>
  );
}
