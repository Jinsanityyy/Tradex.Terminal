"use client";

import React, { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Brain, Clock, Crosshair, RefreshCw } from "lucide-react";
import useSWR from "swr";
import type { AgentRunResult, Symbol, Timeframe } from "@/lib/agents/schemas";
import { useQuotes } from "@/hooks/useMarketData";
import { BrainOverviewDrawer } from "./BrainOverviewDrawer";

// ── Constants ─────────────────────────────────────────────────────────

const SYMBOLS: { id: Symbol; label: string; sub: string }[] = [
  { id: "XAUUSD", label: "XAU/USD", sub: "Gold" },
  { id: "EURUSD", label: "EUR/USD", sub: "Euro" },
  { id: "GBPUSD", label: "GBP/USD", sub: "Pound" },
  { id: "BTCUSD", label: "BTC/USD", sub: "Bitcoin" },
];

const TIMEFRAMES: Timeframe[] = ["M15", "H1", "H4"];

const SYMBOL_TO_QUOTE: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD", EURUSD: "EUR/USD", GBPUSD: "GBP/USD",
  BTCUSD: "BTC/USD", ETHUSD: "ETH/USD", USDJPY: "USD/JPY",
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("fetch failed");
    return r.json() as Promise<AgentRunResult>;
  });

// ── Helpers ───────────────────────────────────────────────────────────

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

type Tone = "green" | "red" | "yellow" | "gray";

function tone(state: string): Tone {
  const s = state.toLowerCase();
  if (["bullish", "long", "valid", "armed", "aligned", "open"].includes(s)) return "green";
  if (["bearish", "short", "invalid", "opposing", "expired", "blocked"].includes(s)) return "red";
  if (["neutral", "pending", "no_trade", "no-trade"].includes(s)) return "yellow";
  return "gray";
}

const TONE_CLS: Record<Tone, { label: string; bar: string; border: string; bg: string; badge: string }> = {
  green: {
    label: "text-emerald-400",
    bar: "bg-emerald-400",
    border: "border-emerald-500/18",
    bg: "bg-emerald-500/[0.04]",
    badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  red: {
    label: "text-red-400",
    bar: "bg-red-400",
    border: "border-red-500/18",
    bg: "bg-red-500/[0.04]",
    badge: "text-red-400 bg-red-500/10 border-red-500/20",
  },
  yellow: {
    label: "text-amber-400",
    bar: "bg-amber-400",
    border: "border-amber-500/18",
    bg: "bg-amber-500/[0.03]",
    badge: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  gray: {
    label: "text-zinc-500",
    bar: "bg-zinc-700",
    border: "border-white/6",
    bg: "bg-white/[0.015]",
    badge: "text-zinc-500 bg-white/4 border-white/8",
  },
};

// ── Pixel diagnostic helpers ──────────────────────────────────────────

type DiagTag = { k: string; v: string };

function fmtPrice(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v > 10000) return v.toFixed(0);
  if (v > 100) return v.toFixed(1);
  if (v > 1) return v.toFixed(4);
  return v.toFixed(5);
}

function DiagStrip({ tags }: { tags: DiagTag[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1 border-t border-white/5 pt-2">
      {tags.map(({ k, v }) => (
        <span
          key={k}
          className="inline-flex items-center gap-0.5 rounded border border-white/6 bg-white/[0.025] px-1.5 py-0.5 font-mono text-[8.5px] tracking-wide"
        >
          <span className="text-zinc-600">{k}:</span>
          <span className="text-zinc-400">{v}</span>
        </span>
      ))}
    </div>
  );
}

function formatPriceActionPattern(setupType: string): string {
  switch (setupType) {
    case "BOS":
      return "Breakout continuation";
    case "BOS_Continuation":
      return "BOS continuation";
    case "CHoCH":
      return "Trend shift reversal";
    case "OB":
      return "Range retest";
    case "FVG":
      return "Gap fill";
    case "Sweep":
      return "Stop-run reversal";
    case "FibLong":
      return "Discount fib entry";
    case "FibShort":
      return "Premium fib entry";
    default:
      return "No clear pattern";
  }
}

function formatRangeContext(zone: string): string {
  switch (zone) {
    case "DISCOUNT":
      return "Lower range";
    case "PREMIUM":
      return "Upper range";
    default:
      return "Mid range";
  }
}

// ── Agent Card ────────────────────────────────────────────────────────

function AgentCard({
  name,
  state,
  confidence,
  insight,
  trigger,
  tags,
  onClick,
}: {
  name: string;
  state: string;
  confidence: number;
  insight: string;
  trigger?: string;
  tags?: DiagTag[];
  onClick?: () => void;
}) {
  const t = tone(state);
  const cls = TONE_CLS[t];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border p-4 text-left transition-all hover:brightness-110 active:scale-[0.99]",
        cls.border, cls.bg
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          {name}
        </span>
        {trigger ? (
          <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]", cls.badge)}>
            {trigger}
          </span>
        ) : null}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("text-[15px] font-bold tracking-tight leading-none", cls.label)}>
          {state.toUpperCase()}
        </span>
        <span className="font-mono text-[13px] font-semibold text-zinc-400">{confidence}%</span>
      </div>

      <p className="line-clamp-1 text-[11px] leading-[1.4] text-zinc-500">{insight}</p>

      <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/5">
        <div className={cn("h-full rounded-full transition-all duration-700", cls.bar)} style={{ width: `${Math.min(100, confidence)}%` }} />
      </div>

      {tags && tags.length > 0 ? <DiagStrip tags={tags} /> : null}
    </button>
  );
}

