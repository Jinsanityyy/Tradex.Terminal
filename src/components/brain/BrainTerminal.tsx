"use client";

import React, { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  Brain,
  Clock,
  FlipHorizontal2,
  Newspaper,
  RefreshCw,
  Shield,
  Target,
  TrendingUp,
} from "lucide-react";
import useSWR from "swr";
import type { AgentRunResult, Symbol, Timeframe } from "@/lib/agents/schemas";
import { AgentActivityLog } from "./AgentActivityLog";
import { AgentCard } from "./AgentCard";
import { AgentCommandRoom } from "./AgentCommandRoom";
import { BrainOverviewDrawer } from "./BrainOverviewDrawer";
import { ConsensusPanel } from "./ConsensusPanel";
import { SnapshotBar } from "./SnapshotBar";
import { TradePlan } from "./TradePlan";

const SYMBOLS: { id: Symbol; label: string; sub: string }[] = [
  { id: "XAUUSD", label: "XAU/USD", sub: "Gold" },
  { id: "EURUSD", label: "EUR/USD", sub: "Euro" },
  { id: "GBPUSD", label: "GBP/USD", sub: "Pound" },
  { id: "BTCUSD", label: "BTC/USD", sub: "Bitcoin" },
];

const TIMEFRAMES: Timeframe[] = ["M5", "M15", "H1", "H4"];

const fetcher = (url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) throw new Error("Failed to fetch agents");
    return response.json() as Promise<AgentRunResult>;
  });

