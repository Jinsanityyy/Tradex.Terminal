"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  ChevronRight,
  Clock,
  Eye,
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
import { LiveTVPanel } from "@/components/shared/LiveTVPanel";
import { SessionSummaryCard } from "@/components/shared/SessionSummaryCard";
import { TrumpImpactPreview } from "@/components/shared/TrumpFeedPanel";
import { MTFBiasPanel } from "@/components/shared/MTFBiasPanel";
import {
  useEconomicCalendar,
  useTrumpPosts,
  useCatalysts,
  useSessions,
  useMarketAnalysis,
  useMTFBias,
} from "@/hooks/useMarketData";
import type { AgentRunResult, Symbol, Timeframe } from "@/lib/agents/schemas";
import type { PnLData } from "@/app/api/pnl/route";
import type { EconomicEvent } from "@/types";

const EmbeddedGlobeClient = dynamic(() => import("@/components/globe/GlobeClient"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-black" />,
});

const SYMBOLS: { id: Symbol; tv: string; label: string; short: string; group: string }[] = [
  // Metals
  { id: "XAUUSD",  tv: "OANDA:XAUUSD",       label: "Gold",       short: "XAU/USD",  group: "Metals"      },
  { id: "XAGUSD",  tv: "OANDA:XAGUSD",        label: "Silver",     short: "XAG/USD",  group: "Metals"      },
  { id: "XPTUSD",  tv: "OANDA:XPTUSD",        label: "Platinum",   short: "XPT/USD",  group: "Metals"      },
  // Major Forex
  { id: "EURUSD",  tv: "OANDA:EURUSD",        label: "Euro",       short: "EUR/USD",  group: "Forex Majors" },
  { id: "GBPUSD",  tv: "OANDA:GBPUSD",        label: "Cable",      short: "GBP/USD",  group: "Forex Majors" },
  { id: "USDJPY",  tv: "OANDA:USDJPY",        label: "Yen",        short: "USD/JPY",  group: "Forex Majors" },
  { id: "USDCHF",  tv: "OANDA:USDCHF",        label: "Swissy",     short: "USD/CHF",  group: "Forex Majors" },
  { id: "USDCAD",  tv: "OANDA:USDCAD",        label: "Loonie",     short: "USD/CAD",  group: "Forex Majors" },
  { id: "AUDUSD",  tv: "OANDA:AUDUSD",        label: "Aussie",     short: "AUD/USD",  group: "Forex Majors" },
  { id: "NZDUSD",  tv: "OANDA:NZDUSD",        label: "Kiwi",       short: "NZD/USD",  group: "Forex Majors" },
  // Cross Forex
  { id: "EURJPY",  tv: "OANDA:EURJPY",        label: "EUR/JPY",    short: "EUR/JPY",  group: "Forex Cross"  },
  { id: "GBPJPY",  tv: "OANDA:GBPJPY",        label: "GBP/JPY",    short: "GBP/JPY",  group: "Forex Cross"  },
  { id: "EURGBP",  tv: "OANDA:EURGBP",        label: "EUR/GBP",    short: "EUR/GBP",  group: "Forex Cross"  },
  { id: "AUDJPY",  tv: "OANDA:AUDJPY",        label: "AUD/JPY",    short: "AUD/JPY",  group: "Forex Cross"  },
  { id: "CADJPY",  tv: "OANDA:CADJPY",        label: "CAD/JPY",    short: "CAD/JPY",  group: "Forex Cross"  },
  { id: "CHFJPY",  tv: "OANDA:CHFJPY",        label: "CHF/JPY",    short: "CHF/JPY",  group: "Forex Cross"  },
  { id: "EURCAD",  tv: "OANDA:EURCAD",        label: "EUR/CAD",    short: "EUR/CAD",  group: "Forex Cross"  },
  { id: "GBPCAD",  tv: "OANDA:GBPCAD",        label: "GBP/CAD",    short: "GBP/CAD",  group: "Forex Cross"  },
  { id: "AUDCAD",  tv: "OANDA:AUDCAD",        label: "AUD/CAD",    short: "AUD/CAD",  group: "Forex Cross"  },
  { id: "AUDNZD",  tv: "OANDA:AUDNZD",        label: "AUD/NZD",    short: "AUD/NZD",  group: "Forex Cross"  },
  // Indices
  { id: "US500",   tv: "FOREXCOM:SPX500",     label: "S&P 500",    short: "US500",    group: "Indices"      },
  { id: "US100",   tv: "FOREXCOM:NAS100",     label: "NASDAQ 100", short: "US100",    group: "Indices"      },
  { id: "US30",    tv: "FOREXCOM:US30",       label: "Dow Jones",  short: "US30",     group: "Indices"      },
  { id: "GER40",   tv: "FOREXCOM:GER40",      label: "DAX 40",     short: "GER40",    group: "Indices"      },
  { id: "UK100",   tv: "FOREXCOM:UK100",      label: "FTSE 100",   short: "UK100",    group: "Indices"      },
  { id: "JPN225",  tv: "FOREXCOM:JPN225",     label: "Nikkei 225", short: "JPN225",   group: "Indices"      },
  { id: "AUS200",  tv: "FOREXCOM:AUS200",     label: "ASX 200",    short: "AUS200",   group: "Indices"      },
  { id: "HK50",    tv: "FOREXCOM:HK50",       label: "Hang Seng",  short: "HK50",     group: "Indices"      },
  // Crypto
  { id: "BTCUSD",  tv: "BITSTAMP:BTCUSD",    label: "Bitcoin",    short: "BTC/USD",  group: "Crypto"       },
  { id: "ETHUSD",  tv: "BITSTAMP:ETHUSD",    label: "Ethereum",   short: "ETH/USD",  group: "Crypto"       },
  { id: "SOLUSD",  tv: "COINBASE:SOLUSD",    label: "Solana",     short: "SOL/USD",  group: "Crypto"       },
  { id: "XRPUSD",  tv: "BITSTAMP:XRPUSD",   label: "XRP",        short: "XRP/USD",  group: "Crypto"       },
  { id: "BNBUSD",  tv: "BINANCE:BNBUSDT",    label: "BNB",        short: "BNB/USD",  group: "Crypto"       },
  { id: "ADAUSD",  tv: "COINBASE:ADAUSD",    label: "Cardano",    short: "ADA/USD",  group: "Crypto"       },
  { id: "DOTUSD",  tv: "COINBASE:DOTUSD",    label: "Polkadot",   short: "DOT/USD",  group: "Crypto"       },
  { id: "LNKUSD",  tv: "COINBASE:LINKUSD",   label: "Chainlink",  short: "LINK/USD", group: "Crypto"       },
  // Commodities
  { id: "USOIL",   tv: "NYMEX:CL1!",         label: "WTI Oil",    short: "WTI",      group: "Commodities"  },
  { id: "UKOIL",   tv: "ICEEUR:B1!",         label: "Brent Oil",  short: "BRENT",    group: "Commodities"  },
  { id: "NATGAS",  tv: "NYMEX:NG1!",         label: "Nat. Gas",   short: "NATGAS",   group: "Commodities"  },
  { id: "CORN",    tv: "CBOT:ZC1!",          label: "Corn",       short: "CORN",     group: "Commodities"  },
  { id: "WHEAT",   tv: "CBOT:ZW1!",          label: "Wheat",      short: "WHEAT",    group: "Commodities"  },
  { id: "COPPER",  tv: "COMEX:HG1!",         label: "Copper",     short: "COPPER",   group: "Commodities"  },
];

