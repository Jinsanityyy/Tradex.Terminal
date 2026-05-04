"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
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

const SYMBOLS: { id: Symbol; label: string; sub: string }[] = [
  { id: "XAUUSD", label: "XAU/USD", sub: "Gold" },
  { id: "EURUSD", label: "EUR/USD", sub: "Euro" },
  { id: "GBPUSD", label: "GBP/USD", sub: "Pound" },
  { id: "BTCUSD", label: "BTC/USD", sub: "Bitcoin" },
];

const TIMEFRAMES: Timeframe[] = ["M15", "H1", "H4"];

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
      detail: data?.agents.master.noTradeReason ?? "No clean price action setup. Stand aside.",
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
    detail: data.agents.execution.signalStateReason || "Wait for candle confirmation at the level.",
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

function getAgentCards(data: AgentRunResult) {
  const { agents } = data;
  const tfBias = agents.trend.timeframeBias;
  const tfCount = (["M5", "M15", "H1", "H4"] as const).filter((timeframe) => tfBias[timeframe] === agents.trend.bias).length;
  const masterDirection = getBiasDirection(agents.master.finalBias);

  return [
    {
      agentId: "trend",
      label: "Market Bias",
      icon: <TrendingUp className="h-4 w-4" />,
      bias: agents.trend.bias,
      confidence: agents.trend.confidence,
      reasons: agents.trend.reasons,
      invalidationLevel: agents.trend.invalidationLevel,
      extra: {
        Structure: agents.trend.marketPhase as string,
        Momentum: agents.trend.momentumDirection as string,
        Direction: agents.trend.maAlignment ? "Clean" : "Mixed",
        Timeframes: agents.trend.timeframeBias.aligned ? "Aligned" : `${tfCount}/4`,
      } as Record<string, string | number | boolean | null>,
      statusLabel: "Primary",
      priority:
        masterDirection !== 0 && getBiasDirection(agents.trend.bias) === masterDirection
          ? ("lead" as SupportCardPriority)
          : ("support" as SupportCardPriority),
    },
    {
      agentId: "smc",
      label: "Candle Confirmation",
      icon: <Activity className="h-4 w-4" />,
      bias: agents.smc.bias,
      confidence: agents.smc.confidence,
      reasons: agents.smc.reasons,
      invalidationLevel: agents.smc.invalidationLevel,
      extra: {
        Pattern: agents.smc.setupType as string,
        Zone: agents.smc.premiumDiscount as string,
        Close: agents.smc.bosDetected ? "Confirmed" : "Waiting",
        Rejection: agents.smc.liquiditySweepDetected ? "Visible" : "Waiting",
      } as Record<string, string | number | boolean | null>,
      statusLabel: "Primary",
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
      statusLabel: "Filter",
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
        Volatility: `${agents.risk.volatilityScore}/100`,
        "Max Risk": `${agents.risk.maxRiskPercent}%`,
      } as Record<string, string | number | boolean | null>,
      isGate: true,
      statusLabel: "Gate",
      priority: agents.risk.valid ? ("support" as SupportCardPriority) : ("watch" as SupportCardPriority),
    },
    {
      agentId: "contrarian",
      label: "Invalidation Check",
      icon: <FlipHorizontal2 className="h-4 w-4" />,
      bias: agents.contrarian.challengesBias ? "opposing" : "neutral",
      confidence: agents.contrarian.trapConfidence,
      reasons: agents.contrarian.failureReasons,
      extra: {
        Conflict: agents.contrarian.trapType ?? "None",
        Risk: `${agents.contrarian.riskFactor}%`,
        "Opp Level": agents.contrarian.oppositeLiquidity?.toFixed(4) ?? "--",
      } as Record<string, string | number | boolean | null>,
      statusLabel: "Check",
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

function StatusPill({
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
      ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
      : tone === "negative"
        ? "border-red-400/20 bg-red-400/[0.07] text-red-300"
        : tone === "warning"
          ? "border-amber-400/20 bg-amber-400/[0.07] text-amber-300"
          : "border-white/10 bg-white/[0.035] text-zinc-300";

  return (
    <div className={cn("rounded-xl border px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]", classes)}>
      <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="mt-1 truncate text-[12px] font-semibold">{value}</div>
    </div>
  );
}

function WarRoomHudPanel({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "warning" | "neutral";
}) {
  const dot =
    tone === "positive"
      ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]"
      : tone === "negative"
        ? "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.9)]"
        : tone === "warning"
          ? "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]"
          : "bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.75)]";

  return (
    <div className="rounded-xl border border-cyan-300/15 bg-black/55 px-3 py-2 backdrop-blur-md shadow-[0_0_22px_rgba(6,182,212,0.08)]">
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-cyan-100/70">{label}</span>
      </div>
      <div className="mt-1 font-mono text-[12px] font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function PriceBox({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number | null;
  tone: "entry" | "stop" | "target" | "neutral";
}) {
  const classes =
    tone === "entry"
      ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300"
      : tone === "target"
        ? "border-cyan-400/25 bg-cyan-400/[0.06] text-cyan-200"
        : tone === "stop"
          ? "border-red-400/25 bg-red-400/[0.06] text-red-300"
          : "border-white/10 bg-white/[0.035] text-zinc-300";

  return (
    <div className={cn("rounded-xl border px-3 py-3", classes)}>
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-bold tracking-tight">
        {typeof value === "number"
          ? value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: value > 100 ? 2 : 5,
            })
          : "--"}
      </div>
    </div>
  );
}

