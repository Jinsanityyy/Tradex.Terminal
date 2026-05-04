"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  ChevronDown,
  ChevronUp,
  Clock,
  Crosshair,
  Eye,
  EyeOff,
  FlipHorizontal2,
  Newspaper,
  RefreshCw,
  Shield,
  Sparkles,
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
import { TradePlan } from "./TradePlan";

const SYMBOLS: { id: Symbol; label: string; sub: string }[] = [
  { id: "XAUUSD", label: "XAU/USD", sub: "Gold" },
  { id: "EURUSD", label: "EUR/USD", sub: "Euro" },
  { id: "GBPUSD", label: "GBP/USD", sub: "Pound" },
  { id: "BTCUSD", label: "BTC/USD", sub: "Bitcoin" },
];

const TIMEFRAMES: Timeframe[] = ["M15", "H1", "H4"];

const fetcher = (url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) throw new Error("Failed to fetch agents");
    return response.json() as Promise<AgentRunResult>;
  });

function timeframeToMs(timeframe: Timeframe) {
  switch (timeframe) {
    case "M15":
      return 15 * 60 * 1000;
    case "H1":
      return 60 * 60 * 1000;
    case "H4":
      return 4 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
}

function formatCountdown(msLeft: number) {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getCandleCloseCountdown(nowMs: number, timeframe: Timeframe) {
  const span = timeframeToMs(timeframe);
  const nextClose = Math.ceil(nowMs / span) * span;
  return formatCountdown(nextClose - nowMs);
}

function getExecutionActionState(data: AgentRunResult | undefined): {
  label: "WAIT" | "PREPARE" | "EXECUTE";
  tone: "positive" | "negative" | "warning" | "neutral";
  detail: string;
} {
  if (!data || data.agents.master.finalBias === "no-trade" || !data.agents.master.tradePlan) {
    return {
      label: "WAIT",
      tone: "warning",
      detail: data?.agents.master.noTradeReason ?? "No valid structure. Stay out.",
    };
  }

  if (data.agents.execution.signalState === "ARMED") {
    return {
      label: "EXECUTE",
      tone: data.agents.master.finalBias === "bearish" ? "negative" : "positive",
      detail: data.agents.execution.triggerCondition || "Trigger is live.",
    };
  }

  return {
    label: "PREPARE",
    tone: "warning",
    detail: data.agents.execution.signalStateReason || "Setup is forming. Wait for trigger confirmation.",
  };
}

function getBiasDirection(bias: string): number {
  if (bias === "bullish" || bias === "valid") return 1;
  if (bias === "bearish" || bias === "invalid") return -1;
  return 0;
}

function getAlignedAgentCount(data: AgentRunResult) {
  return data.agents.master.agentConsensus.filter((item) => {
    if (data.agents.master.finalBias === "bullish") return item.weightedScore > 0;
    if (data.agents.master.finalBias === "bearish") return item.weightedScore < 0;
    return false;
  }).length;
}

type SupportCardPriority = "lead" | "support" | "watch";

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
      { label: "Risk Gate", value: data.agents.risk.valid ? `Open ${data.agents.risk.grade}` : `Blocked ${data.agents.risk.grade}` },
      { label: "Execution", value: data.agents.execution.hasSetup ? "Setup ready" : "Waiting" },
    ],
  };
}