// ── Symbol / Timeframe Selectors ──────────────────────────────────────

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

// ── Main Component ────────────────────────────────────────────────────

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

  const loading = isLoading || isRefreshing;

  const livePriceLabel = liveQuote?.price != null
    ? liveQuote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : null;

  const candleClose = countdown(Math.ceil(nowMs / timeframeMs(timeframe)) * timeframeMs(timeframe) - nowMs);

  // ── Derived display data ─────────────────────────────────────────────

  const master = data?.agents.master;
  const tr = data?.agents.trend;
  const smc = data?.agents.smc;
  const news = data?.agents.news;
  const contrarian = data?.agents.contrarian;
  const execution = data?.agents.execution;
  const structure = data?.snapshot.structure;

  const masterBias = master?.finalBias ?? "no-trade";
  const masterLabel =
    masterBias === "no-trade" ? "NO TRADE"
    : masterBias === "bullish" ? `LONG ${symbol}`
    : `SHORT ${symbol}`;
  const masterReason =
    master?.noTradeReason ?? master?.supports?.[0] ?? "Awaiting analysis";
  const masterTone = masterBias === "bullish" ? "green" : masterBias === "bearish" ? "red" : "yellow";
  const masterCls = TONE_CLS[masterTone as Tone];

  // HTF Bias — from structure data
  const htfState = structure?.htfBias ?? "neutral";
  const htfConf = structure?.htfConfidence ?? 0;
  const htfInsight = structure
    ? `${structure.zone} zone · ${structure.pos52w.toFixed(0)}% of 52-wk range`
    : "No structure data";

  // Liquidity — sweep/BOS focus
  const liqState = smc?.liquiditySweepDetected
    ? smc.bias
    : smc?.bosDetected
      ? smc.bias
      : "neutral";
  const liqInsight = smc?.liquiditySweepDetected
    ? `Sweep detected · ${smc.setupType}`
    : smc?.bosDetected
      ? `BOS confirmed · ${smc.setupType}`
      : smc?.reasons[0] ?? "No trigger";
  const liqTrigger = smc?.liquiditySweepDetected ? "Sweep" : smc?.bosDetected ? "BOS" : "Waiting";

  // Price Action — setup focus
  const paInsight = smc
    ? `${formatPriceActionPattern(smc.setupType)} · ${formatRangeContext(smc.premiumDiscount)}`
    : "No setup";
  const paTrigger = smc?.setupPresent ? smc.setupType : "Waiting";

  const riskState = data?.agents.risk.valid ? "valid" : "blocked";
  const riskConf = data?.agents.risk.sessionScore ?? 0;
  const riskInsight = data?.agents.risk.reasons[0] ?? "No risk assessment";
  const riskTrigger = data?.agents.risk.grade ? `Grade ${data.agents.risk.grade}` : undefined;

  // Contrarian
  const contraState = contrarian?.challengesBias ? "opposing" : "neutral";
  const contraInsight = contrarian
    ? (contrarian.trapType ?? contrarian.failureReasons[0] ?? "No counter-signal")
    : "No data";
  const contraTrigger = contrarian ? `Risk ${contrarian.riskFactor}%` : undefined;

  // Execution
  const execStateRaw = execution?.signalState ?? "NO_TRADE";
  const execState = execStateRaw === "ARMED"
    ? (execution?.direction === "long" ? "bullish" : "bearish")
    : execStateRaw === "EXPIRED" ? "expired"
    : "neutral";
  const execConf = execution?.rrRatio
    ? Math.min(90, Math.round(execution.rrRatio * 20))
    : 0;
  const execInsight = execution?.entry && execution?.rrRatio
    ? `Entry ${fmtPrice(execution.entry)} · RR ${execution.rrRatio.toFixed(2)}:1`
    : (execution?.signalStateReason ?? "No signal");
  const execTrigger = execStateRaw;

  const masterState = master?.finalBias ?? "no-trade";
  const masterConf = master?.confidence ?? 0;
  const masterInsight = master?.noTradeReason ?? master?.supports?.[0] ?? "Awaiting consensus";
  const masterTrigger = master?.strategyMatch ?? "Consensus";

  // ── Timeframe alignment (computed, not trusting .aligned field) ──────
  const tfSyncLabel = tr
    ? ([tr.timeframeBias.M5, tr.timeframeBias.M15, tr.timeframeBias.H1, tr.timeframeBias.H4]
        .every(b => b === tr.bias)
        ? "ALL 4"
        : (() => {
            const matching = (["M5","M15","H1","H4"] as const).filter(k => tr.timeframeBias[k] === tr.bias);
            return matching.length > 0 ? `${matching.join("+")} ONLY` : "MIXED";
          })()
      )
    : "—";

  // ── Pixel diagnostic tags (real data only, "—" fallback) ─────────────

  const trendTags: DiagTag[] = tr ? [
    { k: "PHASE", v: tr.marketPhase },
    { k: "MOMENTUM", v: tr.momentumDirection.toUpperCase() },
    { k: "TF SYNC", v: tfSyncLabel },
    { k: "MA", v: tr.maAlignment ? "ALIGNED" : "MIXED" },
    { k: "INVL", v: fmtPrice(tr.invalidationLevel) },
  ] : [];

  const htfTags: DiagTag[] = structure ? [
    { k: "ZONE", v: structure.zone },
    { k: "52W POS", v: `${structure.pos52w.toFixed(0)}%` },
    { k: "EQ LVL", v: fmtPrice(structure.equilibrium) },
    { k: "SESSION", v: data?.snapshot.indicators.session ?? "—" },
  ] : [];

  const liqTags: DiagTag[] = smc ? [
    { k: "SWEEP", v: smc.liquiditySweepDetected ? "YES" : "NO" },
    { k: "BOS", v: smc.bosDetected ? "YES" : "NO" },
    { k: "CHOCH", v: smc.chochDetected ? "YES" : "NO" },
    { k: "SETUP", v: smc.setupType },
    { k: "LIQ TGT", v: fmtPrice(smc.keyLevels.liquidityTarget) },
  ] : [];

  const newsTags: DiagTag[] = news ? [
    { k: "REGIME", v: news.regime },
    { k: "RISK", v: `${news.riskScore}/100` },
    { k: "EVENTS", v: `${news.catalysts.length}` },
    { k: "IMPACT", v: news.impact.toUpperCase() },
  ] : [];

  const paTags: DiagTag[] = smc ? [
    { k: "PATTERN", v: smc.setupType },
    { k: "RANGE", v: smc.premiumDiscount },
    { k: "BOS", v: smc.bosDetected ? "YES" : "NO" },
    { k: "CHOCH", v: smc.chochDetected ? "YES" : "NO" },
    { k: "TARGET", v: fmtPrice(smc.keyLevels.liquidityTarget) },
  ] : [];

  const riskTags: DiagTag[] = data?.agents.risk ? [
    { k: "GRADE", v: data.agents.risk.grade },
    { k: "MAX", v: `${data.agents.risk.maxRiskPercent}%` },
    { k: "SESSION", v: `${data.agents.risk.sessionScore}/100` },
    { k: "VOL", v: `${data.agents.risk.volatilityScore}/100` },
    { k: "RR", v: data.agents.risk.estimatedRR != null ? `${data.agents.risk.estimatedRR.toFixed(2)}:1` : "—" },
  ] : [];

  const contraTags: DiagTag[] = contrarian ? [
    { k: "TRAP", v: contrarian.trapType ?? "NONE" },
    { k: "RISK", v: `${contrarian.riskFactor}%` },
    { k: "CONF", v: `${contrarian.trapConfidence}%` },
    { k: "OPP LIQ", v: fmtPrice(contrarian.oppositeLiquidity) },
  ] : [];

  const execTags: DiagTag[] = execution ? [
    { k: "ENTRY", v: fmtPrice(execution.entry) },
    { k: "SL", v: fmtPrice(execution.stopLoss) },
    { k: "TP1", v: fmtPrice(execution.tp1) },
    { k: "TP2", v: fmtPrice(execution.tp2) },
    { k: "RR", v: execution.rrRatio != null ? `${execution.rrRatio.toFixed(2)}:1` : "—" },
  ] : [];

  const masterTags: DiagTag[] = master ? [
    { k: "FINAL", v: master.finalBias.toUpperCase() },
    { k: "SCORE", v: master.consensusScore.toFixed(1) },
    { k: "SETUP", v: master.strategyMatch ?? "â€”" },
    { k: "HTF", v: structure?.htfBias?.toUpperCase() ?? "â€”" },
    { k: "EXEC", v: execution?.signalState ?? "â€”" },
  ] : [];

  const openDrawer = useCallback((agentId: string) => {
    setHighlightAgentId(agentId);
    setDrawerOpen(true);
  }, []);

  return (
    <div className="w-full min-w-0 space-y-4 pb-4">

      {/* ── Header ──────────────────────────────────────────────────── */}
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

      {/* ── Loading skeleton ─────────────────────────────────────────── */}
      {loading && !data ? (
        <div className="animate-pulse space-y-3">
          <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-5 py-5">
            <div className="h-7 w-48 rounded-lg bg-white/5" />
            <div className="mt-2 h-3 w-80 rounded bg-white/[0.03]" />
          </div>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
                <div className="h-2.5 w-16 rounded bg-white/5" />
                <div className="mt-3 h-5 w-20 rounded bg-white/5" />
                <div className="mt-3 h-2 w-full rounded bg-white/[0.03]" />
              </div>
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
          {/* ── Master Decision Bar ──────────────────────────────────── */}
          <div className={cn(
            "rounded-2xl border px-5 py-4",
            masterTone === "green" ? "border-emerald-500/20 bg-emerald-500/[0.05]"
            : masterTone === "red" ? "border-red-500/20 bg-red-500/[0.05]"
            : "border-amber-500/16 bg-amber-500/[0.03]"
          )}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-5">
                <span className={cn("text-[26px] font-bold tracking-tight leading-none", masterCls.label)}>
                  {masterLabel}
                </span>
                <span className="text-[12px] leading-5 text-zinc-500 sm:max-w-lg line-clamp-1">
                  {masterReason}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-5">
                <div className="text-right">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Confidence</div>
                  <div className="font-mono text-[16px] font-bold text-zinc-300">{master?.confidence ?? 0}%</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600">Candle</div>
                  <div className="font-mono text-[16px] font-bold text-zinc-300">{candleClose}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Divider label ────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Agent Deck</span>
            <div className="flex-1 border-t border-white/5" />
          </div>

          {/* ── Row 1: Market Bias (4 agents) ───────────────────────── */}
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <AgentCard
              name="Trend Agent"
              state={tr?.bias ?? "neutral"}
              confidence={tr?.confidence ?? 0}
              insight={tr?.reasons[0] ?? "—"}
              trigger={tr?.marketPhase}
              tags={trendTags}
              onClick={() => openDrawer("trend")}
            />
            <AgentCard
              name="Price Action Agent"
              state={smc?.bias ?? "neutral"}
              confidence={smc?.confidence ?? 0}
              insight={paInsight}
              trigger={paTrigger}
              tags={paTags}
              onClick={() => openDrawer("smc")}
            />
            <AgentCard
              name="Risk Gate Agent"
              state={riskState}
              confidence={riskConf}
              insight={riskInsight}
              trigger={riskTrigger}
              tags={riskTags}
              onClick={() => openDrawer("risk")}
            />
            <AgentCard
              name="News Agent"
              state={news?.impact ?? "neutral"}
              confidence={news?.confidence ?? 0}
              insight={news?.dominantCatalyst ?? news?.reasons[0] ?? "—"}
              trigger={news?.regime}
              tags={newsTags}
              onClick={() => openDrawer("news")}
            />
          </div>

          {/* ── Divider label ────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Execution + Consensus</span>
            <div className="flex-1 border-t border-white/5" />
          </div>

          {/* ── Row 2: Execution (3 agents) ─────────────────────────── */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <AgentCard
              name="Execution Agent"
              state={execState}
              confidence={execConf}
              insight={execInsight}
              trigger={execTrigger}
              tags={execTags}
              onClick={() => openDrawer("execution")}
            />
            <AgentCard
              name="Contrarian Agent"
              state={contraState}
              confidence={contrarian?.trapConfidence ?? 0}
              insight={contraInsight}
              trigger={contraTrigger}
              tags={contraTags}
              onClick={() => openDrawer("contrarian")}
            />
            <AgentCard
              name="Master Consensus"
              state={masterState}
              confidence={masterConf}
              insight={masterInsight}
              trigger={masterTrigger}
              tags={masterTags}
              onClick={() => openDrawer("master")}
            />
          </div>

          {/* ── Footer ──────────────────────────────────────────────── */}
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