function ExecutionPanel({
  data,
  actionLabel,
  noTradeItems,
}: {
  data: AgentRunResult;
  actionLabel: "WAIT" | "PREPARE" | "EXECUTE";
  noTradeItems: string[];
}) {
  const plan = data.agents.master.tradePlan;
  const isLong = plan?.direction === "long";

  return (
    <div className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(10,12,14,0.94),rgba(6,7,9,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Execution Instruction</div>
          <div className="mt-1 text-sm font-semibold text-zinc-200">
            {plan ? `${isLong ? "Long" : "Short"} setup · ${actionLabel}` : `No active setup · ${actionLabel}`}
          </div>
        </div>
        <div
          className={cn(
            "rounded-full border px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]",
            actionLabel === "EXECUTE"
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : actionLabel === "PREPARE"
                ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                : "border-zinc-500/25 bg-zinc-500/10 text-zinc-300"
          )}
        >
          {actionLabel}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <PriceBox label="Entry" value={plan?.entry ?? null} tone="entry" />
        <PriceBox label="Stop Loss" value={plan?.stopLoss ?? null} tone="stop" />
        <PriceBox label="TP1" value={plan?.tp1 ?? null} tone="target" />
        <PriceBox label="TP2" value={plan?.tp2 ?? null} tone="target" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusPill label="RR Ratio" value={plan ? `${plan.rrRatio.toFixed(1)}:1` : "--"} tone={plan && plan.rrRatio >= 2 ? "positive" : "warning"} />
          <StatusPill label="Max Risk" value={plan ? `${plan.maxRiskPercent}%` : "--"} tone="neutral" />
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Trigger / Next Action</div>
          <div className="mt-2 text-[12px] leading-5 text-zinc-300">
            {plan?.triggerCondition ??
              noTradeItems[0] ??
              data.agents.master.noTradeReason ??
              "Wait for clean candle close confirmation at the key level."}
          </div>
        </div>
      </div>
    </div>
  );
}

function DriverCard({
  title,
  value,
  confidence,
  detail,
  meta,
  tone,
  onClick,
}: {
  title: string;
  value: string;
  confidence: number;
  detail: string;
  meta: Array<{ label: string; value: string }>;
  tone: "positive" | "negative" | "warning" | "neutral";
  onClick?: () => void;
}) {
  const accent =
    tone === "positive"
      ? "border-emerald-400/25 bg-emerald-400/[0.035] text-emerald-300"
      : tone === "negative"
        ? "border-red-400/25 bg-red-400/[0.035] text-red-300"
        : tone === "warning"
          ? "border-amber-400/25 bg-amber-400/[0.035] text-amber-300"
          : "border-emerald-300/12 bg-white/[0.02] text-zinc-300";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition-all hover:border-emerald-300/35 hover:bg-emerald-300/[0.045]",
        accent
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{title}</div>
          <div className="mt-1 text-[18px] font-semibold tracking-tight">{value}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Confidence</div>
          <div className="mt-1 font-mono text-[15px] font-semibold">{confidence}%</div>
        </div>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn(
            "h-full rounded-full",
            tone === "positive"
              ? "bg-emerald-400"
              : tone === "negative"
                ? "bg-red-400"
                : tone === "warning"
                  ? "bg-amber-400"
                  : "bg-zinc-500"
          )}
          style={{ width: `${Math.max(0, Math.min(confidence, 100))}%` }}
        />
      </div>

      <p className="mt-3 line-clamp-2 text-[12px] leading-5 text-zinc-400">{detail}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {meta.map((item) => (
          <div key={item.label} className="rounded-xl border border-emerald-300/10 bg-black/20 px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">{item.label}</div>
            <div className="mt-1 truncate text-[12px] font-semibold text-zinc-200">{item.value}</div>
          </div>
        ))}
      </div>
    </button>
  );
}