function SymbolSelector({
  value,
  onChange,
}: {
  value: Symbol;
  onChange: (value: Symbol) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-white/8 bg-white/4 p-1">
      {SYMBOLS.map((symbol) => (
        <button
          key={symbol.id}
          onClick={() => onChange(symbol.id)}
          className={cn(
            "flex flex-col items-center rounded-lg px-3 py-2 text-center transition-all",
            value === symbol.id
              ? "bg-white/10 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <span className="text-xs font-bold">{symbol.label}</span>
          <span className="mt-0.5 text-[10px] opacity-60">{symbol.sub}</span>
        </button>
      ))}
    </div>
  );
}

function TimeframeSelector({
  value,
  onChange,
}: {
  value: Timeframe;
  onChange: (value: Timeframe) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-white/8 bg-white/4 p-1">
      {TIMEFRAMES.map((timeframe) => (
        <button
          key={timeframe}
          onClick={() => onChange(timeframe)}
          className={cn(
            "rounded-lg px-3 py-2 text-xs font-bold transition-all",
            value === timeframe
              ? "bg-white/10 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {timeframe}
        </button>
      ))}
    </div>
  );
}

function getAlignedAgentCount(data: AgentRunResult) {
  return data.agents.master.agentConsensus.filter((item) => {
    if (data.agents.master.finalBias === "bullish") return item.weightedScore > 0;
    if (data.agents.master.finalBias === "bearish") return item.weightedScore < 0;
    return false;
  }).length;
}

function getAgentCards(data: AgentRunResult) {
  const { agents } = data;
  const tfBias = agents.trend.timeframeBias;
  const tfCount = (["M5", "M15", "H1", "H4"] as const).filter(
    (timeframe) => tfBias[timeframe] === agents.trend.bias
  ).length;
  const alignedCount = getAlignedAgentCount(data);

  return [
    {
      agentId: "master",
      label: "Master Consensus",
      icon: <Brain className="h-4 w-4" />,
      bias: agents.master.finalBias,
      confidence: agents.master.confidence,
      reasons: agents.master.noTradeReason
        ? [agents.master.noTradeReason, ...agents.master.supports.slice(0, 2)]
        : agents.master.supports.slice(0, 3),
      extra: {
        Consensus: `${agents.master.consensusScore > 0 ? "+" : ""}${agents.master.consensusScore.toFixed(1)}`,
        Aligned: `${alignedCount}/${agents.master.agentConsensus.length}`,
        Strategy: agents.master.strategyMatch ?? "No exact match",
        Mode: agents.master.finalBias === "no-trade" ? "Stand Aside" : "Executable",
      } as Record<string, string | number | boolean | null>,
    },
    {
      agentId: "trend",
      label: "Trend Agent",
      icon: <TrendingUp className="h-4 w-4" />,
      bias: agents.trend.bias,
      confidence: agents.trend.confidence,
      reasons: agents.trend.reasons,
      invalidationLevel: agents.trend.invalidationLevel,
      extra: {
        Phase: agents.trend.marketPhase as string,
        Momentum: agents.trend.momentumDirection as string,
        "MA Align": agents.trend.maAlignment ? "Yes" : "No",
        "TF Sync": agents.trend.timeframeBias.aligned ? "All 4" : `${tfCount}/4`,
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
        Setup: agents.smc.setupType as string,
        Zone: agents.smc.premiumDiscount as string,
        Break: agents.smc.bosDetected ? "Yes" : "No",
        Sweep: agents.smc.liquiditySweepDetected ? "Detected" : "No",
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
        Regime: agents.news.regime,
        Risk: `${agents.news.riskScore}/100`,
        Catalysts: `${agents.news.catalysts.length} found`,
      } as Record<string, string | number | boolean | null>,
    },
    {
      agentId: "execution",
      label: "Execution Agent",
      icon: <Target className="h-4 w-4" />,
      bias: !agents.execution.hasSetup
        ? "neutral"
        : agents.execution.direction === "long"
          ? "bullish"
          : "bearish",
      confidence: agents.execution.hasSetup ? 75 : 30,
      reasons: [agents.execution.triggerCondition, ...agents.execution.managementNotes.slice(0, 2)].filter(
        (entry): entry is string => Boolean(entry)
      ),
      extra: {
        Entry: agents.execution.entry?.toFixed(4) ?? "--",
        SL: agents.execution.stopLoss?.toFixed(4) ?? "--",
        TP1: agents.execution.tp1?.toFixed(4) ?? "--",
        RR: agents.execution.rrRatio ? `${agents.execution.rrRatio}:1` : "--",
      } as Record<string, string | number | boolean | null>,
    },
  ];
}

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
      setRefreshKey((current) => current + 1);
    } finally {
      setIsRefreshing(false);
    }
  }, [symbol, timeframe]);

  const loading = isLoading || isRefreshing;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/15">
            <Brain className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Multi-Agent Brain</h1>
            <p className="text-xs text-zinc-400">7-agent consensus engine - Price Action + Macro + Risk</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SymbolSelector
            value={symbol}
            onChange={(value) => {
              setSymbol(value);
              setRefreshKey((current) => current + 1);
            }}
          />
          <TimeframeSelector
            value={timeframe}
            onChange={(value) => {
              setTimeframe(value);
              setRefreshKey((current) => current + 1);
            }}
          />
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-xs font-semibold text-zinc-400 transition-all hover:bg-white/8 hover:text-white",
              loading && "cursor-not-allowed opacity-50"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {data?.snapshot && !loading && (
        <div className="rounded-xl border border-white/6 bg-[#0d0d0d]/60 px-2 py-3">
          <SnapshotBar snapshot={data.snapshot} />
        </div>
      )}

      {loading && !data && (
        <div className="animate-pulse rounded-xl border border-white/6 bg-[#0d0d0d]/60 px-5 py-4">
          <div className="h-8 w-full rounded bg-white/4" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
          <p className="text-sm text-red-400">Failed to load agent data. Check API keys and try again.</p>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-200">Agent Overview</h2>
            <p className="text-xs text-zinc-500">Click any card to open the full explanation and result for that agent.</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] text-zinc-400">
            7 agents live
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {loading && !data
            ? [...Array(7)].map((_, index) => (
                <AgentCard key={index} agentId="" label="" icon={null} bias="neutral" confidence={0} loading />
              ))
            : data
              ? [
                  ...getAgentCards(data).map((card) => (
                    <AgentCard key={card.agentId} {...card} onClick={() => openDrawer(card.agentId)} />
                  )),
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
                      Grade: data.agents.risk.grade,
                      Session: `${data.agents.risk.sessionScore}/100`,
                      Vol: `${data.agents.risk.volatilityScore}/100`,
                      "Max Risk": `${data.agents.risk.maxRiskPercent}%`,
                    }}
                    isGate
                    onClick={() => openDrawer("risk")}
                  />,
                  <AgentCard
                    key="contrarian"
                    agentId="contrarian"
                    label="Contrarian Agent"
                    icon={<FlipHorizontal2 className="h-4 w-4" />}
                    bias={data.agents.contrarian.challengesBias ? "opposing" : "neutral"}
                    confidence={data.agents.contrarian.trapConfidence}
                    reasons={data.agents.contrarian.failureReasons}
                    extra={{
                      Trap: data.agents.contrarian.trapType ?? "None",
                      Risk: `${data.agents.contrarian.riskFactor}%`,
                      "Opp Liq": data.agents.contrarian.oppositeLiquidity?.toFixed(4) ?? "--",
                    }}
                    onClick={() => openDrawer("contrarian")}
                  />,
                ]
              : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.85fr)]">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Master Consensus</span>
          </div>
          <ConsensusPanel
            finalBias={data?.agents.master.finalBias ?? "no-trade"}
            confidence={data?.agents.master.confidence ?? 0}
            consensusScore={data?.agents.master.consensusScore ?? 0}
            agentConsensus={data?.agents.master.agentConsensus ?? []}
            strategyMatch={
              data?.agents.master.finalBias === "no-trade" ? undefined : data?.agents.master.strategyMatch
            }
            noTradeReason={data?.agents.master.noTradeReason}
            loading={loading && !data}
            onClick={data ? () => openDrawer("master") : undefined}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-zinc-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Execution Plan</span>
          </div>
          <TradePlan
            tradePlan={data?.agents.master.tradePlan ?? null}
            signalState={
              !data
                ? undefined
                : data.agents.master.finalBias === "no-trade"
                  ? "NO_TRADE"
                  : data.agents.execution.signalState
            }
            signalStateReason={
              data?.agents.master.finalBias === "no-trade"
                ? (data.agents.master.noTradeReason ?? "Insufficient consensus - stand aside.")
                : data?.agents.execution.signalStateReason
            }
            distanceToEntry={
              data?.agents.master.finalBias === "no-trade" ? null : data?.agents.execution.distanceToEntry
            }
            loading={loading && !data}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-white/5" />
          <span className="px-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            AI Operations Center
          </span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <AgentCommandRoom data={data ?? null} loading={loading && !data} />
          <AgentActivityLog data={data ?? null} loading={loading && !data} timestamp={data?.timestamp} />
        </div>
      </div>

      {data && (
        <div className="-mt-2 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>{data.totalProcessingTime}ms</span>
          </div>
          {data.cached && <span className="rounded bg-white/4 px-2 py-0.5 text-zinc-500">CACHED</span>}
          <span>{new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
      )}

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