function getAgentCards(data: AgentRunResult) {
  const { agents } = data;
  const tfBias = agents.trend.timeframeBias;
  const tfCount = (["M5", "M15", "H1", "H4"] as const).filter((timeframe) => tfBias[timeframe] === agents.trend.bias).length;
  const masterDirection = getBiasDirection(agents.master.finalBias);

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
        Phase: agents.trend.marketPhase as string,
        Momentum: agents.trend.momentumDirection as string,
        Align: agents.trend.maAlignment ? "Yes" : "No",
        Sync: agents.trend.timeframeBias.aligned ? "All 4" : `${tfCount}/4`,
      } as Record<string, string | number | boolean | null>,
      statusLabel: "Primary driver",
      priority:
        masterDirection !== 0 && getBiasDirection(agents.trend.bias) === masterDirection
          ? ("lead" as SupportCardPriority)
          : ("support" as SupportCardPriority),
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
        Pattern: agents.smc.setupType as string,
        Range: agents.smc.premiumDiscount as string,
        Break: agents.smc.bosDetected ? "Yes" : "No",
        Trigger: agents.smc.liquiditySweepDetected ? "Stop run" : "Waiting",
      } as Record<string, string | number | boolean | null>,
      statusLabel: "Primary driver",
      priority:
        masterDirection !== 0 && getBiasDirection(agents.smc.bias) === masterDirection
          ? ("lead" as SupportCardPriority)
          : ("support" as SupportCardPriority),
    },
    {
      agentId: "news",
      label: "News Filter",
      icon: <Newspaper className="h-4 w-4" />,
      bias: agents.news.impact,
      confidence: agents.news.confidence,
      reasons: agents.news.reasons,
      extra: {
        Regime: agents.news.regime,
        Risk: `${agents.news.riskScore}/100`,
        Catalysts: `${agents.news.catalysts.length} found`,
      } as Record<string, string | number | boolean | null>,
      statusLabel: "Secondary filter",
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
      statusLabel: "Secondary filter",
      priority: agents.risk.valid ? ("support" as SupportCardPriority) : ("watch" as SupportCardPriority),
    },
    {
      agentId: "contrarian",
      label: "Contrarian",
      icon: <FlipHorizontal2 className="h-4 w-4" />,
      bias: agents.contrarian.challengesBias ? "opposing" : "neutral",
      confidence: agents.contrarian.trapConfidence,
      reasons: agents.contrarian.failureReasons,
      extra: {
        Trap: agents.contrarian.trapType ?? "None",
        Risk: `${agents.contrarian.riskFactor}%`,
        "Opp Liq": agents.contrarian.oppositeLiquidity?.toFixed(4) ?? "--",
      } as Record<string, string | number | boolean | null>,
      statusLabel: "Secondary filter",
      priority: agents.contrarian.challengesBias ? ("watch" as SupportCardPriority) : ("support" as SupportCardPriority),
    },
  ];
}

