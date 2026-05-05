"use client";

import React, { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Brain, Clock, Crosshair, RefreshCw } from "lucide-react";
import useSWR from "swr";
import type { AgentRunResult, Symbol, Timeframe } from "@/lib/agents/schemas";
import { useQuotes } from "@/hooks/useMarketData";
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
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  BTCUSD: "BTC/USD",
  ETHUSD: "ETH/USD",
  USDJPY: "USD/JPY",
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("fetch failed");
    return r.json() as Promise<AgentRunResult>;
  });

function timeframeMs(tf: Timeframe) {
  if (tf === "M15") return 15 * 60 * 1000;
  if (tf === "H1") return 60 * 60 * 1000;
  return 4 * 60 * 60 * 1000;
}

function countdown(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatBiasLabel(bias?: string) {
  if (!bias) return "NEUTRAL";
  return bias.replace(/[-_]/g, " ").toUpperCase();
}

function signalStateConfig(state?: string) {
  switch (state) {
    case "ARMED":
      return { label: "ARMED", accent: "bull" as const };
    case "PENDING":
      return { label: "PENDING", accent: "neutral" as const };
    case "EXPIRED":
      return { label: "EXPIRED", accent: "neutral" as const };
    default:
      return { label: "NO TRADE", accent: "neutral" as const };
  }
}

function AgentCard({
  label,
  bias,
  confidence,
  detail,
  detail2,
  accent,
  loading = false,
  onClick,
}: {
  label: string;
  bias: string;
  confidence: number;
  detail: string;
  detail2?: string;
  accent: "bull" | "bear" | "neutral";
  loading?: boolean;
  onClick?: () => void;
}) {
  const accentColor = accent === "bull" ? "bg-emerald-500" : accent === "bear" ? "bg-red-500" : "bg-zinc-600";
  const biasTextColor = accent === "bull" ? "text-emerald-400" : accent === "bear" ? "text-red-400" : "text-zinc-500";
  const borderColor = accent === "bull" ? "border-t-emerald-500/60" : accent === "bear" ? "border-t-red-500/60" : "border-t-zinc-700/40";

  if (loading) {
    return (
      <div className="flex min-h-[152px] flex-col gap-3 border-t-2 border-t-zinc-700/40 bg-[hsl(var(--card))] px-3 py-4">
        <div className="h-2.5 w-24 rounded bg-white/6" />
        <div className="h-4 w-20 rounded bg-white/5" />
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-white/5" />
          <div className="h-3 w-8 rounded bg-white/5" />
        </div>
        <div className="h-3 w-full rounded bg-white/[0.03]" />
        <div className="h-3 w-2/3 rounded bg-white/[0.025]" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[152px] flex-col gap-3 border-t-2 bg-[hsl(var(--card))] px-3 py-4 text-left transition-all",
        borderColor,
        onClick && "hover:bg-white/[0.05]"
      )}
    >
      <span className="truncate text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">{label}</span>
      <span className={cn("text-[14px] font-bold uppercase leading-none", biasTextColor)}>{bias}</span>
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
          <div className={cn("h-full rounded-full transition-all", accentColor)} style={{ width: `${Math.min(100, confidence)}%` }} />
        </div>
        <span className="w-7 shrink-0 text-right font-mono text-[10px] text-zinc-500">{confidence}%</span>
      </div>
      <span className="line-clamp-1 text-[10px] leading-tight text-zinc-500">{detail}</span>
      {detail2 ? <span className="line-clamp-1 text-[10px] leading-tight text-zinc-600">{detail2}</span> : null}
    </button>
  );
}

function SymbolSelector({ value, onChange }: { value: Symbol; onChange: (v: Symbol) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-1">
      {SYMBOLS.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id)}
          className={cn(
            "flex flex-col items-center rounded-md px-2.5 py-1.5 text-center transition-all",
            value === s.id ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <span className="text-[11px] font-bold">{s.label}</span>
          <span className="mt-0.5 text-[9px] opacity-60">{s.sub}</span>
        </button>
      ))}
    </div>
  );
}

