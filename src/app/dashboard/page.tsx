"use client";

import React, { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  Clock,
  Maximize2,
  Minimize2,
  RefreshCw,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { TradingViewChart } from "@/components/shared/TradingViewChart";
import { CommunityPanel } from "@/components/shared/CommunityPanel";
import { CatalystFeed } from "@/components/shared/CatalystFeed";
import { DetailModal } from "@/components/shared/DetailModal";
import { TrumpImpactPreview } from "@/components/shared/TrumpFeedPanel";
import { TradeContextBox } from "@/components/shared/TradeContextBox";
import { SessionSummaryCard } from "@/components/shared/SessionSummaryCard";
import {
  useEconomicCalendar,
  useTrumpPosts,
  useCatalysts,
  useSessions,
  useMarketAnalysis,
} from "@/hooks/useMarketData";
import type { AgentRunResult, Symbol, Timeframe } from "@/lib/agents/schemas";
import type { EconomicEvent } from "@/types";

const SYMBOLS: { id: Symbol; tv: string; label: string; short: string }[] = [
  { id: "XAUUSD", tv: "OANDA:XAUUSD", label: "Gold", short: "XAU" },
  { id: "EURUSD", tv: "OANDA:EURUSD", label: "EUR/USD", short: "EUR" },
  { id: "GBPUSD", tv: "OANDA:GBPUSD", label: "GBP/USD", short: "GBP" },
  { id: "BTCUSD", tv: "BITSTAMP:BTCUSD", label: "Bitcoin", short: "BTC" },
];

const TIMEFRAMES: Timeframe[] = ["M5", "M15", "H1", "H4"];

const fetcher = (url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error("Failed");
    }

    return response.json() as Promise<AgentRunResult>;
  });

function biasColor(bias?: string) {
  if (bias === "bullish") return "text-emerald-400";
  if (bias === "bearish") return "text-red-400";
  return "text-[hsl(var(--muted-foreground))]";
}

function biasBadgeClass(bias?: string) {
  if (bias === "bullish") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (bias === "bearish") return "border-red-500/20 bg-red-500/10 text-red-300";
  return "border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]";
}

function formatBiasLabel(bias?: string) {
  if (!bias) return "NEUTRAL";
  return bias.replace(/-/g, " ").toUpperCase();
}

function formatTradePrice(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "--";
  return value.toFixed(value > 100 ? 2 : 4);
}

function signalStateConfig(state?: string) {
  switch (state) {
    case "ARMED":
      return {
        badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        dot: "bg-emerald-400",
        label: "Armed",
      };
    case "PENDING":
      return {
        badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
        dot: "bg-amber-400",
        label: "Pending",
      };
    case "EXPIRED":
      return {
        badge: "border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]",
        dot: "bg-zinc-500",
        label: "Expired",
      };
    default:
      return {
        badge: "border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]",
        dot: "bg-zinc-500",
        label: "No Trade",
      };
  }
}

function StatCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <p className={cn("text-sm font-mono font-semibold text-[hsl(var(--foreground))]", color)}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{label}</span>
      <span className={cn("max-w-[65%] text-right text-[11px] font-mono text-[hsl(var(--foreground))]", tone)}>
        {value}
      </span>
    </div>
  );
}

function SummaryCard({
  title,
  icon,
  hint = "Open overview",
  onClick,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  hint?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const interactive = Boolean(onClick);

  return (
    <Card
      className={cn(
        "h-full",
        interactive &&
          "cursor-pointer transition-all hover:border-[hsl(var(--primary))]/25 hover:bg-[hsl(var(--secondary))]/35"
      )}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <CardHeader className="pb-1.5">
        <CardTitle className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </span>
          {interactive ? <span className="text-[9px] text-[hsl(var(--primary))]">{hint}</span> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

function OverviewPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/6 bg-white/[0.03] p-3.5">
      <p className="text-[11px] font-medium text-zinc-300">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function OverviewMetric({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] font-medium text-zinc-500">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold text-zinc-100", tone, mono && "font-mono")}>{value}</p>
    </div>
  );
}

function OverviewBullets({
  items,
  tone,
}: {
  items: string[];
  tone?: string;
}) {
  if (items.length === 0) {
    return <p className="text-[13px] leading-5 text-zinc-500">No extra context available.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex items-start gap-2">
          <span className={cn("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500", tone)} />
          <p className={cn("text-[13px] leading-5 text-zinc-300", tone && "text-zinc-200")}>{item}</p>
        </div>
      ))}
    </div>
  );
}

