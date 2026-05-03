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
import { useQuotes } from "@/hooks/useMarketData";
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
    <div className="flex gap-1 rounded-lg border border-white/8 bg-white/4 p-1">
      {SYMBOLS.map((symbol) => (
        <button
          key={symbol.id}
          onClick={() => onChange(symbol.id)}
          className={cn(
            "flex flex-col items-center rounded-md px-2.5 py-1.5 text-center transition-all",
            value === symbol.id
              ? "bg-white/10 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <span className="text-[11px] font-bold">{symbol.label}</span>
          <span className="mt-0.5 text-[9px] opacity-60">{symbol.sub}</span>
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
    <div className="flex gap-1 rounded-lg border border-white/8 bg-white/4 p-1">
      {TIMEFRAMES.map((timeframe) => (
        <button
          key={timeframe}
          onClick={() => onChange(timeframe)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-all",
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

type SupportCardPriority = "lead" | "support" | "watch";

function getBiasDirection(bias: string): number {
  if (bias === "bullish" || bias === "valid") return 1;
  if (bias === "bearish" || bias === "invalid") return -1;
  return 0;
}

function buildNoTradeContext(data: AgentRunResult) {
  const blocker =
    data.agents.master.noTradeReason ??
    data.agents.execution.signalStateReason ??
    data.agents.risk.reasons[0] ??
    "Structure and risk are not aligned enough to justify a live plan yet.";

  const watchItems = [
    data.agents.smc.reasons[0],
    data.agents.trend.reasons[0],
    data.agents.execution.hasSetup ? data.agents.execution.triggerCondition : "Wait for a cleaner trigger before opening risk.",
  ].filter(Boolean) as string[];

  return {
    blocker,
    watchItems,
    stats: [
      { label: "Consensus", value: `${data.agents.master.confidence}%` },
      { label: "Risk Gate", value: data.agents.risk.valid ? `Valid ${data.agents.risk.grade}` : `Blocked ${data.agents.risk.grade}` },
      { label: "Execution", value: data.agents.execution.hasSetup ? "Setup ready" : "Waiting" },
    ],
  };
}

function getAgentCards(data: AgentRunResult) {
  const { agents } = data;
  const tfBias = agents.trend.timeframeBias;
  const tfCount = (["M5", "M15", "H1", "H4"] as const).filter(
    (timeframe) => tfBias[timeframe] === agents.trend.bias
  ).length;
  const masterDirection = getBiasDirection(agents.master.finalBias);

  const cards = [
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
      statusLabel: "Trend Lead",
      priority: masterDirection !== 0 && getBiasDirection(agents.trend.bias) === masterDirection ? ("lead" as SupportCardPriority) : ("support" as SupportCardPriority),
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
      statusLabel: "Execution Context",
      priority: masterDirection !== 0 && getBiasDirection(agents.smc.bias) === masterDirection ? ("lead" as SupportCardPriority) : ("support" as SupportCardPriority),
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
      statusLabel: "Macro Context",
      priority: agents.news.riskScore >= 65 ? ("watch" as SupportCardPriority) : ("support" as SupportCardPriority),
    },
    {
      agentId: "risk",
      label: "Risk Gate",
      icon: <Shield className="h-4 w-4" />,
      bias: agents.risk.valid ? "valid" : "invalid",
      confidence: agents.risk.sessionScore,
      reasons: agents.risk.reasons,
      warnings: agents.risk.warnings,
      extra: {
        Grade: agents.risk.grade,
        Session: `${agents.risk.sessionScore}/100`,
        Vol: `${agents.risk.volatilityScore}/100`,
        "Max Risk": `${agents.risk.maxRiskPercent}%`,
      } as Record<string, string | number | boolean | null>,
      isGate: true,
      statusLabel: "Risk Control",
      priority: agents.risk.valid ? ("support" as SupportCardPriority) : ("watch" as SupportCardPriority),
    },
    {
      agentId: "contrarian",
      label: "Contrarian Agent",
      icon: <FlipHorizontal2 className="h-4 w-4" />,
      bias: agents.contrarian.challengesBias ? "opposing" : "neutral",
      confidence: agents.contrarian.trapConfidence,
      reasons: agents.contrarian.failureReasons,
      extra: {
        Trap: agents.contrarian.trapType ?? "None",
        Risk: `${agents.contrarian.riskFactor}%`,
        "Opp Liq": agents.contrarian.oppositeLiquidity?.toFixed(4) ?? "--",
      } as Record<string, string | number | boolean | null>,
      statusLabel: "Counter Read",
      priority: agents.contrarian.challengesBias ? ("watch" as SupportCardPriority) : ("support" as SupportCardPriority),
    },
  ];

  return cards;
}

// Map agent Symbol → quote symbol used by useQuotes / ticker
const SYMBOL_TO_QUOTE: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD",
  XAGUSD: "XAG/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  USDCAD: "USD/CAD",
  USDCHF: "USD/CHF",
  AUDUSD: "AUD/USD",
  NZDUSD: "NZD/USD",
  BTCUSD: "BTC/USD",
  ETHUSD: "ETH/USD",
};

export function BrainTerminal() {
  const [symbol, setSymbol] = useState<Symbol>("XAUUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [highlightAgentId, setHighlightAgentId] = useState<string | undefined>();
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);

  // Live price from the 30s quotes feed — overrides the stale snapshot price
  const { quotes } = useQuotes(60_000);
  const quoteSymbol = SYMBOL_TO_QUOTE[symbol];
  const liveQuote = quoteSymbol ? quotes.find(q => q.symbol === quoteSymbol) : undefined;

  const openDrawer = useCallback((agentId?: string) => {
    setHighlightAgentId(agentId);
    setActiveAgentId(agentId ?? null);
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
  const secondaryCards = data ? getAgentCards(data) : [];
  const alignedCount = data ? getAlignedAgentCount(data) : 0;
  const focusedAgentId = hoveredAgentId ?? activeAgentId ?? null;
  const noTradeContext = data ? buildNoTradeContext(data) : undefined;
  const supportSummary = data
    ? [
        { label: "Aligned", value: `${alignedCount}/${data.agents.master.agentConsensus.length}`, tone: "neutral" },
        { label: "Macro", value: data.agents.news.regime, tone: "neutral" },
        {
          label: "Execution",
          value: data.agents.execution.hasSetup ? "Setup ready" : "Waiting",
          tone: data.agents.execution.hasSetup ? "positive" : "warning",
        },
        {
          label: "Risk Gate",
          value: data.agents.risk.valid ? `Valid ${data.agents.risk.grade}` : `Blocked ${data.agents.risk.grade}`,
          tone: data.agents.risk.valid ? "positive" : "warning",
        },
      ]
    : [];

  return (
    <div className="w-full min-w-0 space-y-4 pb-2">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/15 shadow-[0_0_24px_rgba(139,92,246,0.12)]">
            <Brain className="h-4.5 w-4.5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-white">Multi-Agent Brain</h1>
            <p className="text-[11px] text-zinc-400">7-agent consensus engine for price action, macro, and risk alignment</p>
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
              "flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-[11px] font-semibold text-zinc-400 transition-all hover:bg-white/8 hover:text-white",
              loading && "cursor-not-allowed opacity-50"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {data?.snapshot && !loading && (
        <div className="rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(15,15,15,0.9),rgba(10,10,10,0.82))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <SnapshotBar
            snapshot={data.snapshot}
            livePrice={liveQuote?.price}
            liveChangePercent={liveQuote?.changePercent}
          />
        </div>
      )}

      {loading && !data && (
        <div className="animate-pulse rounded-xl border border-white/6 bg-[#0d0d0d]/60 px-4 py-3">
          <div className="h-6 w-full rounded bg-white/4" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">Failed to load agent data. Check API keys and try again.</p>
        </div>
      )}

      {/* ── Live Command Room ─────────────────────────────────────────────── */}
      <AgentCommandRoom
        data={data ?? null}
        loading={loading && !data}
        focusedAgentId={focusedAgentId}
        onHoverAgentChange={setHoveredAgentId}
        onSelectAgentChange={setActiveAgentId}
      />

      {/* ── Analysis ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)]">
        <div className="flex min-h-0 min-w-0 flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-400" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-300">
                  Master Consensus
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">Primary decision layer driven by weighted agent agreement.</p>
            </div>
            <span className="hidden rounded-full border border-emerald-500/12 bg-emerald-500/5 px-2.5 py-1 text-[10px] text-zinc-500 md:inline-flex">
              Weighted agent blend
            </span>
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

        <div className="flex min-h-0 min-w-0 flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-zinc-400" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-300">
                  Execution Plan
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">Actionable trigger, invalidation, and management block.</p>
            </div>
            {data ? (
              <button
                onClick={() => openDrawer("execution")}
                className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Open Detail
              </button>
            ) : null}
          </div>
          <div className="flex flex-1">
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
              noTradeContext={noTradeContext}
              loading={loading && !data}
            />
          </div>
        </div>
      </div>

      {(loading || data) && (
        <div className="space-y-3 rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(13,13,13,0.8),rgba(9,9,9,0.92))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">Support Agents</h2>
              <p className="mt-1 text-[11px] text-zinc-500">Secondary reads that support or challenge the primary decision layer.</p>
            </div>
            {data && (
              <span className="rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] text-zinc-400">
                {alignedCount}/{data.agents.master.agentConsensus.length} aligned
              </span>
            )}
          </div>
          {!!supportSummary.length && (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {supportSummary.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-xl border px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
                    item.tone === "positive"
                      ? "border-emerald-500/14 bg-emerald-500/5"
                      : item.tone === "warning"
                        ? "border-amber-500/14 bg-amber-500/5"
                        : "border-white/6 bg-white/[0.02]"
                  )}
                >
                  <div className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500">{item.label}</div>
                  <div className="mt-1 text-[13px] font-semibold text-zinc-200">{item.value}</div>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {loading && !data
              ? [...Array(5)].map((_, index) => (
                  <AgentCard key={index} agentId="" label="" icon={null} bias="neutral" confidence={0} loading />
                ))
              : secondaryCards.map((card) => (
                  <AgentCard
                    key={card.agentId}
                    {...card}
                    active={focusedAgentId === card.agentId}
                    onHoverChange={(active) => setHoveredAgentId(active ? card.agentId : null)}
                    onClick={() => {
                      setActiveAgentId(card.agentId);
                      openDrawer(card.agentId);
                    }}
                  />
                ))}
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(12,12,12,0.78),rgba(9,9,9,0.9))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-200">Detailed View</h2>
            <p className="text-xs text-zinc-500">Operational feed and deeper explanation stay accessible below the decision layer.</p>
          </div>
          <div className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-500">Scroll continues below</div>
        </div>

        <div>
          <AgentActivityLog data={data ?? null} loading={loading && !data} timestamp={data?.timestamp} />
        </div>
      </div>

      {data && (
        <div className="flex items-center justify-between border-t border-white/5 pt-1 text-[11px] text-zinc-500">
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