const TIMEFRAMES: Timeframe[] = ["M5", "M15", "H1", "H4"];

const TV_TO_AGENT_TF: Record<string, Timeframe> = {
  "5": "M5", "15": "M15", "60": "H1", "240": "H4",
};

const TV_INTERVAL_LABELS: Record<string, string> = {
  "1": "1m", "5": "5m", "15": "15m", "30": "30m", "60": "1H", "240": "4H", "D": "1D",
};

interface ManualTrade {
  id: string;
  date: string;
  symbol: string;
  direction: "long" | "short";
  pnl: number;
  fees: number;
  notes?: string;
}

const MANUAL_TRADES_KEY = "tradex_manual_trades";
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const jsonFetcher = <T,>(url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error("Failed");
    }

    return response.json() as Promise<T>;
  });

const fetcher = (url: string) => jsonFetcher<AgentRunResult>(url);

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
          {/* Time + status row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-zinc-500">{event.time} PHT</span>
            <span className={cn(
              "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
              event.status === "completed" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
              event.status === "live" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
              "bg-blue-500/15 text-blue-400 border border-blue-500/20"
            )}>
              {event.status === "completed" ? "Completed" : event.status === "live" ? "Live" : "Upcoming"}
            </span>
          </div>

          {/* Forecast / Previous */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Forecast", value: event.forecast || "—", color: "text-blue-400" },
              { label: "Previous", value: event.previous || "—", color: "text-zinc-400" },
              { label: "Actual", value: event.actual || "—", color: event.actual ? "text-emerald-400" : "text-zinc-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg bg-[hsl(var(--secondary))] p-3 text-center">
                <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1">{label}</p>
                <p className={cn("text-sm font-bold font-mono", color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* PRE-EVENT ANALYSIS — upcoming/live only */}
          {event.status !== "completed" && event.preEventSummary && (
            <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.04] overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-blue-500/15">
                <Eye className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Pre-Event Analysis</span>
                <span className="ml-auto text-[9px] text-blue-400/50 uppercase tracking-wider">
                  {event.status === "live" ? "Starting Now" : "Upcoming"}
                </span>
              </div>
              <div className="px-3.5 py-3">
                <p className="text-[12px] text-[hsl(var(--foreground))] leading-relaxed">{event.preEventSummary}</p>
              </div>
              {event.preEventBullets && event.preEventBullets.length > 0 && (
                <div className="px-3.5 pb-3.5 space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400/70">What To Watch</p>
                  <ul className="space-y-1.5">
                    {event.preEventBullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight className="h-3 w-3 text-blue-400/60 mt-0.5 shrink-0" />
                        <span className="text-[11px] text-zinc-400 leading-snug">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* POST-EVENT ANALYSIS — completed only */}
          {event.status === "completed" && event.postEventSummary && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-amber-500/15">
                <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Post-Event Analysis</span>
                <span className="ml-auto text-[9px] text-amber-400/50 uppercase tracking-wider">Event Concluded</span>
              </div>
              <div className="px-3.5 py-3">
                <p className="text-[12px] text-[hsl(var(--foreground))] leading-relaxed">{event.postEventSummary}</p>
              </div>
              {event.postEventBullets && event.postEventBullets.length > 0 && (
                <div className="px-3.5 pb-3.5 space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70">Now Watch</p>
                  <ul className="space-y-1.5">
                    {event.postEventBullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight className="h-3 w-3 text-amber-400/60 mt-0.5 shrink-0" />
                        <span className="text-[11px] text-zinc-400 leading-snug">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Gold / USD badges + context */}
          <div className="flex gap-2 flex-wrap">
            <EventToneBadge label="GOLD" tone={event.goldImpact} />
            <EventToneBadge label="USD" tone={event.usdImpact} />
          </div>

          {event.goldReasoning && (
            <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                  {event.status === "completed" ? "Gold Context" : "Gold Analysis"}
                </span>
              </div>
              <p className="text-[12px] text-zinc-300 leading-relaxed">{event.goldReasoning}</p>
            </div>
          )}

          {event.usdReasoning && (
            <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                  {event.status === "completed" ? "USD Context" : "USD Analysis"}
                </span>
              </div>
              <p className="text-[12px] text-zinc-300 leading-relaxed">{event.usdReasoning}</p>
            </div>
          )}

          {/* Trade Implication — hide for completed if post-event covers it */}
          {event.tradeImplication && event.status !== "completed" && (
            <div className="rounded-lg border border-[hsl(var(--primary))]/15 bg-[hsl(var(--primary))]/5 p-3.5">
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
  const [chartInterval, setChartInterval] = useState("60");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeOverview, setActiveOverview] = useState<OverviewKey | null>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [manualTrades, setManualTrades] = useState<ManualTrade[]>([]);
  const intervalDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const symCfg = SYMBOLS.find((entry) => entry.id === symbol) ?? SYMBOLS[0];

  const { data, isValidating, mutate } = useSWR<AgentRunResult>(
    `/api/agents/run?symbol=${symbol}&timeframe=${timeframe}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  const handleRefresh = useCallback(async () => {
    await mutate(undefined, { revalidate: true });
  }, [mutate]);

  const handleIntervalChange = useCallback((tvInterval: string) => {
    setChartInterval(tvInterval);
    const mapped = TV_TO_AGENT_TF[tvInterval];
    if (!mapped) return;
    if (intervalDebounceRef.current) clearTimeout(intervalDebounceRef.current);
    intervalDebounceRef.current = setTimeout(() => {
      setTimeframe(mapped);
    }, 2000);
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    handleFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MANUAL_TRADES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setManualTrades(parsed);
      }
    } catch {
      setManualTrades([]);
    }
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
  const { mtfData, mtfLoading } = useMTFBias(symbol);
  const { data: pnlSnapshot, isLoading: pnlLoading } = useSWR<PnLData>(
    "/api/pnl",
    (url: string) => jsonFetcher<PnLData>(url),
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  const upcomingEvents = events.filter((event) => event.status === "upcoming" || event.status === "live");
  const calendarPreview = upcomingEvents.length > 0 ? upcomingEvents.slice(0, 5) : events.slice(0, 5);
  const activeSessions = sessions.filter((session) => session.status === "active" || session.status === "closed");
  const sessionPreview = activeSessions.length > 0 ? activeSessions.slice(0, 3) : sessions.slice(0, 3);
  const primarySession = sessionPreview[0];
  const now = new Date();
  const currentMonth = now.getUTCMonth() + 1;
  const currentYear = now.getUTCFullYear();
  const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
  const liveCalendarCount = events.filter((event) => event.status === "live").length;
  const calendarBullishCount = events.filter((event) => event.goldImpact === "bullish").length;
  const calendarBearishCount = events.filter((event) => event.goldImpact === "bearish").length;
  const calendarBias =
    calendarBullishCount > calendarBearishCount
      ? "Bullish"
      : calendarBearishCount > calendarBullishCount
        ? "Bearish"
        : "Neutral";
  const calendarBiasTone =
    calendarBias === "Bullish"
      ? "text-emerald-400"
      : calendarBias === "Bearish"
        ? "text-red-400"
        : "text-zinc-400";
  const mergedPnlDaily = useMemo(() => {
    const dailyMap = new Map<
      string,
      { date: string; pnl: number; trades: number; wins: number; fees: number }
    >();

    for (const entry of pnlSnapshot?.daily ?? []) {
      dailyMap.set(entry.date, { ...entry });
    }

    for (const trade of manualTrades) {
      if (!trade?.date) continue;
      const existing = dailyMap.get(trade.date) ?? {
        date: trade.date,
        pnl: 0,
        trades: 0,
        wins: 0,
        fees: 0,
      };

      existing.pnl = parseFloat((existing.pnl + (trade.pnl ?? 0)).toFixed(4));
      existing.fees = parseFloat((existing.fees + (trade.fees ?? 0)).toFixed(4));
      existing.trades += 1;
      if ((trade.pnl ?? 0) > 0) {
        existing.wins += 1;
      }

      dailyMap.set(trade.date, existing);
    }

    return Array.from(dailyMap.values()).sort((left, right) => left.date.localeCompare(right.date));
  }, [manualTrades, pnlSnapshot?.daily]);

  const mergedPnlMonthly = useMemo(() => {
    const monthlyMap = new Map<
      string,
      { year: number; month: number; pnl: number; trades: number; wins: number; tradingDays: number }
    >();

    for (const entry of mergedPnlDaily) {
      const [yearLabel, monthLabel] = entry.date.split("-");
      const year = Number(yearLabel);
      const month = Number(monthLabel);
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const existing = monthlyMap.get(key) ?? {
        year,
        month,
        pnl: 0,
        trades: 0,
        wins: 0,
        tradingDays: 0,
      };

      existing.pnl = parseFloat((existing.pnl + entry.pnl).toFixed(4));
      existing.trades += entry.trades;
      existing.wins += entry.wins;
      if (entry.trades > 0) {
        existing.tradingDays += 1;
      }

      monthlyMap.set(key, existing);
    }

    return Array.from(monthlyMap.values()).sort((left, right) => {
      if (left.year !== right.year) return right.year - left.year;
      return right.month - left.month;
    });
  }, [mergedPnlDaily]);

  const monthPnl = mergedPnlMonthly.find(
    (entry) => entry.year === currentYear && entry.month === currentMonth
  );
  const monthTradingDays = monthPnl?.tradingDays ?? 0;
  const overallNetPnl = mergedPnlDaily.reduce((sum, entry) => sum + entry.pnl, 0);
  const overallTrades = mergedPnlDaily.reduce((sum, entry) => sum + entry.trades, 0);
  const overallWins = mergedPnlDaily.reduce((sum, entry) => sum + entry.wins, 0);
  const overallWinRate = overallTrades > 0 ? Math.round((overallWins / overallTrades) * 100) : 0;
  const overallTradingDays = mergedPnlDaily.filter((entry) => entry.trades > 0).length;

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
  const agentOverviewCards: Array<{
    id: string;
    label: string;
    bias: string;
    confidence: number;
    detail: string;
    detail2?: string;
    accent: "bull" | "bear" | "neutral";
  }> = [
    {
      id: "master",
      label: "Master Consensus",
      bias: formatBiasLabel(finalBias),
      confidence: master?.confidence ?? 0,
      detail: master?.strategyMatch ?? signalReason,
      detail2: master ? `${master.consensusScore > 0 ? "+" : ""}${master.consensusScore.toFixed(1)} consensus` : undefined,
      accent:
        finalBias === "bullish" ? "bull" : finalBias === "bearish" ? "bear" : "neutral" as const,
    },
    {
      id: "trend",
      label: "Trend Agent",
      bias: formatBiasLabel(trend?.bias ?? "neutral"),
      confidence: trend?.confidence ?? 0,
      detail: trend?.reasons?.[0] ?? trend?.marketPhase ?? "Trend alignment is recalculating.",
      detail2: trend?.momentumDirection ? `Momentum ${trend.momentumDirection}` : undefined,
      accent:
        trend?.bias === "bullish" ? "bull" : trend?.bias === "bearish" ? "bear" : "neutral" as const,
    },
    {
      id: "smc",
      label: "Price Action Agent",
      bias: formatBiasLabel(smc?.bias ?? "neutral"),
      confidence: smc?.confidence ?? 0,
      detail: smc?.setupType ?? smc?.reasons?.[0] ?? "Structure context is recalculating.",
      detail2: smc?.premiumDiscount ? `Zone ${smc.premiumDiscount}` : undefined,
      accent:
        smc?.bias === "bullish" ? "bull" : smc?.bias === "bearish" ? "bear" : "neutral" as const,
    },
    {
      id: "news",
      label: "News Agent",
      bias: formatBiasLabel(news?.impact ?? "neutral"),
      confidence: news?.confidence ?? 0,
      detail: news?.dominantCatalyst ?? news?.reasons?.[0] ?? "Catalyst feed is recalculating.",
      detail2: news?.riskScore != null ? `Risk ${news.riskScore}/100` : undefined,
      accent:
        news?.impact === "bullish" ? "bull" : news?.impact === "bearish" ? "bear" : "neutral" as const,
    },
    {
      id: "risk",
      label: "Risk Gate",
      bias: risk ? (risk.valid ? "VALID" : "BLOCKED") : "NEUTRAL",
      confidence: risk?.volatilityScore ?? 0,
      detail: risk?.reasons?.[0] ?? risk?.warnings?.[0] ?? "Risk conditions are recalculating.",
      detail2: risk ? `Grade ${risk.grade}` : undefined,
      accent: risk ? (risk.valid ? "bull" : "bear") : "neutral" as const,
    },
    {
      id: "contrarian",
      label: "Contrarian Agent",
      bias: contrarian?.challengesBias ? "ALERT" : "CLEAR",
      confidence: contrarian?.riskFactor ?? 0,
      detail: contrarian?.alternativeScenario ?? contrarian?.failureReasons?.[0] ?? "Contrarian checks are recalculating.",
      detail2: contrarian?.trapType ? `Trap ${contrarian.trapType}` : undefined,
      accent: contrarian?.challengesBias ? "bear" : "neutral" as const,
    },
    {
      id: "execution",
      label: "Execution Agent",
      bias: signalConfig.label.toUpperCase(),
      confidence: exec?.hasSetup ? 75 : 30,
      detail: exec?.triggerCondition ?? signalReason,
      detail2: exec?.direction && exec.direction !== "none" ? `Direction ${exec.direction.toUpperCase()}` : undefined,
      accent:
        exec?.direction === "long"
          ? "bull"
          : exec?.direction === "short"
            ? "bear"
            : signalState === "ARMED"
              ? "bull"
              : "neutral" as const,
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
  const widgetActionClass =
    "inline-flex items-center gap-1 rounded border border-white/[0.08] px-2 py-1 text-[9px] font-medium text-zinc-500 transition-colors hover:border-white/15 hover:text-zinc-200";
  const dashboardWidgets = [
    {
      id: "chart",
      title: "Terminal",
      headerRight: (
        <>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isValidating}
            className={widgetActionClass}
          >
            <RefreshCw className={cn("h-3 w-3", isValidating && "animate-spin")} />
            {isValidating ? "Running" : "Refresh"}
          </button>
          <Link href="/dashboard/brain" className={widgetActionClass}>
            Brain Terminal
            <ArrowRight className="h-3 w-3" />
          </Link>
          <button type="button" onClick={toggleFullscreen} className={widgetActionClass}>
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {isFullscreen ? "Exit" : "Full Screen"}
          </button>
        </>
      ),
      content: (
        <div className="h-full min-h-0 overflow-hidden">
          <TradingViewChart
            symbol={symCfg.tv}
            heightClass="h-full"
            onIntervalChange={handleIntervalChange}
          />
        </div>
      ),
    },
    {
      id: "globe",
      title: "TradeX globe",
      headerRight: (
        <Link href="/globe" className={widgetActionClass}>
          Open
        </Link>
      ),
      content: (
        <div className="h-full min-h-0 overflow-hidden bg-black">
          <EmbeddedGlobeClient embedded />
        </div>
      ),
    },
    {
      id: "live-tv",
      title: "Live TV",
      headerRight: (
        <Link href="/dashboard/live-tv" className={widgetActionClass}>
          Open
        </Link>
      ),
      content: (
        <div className="h-full min-h-0 overflow-hidden p-3">
          <LiveTVPanel showHeader={false} showFooterNote={false} />
        </div>
      ),
    },
    {
      id: "community",
      title: "Desk chat",
      content: (
        <div className="h-full min-h-0 overflow-hidden">
          <CommunityPanel />
        </div>
      ),
    },
    {
      id: "mtf",
      title: `MTF bias · ${symCfg.short}`,
      content: (
        <div className="h-full min-h-0 overflow-y-auto p-3">
          <MTFBiasPanel data={mtfData} isLoading={mtfLoading} />
        </div>
      ),
    },
    {
      id: "trump",
      title: "Trump Impact Monitor",
      headerRight: (
        <Link href="/dashboard/trump-monitor" className={widgetActionClass}>
          Full
        </Link>
      ),
      content: (
        <div className="h-full min-h-0 overflow-y-auto p-3">
          <TrumpImpactPreview posts={trumpPosts} />
        </div>
      ),
    },
    {
      id: "agents",
      title: "7-Agent Overview",
      headerRight: (
        <Link href="/dashboard/brain" className={widgetActionClass}>
          Brain
        </Link>
      ),
      content: (
        <div className="h-full min-h-0 overflow-y-auto p-2.5">
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {agentOverviewCards.map((agent) => (
              <AgentMiniCard
                key={agent.id}
                label={agent.label}
                bias={agent.bias}
                confidence={agent.confidence}
                detail={agent.detail}
                detail2={agent.detail2}
                isLoading={!data}
                accent={agent.accent}
                onClick={() => setActiveAgent(agent.id)}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "catalysts",
      title: "Top Catalysts",
      headerRight: (
        <Link href="/dashboard/catalysts" className={widgetActionClass}>
          All
        </Link>
      ),
      content: (
        <div className="h-full min-h-0 overflow-y-auto p-3">
          {catalysts.length > 0 ? (
            <CatalystFeed catalysts={catalysts} limit={3} />
          ) : (
            <PanelPlaceholder
              title="No catalysts in queue."
              detail="The headline scanner is waiting for the next market-moving event."
            />
          )}
        </div>
      ),
    },
    {
      id: "events",
      title: "Upcoming Events",
      headerRight: (
        <Link href="/dashboard/economic-calendar" className={widgetActionClass}>
          Calendar
        </Link>
      ),
      content: (
        <div className="h-full min-h-0 overflow-y-auto p-3">
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
        </div>
      ),
    },
    {
      id: "economic-calendar",
      title: "Economic Calendar",
      headerRight: (
        <Link href="/dashboard/economic-calendar" className={widgetActionClass}>
          Open
        </Link>
      ),
      content: (
        <div className="h-full min-h-0 overflow-y-auto p-3">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/35 p-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Bias
                </p>
                <p className={cn("mt-1 text-sm font-semibold", calendarBiasTone)}>{calendarBias}</p>
              </div>
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/35 p-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Live
                </p>
                <p className="mt-1 text-sm font-semibold text-[hsl(var(--foreground))]">{liveCalendarCount}</p>
              </div>
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/35 p-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Queue
                </p>
                <p className="mt-1 text-sm font-semibold text-[hsl(var(--foreground))]">{upcomingEvents.length}</p>
              </div>
            </div>

            {calendarPreview.length > 0 ? (
              <div className="space-y-3">
                {calendarPreview.slice(0, 3).map((event) => (
                  <SidebarEventPreview key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <PanelPlaceholder
                title="No scheduled events yet."
                detail="Add this widget when you want a denser calendar board on the dashboard."
              />
            )}
          </div>
        </div>
      ),
    },
    {
      id: "pnl-calendar",
      title: "PnL Calendar",
      headerRight: (
        <Link href="/dashboard/pnl-calendar" className={widgetActionClass}>
          Open
        </Link>
      ),
      content: (
        <div className="h-full min-h-0 overflow-y-auto p-3">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/35 p-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Overall Net
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm font-mono font-semibold",
                    overallNetPnl > 0 ? "text-emerald-400" : overallNetPnl < 0 ? "text-red-400" : "text-zinc-300"
                  )}
                >
                  {overallNetPnl > 0 ? "+" : ""}
                  {overallNetPnl.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/35 p-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Win Rate
                </p>
                <p className="mt-1 text-sm font-semibold text-[hsl(var(--foreground))]">{overallWinRate}%</p>
              </div>
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/35 p-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Trades
                </p>
                <p className="mt-1 text-sm font-semibold text-[hsl(var(--foreground))]">{overallTrades}</p>
              </div>
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/35 p-2.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                  Trading Days
                </p>
                <p className="mt-1 text-sm font-semibold text-[hsl(var(--foreground))]">{overallTradingDays}</p>
              </div>
            </div>

            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/30 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                    Current Month
                  </p>
                  <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                    {monthTradingDays} active days this month
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-sm font-mono font-semibold",
                      (monthPnl?.pnl ?? 0) > 0 ? "text-emerald-400" : (monthPnl?.pnl ?? 0) < 0 ? "text-red-400" : "text-zinc-300"
                    )}
                  >
                    {(monthPnl?.pnl ?? 0) > 0 ? "+" : ""}
                    {(monthPnl?.pnl ?? 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {monthPnl?.trades ?? 0} trades · {monthPnl?.wins ?? 0} wins
                  </p>
                </div>
              </div>
            </div>

            {pnlLoading ? (
              <PanelPlaceholder
                title="Loading PnL calendar."
                detail="Pulling your current journal and trade performance snapshot."
              />
            ) : mergedPnlMonthly.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                    All Months
                  </p>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {mergedPnlMonthly.length} months tracked
                  </p>
                </div>
                {mergedPnlMonthly.map((entry) => (
                  <div
                    key={`${entry.year}-${entry.month}`}
                    className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/35 px-3 py-2"
                  >
                    <div>
                      <p className="text-[11px] font-medium text-[hsl(var(--foreground))]">
                        {MONTH_LABELS[entry.month - 1]} {entry.year}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {entry.trades} trades · {entry.wins} wins
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-[11px] font-mono font-semibold",
                        entry.pnl > 0 ? "text-emerald-400" : entry.pnl < 0 ? "text-red-400" : "text-zinc-300"
                      )}
                    >
                      {entry.pnl > 0 ? "+" : ""}
                      {entry.pnl.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <PanelPlaceholder
                title="No PnL entries yet."
                detail="Add this widget when you want journal and performance visibility beside the terminal."
              />
            )}
          </div>
        </div>
      ),
    },
    {
      id: "sessions",
      title: "Sessions",
      content: (
        <div className="h-full min-h-0 overflow-y-auto p-3">
          <div className="space-y-3">
            {sessionPreview.filter((session) => session.status === "active").length > 0 ? (
              sessionPreview
                .filter((session) => session.status === "active")
                .map((session) => <SessionSummaryCard key={session.session} session={session} />)
            ) : (
              <PanelPlaceholder
                title="No active session."
                detail="Markets are currently between sessions."
              />
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full min-h-0">
      <DashboardGrid widgets={dashboardWidgets} />

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