function ReasonChip({
  label,
  tone,
}: {
  label: string;
  tone?: string;
}) {
  return (
    <span
      className={cn(
        "max-w-full truncate rounded-full border border-white/6 bg-white/[0.03] px-3 py-1.5 text-[11px] text-zinc-300",
        tone
      )}
      title={label}
    >
      {label}
    </span>
  );
}

type OverviewKey = "signal" | "snapshot" | "consensus" | "risk";

function overviewTitle(key: OverviewKey | null) {
  switch (key) {
    case "signal":
      return "Trade Signal Overview";
    case "snapshot":
      return "Market Snapshot Overview";
    case "consensus":
      return "Agent Consensus Overview";
    case "risk":
      return "Risk and Session Overview";
    default:
      return "";
  }
}

function compactItems(items: Array<string | null | undefined | false>, limit = 6) {
  const filtered = items
    .filter((item): item is string => Boolean(item && item.trim()))
    .map((item) => item.trim());

  return Array.from(new Set(filtered)).slice(0, limit);
}

function SummaryHint({
  tone,
  children,
}: {
  tone?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("line-clamp-2 text-[10px] leading-5 text-[hsl(var(--muted-foreground))]", tone)}>
      {children}
    </p>
  );
}

function SetupField({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/35 p-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <p className={cn("mt-1 text-sm font-mono font-semibold text-[hsl(var(--foreground))]", tone)}>{value}</p>
      {detail ? <p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{detail}</p> : null}
    </div>
  );
}

function decisionConfig(decision: "WAIT" | "TRADE" | "NO TRADE") {
  switch (decision) {
    case "TRADE":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
    case "WAIT":
      return "border-amber-500/25 bg-amber-500/10 text-amber-300";
    default:
      return "border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]";
  }
}

function SectionHeader({
  icon,
  label,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
          {label}
        </span>
      </div>
      {action}
    </div>
  );
}

function PanelPlaceholder({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/40 px-3 py-4">
      <p className="text-[11px] font-medium text-[hsl(var(--foreground))]">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{detail}</p>
    </div>
  );
}