function SymbolSelector({ value, onChange }: { value: Symbol; onChange: (value: Symbol) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-white/8 bg-white/4 p-1">
      {SYMBOLS.map((symbol) => (
        <button
          key={symbol.id}
          onClick={() => onChange(symbol.id)}
          className={cn(
            "flex flex-col items-center rounded-md px-2.5 py-1.5 text-center transition-all",
            value === symbol.id ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <span className="text-[11px] font-bold">{symbol.label}</span>
          <span className="mt-0.5 text-[9px] opacity-60">{symbol.sub}</span>
        </button>
      ))}
    </div>
  );
}

function TimeframeSelector({ value, onChange }: { value: Timeframe; onChange: (value: Timeframe) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-white/8 bg-white/4 p-1">
      {TIMEFRAMES.map((timeframe) => (
        <button
          key={timeframe}
          onClick={() => onChange(timeframe)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-all",
            value === timeframe ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {timeframe}
        </button>
      ))}
    </div>
  );
}

function DetailChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "warning" | "neutral";
}) {
  const classes =
    tone === "positive"
      ? "border-emerald-500/14 bg-emerald-500/6 text-emerald-300"
      : tone === "negative"
        ? "border-red-500/14 bg-red-500/6 text-red-300"
        : tone === "warning"
          ? "border-amber-500/14 bg-amber-500/6 text-amber-300"
          : "border-white/8 bg-white/[0.03] text-zinc-300";

  return (
    <div className={cn("rounded-xl border px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]", classes)}>
      <div className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-1 text-[13px] font-semibold">{value}</div>
    </div>
  );
}

function DriverCard({
  title,
  bias,
  confidence,
  detail,
  meta,
  tone,
  icon,
  onClick,
}: {
  title: string;
  bias: string;
  confidence: number;
  detail: string;
  meta: Array<{ label: string; value: string }>;
  tone: "positive" | "negative" | "warning" | "neutral";
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  const accent =
    tone === "positive"
      ? "border-emerald-500/16 bg-emerald-500/5 text-emerald-300"
      : tone === "negative"
        ? "border-red-500/16 bg-red-500/5 text-red-300"
        : tone === "warning"
          ? "border-amber-500/16 bg-amber-500/5 text-amber-300"
          : "border-white/8 bg-white/[0.03] text-zinc-300";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-all hover:brightness-110 hover:ring-1 hover:ring-white/10",
        accent
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2">{icon}</div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{title}</div>
            <div className="mt-1 text-[14px] font-semibold tracking-tight">{bias}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Confidence</div>
          <div className="mt-1 font-mono text-[14px] font-semibold">{confidence}%</div>
        </div>
      </div>
      <p className="mt-4 text-[12px] leading-5 text-zinc-400">{detail}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {meta.map((item) => (
          <div key={item.label} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <div className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">{item.label}</div>
            <div className="mt-1 text-[12px] font-semibold text-zinc-200">{item.value}</div>
          </div>
        ))}
      </div>
    </button>
  );
}

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
  const [sniperMode, setSniperMode] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showDetailLayer, setShowDetailLayer] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const { quotes } = useQuotes(60_000);
  const quoteSymbol = SYMBOL_TO_QUOTE[symbol];
  const liveQuote = quoteSymbol ? quotes.find((quote) => quote.symbol === quoteSymbol) : undefined;

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const openDrawer = useCallback((agentId?: string) => {
    setHighlightAgentId(agentId);
    setActiveAgentId(agentId ?? null);
    setDrawerOpen(true);
  }, []);

  const apiUrl = `/api/agents/run?symbol=${symbol}&timeframe=${timeframe}`;
  const { data, isLoading, error } = useSWR<AgentRunResult>([apiUrl, refreshKey], ([url]) => fetcher(url as string), {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

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
  const supportCards = data ? getAgentCards(data) : [];
  const secondaryIntelCards = supportCards.filter((card) => card.agentId !== "trend" && card.agentId !== "smc");
  const focusedAgentId = hoveredAgentId ?? activeAgentId ?? null;
  const noTradeContext = data ? buildNoTradeContext(data) : undefined;
  const alignedCount = data ? getAlignedAgentCount(data) : 0;
  const actionState = getExecutionActionState(data);
  const actionLabel = actionState?.label ?? "WAIT";
  const candleClose = getCandleCloseCountdown(nowMs, timeframe);

  const snapshotPrice = data?.snapshot?.price != null ? Number(data.snapshot.price) : null;
  const safePrice =
    liveQuote?.price != null
      ? liveQuote.price
      : snapshotPrice != null && Number.isFinite(snapshotPrice)
        ? snapshotPrice
        : null;

  const livePriceLabel =
    safePrice != null
      ? `${SYMBOLS.find((item) => item.id === symbol)?.label ?? symbol} ${safePrice.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}`
      : "--";

  const brainDecision = useMemo(() => {
    if (!data) {
      return {
        label: "WAIT",
        subLabel: "Awaiting brain output",
        detail: "Loading decision engine.",
        tone: "neutral" as const,
      };
    }

    if (actionState.label === "WAIT") {
      return {
        label: "NO TRADE",
        subLabel: "Patience Mode",
        detail: data.agents.master.noTradeReason ?? "No valid structure. Stay out.",
        tone: "warning" as const,
      };
    }

    const direction = data.agents.master.finalBias === "bearish" ? "SHORT" : "LONG";
    const tone = data.agents.master.finalBias === "bearish" ? ("negative" as const) : ("positive" as const);

    return {
      label: `${actionState.label} ${direction}`,
      subLabel: actionState.label === "EXECUTE" ? "Live execution state" : "Trigger forming",
      detail:
        actionState.label === "EXECUTE"
          ? "All conditions aligned. Execute the plan."
          : data.agents.execution.triggerCondition || "Setup is forming. Wait for trigger confirmation.",
      tone,
    };
  }, [actionState.label, data]);

  const decisionToneClasses =
    brainDecision.tone === "positive"
      ? "border-emerald-500/16 bg-emerald-500/6 text-emerald-300"
      : brainDecision.tone === "negative"
        ? "border-red-500/16 bg-red-500/6 text-red-300"
        : brainDecision.tone === "warning"
          ? "border-amber-500/16 bg-amber-500/6 text-amber-300"
          : "border-white/8 bg-white/[0.03] text-zinc-200";

  const trendTone = data?.agents.trend.bias === "bullish" ? "positive" : data?.agents.trend.bias === "bearish" ? "negative" : "neutral";
  const paTone = data?.agents.smc.bias === "bullish" ? "positive" : data?.agents.smc.bias === "bearish" ? "negative" : "warning";

  return (
    <div className="w-full min-w-0 space-y-4 pb-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04]">
            <Brain className="h-4.5 w-4.5 text-zinc-200" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-white">Brain</h1>
            <p className="text-[11px] text-zinc-500">Decision layer only. Confirm, filter, execute.</p>
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
            onClick={() => setSniperMode((current) => !current)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all",
              sniperMode ? "border-amber-500/20 bg-amber-500/12 text-amber-300" : "border-white/10 bg-white/4 text-zinc-400 hover:bg-white/8 hover:text-white"
            )}
          >
            <Crosshair className="h-3.5 w-3.5" />
            Sniper Mode
          </button>
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

      {loading && !data ? (
        <div className="animate-pulse rounded-2xl border border-white/6 bg-[#0d0d0d]/60 px-4 py-6">
          <div className="h-12 w-64 rounded bg-white/4" />
          <div className="mt-3 h-5 w-full rounded bg-white/4" />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm text-red-400">Failed to load brain output. Check API keys and try again.</p>
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="rounded-[28px] border border-white/6 bg-[linear-gradient(180deg,rgba(12,13,16,0.96),rgba(8,9,12,0.94))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Brain Output</div>
                <div className={cn("mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", decisionToneClasses)}>
                  {brainDecision.subLabel}
                </div>
                <div
                  className={cn(
                    "mt-4 text-[34px] font-semibold tracking-[-0.04em] sm:text-[48px]",
                    brainDecision.tone === "warning"
                      ? "text-amber-300"
                      : brainDecision.tone === "negative"
                        ? "text-red-300"
                        : brainDecision.tone === "positive"
                          ? "text-emerald-300"
                          : "text-white"
                  )}
                >
                  {brainDecision.label}
                </div>
                <p className="mt-3 max-w-3xl text-[14px] leading-6 text-zinc-400">{brainDecision.detail}</p>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-[320px] xl:grid-cols-1">
                <DetailChip
                  label="Risk Gate"
                  value={data.agents.risk.valid ? `OPEN · ${data.agents.risk.grade}` : `BLOCKED · ${data.agents.risk.grade}`}
                  tone={data.agents.risk.valid ? "positive" : "warning"}
                />
                <DetailChip label="Candle Close" value={candleClose} tone="neutral" />
                <DetailChip label="Aligned Agents" value={`${alignedCount}/${data.agents.master.agentConsensus.length}`} tone="neutral" />
                <DetailChip label="Live Price" value={livePriceLabel} tone="neutral" />
              </div>
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-3 xl:grid-cols-4">
              <DetailChip label="Trend" value={data.agents.trend.bias.toUpperCase()} tone={trendTone} />
              <DetailChip label="Price Action" value={data.agents.smc.bias.toUpperCase()} tone={paTone} />
              <DetailChip label="Execution State" value={actionState.label} tone={actionState.tone} />
              <DetailChip label="Confidence" value={`${data.agents.master.confidence}%`} tone={brainDecision.tone} />
            </div>
          </div>

          {!sniperMode ? (
            <div className="overflow-hidden rounded-[28px] border border-cyan-500/15 bg-black/40 shadow-[0_0_40px_rgba(6,182,212,0.08)]">
              <AgentCommandRoom
                data={data}
                loading={false}
                focusedAgentId={focusedAgentId}
                onHoverAgentChange={setHoveredAgentId}
                onSelectAgentChange={setActiveAgentId}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_340px]">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-zinc-300" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-300">Execution Instruction</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">Entry, invalidation, target, and trigger only.</p>
              </div>
              <button
                onClick={() => openDrawer("execution")}
                className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500 transition-colors hover:text-zinc-300"
              >
                Open Detail
              </button>
            </div>

            <TradePlan
              tradePlan={data.agents.master.tradePlan ?? null}
              signalState={data.agents.master.finalBias === "no-trade" ? "NO_TRADE" : data.agents.execution.signalState}
              signalStateReason={
                data.agents.master.finalBias === "no-trade"
                  ? (data.agents.master.noTradeReason ?? "Insufficient consensus - stand aside.")
                  : data.agents.execution.signalStateReason
              }
              distanceToEntry={data.agents.master.finalBias === "no-trade" ? null : data.agents.execution.distanceToEntry}
              noTradeContext={noTradeContext}
              loading={loading && !data}
            />
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(13,13,13,0.9),rgba(10,10,10,0.9))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex items-center gap-2">
                <Shield className={cn("h-4 w-4", data.agents.risk.valid ? "text-emerald-300" : "text-amber-300")} />
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">Risk Gate</div>
              </div>
              <div className={cn("mt-3 text-[22px] font-semibold tracking-tight", data.agents.risk.valid ? "text-emerald-300" : "text-amber-300")}>
                {data.agents.risk.valid ? "OPEN" : "BLOCKED"}
              </div>
              <p className="mt-2 text-[12px] leading-5 text-zinc-400">
                {data.agents.risk.valid
                  ? data.agents.risk.reasons[0] ?? "Risk conditions are acceptable."
                  : `Blocked: ${data.agents.risk.reasons[0] ?? "Risk conditions are not acceptable."}`}
              </p>
            </div>

            <div className="rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(13,13,13,0.9),rgba(10,10,10,0.9))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-zinc-300" />
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">What To Do Next</div>
              </div>
              <div className="mt-3 space-y-2.5">
                {((actionLabel === "WAIT"
                  ? noTradeContext?.watchItems
                  : [data.agents.execution.triggerCondition, data.agents.master.tradePlan?.managementNotes?.[0], data.agents.master.tradePlan?.managementNotes?.[1]]) ?? [])
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-start gap-2.5">
                      <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-zinc-500" />
                      <p className="text-[12px] leading-5 text-zinc-400">{item}</p>
                    </div>
                  ))}
              </div>
            </div>

            {!sniperMode ? (
              <div className="rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(13,13,13,0.9),rgba(10,10,10,0.9))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-zinc-300" />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">Minimal Justification</div>
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-[12px] leading-5 text-zinc-400">
                    <span className="text-zinc-200">Trend:</span> {data.agents.trend.reasons[0]}
                  </p>
                  <p className="text-[12px] leading-5 text-zinc-400">
                    <span className="text-zinc-200">Price Action:</span> {data.agents.smc.reasons[0]}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {data ? (
        <div className="space-y-3 rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(12,12,12,0.82),rgba(9,9,9,0.92))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">Decision Drivers</h2>
              <p className="mt-1 text-[11px] text-zinc-500">All agents remain visible for full transparency.</p>
            </div>
            <button
              onClick={() => setShowFilters((current) => !current)}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] text-zinc-400 transition-colors hover:bg-white/8 hover:text-zinc-200"
            >
              {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showFilters ? "Hide secondary agents" : "Show secondary agents"}
            </button>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <DriverCard
              title="Trend"
              bias={data.agents.trend.bias.toUpperCase()}
              confidence={data.agents.trend.confidence}
              detail={data.agents.trend.reasons[0] ?? "No trend read available."}
              meta={[
                { label: "Phase", value: String(data.agents.trend.marketPhase) },
                { label: "Momentum", value: String(data.agents.trend.momentumDirection) },
                { label: "Alignment", value: data.agents.trend.maAlignment ? "Aligned" : "Mixed" },
              ]}
              tone={trendTone}
              icon={<TrendingUp className="h-4 w-4" />}
              onClick={() => openDrawer("trend")}
            />
            <DriverCard
              title="Price Action"
              bias={data.agents.smc.bias.toUpperCase()}
              confidence={data.agents.smc.confidence}
              detail={data.agents.smc.reasons[0] ?? "No price action read available."}
              meta={[
                { label: "Pattern", value: String(data.agents.smc.setupType) },
                { label: "Range", value: String(data.agents.smc.premiumDiscount) },
                { label: "Trigger", value: data.agents.smc.liquiditySweepDetected ? "Stop run" : "Waiting" },
              ]}
              tone={paTone}
              icon={<Activity className="h-4 w-4" />}
              onClick={() => openDrawer("smc")}
            />
          </div>

          {showFilters ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {secondaryIntelCards.map((card) => (
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
          ) : (
            <div className="rounded-xl border border-dashed border-white/8 bg-white/[0.02] px-4 py-5 text-sm text-zinc-500">
              Secondary agents are temporarily collapsed. Click “Show secondary agents” to bring them back.
            </div>
          )}
        </div>
      ) : null}

      {showDetailLayer && data ? (
        <div className="space-y-4 rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(11,13,16,0.92),rgba(8,9,12,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-200">Detailed Layer</h2>
              <p className="text-xs text-zinc-500">Full operational log only. Pixel floor is now part of the top Brain identity layer.</p>
            </div>
            <button
              onClick={() => setShowDetailLayer(false)}
              className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Hide detailed layer
            </button>
          </div>

          <AgentActivityLog data={data} loading={false} timestamp={data.timestamp} />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(12,12,12,0.78),rgba(9,9,9,0.9))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-200">Detailed Layer</h2>
              <p className="text-xs text-zinc-500">Keep the full log hidden unless you need deeper context.</p>
            </div>
            <button
              onClick={() => setShowDetailLayer((current) => !current)}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] text-zinc-400 transition-colors hover:bg-white/8 hover:text-zinc-200"
            >
              {showDetailLayer ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              Show detailed layer
            </button>
          </div>

          <div className="mt-3 flex min-h-[110px] items-center justify-center rounded-2xl border border-dashed border-white/8 bg-white/[0.02] px-4 py-8 text-center">
            <div className="max-w-md">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
                <Sparkles className="h-4 w-4 text-amber-300" />
              </div>
              <p className="text-sm font-medium text-zinc-200">Detailed layer is hidden for faster decision-making.</p>
              <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                Expand it only when you need the full agent logs or slower justification.
              </p>
            </div>
          </div>
        </div>
      )}

      {data ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-1 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>{data.totalProcessingTime}ms processing</span>
          </div>
          {data.cached ? <span className="rounded bg-white/4 px-2 py-0.5 text-zinc-500">CACHED</span> : null}
          <span>{new Date(data.timestamp).toLocaleTimeString()}</span>
        </div>
      ) : null}

      {data ? (
        <BrainOverviewDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          data={data}
          highlightAgentId={highlightAgentId}
        />
      ) : null}
    </div>
  );
}
