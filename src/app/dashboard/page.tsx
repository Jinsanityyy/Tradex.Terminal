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
import { SessionSummaryCard } from "@/components/shared/SessionSummaryCard";
import { TrumpImpactPreview } from "@/components/shared/TrumpFeedPanel";
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

function AgentMiniCard({
  label,
  bias,
  confidence,
  detail,
  detail2,
  isLoading,
  accent,
  onClick,
}: {
  label: string;
  bias: string;
  confidence: number;
  detail: string;
  detail2?: string;
  isLoading: boolean;
  accent: "bull" | "bear" | "neutral";
  onClick?: () => void;
}) {
  const accentColor = accent === "bull" ? "bg-emerald-500" : accent === "bear" ? "bg-red-500" : "bg-zinc-600";
  const biasTextColor = accent === "bull" ? "text-emerald-400" : accent === "bear" ? "text-red-400" : "text-zinc-500";
  const borderColor = accent === "bull" ? "border-t-emerald-500/60" : accent === "bear" ? "border-t-red-500/60" : "border-t-zinc-700/40";

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col bg-[hsl(var(--card))] px-3 py-4 gap-3 border-t-2 transition-all",
        borderColor,
        onClick && "cursor-pointer hover:bg-white/[0.05]",
      )}
    >
      {/* Label */}
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600 truncate">{label}</span>

      {/* Bias — prominent */}
      {isLoading ? (
        <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
      ) : (
        <span className={cn("text-[14px] font-bold uppercase leading-none", biasTextColor)}>{bias}</span>
      )}

      {/* Confidence bar + % */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", accentColor)}
            style={{ width: isLoading ? "0%" : `${confidence}%` }} />
        </div>
        <span className="text-[10px] font-mono text-zinc-500 shrink-0 w-7 text-right">{isLoading ? "—" : `${confidence}%`}</span>
      </div>

      {/* Detail line 1 */}
      <span className="text-[10px] text-zinc-500 truncate leading-tight">{isLoading ? "—" : detail}</span>

      {/* Detail line 2 — optional */}
      {detail2 && !isLoading && (
        <span className="text-[10px] text-zinc-600 truncate leading-tight">{detail2}</span>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  icon,
  hint = "OPEN OVERVIEW",
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
    <div
      className={cn(
        "h-full flex flex-col border-l-2 border-l-white/8 pl-4 py-4 pr-4 bg-[hsl(var(--card))]",
        interactive && "cursor-pointer group hover:bg-white/[0.04] transition-colors"
      )}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-600">{title}</span>
        </div>
        {interactive && (
          <span className="text-[8px] text-zinc-700 group-hover:text-zinc-400 transition-colors uppercase tracking-wider">{hint}</span>
        )}
      </div>
      <div className="flex-1 space-y-2">
        {children}
      </div>
    </div>
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
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))]">
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
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/40 p-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-[hsl(var(--foreground))]">{event.time}</span>
          <SidebarCountdown utcTimestamp={event.utcTimestamp} />
          <Badge variant={event.impact === "high" ? "high" : event.impact === "medium" ? "medium" : "low"} className="text-[9px]">
            {event.impact}
          </Badge>
        </div>
        <p className="mt-2 text-[12px] font-semibold leading-5 text-[hsl(var(--foreground))]">{event.event}</p>
        <div className="mt-2 flex gap-2">
          <EventToneBadge label="Gold" tone={event.goldImpact} />
          <EventToneBadge label="USD" tone={event.usdImpact} />
        </div>
        {event.tradeImplication && (
          <p className="mt-2 text-[10px] text-zinc-600 line-clamp-1">{event.tradeImplication}</p>
        )}
        <p className="mt-1.5 text-[9px] text-[hsl(var(--primary))]/60">Tap for full analysis →</p>
      </div>

      <DetailModal open={open} onClose={() => setOpen(false)} title={event.event}>
        <div className="space-y-4">
          {/* Time + Impact */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-3">
              <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1">Time</p>
              <p className="text-sm font-mono font-bold text-white">{event.time}</p>
            </div>
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-3">
              <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1">Forecast</p>
              <p className="text-sm font-mono font-bold text-white">{event.forecast || "—"}</p>
            </div>
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-3">
              <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1">Previous</p>
              <p className="text-sm font-mono font-bold text-white">{event.previous || "—"}</p>
            </div>
          </div>

          {/* Market bias */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-3">
              <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1.5">Gold Impact</p>
              <EventToneBadge label="Gold" tone={event.goldImpact} />
            </div>
            <div className="flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-3">
              <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1.5">USD Impact</p>
              <EventToneBadge label="USD" tone={event.usdImpact} />
            </div>
          </div>

          {/* Gold Analysis */}
          {event.goldAnalysis && (
            <div className="rounded-lg border border-white/5 bg-[hsl(var(--secondary))] p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">Gold Analysis</p>
              <p className="text-[12px] text-zinc-300 leading-relaxed">{event.goldAnalysis}</p>
            </div>
          )}

          {/* USD Analysis */}
          {event.usdAnalysis && (
            <div className="rounded-lg border border-white/5 bg-[hsl(var(--secondary))] p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5">USD Analysis</p>
              <p className="text-[12px] text-zinc-300 leading-relaxed">{event.usdAnalysis}</p>
            </div>
          )}

          {/* Trade Implication */}
          {event.tradeImplication && (
            <div className="rounded-lg border border-[hsl(var(--primary))]/15 bg-[hsl(var(--primary))]/5 p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--primary))]/60 mb-1.5">Trade Implication</p>
              <p className="text-[12px] text-zinc-200 leading-relaxed">{event.tradeImplication}</p>
            </div>
          )}

          {/* Affected assets */}
          {event.affectedAssets?.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-2">Affected Assets</p>
              <div className="flex flex-wrap gap-1.5">
                {event.affectedAssets.map(a => (
                  <span key={a} className="rounded bg-[hsl(var(--card))] px-2 py-1 text-[10px] font-mono text-zinc-400">{a}</span>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <Link href="/dashboard/economic-calendar" className="text-[11px] text-zinc-500 hover:text-zinc-300">
              Open full calendar →
            </Link>
          </div>
        </div>
      </DetailModal>
    </>
  );
}

export default function DashboardPage() {
  const [symbol, setSymbol] = useState<Symbol>("XAUUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeOverview, setActiveOverview] = useState<OverviewKey | null>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

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
  const { catalysts } = useCatalysts();
  const { sessions } = useSessions();
  const { posts: trumpPosts } = useTrumpPosts();
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
  // topbar(56) + action bar(28) + chart bar(38) + agents(105) + execution(38) = 265
  const chartHeightClass = isFullscreen ? "h-[88vh]" : "h-[calc(100vh-265px)]";

  return (
    <div className="flex flex-col lg:flex-row overflow-hidden" style={{ height: "100%" }}>
      <section className="min-w-0 flex-1 flex flex-col overflow-hidden" style={{ height: "100%" }}>
        {/* Minimal action bar — Refresh, Brain Terminal, Fullscreen only */}
        <div className="flex items-center justify-end gap-1 px-3 py-1 shrink-0">
          <button onClick={handleRefresh} disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors">
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            {isLoading ? "Running…" : "Refresh"}
          </button>
          <Link href="/dashboard/brain"
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors">
            Brain Terminal <ArrowRight className="h-3 w-3" />
          </Link>
          <button onClick={toggleFullscreen}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors">
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {isFullscreen ? "Exit" : "Full Screen"}
          </button>
        </div>

        {/* Chart */}
        <div className="shrink-0 overflow-hidden">
          <TradingViewChart symbol={symCfg.tv} heightClass={chartHeightClass} />
        </div>

        {/* 7 Agent cards */}
        <div className="shrink-0 grid grid-cols-7 gap-px bg-white/5 overflow-hidden pl-[46px]">
          <AgentMiniCard label="MASTER" bias={finalBias} confidence={master?.confidence ?? 0}
            detail={isNoTrade ? (master?.noTradeReason ?? "No trade") : (master?.strategyMatch ?? finalBias)}
            detail2={`Score: ${master?.consensusScore?.toFixed(1) ?? "—"}`}
            isLoading={isLoading && !data} accent={isNoTrade ? "neutral" : finalBias === "bullish" ? "bull" : "bear"}
            onClick={() => setActiveAgent("master")} />
          <AgentMiniCard label="TREND" bias={trend?.bias ?? "neutral"} confidence={trend?.confidence ?? 0}
            detail={trend?.marketPhase ? `Phase: ${trend.marketPhase}` : "—"}
            detail2={`Momentum: ${trend?.momentumDirection ?? "—"}`}
            isLoading={isLoading && !data}
            accent={trend?.bias === "bullish" ? "bull" : trend?.bias === "bearish" ? "bear" : "neutral"}
            onClick={() => setActiveAgent("trend")} />
          <AgentMiniCard label="PR. ACTION" bias={smc?.bias ?? "neutral"} confidence={smc?.confidence ?? 0}
            detail={smc?.setupType ?? "—"}
            detail2={`Zone: ${smc?.premiumDiscount ?? "—"}`}
            isLoading={isLoading && !data}
            accent={smc?.bias === "bullish" ? "bull" : smc?.bias === "bearish" ? "bear" : "neutral"}
            onClick={() => setActiveAgent("smc")} />
          <AgentMiniCard label="NEWS" bias={news?.impact ?? "neutral"} confidence={news?.confidence ?? 0}
            detail={news?.regime ? `Regime: ${news.regime}` : "—"}
            detail2={`Risk: ${news?.riskScore ?? 0}/100`}
            isLoading={isLoading && !data}
            accent={news?.impact === "bullish" ? "bull" : news?.impact === "bearish" ? "bear" : "neutral"}
            onClick={() => setActiveAgent("news")} />
          <AgentMiniCard label="RISK GATE" bias={risk?.valid ? "valid" : "blocked"} confidence={risk?.sessionScore ?? 0}
            detail={`Grade ${risk?.grade ?? "—"} · Vol ${risk?.volatilityScore ?? 0}`}
            detail2={risk?.warnings?.[0]?.substring(0, 40) ?? "No warnings"}
            isLoading={isLoading && !data}
            accent={risk?.valid ? "bull" : "bear"}
            onClick={() => setActiveAgent("risk")} />
          <AgentMiniCard label="CONTRARIAN" bias={contrarian?.challengesBias ? "alert" : "clear"} confidence={contrarian?.riskFactor ?? 0}
            detail={contrarian?.trapType && contrarian.trapType !== "None" ? contrarian.trapType : "No trap"}
            detail2={contrarian?.challengesBias ? (contrarian.failureReasons?.[0]?.substring(0, 40) ?? "—") : "Bias confirmed"}
            isLoading={isLoading && !data} accent={contrarian?.challengesBias ? "bear" : "neutral"}
            onClick={() => setActiveAgent("contrarian")} />
          <AgentMiniCard label="EXECUTION" bias={exec?.signalState ?? "NO_TRADE"} confidence={exec?.hasSetup ? 75 : 0}
            detail={exec?.entry ? `Entry: ${exec.entry.toFixed(exec.entry > 100 ? 1 : 4)}` : (exec?.trigger ?? "—")}
            detail2={exec?.distanceToEntry != null ? `${exec.distanceToEntry}% from entry` : "No setup"}
            isLoading={isLoading && !data}
            accent={exec?.signalState === "ARMED" ? "bull" : exec?.signalState === "PENDING" ? "neutral" : "bear"}
            onClick={() => setActiveAgent("execution")} />
        </div>

        {/* Compact execution plan strip — fills space below agent cards */}
        {data && (
          <div className="shrink-0 rounded-none border-t border-white/5 bg-[hsl(var(--card))] px-4 py-2 pl-[50px]">
            {tradePlan ? (
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[11px] font-bold uppercase", tradePlan.direction === "long" ? "text-emerald-400" : "text-red-400")}>
                    {tradePlan.direction === "long" ? "▲ LONG" : "▼ SHORT"} · {tradePlan.trigger}
                  </span>
                </div>
                <span className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-4">
                  <div><span className="text-[9px] text-zinc-600 uppercase mr-1.5">Entry</span><span className="text-[12px] font-mono text-zinc-100">{tradePlan.entry.toFixed(tradePlan.entry > 100 ? 2 : 4)}</span></div>
                  <div><span className="text-[9px] text-zinc-600 uppercase mr-1.5">SL</span><span className="text-[12px] font-mono text-red-400">{tradePlan.stopLoss.toFixed(tradePlan.stopLoss > 100 ? 2 : 4)}</span></div>
                  <div><span className="text-[9px] text-zinc-600 uppercase mr-1.5">TP1</span><span className="text-[12px] font-mono text-emerald-400">{tradePlan.tp1.toFixed(tradePlan.tp1 > 100 ? 2 : 4)}</span></div>
                  {tradePlan.tp2 && <div><span className="text-[9px] text-zinc-600 uppercase mr-1.5">TP2</span><span className="text-[12px] font-mono text-emerald-300">{tradePlan.tp2.toFixed(tradePlan.tp2 > 100 ? 2 : 4)}</span></div>}
                  <div><span className="text-[9px] text-zinc-600 uppercase mr-1.5">RR</span><span className="text-[12px] font-mono text-zinc-200">{tradePlan.rrRatio}:1</span></div>
                  <div><span className="text-[9px] text-zinc-600 uppercase mr-1.5">Risk</span><span className="text-[12px] font-mono text-zinc-400">{tradePlan.maxRiskPercent}%</span></div>
                </div>
                {exec?.signalStateReason && (
                  <>
                    <span className="h-3 w-px bg-white/10" />
                    <span className={cn("text-[10px]", exec.signalState === "ARMED" ? "text-emerald-400" : exec.signalState === "PENDING" ? "text-amber-400" : "text-zinc-600")}>
                      {exec.signalStateReason}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-600">
                  {master?.noTradeReason ?? "No active trade setup — stand aside and monitor for entry conditions"}
                </span>
              </div>
            )}
          </div>
        )}

      </section>

      <aside className="w-full lg:w-[440px] xl:w-[480px] shrink-0 lg:h-full lg:flex lg:flex-col lg:overflow-hidden border-l border-white/5">

        {/* Community chat — fixed height at top */}
        <div className="shrink-0" style={{ height: "360px" }}>
          <Card className="overflow-hidden h-full rounded-none border-x-0 border-t-0">
            <CardContent className="p-0 h-full">
              <CommunityPanel />
            </CardContent>
          </Card>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 shrink-0" />

        {/* Rest — scrollable */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4">

          {/* Trump Impact Monitor — first after community */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionHeader
                icon={<Activity className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />}
                label="Trump Impact Monitor"
                action={
                  <Link href="/dashboard/trump-monitor" className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                    Full
                  </Link>
                }
              />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <TrumpImpactPreview posts={trumpPosts} />
            </CardContent>
          </Card>

          {/* Top Catalysts */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionHeader
                icon={<Zap className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />}
                label="Top Catalysts"
                action={
                  <Link href="/dashboard/catalysts" className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                    All
                  </Link>
                }
              />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {catalysts.length > 0 ? (
                <CatalystFeed catalysts={catalysts} limit={3} />
              ) : (
                <PanelPlaceholder
                  title="No catalysts in queue."
                  detail="The headline scanner is waiting for the next market-moving event."
                />
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionHeader
                icon={<CalendarDays className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />}
                label="Upcoming Events"
                action={
                  <Link href="/dashboard/economic-calendar" className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                    Calendar
                  </Link>
                }
              />
            </CardHeader>
            <CardContent className="px-4 pb-4">
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

          {/* Sessions */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <SectionHeader
                icon={<Clock className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />}
                label="Sessions"
              />
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {sessionPreview.filter(s => s.status === "active").length > 0 ? (
                sessionPreview.filter(s => s.status === "active").map((session) => (
                  <SessionSummaryCard key={session.session} session={session} />
                ))
              ) : (
                <PanelPlaceholder
                  title="No active session."
                  detail="Markets are currently between sessions."
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

      {/* Agent Detail Drawer */}
      {activeAgent && data && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setActiveAgent(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[hsl(var(--card))] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className={cn("h-2 w-2 rounded-full",
                  activeAgent === "master" ? (isNoTrade ? "bg-zinc-500" : finalBias === "bullish" ? "bg-emerald-400" : "bg-red-400") :
                  activeAgent === "trend" ? (trend?.bias === "bullish" ? "bg-emerald-400" : trend?.bias === "bearish" ? "bg-red-400" : "bg-zinc-500") :
                  "bg-zinc-500"
                )} />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-300">
                  {activeAgent === "master" ? "Master Consensus" :
                   activeAgent === "trend" ? "Trend Agent" :
                   activeAgent === "smc" ? "Price Action Agent" :
                   activeAgent === "news" ? "News Agent" :
                   activeAgent === "risk" ? "Risk Gate Agent" :
                   activeAgent === "contrarian" ? "Contrarian Agent" :
                   "Execution Agent"}
                </span>
              </div>
              <button onClick={() => setActiveAgent(null)} className="text-zinc-600 hover:text-zinc-300 text-lg leading-none">×</button>
            </div>

            {/* Content */}
            <div className="px-5 py-4 space-y-4 text-[12px]">

              {/* MASTER */}
              {activeAgent === "master" && master && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Final Bias</p><p className={cn("font-semibold uppercase", biasColor(finalBias))}>{finalBias}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Confidence</p><p className="font-mono text-zinc-200">{master.confidence}%</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Consensus</p><p className={cn("font-mono", master.consensusScore > 0 ? "text-emerald-400" : "text-red-400")}>{master.consensusScore > 0 ? "+" : ""}{master.consensusScore.toFixed(1)}</p></div>
                  </div>
                  {master.strategyMatch && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Strategy</p><p className="text-amber-400">{master.strategyMatch}</p></div>}
                  {master.noTradeReason && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">No Trade Reason</p><p className="text-zinc-400">{master.noTradeReason}</p></div>}
                  {master.supports?.length > 0 && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Supporting Factors</p><div className="space-y-1">{master.supports.map((s, i) => <p key={i} className="text-zinc-400 flex gap-2"><span className="text-emerald-500 shrink-0">+</span>{s}</p>)}</div></div>}
                  {master.invalidations?.length > 0 && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Invalidation Conditions</p><div className="space-y-1">{master.invalidations.map((s, i) => <p key={i} className="text-zinc-400 flex gap-2"><span className="text-red-500 shrink-0">−</span>{s}</p>)}</div></div>}
                </>
              )}

              {/* TREND */}
              {activeAgent === "trend" && trend && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Bias</p><p className={cn("font-semibold uppercase", biasColor(trend.bias))}>{trend.bias}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Confidence</p><p className="font-mono text-zinc-200">{trend.confidence}%</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Momentum</p><p className="text-zinc-300 capitalize">{trend.momentumDirection}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Market Phase</p><p className="text-zinc-300 capitalize">{trend.marketPhase}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">MA Alignment</p><p className={trend.maAlignment ? "text-emerald-400" : "text-red-400"}>{trend.maAlignment ? "Aligned ✓" : "Misaligned ✗"}</p></div>
                  </div>
                  {trend.invalidationLevel && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Invalidation Level</p><p className="font-mono text-red-400">{trend.invalidationLevel.toFixed(2)}</p></div>}
                  {trend.reasons?.length > 0 && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Reasoning</p><div className="space-y-1">{trend.reasons.map((r, i) => <p key={i} className="text-zinc-400">• {r}</p>)}</div></div>}
                </>
              )}

              {/* SMC / PRICE ACTION */}
              {activeAgent === "smc" && smc && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Bias</p><p className={cn("font-semibold uppercase", biasColor(smc.bias))}>{smc.bias}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Confidence</p><p className="font-mono text-zinc-200">{smc.confidence}%</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Setup</p><p className="text-zinc-300 text-[11px]">{smc.setupType}</p></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Liq. Sweep</p><p className={smc.liquiditySweepDetected ? "text-amber-400" : "text-zinc-600"}>{smc.liquiditySweepDetected ? "Detected" : "None"}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">BOS</p><p className={smc.bosDetected ? "text-emerald-400" : "text-zinc-600"}>{smc.bosDetected ? "Detected" : "None"}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">CHoCH</p><p className={smc.chochDetected ? "text-amber-400" : "text-zinc-600"}>{smc.chochDetected ? "Detected" : "None"}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Zone</p><p className="text-zinc-300">{smc.premiumDiscount}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Setup Present</p><p className={smc.setupPresent ? "text-emerald-400" : "text-zinc-600"}>{smc.setupPresent ? "Yes" : "No"}</p></div>
                  </div>
                  {smc.reasons?.length > 0 && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Reasoning</p><div className="space-y-1">{smc.reasons.map((r, i) => <p key={i} className="text-zinc-400">• {r}</p>)}</div></div>}
                </>
              )}

              {/* NEWS */}
              {activeAgent === "news" && news && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Impact</p><p className={cn("font-semibold uppercase", biasColor(news.impact))}>{news.impact}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Risk Score</p><p className={cn("font-mono", news.riskScore > 70 ? "text-red-400" : news.riskScore > 40 ? "text-amber-400" : "text-emerald-400")}>{news.riskScore}/100</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Regime</p><p className="text-zinc-300 capitalize">{news.regime}</p></div>
                  </div>
                  {news.dominantCatalyst && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Dominant Catalyst</p><p className="text-zinc-300">{news.dominantCatalyst}</p></div>}
                  {news.catalysts?.length > 0 && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Catalysts</p><div className="space-y-2">{news.catalysts.slice(0,4).map((c, i) => <div key={i} className="flex items-start gap-2"><span className={cn("text-[9px] font-bold uppercase shrink-0 mt-0.5", c.impact === "high" ? "text-red-400" : c.impact === "medium" ? "text-amber-400" : "text-zinc-500")}>{c.impact}</span><p className="text-zinc-400 text-[11px]">{c.headline}</p></div>)}</div></div>}
                  {news.biasChangers?.length > 0 && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Bias Changers</p><div className="space-y-1">{news.biasChangers.map((b, i) => <p key={i} className="text-amber-400/70 text-[11px]">⚠ {b}</p>)}</div></div>}
                </>
              )}

              {/* RISK */}
              {activeAgent === "risk" && risk && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Gate</p><p className={cn("font-semibold uppercase", risk.valid ? "text-emerald-400" : "text-red-400")}>{risk.valid ? "VALID" : "BLOCKED"}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Grade</p><p className="font-mono text-zinc-200 text-lg">{risk.grade}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Max Risk</p><p className="font-mono text-zinc-200">{risk.maxRiskPercent}%</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Volatility Score</p><div className="flex items-center gap-2 mt-1"><div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${risk.volatilityScore}%` }} /></div><span className="font-mono text-zinc-400 text-[10px]">{risk.volatilityScore}</span></div></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Session Score</p><div className="flex items-center gap-2 mt-1"><div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${risk.sessionScore}%` }} /></div><span className="font-mono text-zinc-400 text-[10px]">{risk.sessionScore}</span></div></div>
                  </div>
                  {risk.warnings?.length > 0 && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Warnings</p><div className="space-y-1">{risk.warnings.map((w, i) => <p key={i} className="text-red-400/70">⚠ {w}</p>)}</div></div>}
                  {risk.reasons?.length > 0 && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Reasoning</p><div className="space-y-1">{risk.reasons.map((r, i) => <p key={i} className="text-zinc-400">• {r}</p>)}</div></div>}
                </>
              )}

              {/* CONTRARIAN */}
              {activeAgent === "contrarian" && contrarian && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Challenges</p><p className={cn("font-semibold", contrarian.challengesBias ? "text-amber-400" : "text-zinc-500")}>{contrarian.challengesBias ? "YES" : "NO"}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Risk Factor</p><p className={cn("font-mono", contrarian.riskFactor > 60 ? "text-red-400" : "text-zinc-300")}>{contrarian.riskFactor}%</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Trap</p><p className="text-zinc-300 text-[11px]">{contrarian.trapType ?? "None"}</p></div>
                  </div>
                  {contrarian.alternativeScenario && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Alternative Scenario</p><p className="text-zinc-400">{contrarian.alternativeScenario}</p></div>}
                  {contrarian.failureReasons?.length > 0 && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Failure Risks</p><div className="space-y-1">{contrarian.failureReasons.map((r, i) => <p key={i} className="text-amber-400/70">⚠ {r}</p>)}</div></div>}
                  {contrarian.oppositeLiquidity && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Opposite Liquidity</p><p className="font-mono text-zinc-300">{contrarian.oppositeLiquidity.toFixed(2)}</p></div>}
                </>
              )}

              {/* EXECUTION */}
              {activeAgent === "execution" && exec && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Signal State</p><p className={cn("font-semibold uppercase text-[11px]", exec.signalState === "ARMED" ? "text-emerald-400" : exec.signalState === "PENDING" ? "text-amber-400" : "text-zinc-500")}>{exec.signalState}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Direction</p><p className={cn("font-semibold uppercase", exec.direction === "long" ? "text-emerald-400" : exec.direction === "short" ? "text-red-400" : "text-zinc-500")}>{exec.direction}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Distance</p><p className="font-mono text-zinc-300">{exec.distanceToEntry != null ? `${exec.distanceToEntry}%` : "—"}</p></div>
                  </div>
                  {exec.entry && <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Entry</p><p className="font-mono text-zinc-100">{exec.entry.toFixed(exec.entry > 100 ? 2 : 4)}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Stop Loss</p><p className="font-mono text-red-400">{exec.stopLoss?.toFixed(exec.stopLoss > 100 ? 2 : 4) ?? "—"}</p></div>
                    <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">TP1</p><p className="font-mono text-emerald-400">{exec.tp1?.toFixed(exec.tp1 > 100 ? 2 : 4) ?? "—"}</p></div>
                  </div>}
                  {exec.signalStateReason && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">State Reason</p><p className="text-zinc-400">{exec.signalStateReason}</p></div>}
                  {exec.triggerCondition && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Trigger</p><p className="text-zinc-400">{exec.triggerCondition}</p></div>}
                  {exec.managementNotes?.length > 0 && <div><p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Trade Management</p><div className="space-y-1">{exec.managementNotes.map((n, i) => <p key={i} className="text-zinc-400">• {n}</p>)}</div></div>}
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