function SidebarCountdown({ utcTimestamp }: { utcTimestamp?: number }) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    if (!utcTimestamp) {
      setDiff(null);
      return;
    }

    const tick = () => setDiff(utcTimestamp - Date.now());
    tick();

    const intervalId = setInterval(tick, utcTimestamp - Date.now() < 5 * 60_000 ? 1000 : 30_000);
    return () => clearInterval(intervalId);
  }, [utcTimestamp]);

  if (diff === null || diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`;

  return (
    <span className="inline-flex items-center rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-blue-400">
      {label}
    </span>
  );
}

function EventToneBadge({
  label,
  tone,
}: {
  label: string;
  tone?: "bullish" | "bearish" | "neutral";
}) {
  if (!tone) return null;

  return (
    <Badge variant={tone} className="text-[9px]">
      {label} {tone}
    </Badge>
  );
}

function SidebarEventPreview({ event }: { event: EconomicEvent }) {
  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono font-semibold text-[hsl(var(--foreground))]">{event.time}</span>
        <SidebarCountdown utcTimestamp={event.utcTimestamp} />
        <Badge variant={event.impact === "high" ? "high" : event.impact === "medium" ? "medium" : "low"} className="text-[9px]">
          {event.impact}
        </Badge>
      </div>

      <p className="mt-2 text-[12px] font-semibold leading-5 text-[hsl(var(--foreground))]">
        {event.event}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Forecast</p>
          <p className="mt-1 text-[11px] font-mono text-[hsl(var(--foreground))]">{event.forecast}</p>
        </div>
        <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">Previous</p>
          <p className="mt-1 text-[11px] font-mono text-[hsl(var(--foreground))]">{event.previous}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <EventToneBadge label="Gold" tone={event.goldImpact} />
        <EventToneBadge label="USD" tone={event.usdImpact} />
      </div>

      {event.affectedAssets.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.affectedAssets.slice(0, 3).map((asset) => (
            <span
              key={asset}
              className="rounded bg-[hsl(var(--card))] px-1.5 py-0.5 text-[9px] font-mono text-[hsl(var(--muted-foreground))]"
            >
              {asset}
            </span>
          ))}
        </div>
      ) : null}

      {event.tradeImplication ? (
        <p className="mt-3 text-[11px] leading-5 text-[hsl(var(--muted-foreground))] line-clamp-2">
          {event.tradeImplication}
        </p>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const [symbol, setSymbol] = useState<Symbol>("XAUUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeOverview, setActiveOverview] = useState<OverviewKey | null>(null);

  const symCfg = SYMBOLS.find((entry) => entry.id === symbol) ?? SYMBOLS[0];

  const { data, isLoading, mutate } = useSWR<AgentRunResult>(
    `/api/agents/run?symbol=${symbol}&timeframe=${timeframe}&t=${refreshKey}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  const handleRefresh = useCallback(async () => {
    setRefreshKey((current) => current + 1);
    await mutate();
  }, [mutate]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    handleFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Failed to toggle fullscreen:", error);
    }
  }, []);

  const { events } = useEconomicCalendar();
  const { posts: trump } = useTrumpPosts();
  const { catalysts } = useCatalysts();
  const { sessions } = useSessions();
  const { tradeContext } = useMarketAnalysis();

  const upcomingEvents = events.filter((event) => event.status === "upcoming" || event.status === "live");
  const calendarPreview = upcomingEvents.length > 0 ? upcomingEvents.slice(0, 5) : events.slice(0, 5);
  const activeSessions = sessions.filter((session) => session.status === "active" || session.status === "closed");
  const sessionPreview = activeSessions.length > 0 ? activeSessions.slice(0, 3) : sessions.slice(0, 3);
  const primarySession = sessionPreview[0];

  const master = data?.agents.master;
  const exec = data?.agents.execution;
  const risk = data?.agents.risk;
  const trend = data?.agents.trend;
  const smc = data?.agents.smc;
  const news = data?.agents.news;
  const contrarian = data?.agents.contrarian;
  const snap = data?.snapshot;
  const tradePlan = master?.tradePlan;

  const finalBias = master?.finalBias ?? "no-trade";
  const isNoTrade = finalBias === "no-trade";
  const signalState = isNoTrade ? "NO_TRADE" : exec?.signalState;
  const signalConfig = signalStateConfig(signalState);
  const signalReason =
    exec?.signalStateReason ??
    master?.noTradeReason ??
    "No active trade plan. Monitor the terminal for the next valid setup.";

  const currentPrice = snap?.price.current ?? 0;
  const priceLabel =
    currentPrice > 0
      ? currentPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: currentPrice > 100 ? 2 : 5,
        })
      : "--";

  const agentRows = [
    { label: "Trend", bias: trend?.bias ?? "neutral", confidence: trend?.confidence ?? 0 },
    { label: "Price Action", bias: smc?.bias ?? "neutral", confidence: smc?.confidence ?? 0 },
    { label: "News", bias: news?.impact ?? "neutral", confidence: news?.confidence ?? 0 },
    {
      label: "Execution",
      bias: exec?.direction === "long" ? "bullish" : exec?.direction === "short" ? "bearish" : "neutral",
      confidence: exec?.hasSetup ? 75 : 30,
    },
    {
      label: "Contrarian",
      bias: contrarian?.challengesBias ? "bearish" : "neutral",
      confidence: contrarian?.riskFactor ?? 0,
    },
  ];

  const signalPreview = master?.strategyMatch ?? signalReason;
  const snapshotPreview = snap?.structure?.smcContext ?? "Structure context is recalculating from the latest feed.";
  const consensusPreview =
    master?.supports?.[0] ?? "Consensus blends trend, price action, catalysts, execution timing, and contrarian risk.";
  const riskPreview =
    primarySession?.carriesForward ??
    tradeContext.directionalLean ??
    "Risk posture updates with volatility, session quality, and macro pressure.";
  const finalDecision: "WAIT" | "TRADE" | "NO TRADE" =
    finalBias === "no-trade" || risk?.valid === false
      ? "NO TRADE"
      : signalState === "ARMED" && exec?.hasSetup
        ? "TRADE"
        : exec?.hasSetup || signalState === "PENDING"
          ? "WAIT"
          : "NO TRADE";
  const setupType =
    master?.strategyMatch ??
    (smc?.setupType && smc.setupType !== "None" ? `${smc.setupType.toUpperCase()} SETUP` : "No confirmed setup");
  const entryTrigger = tradePlan?.triggerCondition ?? exec?.triggerCondition ?? signalReason;
  const entryZone = tradePlan?.entryZone ?? exec?.entryZone ?? snap?.structure?.zone ?? "--";
  const invalidationLevel = tradePlan?.stopLoss ?? smc?.invalidationLevel ?? trend?.invalidationLevel ?? null;
  const invalidationLabel = invalidationLevel != null ? formatTradePrice(invalidationLevel) : "--";
  const invalidationNote = tradePlan?.slZone ?? "Invalidation level";
  const tp1Label = tradePlan?.tp1 != null ? formatTradePrice(tradePlan.tp1) : "--";
  const tp2Label = tradePlan?.tp2 != null ? formatTradePrice(tradePlan.tp2) : "--";
  const maxRiskLabel = tradePlan?.maxRiskPercent
    ? `${tradePlan.maxRiskPercent}%`
    : risk?.maxRiskPercent
      ? `${risk.maxRiskPercent}%`
      : "--";
  const riskRewardLabel = tradePlan?.rrRatio
    ? `${tradePlan.rrRatio}:1`
    : risk?.estimatedRR != null
      ? `${risk.estimatedRR}:1`
      : "--";
  const executionNote =
    tradePlan?.managementNotes?.[0] ??
    master?.supports?.[0] ??
    "Execution remains gated by live structure, agent consensus, and risk quality.";
  const directionLabel =
    tradePlan?.direction?.toUpperCase() ??
    (exec?.direction && exec.direction !== "none" ? exec.direction.toUpperCase() : "--");
  const confidenceLabel = master ? `${master.confidence}%` : "--";
  const topSummaryMetrics = [
    { label: "Signal", value: signalConfig.label.toUpperCase(), tone: biasColor(finalBias) },
    { label: "Bias", value: formatBiasLabel(finalBias), tone: biasColor(finalBias) },
    { label: "Direction", value: directionLabel, tone: biasColor(finalBias) },
    { label: "Confidence", value: confidenceLabel, mono: true },
    { label: "Max Risk", value: maxRiskLabel, mono: true },
  ];
  const executionMetrics = [
    { label: "Entry", value: tradePlan?.entry != null ? formatTradePrice(tradePlan.entry) : "--", mono: true },
    { label: "Stop", value: invalidationLabel, tone: "text-red-300", mono: true },
    { label: "TP1", value: tp1Label, tone: "text-emerald-300", mono: true },
    { label: "TP2", value: tp2Label, tone: "text-emerald-200", mono: true },
    { label: "R:R", value: riskRewardLabel, tone: tradePlan && (tradePlan.rrRatio ?? 0) >= 2 ? "text-emerald-300" : "text-amber-300", mono: true },
    { label: "Final Action", value: finalDecision, tone: finalDecision === "TRADE" ? "text-emerald-300" : finalDecision === "WAIT" ? "text-amber-300" : "text-zinc-300" },
  ];
  const overviewContent = (() => {
    switch (activeOverview) {
      case "snapshot":
        return {
          statusItems: compactItems([
            snapshotPreview,
            snap?.isExtended
              ? "Momentum is extended, so entries need tighter risk and better confirmation."
              : "Momentum is balanced enough for structure-led execution.",
            `Session: ${snap?.indicators?.session ?? primarySession?.session.toUpperCase() ?? "--"}`,
          ], 3),
          triggerItems: compactItems([
            entryTrigger,
            `Price is tagged ${snap?.structure?.zone ?? "--"} near equilibrium ${snap ? formatTradePrice(snap.structure.equilibrium) : "--"}.`,
            snap?.structure?.smcContext,
          ], 3),
          whyItems: compactItems([
            trend?.reasons?.[0],
            smc?.reasons?.[0],
            news?.reasons?.[0],
            master?.supports?.[0],
          ], 4),
          chips: compactItems([
            ...((snap?.recentNews ?? []).slice(0, 2).map((item) => item.headline)),
            `RSI ${snap?.indicators?.rsi ?? "--"}`,
            `${Math.round(snap?.structure?.pos52w ?? 0)}% through 52W range`,
            `HTF ${formatBiasLabel(snap?.structure?.htfBias)}`,
          ], 6),
        };
      case "consensus":
        return {
          statusItems: compactItems([
            consensusPreview,
            `${agentRows.filter((agent) => agent.bias === finalBias).length}/${agentRows.length} support agents align with the current bias.`,
            `Consensus score ${master ? `${master.consensusScore > 0 ? "+" : ""}${master.consensusScore.toFixed(1)}` : "--"}.`,
          ], 3),
          triggerItems: compactItems([
            entryTrigger,
            ...agentRows.slice(0, 3).map((agent) => `${agent.label}: ${formatBiasLabel(agent.bias)} ${agent.confidence}%`),
          ], 4),
          whyItems: compactItems([
            ...(master?.supports ?? []),
            ...(master?.invalidations ?? []).slice(0, 2).map((item) => `Watch: ${item}`),
          ], 5),
          chips: compactItems([
            ...agentRows.map((agent) => `${agent.label} ${formatBiasLabel(agent.bias)} ${agent.confidence}%`),
            master?.strategyMatch,
          ], 7),
        };
      case "risk":
        return {
          statusItems: compactItems([
            riskPreview,
            `Risk gate is ${risk ? `${risk.valid ? "VALID" : "BLOCKED"} ${risk.grade}` : "--"}.`,
            `Volatility ${risk ? risk.volatilityScore : "--"} / Session ${risk ? risk.sessionScore : "--"}.`,
          ], 3),
          triggerItems: compactItems([
            entryTrigger,
            ...(risk?.warnings ?? []).slice(0, 2),
            ...(risk?.reasons ?? []).slice(0, 1),
          ], 4),
          whyItems: compactItems([
            ...(risk?.warnings ?? []),
            ...(tradeContext.cautionFactors ?? []),
            tradeContext.directionalLean,
          ], 5),
          chips: compactItems([
            `Max risk ${maxRiskLabel}`,
            `Estimated ${riskRewardLabel}`,
            primarySession?.session.toUpperCase(),
            ...(tradeContext.cautionFactors ?? []),
          ], 7),
        };
      case "signal":
      default:
        return {
          statusItems: compactItems([
            signalReason,
            master?.strategyMatch,
            finalDecision === "TRADE"
              ? "Conditions are aligned enough to execute if price confirms."
              : finalDecision === "WAIT"
                ? "Setup exists, but the desk still wants more confirmation."
                : "Consensus or risk quality is not strong enough to trade.",
          ], 3),
          triggerItems: compactItems([
            entryTrigger,
            tradePlan?.trigger ? `Setup trigger: ${tradePlan.trigger.toUpperCase()}` : null,
            entryZone !== "--" ? `Entry zone: ${entryZone}` : null,
          ], 3),
          whyItems: compactItems([
            ...(master?.supports ?? []),
            ...(master?.invalidations ?? []).slice(0, 2).map((item) => `Watch: ${item}`),
          ], 5),
          chips: compactItems([
            ...agentRows.map((agent) => `${agent.label} ${formatBiasLabel(agent.bias)} ${agent.confidence}%`),
            ...(tradePlan?.managementNotes ?? []),
          ], 8),
        };
    }
  })();
  const chartHeightClass = isFullscreen
    ? "h-[88vh]"
    : "h-[60vh] min-h-[400px] lg:h-[75vh] lg:min-h-[500px]";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:h-[calc(100vh-var(--topbar-height,56px))] lg:overflow-hidden">
      <section className="min-w-0 flex-1 flex flex-col gap-3 lg:overflow-y-auto lg:h-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div>
              <h1 className="text-base font-semibold text-[hsl(var(--foreground))]">Command Center</h1>
            </div>

            <div className="hidden items-center gap-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 xl:flex">
              {SYMBOLS.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSymbol(entry.id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
                    symbol === entry.id
                      ? "bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  {entry.short}
                </button>
              ))}
            </div>

            <div className="hidden items-center gap-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 xl:flex">
              {TIMEFRAMES.map((entry) => (
                <button
                  key={entry}
                  onClick={() => setTimeframe(entry)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-mono transition-colors",
                    timeframe === entry
                      ? "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  )}
                >
                  {entry}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              {isLoading ? "Refreshing" : "Refresh"}
            </button>

            <Link
              href="/dashboard/brain"
              className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              Brain Terminal
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <button
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
              title={isFullscreen ? "Exit full screen" : "Open full screen"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {isFullscreen ? "Exit Full Screen" : "Full Screen"}
            </button>
          </div>
        </div>

        {/* Chart — first thing visible */}
        <Card className="overflow-hidden border-[hsl(var(--primary))]/20">
          <CardContent className="p-0">
            <TradingViewChart symbol={symCfg.tv} heightClass={chartHeightClass} />
          </CardContent>
        </Card>

        <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard
            title="Trade Signal"
            icon={<Activity className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />}
            onClick={() => setActiveOverview("signal")}
          >
            <div className={cn("inline-flex items-center gap-2 rounded-md border px-2.5 py-2", signalConfig.badge)}>
              <span className={cn("h-2 w-2 rounded-full", signalConfig.dot)} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{signalConfig.label}</span>
              {master?.confidence ? (
                <span className="text-[11px] font-mono text-[hsl(var(--foreground))]">{master.confidence}%</span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCell label="Bias" value={formatBiasLabel(finalBias)} color={biasColor(finalBias)} />
              <StatCell label="Direction" value={tradePlan?.direction?.toUpperCase() ?? "--"} />
              <StatCell label="Trigger" value={tradePlan?.trigger?.toUpperCase() ?? "--"} />
              <StatCell
                label="Max Risk"
                value={tradePlan?.maxRiskPercent ? `${tradePlan.maxRiskPercent}%` : "--"}
                color="text-[hsl(var(--muted-foreground))]"
              />
            </div>

            <SummaryHint>{signalPreview}</SummaryHint>
          </SummaryCard>

          <SummaryCard
            title="Market Snapshot"
            icon={<BarChart3 className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />}
            onClick={() => setActiveOverview("snapshot")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{symCfg.label}</p>
                <p className="text-2xl font-semibold font-mono text-[hsl(var(--foreground))]">{priceLabel}</p>
              </div>
              <div className={cn("rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]", biasBadgeClass(finalBias))}>
                {formatBiasLabel(finalBias)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCell
                label="RSI"
                value={String(snap?.indicators?.rsi ?? "--")}
                color={
                  (snap?.indicators?.rsi ?? 50) > 70
                    ? "text-red-400"
                    : (snap?.indicators?.rsi ?? 50) < 30
                      ? "text-emerald-400"
                      : "text-[hsl(var(--foreground))]"
                }
              />
              <StatCell label="Session" value={snap?.indicators?.session ?? primarySession?.session.toUpperCase() ?? "--"} />
              <StatCell label="Zone" value={snap?.structure?.zone ?? "--"} />
              <StatCell
                label="Consensus"
                value={master ? `${master.consensusScore > 0 ? "+" : ""}${master.consensusScore.toFixed(1)}` : "--"}
                color={master && master.consensusScore < 0 ? "text-red-400" : "text-emerald-400"}
              />
            </div>

            <SummaryHint>{snapshotPreview}</SummaryHint>
          </SummaryCard>

          <SummaryCard
            title="Agent Consensus"
            icon={<BrainCircuit className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />}
            onClick={() => setActiveOverview("consensus")}
          >
            <div className="grid grid-cols-3 gap-2">
              {agentRows.slice(0, 3).map((agent) => (
                <div
                  key={agent.label}
                  className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/35 px-2 py-2"
                >
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                    {agent.label}
                  </p>
                  <p className={cn("mt-1 text-[11px] font-mono font-semibold", biasColor(agent.bias))}>
                    {formatBiasLabel(agent.bias)}
                  </p>
                  <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{agent.confidence}%</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-[hsl(var(--border))] pt-3">
              <StatCell
                label="News Risk"
                value={news ? `${news.riskScore ?? 0}/100` : "--"}
                color={
                  (news?.riskScore ?? 0) > 70
                    ? "text-red-400"
                    : (news?.riskScore ?? 0) > 40
                      ? "text-amber-400"
                      : "text-emerald-400"
                }
              />
              <StatCell label="Catalysts" value={String(news?.catalysts?.length ?? catalysts.length)} />
            </div>

            <SummaryHint>{consensusPreview}</SummaryHint>
          </SummaryCard>

          <SummaryCard
            title="Risk and Session"
            icon={<Shield className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />}
            onClick={() => setActiveOverview("risk")}
          >
            <div className="grid grid-cols-2 gap-3">
              <StatCell
                label="Risk Gate"
                value={risk ? `${risk.valid ? "VALID" : "BLOCKED"} ${risk.grade}` : "--"}
                color={risk?.valid ? "text-emerald-400" : "text-red-400"}
              />
              <StatCell label="Volatility" value={risk ? String(risk.volatilityScore) : "--"} />
              <StatCell label="Session Score" value={risk ? String(risk.sessionScore) : "--"} />
              <StatCell label="Session" value={primarySession?.session.toUpperCase() ?? "--"} />
            </div>

            <SummaryHint>{riskPreview}</SummaryHint>
          </SummaryCard>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[hsl(var(--primary))]" />
                  <span>Trade Setup / Execution Plan</span>
                </CardTitle>
                <CardDescription>
                  Direct execution context under the chart so the decision path stays visible without wasting vertical space.
                </CardDescription>
              </div>

              <div
                className={cn(
                  "inline-flex items-center rounded-md border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                  decisionConfig(finalDecision)
                )}
              >
                {finalDecision}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SetupField label="Bias" value={formatBiasLabel(finalBias)} tone={biasColor(finalBias)} />
              <SetupField label="Setup Type" value={setupType} detail={smc?.reasons?.[0]} />
              <SetupField label="Entry Zone" value={entryZone} detail={tradePlan?.direction?.toUpperCase() ?? "WAITING"} />
              <SetupField label="Risk Reward" value={riskRewardLabel} detail={`Max risk ${maxRiskLabel}`} tone={tradePlan && (tradePlan.rrRatio ?? 0) >= 2 ? "text-emerald-400" : "text-amber-400"} />
              <SetupField label="Stop / Invalidation" value={invalidationLabel} detail={invalidationNote} tone="text-red-400" />
              <SetupField label="TP1" value={tp1Label} detail={tradePlan?.tp1Zone ?? "First target"} tone="text-emerald-400" />
              <SetupField label="TP2" value={tp2Label} detail={tradePlan?.tp2 ? "Final target" : "No secondary target"} tone="text-emerald-300" />
              <SetupField label="Final Decision" value={finalDecision} detail={signalState ? `${signalConfig.label.toUpperCase()} signal state` : "Awaiting signal state"} tone={finalDecision === "TRADE" ? "text-emerald-400" : finalDecision === "WAIT" ? "text-amber-400" : "text-[hsl(var(--muted-foreground))]"} />
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/35 p-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Entry Trigger
                </p>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--foreground))]">{entryTrigger}</p>
                <p className="mt-2 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{executionNote}</p>
              </div>

              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/35 p-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Trade Controls
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <StatCell label="Entry" value={tradePlan?.entry != null ? formatTradePrice(tradePlan.entry) : "--"} />
                  <StatCell label="Max Risk" value={maxRiskLabel} color="text-[hsl(var(--foreground))]" />
                  <StatCell label="Signal" value={signalConfig.label.toUpperCase()} color={biasColor(finalBias)} />
                  <StatCell
                    label="Risk Gate"
                    value={risk ? `${risk.valid ? "VALID" : "BLOCKED"} ${risk.grade}` : "--"}
                    color={risk?.valid ? "text-emerald-400" : "text-red-400"}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="w-full lg:w-[300px] xl:w-[320px] shrink-0 lg:sticky lg:top-0 lg:h-[calc(100vh-var(--topbar-height,56px))] lg:flex lg:flex-col lg:overflow-hidden">

        {/* Community chat — fixed at top */}
        <div className="shrink-0">
          <Card className="overflow-hidden rounded-none border-x-0 border-t-0">
            <CardContent className="p-0">
              <CommunityPanel />
            </CardContent>
          </Card>
        </div>

        {/* Rest of sidebar — scrollable */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3">

          <Card>
            <CardHeader className="pb-3">
              <SectionHeader
                icon={<Zap className="h-3.5 w-3.5 text-amber-400" />}
                label="Top Catalysts"
                action={
                  <Link href="/dashboard/catalysts" className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                    All
                  </Link>
                }
              />
            </CardHeader>
            <CardContent>
              {catalysts.length > 0 ? (
                <CatalystFeed catalysts={catalysts} limit={3} compact />
              ) : (
                <PanelPlaceholder
                  title="No catalysts in queue."
                  detail="The headline scanner is waiting for the next market-moving event."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <SectionHeader
                icon={<CalendarDays className="h-3.5 w-3.5 text-blue-400" />}
                label="Upcoming Events"
                action={
                  <Link href="/dashboard/economic-calendar" className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                    Calendar
                  </Link>
                }
              />
            </CardHeader>
            <CardContent>
              {calendarPreview.length > 0 ? (
                <div className="space-y-3">
                  {calendarPreview.slice(0, 2).map((event) => (
                    <SidebarEventPreview key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <PanelPlaceholder
                  title="No scheduled events yet."
                  detail="The event calendar will list the next high-impact releases here."
                />
              )}
            </CardContent>
          </Card>

          {trump.length > 0 ? (
            <TrumpImpactPreview posts={trump} />
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <SectionHeader
                  icon={<Activity className="h-3.5 w-3.5 text-amber-400" />}
                  label="Trump Monitor"
                />
              </CardHeader>
              <CardContent>
                <PanelPlaceholder
                  title="No fresh posts detected."
                  detail="The policy monitor will surface high-impact political headlines here."
                />
              </CardContent>
            </Card>
          )}

          <TradeContextBox context={tradeContext} />

          <Card>
            <CardHeader className="pb-3">
              <SectionHeader
                icon={<Clock className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />}
                label="Sessions"
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {sessionPreview.length > 0 ? (
                sessionPreview.map((session) => (
                  <SessionSummaryCard key={session.session} session={session} compact />
                ))
              ) : (
                <PanelPlaceholder
                  title="Session data is loading."
                  detail="The desk will show the active and recently closed sessions here."
                />
              )}
            </CardContent>
          </Card>

        </div>
      </aside>

      <DetailModal
        open={activeOverview !== null}
        onClose={() => setActiveOverview(null)}
        title={overviewTitle(activeOverview)}
      >
        <div className="space-y-3.5">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {topSummaryMetrics.map((metric) => (
              <OverviewMetric
                key={metric.label}
                label={metric.label}
                value={metric.value}
                tone={metric.tone}
                mono={metric.mono}
              />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div className="space-y-3">
              <OverviewPanel title="Status">
                <OverviewBullets items={overviewContent.statusItems} />
              </OverviewPanel>

              <OverviewPanel title="Trigger condition">
                <OverviewBullets items={overviewContent.triggerItems} tone="bg-amber-400" />
              </OverviewPanel>

              <OverviewPanel title="Why this signal">
                <OverviewBullets items={overviewContent.whyItems} tone="bg-emerald-400" />
              </OverviewPanel>
            </div>

            <OverviewPanel title="Execution Plan">
              <div className="grid grid-cols-2 gap-2.5">
                {executionMetrics.map((metric) => (
                  <OverviewMetric
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    tone={metric.tone}
                    mono={metric.mono}
                  />
                ))}
              </div>
            </OverviewPanel>
          </div>

          <OverviewPanel title="Agent reasoning">
            <div className="flex flex-wrap gap-2">
              {overviewContent.chips.map((item, index) => (
                <ReasonChip
                  key={`${item}-${index}`}
                  label={item}
                  tone={
                    item.startsWith("Watch:")
                      ? "border-red-500/15 bg-red-500/8 text-red-200"
                      : item.includes("BULLISH") || item.includes("VALID")
                        ? "border-emerald-500/15 bg-emerald-500/8 text-emerald-200"
                        : item.includes("BEARISH") || item.includes("BLOCKED")
                          ? "border-red-500/15 bg-red-500/8 text-red-200"
                          : "text-zinc-300"
                  }
                />
              ))}
            </div>
          </OverviewPanel>
        </div>
      </DetailModal>
    </div>
  );
}