export function BrainTerminal() {
  const [symbol, setSymbol] = useState<Symbol>("XAUUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [highlightAgentId, setHighlightAgentId] = useState<string | undefined>();
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
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
  const alignedCount = data ? getAlignedAgentCount(data) : 0;
  const actionState = getExecutionActionState(data);
  const actionLabel = actionState.label;
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

  const noTradeItems = useMemo(() => {
    if (!data) return [];
    return [
      data.agents.smc.reasons[0],
      data.agents.trend.reasons[0],
      data.agents.execution.hasSetup ? data.agents.execution.triggerCondition : "Wait for candle close confirmation at the key level.",
    ].filter(Boolean) as string[];
  }, [data]);

  const brainDecision = useMemo(() => {
    if (!data) {
      return {
        label: "WAIT",
        subLabel: "Awaiting price read",
        detail: "Loading price action state.",
        tone: "neutral" as const,
      };
    }

    if (actionState.label === "WAIT") {
      return {
        label: "NO TRADE",
        subLabel: "No clean confirmation",
        detail: data.agents.master.noTradeReason ?? "No clean price action setup. Stand aside.",
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
          ? "Conditions aligned. Execute only according to the plan."
          : data.agents.execution.triggerCondition || "Wait for candle close confirmation at the level.",
      tone,
    };
  }, [actionState.label, data]);

  const decisionToneClasses =
    brainDecision.tone === "positive"
      ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300"
      : brainDecision.tone === "negative"
        ? "border-red-400/25 bg-red-400/[0.08] text-red-300"
        : brainDecision.tone === "warning"
          ? "border-amber-400/25 bg-amber-400/[0.08] text-amber-300"
          : "border-white/10 bg-white/[0.035] text-zinc-200";

  const marketBiasTone = data?.agents.trend.bias === "bullish" ? "positive" : data?.agents.trend.bias === "bearish" ? "negative" : "neutral";
  const candleTone = data?.agents.smc.bias === "bullish" ? "positive" : data?.agents.smc.bias === "bearish" ? "negative" : "warning";
  const rejectionTone = data?.agents.smc.liquiditySweepDetected ? "positive" : "warning";

  return (
    <div className="w-full min-w-0 space-y-4 pb-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05]">
            <Brain className="h-4.5 w-4.5 text-emerald-200" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-white">Brain</h1>
            <p className="text-[11px] text-zinc-500">Pixel-Art War Room · Pure price action decision layer.</p>
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
            onClick={() => setFocusMode((current) => !current)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all",
              focusMode
                ? "border-emerald-400/25 bg-emerald-400/12 text-emerald-300"
                : "border-white/10 bg-white/4 text-zinc-400 hover:bg-white/8 hover:text-white"
            )}
          >
            <Crosshair className="h-3.5 w-3.5" />
            Focus Mode
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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)]">
          <div className="rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(12,13,16,0.96),rgba(8,9,12,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Brain Output</div>

            <div className={cn("mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", decisionToneClasses)}>
              {brainDecision.subLabel}
            </div>

            <div
              className={cn(
                "mt-4 text-[28px] font-semibold tracking-[-0.035em] sm:text-[36px]",
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

            <p className="mt-2 text-[12px] leading-5 text-zinc-400">{brainDecision.detail}</p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <StatusPill
                label="Risk Gate"
                value={data.agents.risk.valid ? `OPEN · ${data.agents.risk.grade}` : `BLOCKED · ${data.agents.risk.grade}`}
                tone={data.agents.risk.valid ? "positive" : "warning"}
              />
              <StatusPill label="Candle Close" value={candleClose} tone="neutral" />
              <StatusPill label="Aligned Reads" value={`${alignedCount}/${data.agents.master.agentConsensus.length}`} tone="neutral" />
              <StatusPill label="Live Price" value={livePriceLabel} tone="neutral" />
            </div>

            <div className="mt-4 grid gap-2">
              <StatusPill label="Market Bias" value={data.agents.trend.bias.toUpperCase()} tone={marketBiasTone} />
              <StatusPill label="Candle Confirmation" value={data.agents.smc.bias.toUpperCase()} tone={candleTone} />
              <StatusPill label="Level Rejection" value={data.agents.smc.liquiditySweepDetected ? "VALID" : "WAITING"} tone={rejectionTone} />
            </div>
          </div>

          {!focusMode ? (
            <div className="relative overflow-hidden rounded-[24px] border border-cyan-400/15 bg-black/50 shadow-[0_0_45px_rgba(6,182,212,0.1)]">
              <div className="relative min-h-[360px] w-full [&>*]:h-auto [&>*]:min-h-[360px] [&>*]:w-full [&_img]:h-auto [&_img]:w-full [&_img]:object-contain [&_.absolute.rounded-full]:hidden">
                <AgentCommandRoom
                  data={data}
                  loading={false}
                  focusedAgentId={focusedAgentId}
                  onHoverAgentChange={setHoveredAgentId}
                  onSelectAgentChange={setActiveAgentId}
                />
              </div>

              <div className="pointer-events-none absolute inset-x-3 top-3 grid gap-2 sm:grid-cols-3">
                <WarRoomHudPanel label="X TRADEX" value={`${symbol} · ${timeframe}`} tone="neutral" />
                <WarRoomHudPanel label="Bias" value={data.agents.trend.bias.toUpperCase()} tone={marketBiasTone} />
                <WarRoomHudPanel label="State" value={actionState.label} tone={actionState.tone} />
              </div>

              <div className="pointer-events-none absolute bottom-3 left-3 right-3 grid gap-2 sm:grid-cols-3">
                <WarRoomHudPanel label="Candle" value={data.agents.smc.bias.toUpperCase()} tone={candleTone} />
                <WarRoomHudPanel label="Rejection" value={data.agents.smc.liquiditySweepDetected ? "VALID" : "WAITING"} tone={rejectionTone} />
                <WarRoomHudPanel label="Confidence" value={`${data.agents.master.confidence}%`} tone={brainDecision.tone} />
              </div>

              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(34,197,94,0.06),transparent_35%),linear-gradient(180deg,transparent,rgba(0,0,0,0.18))]" />
            </div>
          ) : null}
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_340px]">
          <ExecutionPanel data={data} actionLabel={actionLabel} noTradeItems={noTradeItems} />

          <div className="space-y-3">
            <div className="rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(13,13,13,0.9),rgba(10,10,10,0.9))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">Risk Gate</div>
              <div className={cn("mt-3 text-[20px] font-semibold tracking-tight", data.agents.risk.valid ? "text-emerald-300" : "text-amber-300")}>
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
                  ? noTradeItems
                  : [data.agents.execution.triggerCondition, data.agents.master.tradePlan?.managementNotes?.[0], data.agents.master.tradePlan?.managementNotes?.[1]]) ?? [])
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-start gap-2.5">
                      <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                      <p className="text-[12px] leading-5 text-zinc-400">{item}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {data ? (
        <div className="space-y-3 rounded-2xl border border-emerald-300/10 bg-[linear-gradient(180deg,rgba(12,12,12,0.78),rgba(9,9,9,0.92))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">Decision Drivers</h2>
              <p className="mt-1 text-[11px] text-zinc-500">Price movement, candle confirmation, level rejection, and risk.</p>
            </div>
            <button
              onClick={() => setShowFilters((current) => !current)}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] text-zinc-400 transition-colors hover:bg-white/8 hover:text-zinc-200"
            >
              {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showFilters ? "Hide secondary filters" : "Show secondary filters"}
            </button>
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            <DriverCard
              title="Market Bias"
              value={data.agents.trend.bias.toUpperCase()}
              confidence={data.agents.trend.confidence}
              detail={data.agents.trend.reasons[0] ?? "No market bias read available."}
              meta={[
                { label: "Structure", value: String(data.agents.trend.marketPhase) },
                { label: "Momentum", value: String(data.agents.trend.momentumDirection) },
                { label: "Direction", value: data.agents.trend.maAlignment ? "Clean" : "Mixed" },
              ]}
              tone={marketBiasTone}
              onClick={() => openDrawer("trend")}
            />
            <DriverCard
              title="Candle Confirmation"
              value={data.agents.smc.bias.toUpperCase()}
              confidence={data.agents.smc.confidence}
              detail={data.agents.smc.reasons[0] ?? "No candle confirmation read available."}
              meta={[
                { label: "Pattern", value: String(data.agents.smc.setupType) },
                { label: "Zone", value: String(data.agents.smc.premiumDiscount) },
                { label: "Close", value: data.agents.smc.bosDetected ? "Confirmed" : "Waiting" },
              ]}
              tone={candleTone}
              onClick={() => openDrawer("smc")}
            />
            <DriverCard
              title="Level Rejection"
              value={data.agents.smc.liquiditySweepDetected ? "VALID" : "WAITING"}
              confidence={data.agents.smc.confidence}
              detail={data.agents.smc.reasons[1] ?? data.agents.smc.reasons[0] ?? "Waiting for a clean rejection at the level."}
              meta={[
                { label: "Rejection", value: data.agents.smc.liquiditySweepDetected ? "Visible" : "Waiting" },
                { label: "Invalidation", value: data.agents.smc.invalidationLevel ? data.agents.smc.invalidationLevel.toFixed(2) : "--" },
                { label: "Risk", value: data.agents.risk.valid ? "Allowed" : "Blocked" },
              ]}
              tone={rejectionTone}
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
            <div className="rounded-xl border border-dashed border-emerald-300/12 bg-white/[0.02] px-4 py-5 text-sm text-zinc-500">
              Secondary filters are collapsed. Main price action drivers remain visible.
            </div>
          )}
        </div>
      ) : null}

      {showDetailLayer && data ? (
        <div className="space-y-4 rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(11,13,16,0.92),rgba(8,9,12,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-200">Detailed Layer</h2>
              <p className="text-xs text-zinc-500">Full operational log only. War Room stays in the main visual layer.</p>
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
              <p className="text-xs text-zinc-500">Keep logs hidden unless you need deeper context.</p>
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
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10">
                <Sparkles className="h-4 w-4 text-emerald-300" />
              </div>
              <p className="text-sm font-medium text-zinc-200">Detailed layer is hidden for faster decision-making.</p>
              <p className="mt-1 text-[12px] leading-5 text-zinc-500">Expand only when you need the full log.</p>
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
