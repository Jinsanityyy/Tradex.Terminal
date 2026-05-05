"use client";

import React, { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Brain, Clock, Crosshair, RefreshCw } from "lucide-react";
import useSWR from "swr";
import type { AgentRunResult, Symbol, Timeframe } from "@/lib/agents/schemas";
import { useQuotes } from "@/hooks/useMarketData";
import { BrainOverviewDrawer } from "./BrainOverviewDrawer";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiagTag = { k: string; v: string };
type Tone = "green" | "red" | "yellow" | "gray";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—";
  if (v > 10000) return v.toFixed(0);
  if (v > 100)   return v.toFixed(1);
  if (v > 1)     return v.toFixed(4);
  return v.toFixed(5);
}

function biasTone(bias: string | undefined): Tone {
  if (bias === "bullish" || bias === "valid" || bias === "long")    return "green";
  if (bias === "bearish" || bias === "blocked" || bias === "short") return "red";
  if (bias === "opposing" || bias === "no-trade")                   return "yellow";
  return "gray";
}

const TONE_CLS: Record<Tone, { border: string; text: string; bar: string }> = {
  green:  { border: "border-t-emerald-500/70", text: "text-emerald-400", bar: "bg-emerald-500" },
  red:    { border: "border-t-red-500/70",     text: "text-red-400",     bar: "bg-red-500"     },
  yellow: { border: "border-t-amber-500/70",   text: "text-amber-400",   bar: "bg-amber-500"   },
  gray:   { border: "border-t-zinc-700/40",    text: "text-zinc-400",    bar: "bg-zinc-600"    },
};

function fmt(s: string | undefined): string {
  if (!s) return "NEUTRAL";
  return s.replace(/[-_]/g, " ").toUpperCase();
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SYMBOLS: { id: Symbol; label: string; sub: string }[] = [
  { id: "XAUUSD", label: "XAU/USD", sub: "Gold"    },
  { id: "EURUSD", label: "EUR/USD", sub: "Euro"    },
  { id: "GBPUSD", label: "GBP/USD", sub: "Pound"   },
  { id: "BTCUSD", label: "BTC/USD", sub: "Bitcoin" },
];
const TIMEFRAMES: Timeframe[] = ["M15", "H1", "H4"];
const SYMBOL_TO_QUOTE: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD", EURUSD: "EUR/USD", GBPUSD: "GBP/USD", BTCUSD: "BTC/USD",
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("fetch failed");
    return r.json() as Promise<AgentRunResult>;
  });

function timeframeMs(tf: Timeframe) {
  if (tf === "M15") return 15 * 60 * 1000;
  if (tf === "H1")  return 60 * 60 * 1000;
  return 4 * 60 * 60 * 1000;
}