function TimeframeSelector({ value, onChange }: { value: Timeframe; onChange: (v: Timeframe) => void }) {
  return (
    <div className="flex gap-1 rounded-lg border border-white/8 bg-white/[0.03] p-1">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-all",
            value === tf ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

export function BrainTerminal() {
  const [symbol, setSymbol] = useState<Symbol>("XAUUSD");
  const [timeframe, setTimeframe] = useState<Timeframe>("H1");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [highlightAgentId, setHighlightAgentId] = useState<string | undefined>();
  const [sniperMode, setSniperMode] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const { quotes } = useQuotes(60_000);
  const quoteSymbol = SYMBOL_TO_QUOTE[symbol];
  const liveQuote = quoteSymbol ? quotes.find((q) => q.symbol === quoteSymbol) : undefined;

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
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
      setRefreshKey((k) => k + 1);
    } finally {
      setIsRefreshing(false);
    }
  }, [symbol, timeframe]);

  const openDrawer = useCallback((agentId: string) => {
    setHighlightAgentId(agentId);
    setDrawerOpen(true);
  }, []);

  const loading = isLoading || isRefreshing;
  const livePriceLabel = liveQuote?.price != null
    ? liveQuote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : null;
  const candleClose = countdown(Math.ceil(nowMs / timeframeMs(timeframe)) * timeframeMs(timeframe) - nowMs);

  const master = data?.agents.master;
  const trend = data?.agents.trend;
  const smc = data?.agents.smc;
  const news = data?.agents.news;
  const risk = data?.agents.risk;
  const contrarian = data?.agents.contrarian;
  const execution = data?.agents.execution;

  const finalBias = master?.finalBias ?? "no-trade";
  const signalState = finalBias === "no-trade" ? "NO_TRADE" : execution?.signalState;
  const signalConfig = signalStateConfig(signalState);
  const signalReason =
    execution?.signalStateReason ??
    master?.noTradeReason ??
    "No active trade plan. Monitor the terminal for the next valid setup.";

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
      accent: finalBias === "bullish" ? "bull" : finalBias === "bearish" ? "bear" : "neutral",
    },
    {
      id: "trend",
      label: "Trend Agent",
      bias: formatBiasLabel(trend?.bias ?? "neutral"),
      confidence: trend?.confidence ?? 0,
      detail: trend?.reasons?.[0] ?? trend?.marketPhase ?? "Trend alignment is recalculating.",
      detail2: trend?.momentumDirection ? `Momentum ${trend.momentumDirection}` : undefined,
      accent: trend?.bias === "bullish" ? "bull" : trend?.bias === "bearish" ? "bear" : "neutral",
    },
    {
      id: "smc",
      label: "Price Action Agent",
      bias: formatBiasLabel(smc?.bias ?? "neutral"),
      confidence: smc?.confidence ?? 0,
      detail: smc?.setupType ?? smc?.reasons?.[0] ?? "Structure context is recalculating.",
      detail2: smc?.premiumDiscount ? `Zone ${smc.premiumDiscount}` : undefined,
      accent: smc?.bias === "bullish" ? "bull" : smc?.bias === "bearish" ? "bear" : "neutral",
    },
    {
      id: "news",
      label: "News Agent",
      bias: formatBiasLabel(news?.impact ?? "neutral"),
      confidence: news?.confidence ?? 0,
      detail: news?.dominantCatalyst ?? news?.reasons?.[0] ?? "Catalyst feed is recalculating.",
      detail2: news?.riskScore != null ? `Risk ${news.riskScore}/100` : undefined,
      accent: news?.impact === "bullish" ? "bull" : news?.impact === "bearish" ? "bear" : "neutral",
    },
    {
      id: "risk",
      label: "Risk Gate",
      bias: risk ? (risk.valid ? "VALID" : "BLOCKED") : "NEUTRAL",
      confidence: risk?.volatilityScore ?? 0,
      detail: risk?.reasons?.[0] ?? risk?.warnings?.[0] ?? "Risk conditions are recalculating.",
      detail2: risk ? `Grade ${risk.grade}` : undefined,
      accent: risk ? (risk.valid ? "bull" : "bear") : "neutral",
    },
    {
      id: "contrarian",
      label: "Contrarian Agent",
      bias: contrarian?.challengesBias ? "ALERT" : "CLEAR",
      confidence: contrarian?.riskFactor ?? 0,
      detail: contrarian?.alternativeScenario ?? contrarian?.failureReasons?.[0] ?? "Contrarian checks are recalculating.",
      detail2: contrarian?.trapType ? `Trap ${contrarian.trapType}` : undefined,
      accent: contrarian?.challengesBias ? "bear" : "neutral",
    },
    {
      id: "execution",
      label: "Execution Agent",
      bias: signalConfig.label,
      confidence: execution?.hasSetup ? 75 : 30,
      detail: execution?.triggerCondition ?? signalReason,
      detail2: execution?.direction && execution.direction !== "none" ? `Direction ${execution.direction.toUpperCase()}` : undefined,
      accent:
        execution?.direction === "long"
          ? "bull"
          : execution?.direction === "short"
            ? "bear"
            : signalConfig.accent,
    },
  ];

  return (
    <div className="w-full min-w-0 space-y-4 pb-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04]">
            <Brain className="h-4 w-4 text-zinc-300" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-white">Brain</h1>
            <p className="text-[11px] text-zinc-600">7-agent decision engine</p>
          </div>
          {livePriceLabel ? (
            <div className="ml-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-1.5">
              <span className="font-mono text-[13px] font-semibold text-zinc-200">{livePriceLabel}</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SymbolSelector value={symbol} onChange={(v) => { setSymbol(v); setRefreshKey((k) => k + 1); }} />
          <TimeframeSelector value={timeframe} onChange={(v) => { setTimeframe(v); setRefreshKey((k) => k + 1); }} />
          {!sniperMode ? (
            <button
              onClick={() => setSniperMode(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-zinc-500 transition-all hover:text-zinc-300"
            >
              <Crosshair className="h-3.5 w-3.5" />
              Sniper
            </button>
          ) : (
            <button
              onClick={() => setSniperMode(false)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-300 transition-all"
            >
              <Crosshair className="h-3.5 w-3.5" />
              Sniper ON
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-zinc-500 transition-all hover:text-zinc-300",
              loading && "cursor-not-allowed opacity-40"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-3 w-28 rounded bg-white/5" />
            <div className="h-px flex-1 bg-white/[0.05]" />
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {[...Array(7)].map((_, i) => (
              <AgentCard
                key={i}
                label="Loading"
                bias="NEUTRAL"
                confidence={0}
                detail="—"
                accent="neutral"
                loading
              />
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[12px] text-red-400">
          Failed to load agent data. Check your API key and try again.
        </div>
      ) : null}

      {data ? (
        <>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">7-Agent Overview</span>
            <div className="flex-1 border-t border-white/5" />
            <div className="hidden items-center gap-5 text-right sm:flex">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Confidence</div>
                <div className="font-mono text-[12px] font-bold text-zinc-300">{master?.confidence ?? 0}%</div>
              </div>
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Candle</div>
                <div className="font-mono text-[12px] font-bold text-zinc-300">{candleClose}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {agentOverviewCards.map((agent) => (
              <AgentCard
                key={agent.id}
                label={agent.label}
                bias={agent.bias}
                confidence={agent.confidence}
                detail={agent.detail}
                detail2={agent.detail2}
                accent={agent.accent}
                onClick={() => openDrawer(agent.id)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-2 text-[11px] text-zinc-600">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>{data.totalProcessingTime}ms</span>
            </div>
            {data.cached ? <span className="rounded bg-white/4 px-1.5 py-0.5 text-[10px]">CACHED</span> : null}
            <span className="ml-auto">{new Date(data.timestamp).toLocaleTimeString()}</span>
          </div>
        </>
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
