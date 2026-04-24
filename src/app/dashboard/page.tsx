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
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { TradingViewChart } from "@/components/shared/TradingViewChart";
import { CatalystFeed } from "@/components/shared/CatalystFeed";
import { AssetSnapshotGrid } from "@/components/shared/AssetSnapshotGrid";
import { TrumpImpactPreview } from "@/components/shared/TrumpFeedPanel";
import { TradeContextBox } from "@/components/shared/TradeContextBox";
import { SessionSummaryCard } from "@/components/shared/SessionSummaryCard";
import {
  useQuotes,
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
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
          {icon}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
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
  const [expandedSnapshot, setExpandedSnapshot] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const { quotes } = useQuotes();
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

  const tradeStats = tradePlan
    ? [
        { label: "Entry", value: formatTradePrice(tradePlan.entry), color: "text-[hsl(var(--foreground))]" },
        { label: "Stop", value: formatTradePrice(tradePlan.stopLoss), color: "text-red-400" },
        { label: "TP1", value: formatTradePrice(tradePlan.tp1), color: "text-emerald-400" },
        {
          label: "R:R",
          value: `${tradePlan.rrRatio}:1`,
          color: (tradePlan.rrRatio ?? 0) >= 2 ? "text-emerald-400" : "text-amber-400",
        },
      ]
    : [
        { label: "Bias", value: formatBiasLabel(finalBias), color: biasColor(finalBias) },
        { label: "Risk", value: risk ? `${risk.valid ? "VALID" : "BLOCKED"} ${risk.grade}` : "--", color: risk?.valid ? "text-emerald-400" : "text-red-400" },
        { label: "Session", value: snap?.indicators?.session ?? primarySession?.session.toUpperCase() ?? "--" },
        { label: "Zone", value: snap?.structure?.zone ?? "--" },
      ];

  const snapshotAssets = expandedSnapshot ? quotes : quotes.slice(0, 8);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto lg:flex-row lg:overflow-hidden lg:overflow-y-hidden">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:overflow-y-auto lg:pr-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-[hsl(var(--foreground))]">Command Center</h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Live dashboard layout with terminal context and full-screen viewing.
            </p>
          </div>

          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            title={isFullscreen ? "Exit full screen" : "Open full screen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {isFullscreen ? "Exit Full Screen" : "Full Screen"}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          <SummaryCard title="Trade Signal" icon={<Activity className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />}>
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

            <p className="text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{signalReason}</p>
          </SummaryCard>

          <SummaryCard title="Market Snapshot" icon={<BarChart3 className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />}>
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
          </SummaryCard>

          <SummaryCard title="Agent Consensus" icon={<BrainCircuit className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />}>
            <div className="space-y-2">
              {agentRows.map((agent) => (
                <InfoRow
                  key={agent.label}
                  label={agent.label}
                  value={`${formatBiasLabel(agent.bias)} ${agent.confidence}%`}
                  tone={biasColor(agent.bias)}
                />
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
          </SummaryCard>

          <SummaryCard title="Risk and Session" icon={<Shield className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />}>
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

            <p className="text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">
              {primarySession?.carriesForward ?? tradeContext.directionalLean}
            </p>
          </SummaryCard>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="gap-3 border-b border-[hsl(var(--border))] pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" />
                  <span>{symCfg.label} Terminal</span>
                </CardTitle>
                <CardDescription>
                  Live chart, execution context, and machine-generated trade plan in one working area.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
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
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1">
                {SYMBOLS.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setSymbol(entry.id)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
                      symbol === entry.id
                        ? "border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                        : "border-transparent bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    )}
                  >
                    {entry.short}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1">
                {TIMEFRAMES.map((entry) => (
                  <button
                    key={entry}
                    onClick={() => setTimeframe(entry)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[10px] font-mono transition-colors",
                      timeframe === entry
                        ? "border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
                        : "border-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                    )}
                  >
                    {entry}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 lg:ml-auto">
                <StatCell label="Price" value={priceLabel} color="text-[hsl(var(--foreground))]" />
                <StatCell label="RSI" value={String(snap?.indicators?.rsi ?? "--")} />
                <StatCell label="Session" value={snap?.indicators?.session ?? "--"} />
                <StatCell label="Zone" value={snap?.structure?.zone ?? "--"} />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="border-b border-[hsl(var(--border))]">
              <TradingViewChart
                symbol={symCfg.tv}
                heightClass="h-[78vh] min-h-[820px] xl:h-[84vh] xl:min-h-[920px] max-h-[1280px]"
              />
            </div>

            <div className="grid gap-4 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0">
                {tradePlan ? (
                  <div className="flex items-start gap-3">
                    {tradePlan.direction === "long" ? (
                      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold uppercase tracking-[0.18em]",
                          tradePlan.direction === "long" ? "text-emerald-400" : "text-red-400"
                        )}
                      >
                        {tradePlan.direction} setup
                      </p>
                      <p className="mt-1 text-[11px] text-[hsl(var(--foreground))]">
                        Trigger: {tradePlan.trigger}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">
                        {signalReason}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[hsl(var(--foreground))]">
                        No active trade plan
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">
                        {signalReason}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {tradeStats.map((stat) => (
                  <StatCell key={stat.label} label={stat.label} value={stat.value} color={stat.color} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" />
                <span>Cross-Asset Snapshot</span>
              </CardTitle>
              <CardDescription>Keep the wider market tape visible under the primary terminal panel.</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpandedSnapshot((current) => !current)}
                className="rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
              >
                {expandedSnapshot ? "Compact" : "Expand"}
              </button>
              <Link
                href="/dashboard/asset-matrix"
                className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
              >
                Full Matrix
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>

          <CardContent>
            {snapshotAssets.length > 0 ? (
              <AssetSnapshotGrid assets={snapshotAssets} compact={!expandedSnapshot} />
            ) : (
              <PanelPlaceholder
                title="Market tape is reconnecting."
                detail="Price snapshots will populate here as soon as the quote feed responds."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <aside className="min-h-0 w-full shrink-0 lg:w-[300px] lg:overflow-y-auto lg:pl-1 xl:w-[320px]">
        <div className="flex flex-col gap-3">
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
    </div>
  );
}