function countdown(msLeft: number) {
  const s   = Math.max(0, Math.floor(msLeft / 1000));
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DiagStrip({ tags }: { tags: DiagTag[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1 pt-1 border-t border-white/4 mt-1">
      {tags.map((t) => (
        <span
          key={t.k}
          className="inline-flex items-center gap-0.5 rounded border border-white/6 bg-white/[0.03] px-1 py-0.5 font-mono text-[8px]"
        >
          <span className="text-zinc-700">{t.k}:</span>
          <span className="text-zinc-500">{t.v}</span>
        </span>
      ))}
    </div>
  );
}

function AgentCard({
  name,
  state,
  confidence,
  insight,
  sub,
  tone,
  tags,
  loading,
  onClick,
}: {
  name: string;
  state: string;
  confidence: number;
  insight: string;
  sub?: string;
  tone: Tone;
  tags?: DiagTag[];
  loading?: boolean;
  onClick?: () => void;
}) {
  const cls = TONE_CLS[tone];

  if (loading) {
    return (
      <div className="flex min-h-[140px] flex-col gap-2.5 border-t-2 border-t-zinc-700/30 bg-[hsl(var(--card))] px-3 py-3 animate-pulse">
        <div className="h-2 w-20 rounded bg-white/6" />
        <div className="h-4 w-16 rounded bg-white/5" />
        <div className="h-[3px] w-full rounded-full bg-white/5" />
        <div className="h-2.5 w-full rounded bg-white/[0.03]" />
        <div className="h-2.5 w-2/3 rounded bg-white/[0.025]" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[140px] flex-col gap-2 border-t-2 bg-[hsl(var(--card))] px-3 py-3 text-left transition-all",
        cls.border,
        onClick && "hover:bg-white/[0.04] cursor-pointer"
      )}
    >
      <span className="truncate text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">{name}</span>
      <span className={cn("text-[13px] font-black uppercase leading-none tracking-wide", cls.text)}>{state}</span>
      <div className="flex items-center gap-2">
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-zinc-800">
          <div className={cn("h-full rounded-full transition-all duration-500", cls.bar)} style={{ width: `${Math.min(100, confidence)}%` }} />
        </div>
        <span className="w-7 shrink-0 text-right font-mono text-[10px] text-zinc-600">{confidence}%</span>
      </div>
      <span className="line-clamp-2 text-[10px] leading-snug text-zinc-500">{insight}</span>
      {sub ? <span className="text-[9px] text-zinc-700">{sub}</span> : null}
      {tags ? <DiagStrip tags={tags} /> : null}
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export function BrainTerminal() {
  const [symbol, setSymbol]             = useState<Symbol>("XAUUSD");
  const [timeframe, setTimeframe]       = useState<Timeframe>("H1");
  const [refreshKey, setRefreshKey]     = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [highlightId, setHighlightId]  = useState<string | undefined>();
  const [sniperMode, setSniperMode]     = useState(false);
  const [nowMs, setNowMs]               = useState(() => Date.now());

  const { quotes } = useQuotes(60_000);
  const quoteSymbol = SYMBOL_TO_QUOTE[symbol];
  const liveQuote   = quoteSymbol ? quotes.find((q) => q.symbol === quoteSymbol) : undefined;

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
    setHighlightId(agentId);
    setDrawerOpen(true);
  }, []);

  const loading = isLoading || isRefreshing;

  const livePriceLabel = liveQuote?.price != null
    ? liveQuote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : null;

  const candleClose = countdown(
    Math.ceil(nowMs / timeframeMs(timeframe)) * timeframeMs(timeframe) - nowMs
  );

  // ── Agent destructuring ────────────────────────────────────────────────────

  const master     = data?.agents.master;
  const tr         = data?.agents.trend;
  const smc        = data?.agents.smc;
  const news       = data?.agents.news;
  const risk       = data?.agents.risk;
  const contrarian = data?.agents.contrarian;
  const execution  = data?.agents.execution;
  const finalBias  = master?.finalBias ?? "no-trade";

  // TF alignment: computed from individual biases, not the pre-computed flag
  const tfSyncLabel = tr
    ? ([tr.timeframeBias.M5, tr.timeframeBias.M15, tr.timeframeBias.H1, tr.timeframeBias.H4]
        .every(b => b === tr.bias)
        ? "ALL 4"
        : (() => {
            const match = (["M5", "M15", "H1", "H4"] as const).filter(k => tr.timeframeBias[k] === tr.bias);
            return match.length > 0 ? `${match.join("+")} ONLY` : "MIXED";
          })()
      )
    : "—";

  // Execution confidence: derived from actual RR ratio (real data)
  const execConf = execution?.rrRatio != null
    ? Math.min(90, Math.round(execution.rrRatio * 20))
    : execution?.hasSetup ? 35 : 10;

  // ── Diagnostic tags — all fields from real agent outputs ──────────────────

  const trendTags: DiagTag[] = tr ? [
    { k: "PHASE",    v: tr.marketPhase },
    { k: "MOMENTUM", v: tr.momentumDirection.toUpperCase() },
    { k: "TF SYNC",  v: tfSyncLabel },
    { k: "MA",       v: tr.maAlignment ? "ALIGNED" : "MIXED" },
    { k: "INVL",     v: fmtPrice(tr.invalidationLevel) },
  ] : [];

  const smcTags: DiagTag[] = smc ? [
    { k: "SETUP",  v: smc.setupType },
    { k: "ZONE",   v: smc.premiumDiscount },
    { k: "BOS",    v: smc.bosDetected ? "YES" : "NO" },
    { k: "CHoCH",  v: smc.chochDetected ? "YES" : "NO" },
    { k: "SWEEP",  v: smc.liquiditySweepDetected ? "YES" : "NO" },
    { k: "INVL",   v: fmtPrice(smc.invalidationLevel) },
  ] : [];

  const newsTags: DiagTag[] = news ? [
    { k: "REGIME",   v: news.regime.toUpperCase() },
    { k: "RISK",     v: `${news.riskScore}/100` },
    { k: "EVENTS",   v: `${news.catalysts.length}` },
    { k: "CHANGERS", v: `${news.biasChangers.length}` },
  ] : [];

  const riskTags: DiagTag[] = risk ? [
    { k: "GRADE",    v: risk.grade },
    { k: "MAX RISK", v: `${risk.maxRiskPercent}%` },
    { k: "SESSION",  v: `${risk.sessionScore}/100` },
    { k: "VOL",      v: `${risk.volatilityScore}/100` },
    { k: "WARNS",    v: `${risk.warnings.length}` },
  ] : [];

  const contrarianTags: DiagTag[] = contrarian ? [
    { k: "TRAP",   v: contrarian.trapType ?? "NONE" },
    { k: "RISK",   v: `${contrarian.riskFactor}%` },
    { k: "CONF",   v: `${contrarian.trapConfidence}%` },
    { k: "OPP LQ", v: fmtPrice(contrarian.oppositeLiquidity) },
  ] : [];

  const execTags: DiagTag[] = execution ? [
    { k: "STATE",  v: execution.signalState },
    { k: "ENTRY",  v: fmtPrice(execution.entry) },
    { k: "SL",     v: fmtPrice(execution.stopLoss) },
    { k: "TP1",    v: fmtPrice(execution.tp1) },
    { k: "TP2",    v: fmtPrice(execution.tp2) },
    { k: "RR",     v: execution.rrRatio != null ? `${execution.rrRatio.toFixed(2)}:1` : "—" },
  ] : [];

  // ── Master bar visual ──────────────────────────────────────────────────────

  const masterTone = biasTone(finalBias);
  const masterCls  = TONE_CLS[masterTone];

  const masterLabel =
    finalBias === "bullish" ? `LONG ${data?.symbolDisplay ?? symbol}` :
    finalBias === "bearish" ? `SHORT ${data?.symbolDisplay ?? symbol}` :
    "NO TRADE";

  return (
    <div className="w-full min-w-0 space-y-3 pb-4">

      {/* Header */}
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

      {/* Loading skeleton */}
      {loading && !data ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-[72px] rounded-xl bg-white/4" />
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => <AgentCard key={i} name="—" state="—" confidence={0} insight="—" tone="gray" loading />)}
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(3)].map((_, i) => <AgentCard key={i} name="—" state="—" confidence={0} insight="—" tone="gray" loading />)}
          </div>
        </div>
      ) : null}

      {/* Error */}
      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[12px] text-red-400">
          Failed to load agent data. Check your API key and try again.
        </div>
      ) : null}

      {/* Main content */}
      {data ? (
        <>
          {/* ── Master Decision Bar ─────────────────────────────────────────── */}
          <button
            onClick={() => openDrawer("master")}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all text-left",
              finalBias === "bullish" ? "bg-emerald-500/8 border-emerald-500/25 hover:bg-emerald-500/12" :
              finalBias === "bearish" ? "bg-red-500/8 border-red-500/25 hover:bg-red-500/12" :
              "bg-white/[0.03] border-white/8 hover:bg-white/[0.05]"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">Master Consensus</span>
                {data.cached && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/6 text-zinc-600 font-mono border border-white/6">CACHED</span>
                )}
              </div>
              <span className={cn("text-[20px] font-black uppercase tracking-tight leading-tight", masterCls.text)}>
                {masterLabel}
              </span>
              <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                {master?.strategyMatch ?? master?.noTradeReason ?? "Awaiting agent consensus"}
              </p>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Confidence</div>
                <div className={cn("text-[24px] font-black leading-tight", masterCls.text)}>{master?.confidence ?? 0}%</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Consensus</div>
                <div className={cn(
                  "text-[15px] font-bold font-mono",
                  master && master.consensusScore > 0 ? "text-emerald-400" :
                  master && master.consensusScore < 0 ? "text-red-400" : "text-zinc-500"
                )}>
                  {master ? `${master.consensusScore > 0 ? "+" : ""}${master.consensusScore.toFixed(1)}` : "—"}
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-[9px] text-zinc-600 uppercase tracking-wider">Candle</div>
                <div className="font-mono text-[13px] font-bold text-zinc-400">{candleClose}</div>
              </div>
            </div>
          </button>

          {/* Section label */}
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-700">7-Agent Overview</span>
            <div className="flex-1 border-t border-white/4" />
          </div>

          {/* ── Row 1: Trend, Price Action, News, Risk ──────────────────────── */}
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">

            <AgentCard
              name="Trend Agent"
              state={fmt(tr?.bias)}
              confidence={tr?.confidence ?? 0}
              insight={tr?.reasons?.[0] ?? tr?.marketPhase ?? "Recalculating..."}
              sub={tr?.momentumDirection ? `Momentum ${tr.momentumDirection}` : undefined}
              tone={biasTone(tr?.bias)}
              tags={trendTags}
              onClick={() => openDrawer("trend")}
            />

            <AgentCard
              name="Price Action Agent"
              state={fmt(smc?.bias)}
              confidence={smc?.confidence ?? 0}
              insight={smc?.reasons?.[0] ?? smc?.setupType ?? "Recalculating..."}
              sub={smc?.premiumDiscount ? `Zone ${smc.premiumDiscount}` : undefined}
              tone={biasTone(smc?.bias)}
              tags={smcTags}
              onClick={() => openDrawer("smc")}
            />

            <AgentCard
              name="News Agent"
              state={fmt(news?.impact)}
              confidence={news?.confidence ?? 0}
              insight={news?.dominantCatalyst ?? news?.reasons?.[0] ?? "Recalculating..."}
              sub={news?.riskScore != null ? `Risk ${news.riskScore}/100` : undefined}
              tone={biasTone(news?.impact)}
              tags={newsTags}
              onClick={() => openDrawer("news")}
            />

            <AgentCard
              name="Risk Gate"
              state={risk ? (risk.valid ? "VALID" : "BLOCKED") : "NEUTRAL"}
              confidence={risk?.sessionScore ?? 0}
              insight={risk?.reasons?.[0] ?? risk?.warnings?.[0] ?? "Recalculating..."}
              sub={risk ? `Grade ${risk.grade} — Max ${risk.maxRiskPercent}% risk` : undefined}
              tone={risk ? (risk.valid ? "green" : "red") : "gray"}
              tags={riskTags}
              onClick={() => openDrawer("risk")}
            />
          </div>

          {/* ── Row 2: Contrarian, Execution, Trade Plan ─────────────────────── */}
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">

            <AgentCard
              name="Contrarian Agent"
              state={contrarian?.challengesBias ? "ALERT" : "CLEAR"}
              confidence={contrarian?.trapConfidence ?? 0}
              insight={contrarian?.alternativeScenario ?? contrarian?.failureReasons?.[0] ?? "Recalculating..."}
              sub={contrarian?.trapType ? `Trap: ${contrarian.trapType}` : undefined}
              tone={contrarian?.challengesBias ? "red" : "gray"}
              tags={contrarianTags}
              onClick={() => openDrawer("contrarian")}
            />

            <AgentCard
              name="Execution Agent"
              state={execution?.signalState ?? "NO TRADE"}
              confidence={execConf}
              insight={execution?.signalStateReason ?? execution?.triggerCondition ?? "Recalculating..."}
              sub={
                execution?.hasSetup && execution.direction !== "none"
                  ? `${execution.direction.toUpperCase()} — RR ${execution.rrRatio?.toFixed(2) ?? "—"}:1`
                  : undefined
              }
              tone={
                execution?.direction === "long"  ? "green" :
                execution?.direction === "short" ? "red"   :
                execution?.signalState === "ARMED" ? "yellow" : "gray"
              }
              tags={execTags}
              onClick={() => openDrawer("execution")}
            />

            {/* Trade Plan card — shows real entry/SL/TP data */}
            {execution?.hasSetup && execution.entry != null ? (
              <button
                onClick={() => openDrawer("execution")}
                className="flex flex-col gap-2 border-t-2 border-t-violet-500/60 bg-[hsl(var(--card))] px-3 py-3 text-left transition-all hover:bg-white/[0.04] min-h-[140px]"
              >
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">Trade Plan</span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 flex-1">
                  {[
                    { label: "ENTRY", value: fmtPrice(execution.entry)    },
                    { label: "SL",    value: fmtPrice(execution.stopLoss) },
                    { label: "TP1",   value: fmtPrice(execution.tp1)      },
                    { label: "TP2",   value: fmtPrice(execution.tp2)      },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-mono text-zinc-700">{label}</span>
                      <span className="text-[12px] font-mono font-bold text-zinc-300">{value}</span>
                    </div>
                  ))}
                </div>
                {execution.rrRatio != null && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                    <span className="text-[9px] text-zinc-700 uppercase tracking-wider">Risk / Reward</span>
                    <span className="font-mono text-[13px] font-black text-violet-400">{execution.rrRatio.toFixed(2)}:1</span>
                  </div>
                )}
              </button>
            ) : (
              <div className="flex flex-col gap-2 border-t-2 border-t-zinc-700/20 bg-[hsl(var(--card))] px-3 py-3 min-h-[140px]">
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-700">Trade Plan</span>
                <span className="text-[10px] text-zinc-700 mt-1">No active execution plan.</span>
                <span className="text-[9px] text-zinc-800">Signal must reach ARMED state before executing.</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-3 border-t border-white/4 pt-2 text-[10px] text-zinc-700">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>{data.totalProcessingTime}ms</span>
            </div>
            {data.cached ? <span className="rounded bg-white/4 px-1.5 py-0.5 font-mono border border-white/5">CACHED</span> : null}
            <span className="ml-auto font-mono">{new Date(data.timestamp).toLocaleTimeString()}</span>
          </div>
        </>
      ) : null}

      {/* Drawer */}
      {data ? (
        <BrainOverviewDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          data={data}
          highlightAgentId={highlightId}
        />
      ) : null}
    </div>
  );
}
