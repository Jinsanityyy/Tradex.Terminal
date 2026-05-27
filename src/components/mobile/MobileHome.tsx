"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuotes, useMarketBias, useKeyLevels, useCatalysts, useMarketAnalysis, useAgentResult, useSessions, useMTFBias, useTrumpPosts } from "@/hooks/useMarketData";
import { useWebSocketPrices } from "@/hooks/useWebSocketPrices";
import { TrendingUp, TrendingDown, Minus, Target, Zap, RefreshCw, Sparkles, ChevronDown, ChevronUp, Brain, BarChart2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DetailModal } from "@/components/shared/DetailModal";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { mutate } from "swr";
import type { Catalyst } from "@/types";
import { useSettings } from "@/contexts/SettingsContext";
import { isAgentSupported, getSymbolLabel, getSymbolShort, SYMBOL_META, getCatalystImpactForSymbol } from "@/lib/assetImpact";
import { AssetChip, AssetSelectorSheet } from "@/components/mobile/AssetSelectorSheet";
import { MobileWidgetSheet, loadWidgetConfig, saveWidgetConfig } from "@/components/mobile/MobileWidgetSheet";
import type { WidgetConfig } from "@/components/mobile/MobileWidgetSheet";
import { MTFBiasPanel } from "@/components/shared/MTFBiasPanel";
import { KeyLevelsCard } from "@/components/shared/KeyLevelsCard";
import { LotCalculatorWidget } from "@/components/shared/LotCalculatorWidget";
import { TrumpFeedPanel } from "@/components/shared/TrumpFeedPanel";
import { AgentCardsWidget } from "@/components/brain/AgentCardsWidget";
import { LiveTVPanel } from "@/components/shared/LiveTVPanel";
import dynamic from "next/dynamic";
const GlobeClient = dynamic(() => import("@/components/globe/GlobeClient"), { ssr: false });
import { CommunityPanel } from "@/components/shared/CommunityPanel";
import { TakeTradeModal } from "@/components/shared/TakeTradeModal";
import { CloseTradeModal } from "@/components/shared/CloseTradeModal";
import { loadTradeLog, findOpenBySetup, discardTrade, type TakenSignal } from "@/lib/trades/trade-log";
import { playSignalArmed } from "@/lib/sounds";
import useSWR from "swr";
import type { DailyPnL, MonthlyPnL } from "@/app/api/pnl/route";
import { useRefreshCooldown } from "@/hooks/useRefreshCooldown";
import { useSubscription } from "@/hooks/useSubscription";

const pnlFetcher = (url: string) => fetch(url).then(r => r.json());

function MobilePnLWidget() {
  const { data } = useSWR<{ daily: DailyPnL[]; monthly: MonthlyPnL[] }>(
    "/api/pnl",
    pnlFetcher,
    { refreshInterval: 300_000 }
  );

  const now = new Date();
  const thisMonth = data?.monthly?.find(
    (m: MonthlyPnL) => m.year === now.getFullYear() && m.month === now.getMonth() + 1
  );
  const winRate = thisMonth && thisMonth.trades > 0
    ? Math.round((thisMonth.wins / thisMonth.trades) * 100)
    : 0;

  // Last 14 days bars
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0];
  });
  const dailyMap = new Map<string, number>(
    (data?.daily ?? []).map((d: DailyPnL): [string, number] => [d.date, d.pnl])
  );
  const vals: number[] = last14.map((d: string) => dailyMap.get(d) ?? 0);
  const maxAbs = Math.max(...vals.map((v: number) => Math.abs(v)), 1);

  return (
    <section key="pnl_calendar">
      <div className="bg-[hsl(var(--card))] rounded-xl border border-white/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div>
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-0.5">PnL Calendar</p>
            <p className="text-xs font-semibold text-zinc-300">
              {now.toLocaleString("default", { month: "long" })} {now.getFullYear()}
            </p>
          </div>
          <button
            onClick={() => {
              document.dispatchEvent(new CustomEvent("tradex:open-more", { detail: { appId: "pnl-calendar" } }));
            }}
            className="text-[10px] text-[hsl(var(--primary))] font-semibold border border-[hsl(var(--primary))]/30 px-2.5 py-1 rounded-lg active:opacity-70"
          >
            Open →
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-white/5">
          {[
            { label: "Net P&L", value: thisMonth
                ? `${thisMonth.pnl >= 0 ? "+" : ""}$${Math.abs(thisMonth.pnl) >= 1000 ? (thisMonth.pnl / 1000).toFixed(1) + "k" : thisMonth.pnl.toFixed(0)}`
                : "$0",
              color: !thisMonth || thisMonth.pnl === 0 ? "text-zinc-400" : thisMonth.pnl > 0 ? "text-emerald-400" : "text-red-400" },
            { label: "Win Rate", value: thisMonth?.trades ? `${winRate}%` : " - ",
              color: winRate >= 50 ? "text-emerald-400" : winRate > 0 ? "text-red-400" : "text-zinc-400" },
            { label: "Trades", value: thisMonth?.trades ?? 0, color: "text-zinc-200" },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-4 py-3 text-center">
              <p className="text-[8px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
              <p className={cn("text-sm font-bold font-mono", color)}>{value}</p>
            </div>
          ))}
        </div>

        {/* 14-day mini bar chart */}
        <div className="px-4 pb-3 pt-2">
          <p className="text-[8px] text-zinc-700 mb-1.5">Last 14 days</p>
          <div className="flex items-end gap-0.5 h-8">
            {vals.map((v, i) => {
              const pct = Math.abs(v) / maxAbs;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  {v !== 0
                    ? <div
                        className={cn("w-full rounded-sm min-h-[2px]", v > 0 ? "bg-emerald-500/70" : "bg-red-500/60")}
                        style={{ height: `${Math.max(pct * 100, 8)}%` }}
                      />
                    : <div className="w-full h-px bg-white/10" />
                  }
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveBadge() {
  return (
    <span className="flex items-center gap-1 text-[9px] font-medium text-[hsl(var(--primary))] uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
      Live
    </span>
  );
}

function PriceCard({ symbol, price, change, isActive, wsPrice }: {
  symbol: string;
  price: number | string;
  change?: number;
  isActive?: boolean;
  wsPrice?: number;
}) {
  const up = (change ?? 0) > 0;
  const down = (change ?? 0) < 0;
  const displayPrice = wsPrice ?? price;

  return (
    <div className={cn(
      "rounded-xl p-3.5 border transition-all",
      isActive
        ? "bg-[hsl(var(--primary))]/8 border-[hsl(var(--primary))]/35"
        : "bg-[hsl(var(--card))] border-white/5",
    )}>
      <p className={cn("text-[10px] uppercase tracking-widest mb-1", isActive ? "text-[hsl(var(--primary))]/70" : "text-[hsl(var(--muted-foreground))]")}>{symbol}</p>
      <p className="text-lg font-bold font-mono leading-tight text-[hsl(var(--foreground))]">
        {typeof displayPrice === "number"
          ? displayPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
          : displayPrice}
      </p>
      {change !== undefined && (
        <p className={cn("text-[10px] font-semibold mt-0.5", up ? "text-emerald-400" : down ? "text-red-400" : "text-[hsl(var(--muted-foreground))]")}>
          {up ? "+" : ""}{change.toFixed(2)}%
        </p>
      )}
    </div>
  );
}

export function MobileHome() {
  const { settings } = useSettings();
  const activeSymbol = isAgentSupported(settings.selectedSymbol ?? "XAUUSD")
    ? (settings.selectedSymbol as "XAUUSD" | "EURUSD" | "GBPUSD" | "BTCUSD")
    : "XAUUSD";

  const { quotes } = useQuotes();
  const { biasData } = useMarketBias();
  const { levels } = useKeyLevels();
  const { catalysts } = useCatalysts();
  const { narrative, sentiment, generateFresh } = useMarketAnalysis();
  const { result: agentData, refresh: refreshAgent } = useAgentResult(activeSymbol, "H1");
  const { sessions } = useSessions();
  const { mtfData, mtfLoading } = useMTFBias(activeSymbol);
  const { posts: trumpPosts } = useTrumpPosts();
  const [generating, setGenerating] = useState(false);
  const [selectedCatalyst, setSelectedCatalyst] = useState<Catalyst | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [biasModalOpen, setBiasModalOpen] = useState(false);
  const [widgetSheetOpen, setWidgetSheetOpen] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig[]>(() => loadWidgetConfig());
  const [tradeLog, setTradeLog] = useState<TakenSignal[]>([]);
  const [takingTrade, setTakingTrade] = useState(false);
  const [closingTrade, setClosingTrade] = useState<TakenSignal | null>(null);
  const containerRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLElement>;
  const [lastOutcome, setLastOutcome] = useState<{ status: string; pnlR?: number } | null>(null);

  useEffect(() => { setTradeLog(loadTradeLog()); }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/signals?symbol=${activeSymbol}&limit=10&period=7d`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (cancelled || !json) return;
        const resolved = (json.recent ?? []).find(
          (s: { status: string }) => ["win_tp1", "win_tp2", "loss_sl"].includes(s.status)
        );
        setLastOutcome(resolved
          ? { status: resolved.status, pnlR: resolved.outcome?.pnlR }
          : null
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeSymbol]);

  const symbolBiasLabel = getSymbolLabel(activeSymbol);
  const symbolBiasShort = getSymbolShort(activeSymbol);

  const DEFAULT_ASSETS = ["XAUUSD", "BTCUSD", "EURUSD", "USDJPY", "USOIL", "GBPUSD"];
  const keyAssets = settings.trackedAssets.length > 0
    ? settings.trackedAssets
    : DEFAULT_ASSETS;
  const displayQuotes = (() => {
    const matched = keyAssets.map((sym) => quotes.find((q) => q.symbol === sym)).filter(Boolean) as typeof quotes;
    // If nothing matched (e.g. stale localStorage with old format), fall back to defaults
    if (matched.length === 0 && quotes.length > 0) {
      return DEFAULT_ASSETS.map((sym) => quotes.find((q) => q.symbol === sym)).filter(Boolean) as typeof quotes;
    }
    return matched;
  })();

  // Stable symbol list so the WS hook doesn't re-subscribe on every render
  const wsSymbols = useMemo(
    () => displayQuotes.map((q) => q.symbol),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayQuotes.map((q) => q.symbol).join(",")]
  );
  const { prices: wsPrices } = useWebSocketPrices(wsSymbols);

  // Agent signal data  -  exec has signalState + entry/SL/TP
  const master = agentData?.agents?.master;
  const exec = agentData?.agents?.execution;
  const tradePlan = master?.tradePlan;

  // ── Live price recalculation ─────────────────────────────────────────────
  // Analysis is cached (up to 5 min). Use live price to compute real distance
  // so we never show a stale "0.17% from entry" when price has moved far away.
  // quotes uses "XAUUSD" format (no slash) — same as activeSymbol — so match directly.
  // Prefer WebSocket price (most real-time); fall back to REST quote price.
  const liveQuote = quotes.find(q => q.symbol === activeSymbol);
  const livePrice: number | null = wsPrices.get(activeSymbol) ?? liveQuote?.price ?? null;

  const liveDistanceToEntry = (livePrice != null && exec?.entry != null)
    ? parseFloat((Math.abs(livePrice - exec.entry) / exec.entry * 100).toFixed(2))
    : exec?.distanceToEntry ?? null;

  const liveSignalStateReason = (() => {
    if (!exec?.entry || livePrice == null) return exec?.signalStateReason;
    const dist = liveDistanceToEntry!;
    const p = exec.entry > 100 ? 1 : 4;
    const pricePastEntry = exec.direction === "long"
      ? livePrice > exec.entry
      : livePrice < exec.entry;
    if (pricePastEntry && dist > 0.3)
      return `Price already moved ${dist.toFixed(2)}% past entry. Do NOT chase — wait for next setup.`;
    if (dist <= 0.15)
      return `${exec.grade} setup — price is ${dist.toFixed(2)}% from entry. Confirm trigger and execute.`;
    if (dist <= 1.0)
      return `Price is ${dist.toFixed(2)}% from entry zone at ${exec.entry.toFixed(p)}. Wait for price to return before entering.`;
    return `Price is ${dist.toFixed(2)}% away from entry at ${exec.entry.toFixed(p)}. Monitor — no action yet.`;
  })();

  const liveSignalState = (() => {
    const isNoTrade = master?.finalBias === "no-trade" || !!master?.noTradeReason;
    if (isNoTrade || !exec?.hasSetup) return "NO_TRADE";
    if (liveDistanceToEntry == null) return exec?.signalState ?? "NO_TRADE";
    const dist = liveDistanceToEntry;
    const pricePastEntry = exec.direction === "long"
      ? (livePrice ?? 0) > (exec.entry ?? 0)
      : (livePrice ?? 0) < (exec.entry ?? 0);
    if (pricePastEntry && dist > 0.3) return "EXPIRED";
    if (dist <= 0.15) return "ARMED";
    return "PENDING";
  })();

  // If master agent says no-trade, honour it regardless of what the execution
  // agent computed — execution can find a B/B+ setup while master still vetoes.
  const signalState: string =
    master?.finalBias === "no-trade" || master?.noTradeReason
      ? "NO_TRADE"
      : liveSignalState;

  // Patch execution agent with live-computed signal state so the agent cards
  // and dots stay consistent with the top-level signal display.
  const patchedAgentData = agentData ? {
    ...agentData,
    agents: {
      ...agentData.agents,
      execution: agentData.agents?.execution ? {
        ...agentData.agents.execution,
        signalState: liveSignalState,
        distanceToEntry: liveDistanceToEntry ?? agentData.agents.execution.distanceToEntry,
        signalStateReason: liveSignalStateReason ?? agentData.agents.execution.signalStateReason,
      } : agentData.agents?.execution,
    },
  } : null;
  const finalBias = master?.finalBias ?? "neutral";

  // Entry/SL/TP  -  exec has live values, tradePlan has logged values
  const entry = exec?.entry ?? tradePlan?.entry ?? null;
  const stopLoss = exec?.stopLoss ?? tradePlan?.stopLoss ?? null;
  const tp1 = exec?.tp1 ?? tradePlan?.tp1 ?? null;
  const rrRatio = exec?.rrRatio ?? tradePlan?.rrRatio ?? null;
  const direction = exec?.direction ?? tradePlan?.direction ?? null;
  const trigger = exec?.trigger ?? tradePlan?.trigger ?? null;

  // Active session
  const activeSession = sessions.find(s => s.status === "active");

  // Bias for selected symbol — technical data for gold, agent consensus for others
  const BIAS_SEARCH: Record<string, string> = {
    XAUUSD: "gold", BTCUSD: "bitcoin", EURUSD: "euro", GBPUSD: "pound",
  };
  const techBias = biasData.find((b) => {
    const term = BIAS_SEARCH[activeSymbol];
    return term && b.asset?.toLowerCase().includes(term);
  });
  const activeBias = techBias
    ? { bias: techBias.bias, confidence: techBias.confidence }
    : master
      ? { bias: master.finalBias as string, confidence: master.confidence }
      : null;

  const { subscription } = useSubscription();
  const { isOnCooldown, countdownLabel, markRefreshed, dailyLeft, hasHitDailyLimit } = useRefreshCooldown(subscription.isPro);

  const divRef = useRef<HTMLDivElement>(null);

  // Play ARMED sound only when signal *transitions* to ARMED (not on first mount
  // with stale cached data — that would fire the chime every time the app opens).
  const lastArmedKeyRef  = useRef<string | null>(null);
  const prevSignalRef    = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevSignalRef.current;
    prevSignalRef.current = signalState;
    if (signalState !== "ARMED") return;
    if (prev === null) return; // skip initial render
    const key = `${activeSymbol}_${entry}`;
    if (key === lastArmedKeyRef.current) return;
    lastArmedKeyRef.current = key;
    playSignalArmed();
  }, [signalState, activeSymbol, entry]);

  const handleRefresh = useCallback(async () => {
    if (isOnCooldown) return;
    await Promise.all([
      mutate("/api/market/quotes"),
      mutate("/api/market/catalysts"),
      refreshAgent(),   // POST with forceRefresh: true → generates a fresh signal
    ]);
    markRefreshed();
  }, [isOnCooldown, markRefreshed, refreshAgent]);

  const { refreshing, pullDistance, THRESHOLD } = usePullToRefresh(handleRefresh, divRef as React.RefObject<HTMLElement>);


  async function handleGenerate() {
    setGenerating(true);
    try { await generateFresh(); } finally { setGenerating(false); }
  }

  function handleWidgetChange(config: WidgetConfig[]) {
    setWidgetConfig(config);
    saveWidgetConfig(config);
  }

  const signalColor = signalState === "ARMED" ? "text-emerald-400" : signalState === "PENDING" ? "text-amber-400" : "text-zinc-500";
  const signalBg = signalState === "ARMED" ? "bg-emerald-500/10 border-emerald-500/30" : signalState === "PENDING" ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/5";

  const isCrypto = SYMBOL_META[activeSymbol]?.group === "Crypto";
  const isWeekend = (() => { const d = new Date().getUTCDay(); return d === 0 || d === 6; })();

  const catalystImpact = catalysts[0]
    ? getCatalystImpactForSymbol(catalysts[0], activeSymbol)
    : null;

  const lastUpdated = agentData?.timestamp
    ? (() => {
        const diff = Math.floor((Date.now() - new Date(agentData.timestamp).getTime()) / 60000);
        return diff < 1 ? "just now" : `${diff}m ago`;
      })()
    : null;

  return (
    <>
    <AssetSelectorSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    <MobileWidgetSheet
      open={widgetSheetOpen}
      onClose={() => setWidgetSheetOpen(false)}
      config={widgetConfig}
      onChange={handleWidgetChange}
    />
    <div ref={divRef} className="overflow-y-auto h-full pb-6">
      {/* Pull to refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div className="flex items-center justify-center py-3 transition-all"
          style={{ height: refreshing ? 48 : Math.min(pullDistance * 0.5, 48) }}>
          {isOnCooldown
            ? <span className="text-[10px] text-zinc-500">{countdownLabel}</span>
            : <RefreshCw className={cn("h-4 w-4 text-[hsl(var(--primary))]", refreshing ? "animate-spin" : pullDistance >= THRESHOLD ? "text-emerald-400" : "")} />
          }
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-zinc-200">{symbolBiasLabel}</span>
          {lastUpdated && (
            <span className="text-[9px] text-zinc-600">· updated {lastUpdated}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOnCooldown && (
            <span className="flex items-center gap-1 text-[9px] font-mono text-amber-400/80 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
              <RefreshCw className="h-2.5 w-2.5" />
              {countdownLabel}
            </span>
          )}
          <button
            onClick={() => setWidgetSheetOpen(true)}
            className="p-1.5 rounded-lg text-zinc-600 active:text-zinc-300 active:bg-white/5"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <AssetChip onPress={() => setSheetOpen(true)} />
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* ── Persistent open trade banner (shows regardless of signal state) ── */}
        {(() => {
          const openTrade = tradeLog.find(t => t.status === "open" && t.symbol === activeSymbol);
          if (!openTrade) return null;
          const diffMs = Date.now() - new Date(openTrade.takenAt).getTime();
          const h = Math.floor(diffMs / 3_600_000);
          const m = Math.floor((diffMs % 3_600_000) / 60_000);
          const takenAgo = h > 0 ? `${h}h ${m}m ago` : `${m}m ago`;
          const isBuy = openTrade.direction === "BUY";
          return (
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-amber-500/70 uppercase tracking-wider font-bold">Open Trade · {takenAgo}</p>
                  <p className={cn("text-[12px] font-bold mt-0.5", isBuy ? "text-emerald-400" : "text-red-400")}>
                    {openTrade.direction} {openTrade.symbolDisplay}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-zinc-600">Entry</p>
                  <p className="text-[11px] font-mono text-zinc-300">
                    {openTrade.entry > 100 ? openTrade.entry.toFixed(2) : openTrade.entry.toFixed(4)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setClosingTrade(openTrade)}
                  className="flex-1 py-2 rounded-lg text-[11px] font-bold border border-amber-500/40 bg-amber-500/10 text-amber-400 active:bg-amber-500/20"
                >
                  Close Trade
                </button>
                <button
                  onClick={() => { discardTrade(openTrade.id); setTradeLog(loadTradeLog()); }}
                  className="px-3 py-2 rounded-lg text-[11px] border border-white/8 text-zinc-600 active:text-red-400"
                >
                  Discard
                </button>
              </div>
            </div>
          );
        })()}

        {widgetConfig.filter((w: WidgetConfig) => w.visible).map((w: WidgetConfig) => {
          switch (w.id) {
            case "signal_session":
              return (
                <div key="signal_session" className="grid grid-cols-2 gap-2">
                  {/* Signal State */}
                  <div className={cn("rounded-xl p-3.5 border", signalBg)}>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Signal</p>
                    <p className={cn("text-[13px] font-bold uppercase", signalColor)}>{signalState.replace("_", " ")}</p>
                    {direction && direction.toLowerCase() !== "none" && signalState !== "NO_TRADE" && (
                      <p className="text-[9px] text-zinc-600 mt-1 truncate">
                        {direction.toUpperCase()} · {trigger && trigger.toLowerCase() !== "none" ? trigger : " - "}
                      </p>
                    )}
                    {signalState === "NO_TRADE" && master?.noTradeReason && (
                      <p className="text-[9px] text-zinc-600 mt-1 leading-tight line-clamp-2">{master.noTradeReason}</p>
                    )}
                    {lastOutcome && (
                      <div className={cn(
                        "mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold",
                        lastOutcome.status === "loss_sl"
                          ? "bg-red-500/15 text-red-400"
                          : "bg-emerald-500/15 text-emerald-400"
                      )}>
                        {lastOutcome.status === "win_tp2" ? "TP2 ✅✅" :
                         lastOutcome.status === "win_tp1" ? "TP1 ✅"   : "SL ❌"}
                        {lastOutcome.pnlR != null && (
                          <span className="opacity-70 ml-0.5">
                            {lastOutcome.pnlR > 0 ? `+${lastOutcome.pnlR}R` : `${lastOutcome.pnlR}R`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Active Session */}
                  <div className="bg-[hsl(var(--card))] rounded-xl p-3.5 border border-white/5">
                    <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Session</p>
                    {isWeekend && !isCrypto ? (
                      <>
                        <p className="text-[13px] font-bold text-zinc-500">Market Closed</p>
                        <p className="text-[9px] text-zinc-700 mt-1">Reopens Monday</p>
                      </>
                    ) : activeSession ? (
                      <>
                        <p className="text-[13px] font-bold text-zinc-200">{activeSession.session}</p>
                        <span className={cn("text-[9px] font-bold uppercase",
                          activeSession.volatilityTone === "high" ? "text-red-400" :
                          activeSession.volatilityTone === "moderate" ? "text-amber-400" : "text-emerald-400")}>
                          {activeSession.volatilityTone} vol
                        </span>
                      </>
                    ) : isCrypto ? (
                      <>
                        <p className="text-[13px] font-bold text-emerald-400">24/7 Open</p>
                        <span className="text-[9px] font-bold uppercase text-emerald-600">Always active</span>
                      </>
                    ) : (
                      <>
                        <p className="text-[13px] font-bold text-zinc-500">Between</p>
                        <p className="text-[9px] text-zinc-700 mt-1">Sessions</p>
                      </>
                    )}
                  </div>
                </div>
              );

            case "entry_strip":
              return entry ? (
                <div key="entry_strip" className={cn("border rounded-xl px-4 py-3",
                  signalState === "ARMED"   ? "bg-emerald-500/8 border-emerald-500/25" :
                  signalState === "PENDING" ? "bg-amber-500/8 border-amber-500/25" :
                  "bg-white/5 border-white/10")}>
                  <p className={cn("text-[9px] uppercase tracking-wider mb-2",
                    signalState === "ARMED"   ? "text-emerald-500/70" :
                    signalState === "PENDING" ? "text-amber-500/70" :
                    "text-zinc-600")}>
                    {signalState === "ARMED" ? "⚡ Armed  -  Confirm trigger" :
                     signalState === "PENDING" ? "⏳ Pending  -  Waiting for entry" :
                     "Last Setup"}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Entry", value: entry > 100 ? entry.toFixed(2) : entry.toFixed(4), color: "text-zinc-100" },
                      { label: "SL",    value: stopLoss ? (stopLoss > 100 ? stopLoss.toFixed(2) : stopLoss.toFixed(4)) : " - ", color: "text-red-400" },
                      { label: "TP1",   value: tp1 ? (tp1 > 100 ? tp1.toFixed(2) : tp1.toFixed(4)) : " - ", color: "text-emerald-400" },
                      { label: "RR",    value: rrRatio ? `${rrRatio}:1` : " - ", color: "text-zinc-300" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="text-center">
                        <p className="text-[8px] text-zinc-600 mb-0.5">{label}</p>
                        <p className={cn("text-[11px] font-mono font-bold", color)}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {liveSignalStateReason && (
                    <p className="text-[10px] text-zinc-600 mt-2 leading-tight">{liveSignalStateReason}</p>
                  )}
                  {/* Take / Close trade buttons */}
                  {(() => {
                    if (!entry || !stopLoss || !tp1) return null;
                    const openTrade = findOpenBySetup(activeSymbol, entry, stopLoss);
                    if (openTrade) {
                      const takenAgo = (() => {
                        const diffMs = Date.now() - new Date(openTrade.takenAt).getTime();
                        const h = Math.floor(diffMs / 3_600_000);
                        const m = Math.floor((diffMs % 3_600_000) / 60_000);
                        return h > 0 ? `${h}h ${m}m ago` : `${m}m ago`;
                      })();
                      return (
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between px-0.5">
                            <span className="text-[9px] text-zinc-500">
                              Open @ <span className="font-mono text-zinc-400">{openTrade.entry > 100 ? openTrade.entry.toFixed(2) : openTrade.entry.toFixed(4)}</span>
                              {" · "}{openTrade.direction}{" · "}{takenAgo}
                            </span>
                            <button
                              onClick={() => { discardTrade(openTrade.id); setTradeLog(loadTradeLog()); }}
                              className="text-[9px] text-zinc-600 hover:text-red-400 transition-colors px-1 py-0.5"
                            >
                              Discard ×
                            </button>
                          </div>
                          <button
                            onClick={() => setClosingTrade(openTrade)}
                            className="w-full py-2 rounded-lg text-[11px] font-bold border border-amber-500/40 bg-amber-500/10 text-amber-400 active:bg-amber-500/20"
                          >
                            Close Trade
                          </button>
                        </div>
                      );
                    }
                    if (signalState === "ARMED" || signalState === "PENDING") {
                      return (
                        <button
                          onClick={() => setTakingTrade(true)}
                          className="mt-3 w-full py-2 rounded-lg text-[11px] font-bold border border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] active:bg-[hsl(var(--primary))]/20"
                        >
                          + Take Trade
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : null;

            case "top_catalyst":
              return (catalysts[0] && catalystImpact) ? (
                <div key="top_catalyst" onClick={() => setSelectedCatalyst(catalysts[0])}
                  className="bg-[hsl(var(--card))] rounded-xl px-4 py-3 border border-white/5 active:bg-[hsl(var(--secondary))] cursor-pointer">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <p className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Top Catalyst</p>
                      <p className="text-xs text-zinc-200 leading-snug">{catalysts[0].title}</p>
                    </div>
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-4",
                      catalysts[0].importance === "high" ? "bg-red-500/15 text-red-400" :
                      catalysts[0].importance === "medium" ? "bg-amber-500/15 text-amber-400" :
                      "bg-zinc-500/15 text-zinc-400")}>
                      {catalysts[0].importance?.toUpperCase()}
                    </span>
                  </div>
                  <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded",
                    catalystImpact.impact === "bullish" ? "bg-emerald-500/15 text-emerald-400" :
                    catalystImpact.impact === "bearish" ? "bg-red-500/15 text-red-400" :
                    "bg-zinc-500/15 text-zinc-400")}>
                    {symbolBiasShort} {catalystImpact.impact.toUpperCase()}
                  </span>
                </div>
              ) : null;

            case "live_prices":
              return (
                <section key="live_prices">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Live Prices</span>
                    <LiveBadge />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {displayQuotes.length > 0
                      ? displayQuotes.map((q) => <PriceCard key={q.symbol} symbol={q.symbol} price={q.price} change={q.changePercent} isActive={q.symbol === activeSymbol} wsPrice={wsPrices.get(q.symbol)} />)
                      : Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-[hsl(var(--card))] rounded-xl p-3.5 border border-white/5 h-[70px] animate-pulse" />)
                    }
                  </div>
                </section>
              );

            case "asset_bias":
              return activeBias ? (
                <section key="asset_bias">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3">{symbolBiasLabel} Bias</p>
                  <div
                    className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5 cursor-pointer active:opacity-75"
                    onClick={() => setBiasModalOpen(true)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold">{symbolBiasShort}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold px-3 py-1 rounded-full",
                          activeBias.bias === "bullish" ? "bg-emerald-500/15 text-emerald-400" :
                          activeBias.bias === "bearish" ? "bg-red-500/15 text-red-400" : "bg-zinc-500/15 text-zinc-400")}>
                          {activeBias.bias?.toUpperCase()}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
                      </div>
                    </div>
                    <div className="flex justify-between text-[9px] text-zinc-600 mb-1.5">
                      <span>Conviction</span><span>{activeBias.confidence}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5">
                      <div className={cn("h-full rounded-full", activeBias.bias === "bullish" ? "bg-emerald-400" : activeBias.bias === "bearish" ? "bg-red-400" : "bg-zinc-400")}
                        style={{ width: `${activeBias.confidence}%` }} />
                    </div>
                  </div>
                </section>
              ) : null;

            case "mtf_bias":
              return (
                <section key="mtf_bias">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3">MTF Bias</p>
                  <MTFBiasPanel data={mtfData ?? undefined} isLoading={mtfLoading} />
                </section>
              );

            case "key_levels":
              return levels.length > 0 ? (
                <section key="key_levels">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3">Key Levels</p>
                  <KeyLevelsCard levels={levels} compact />
                </section>
              ) : null;

            case "ai_analysis":
              return (
                <section key="ai_analysis">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider">AI Analysis</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          if (isOnCooldown || hasHitDailyLimit) return;
                          setGenerating(true);
                          try { await generateFresh(); markRefreshed(); }
                          finally { setGenerating(false); }
                        }}
                        disabled={generating || isOnCooldown || hasHitDailyLimit}
                        className="flex items-center gap-1 text-[9px] text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30 px-2 py-1 rounded-lg disabled:opacity-40"
                      >
                        {generating ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                        {generating ? "…" : isOnCooldown ? countdownLabel! : hasHitDailyLimit ? "0 left" : !subscription.isPro ? `${dailyLeft} left` : "Refresh"}
                      </button>
                    </div>
                  </div>
                  <div
                    className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5 space-y-2 cursor-pointer active:opacity-80"
                    onClick={() => setAiExpanded((v: boolean) => !v)}
                  >
                    {narrative.regime && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Regime</span>
                          <span className="text-[10px] font-semibold text-amber-400">{narrative.regime}</span>
                        </div>
                        {aiExpanded
                          ? <ChevronUp className="h-3 w-3 text-zinc-600" />
                          : <ChevronDown className="h-3 w-3 text-zinc-600" />}
                      </div>
                    )}
                    {narrative.summary && (
                      <p className={cn("text-xs text-zinc-400 leading-relaxed", !aiExpanded && "line-clamp-2")}>
                        {narrative.summary}
                      </p>
                    )}
                  </div>
                </section>
              );

            case "more_catalysts":
              return catalysts.length > 1 ? (
                <section key="more_catalysts">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3">More Catalysts</p>
                  <div className="space-y-2">
                    {catalysts.slice(1, 4).map((c, i) => (
                      <div key={i} onClick={() => setSelectedCatalyst(c)}
                        className="bg-[hsl(var(--card))] rounded-xl px-4 py-3 border border-white/5 active:bg-[hsl(var(--secondary))] cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-zinc-200 leading-snug flex-1">{c.title}</p>
                          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0",
                            c.importance === "high" ? "bg-red-500/15 text-red-400" :
                            c.importance === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-zinc-500/15 text-zinc-400")}>
                            {c.importance?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null;

            case "trump_feed":
              return (
                <section key="trump_feed">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3">Trump Impact</p>
                  <TrumpFeedPanel posts={trumpPosts} compact />
                </section>
              );

            case "agents": {
              const ad = patchedAgentData?.agents;
              const mTone = (b?: string) =>
                b === "bullish" || b === "valid" ? "green" :
                b === "bearish" || b === "blocked" ? "red" :
                b === "opposing" || b === "no-trade" ? "yellow" : "gray";
              const agentDots: { id: string; tone: string }[] = [
                { id: "TR", tone: mTone(ad?.trend?.bias) },
                { id: "PA", tone: mTone(ad?.smc?.bias) },
                { id: "NW", tone: mTone(ad?.news?.impact) },
                { id: "RG", tone: ad?.risk ? (ad.risk.valid ? "green" : "red") : "gray" },
                { id: "CT", tone: ad?.contrarian?.challengesBias ? "red" : "gray" },
                { id: "EX", tone: ad?.execution?.direction === "long" ? "green" : ad?.execution?.direction === "short" ? "red" : ad?.execution?.signalState === "ARMED" ? "yellow" : "gray" },
                { id: "MA", tone: mTone(ad?.master?.finalBias) },
              ];
              return (
                <section key="agents">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wider">7-Agent Overview</p>
                    {agentData && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        {agentDots.map(({ id, tone }) => {
                          const dotCls =
                            tone === "green"  ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]" :
                            tone === "red"    ? "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.7)]"      :
                            tone === "yellow" ? "bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.5)]"   :
                                               "bg-zinc-700";
                          return (
                            <div key={id} className="flex flex-col items-center gap-0.5">
                              <div className={cn("h-1.5 w-1.5 rounded-full", dotCls)} />
                              <span className="font-mono text-[6px] text-zinc-800">{id}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex-1 border-t border-white/[0.04]" />
                  </div>
                  <AgentCardsWidget
                    data={patchedAgentData ?? undefined}
                    isLoading={!agentData}
                    visibleAgents={new Set(["trend", "smc", "news", "risk", "contrarian", "execution", "master"])}
                  />
                </section>
              );
            }

            case "globe":
              return (
                <section key="globe">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3">TradeX Globe</p>
                  <div className="rounded-xl overflow-hidden border border-white/5" style={{ height: 340 }}>
                    <GlobeClient embedded />
                  </div>
                </section>
              );

            case "live_tv":
              return (
                <section key="live_tv">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3">Live TV</p>
                  <LiveTVPanel showHeader={false} showFooterNote={false} />
                </section>
              );

            case "community":
              return (
                <section key="community">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3">Community</p>
                  <CommunityPanel />
                </section>
              );

            case "lot_calculator":
              return (
                <section key="lot_calculator">
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-3">Lot Calculator</p>
                  <LotCalculatorWidget />
                </section>
              );

            case "pnl_calendar":
              return <MobilePnLWidget key="pnl_calendar" />;

            default:
              return null;
          }
        })}
      </div>

      {/* Bias Detail Modal */}
      <DetailModal open={biasModalOpen} onClose={() => setBiasModalOpen(false)} title={`${symbolBiasLabel} Bias Analysis`}>
        {activeBias && (
          <div className="space-y-4">
            {/* Conviction header */}
            <div className={cn("rounded-xl p-4 border",
              activeBias.bias === "bullish" ? "bg-emerald-500/8 border-emerald-500/20" :
              activeBias.bias === "bearish" ? "bg-red-500/8 border-red-500/20" :
              "bg-zinc-800/50 border-zinc-700/30")}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-zinc-100">{symbolBiasShort}</span>
                <span className={cn("text-[11px] font-bold px-3 py-1 rounded-full",
                  activeBias.bias === "bullish" ? "bg-emerald-500/20 text-emerald-300" :
                  activeBias.bias === "bearish" ? "bg-red-500/20 text-red-300" :
                  "bg-zinc-700 text-zinc-400")}>
                  {activeBias.bias?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 mb-2">
                <span>Conviction</span><span className="font-mono font-bold text-zinc-300">{activeBias.confidence}%</span>
              </div>
              <div className="h-2 rounded-full bg-black/30">
                <div className={cn("h-full rounded-full transition-all", activeBias.bias === "bullish" ? "bg-emerald-400" : activeBias.bias === "bearish" ? "bg-red-400" : "bg-zinc-500")}
                  style={{ width: `${activeBias.confidence}%` }} />
              </div>
              <p className="text-[10px] text-zinc-600 mt-2">
                {activeBias.confidence >= 70 ? "High conviction — strong directional alignment across factors." :
                 activeBias.confidence >= 50 ? "Moderate conviction — majority of factors align but some uncertainty remains." :
                 "Low conviction — mixed signals, trade with reduced size or wait for confirmation."}
              </p>
            </div>

            {/* Supporting factors */}
            {(techBias?.supportingFactors?.length || master?.supports?.length) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70 mb-2">Supporting Factors</p>
                <div className="space-y-1.5">
                  {(techBias?.supportingFactors ?? master?.supports ?? []).map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 shrink-0 mt-0.5 text-[11px]">✓</span>
                      <p className="text-[11px] text-zinc-300 leading-snug">{f}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invalidation factors */}
            {(techBias?.invalidationFactors?.length || master?.invalidations?.length) && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-500/70 mb-2">Invalidation — Watch For</p>
                <div className="space-y-1.5">
                  {(techBias?.invalidationFactors ?? master?.invalidations ?? []).map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-red-500 shrink-0 mt-0.5 text-[11px]">✕</span>
                      <p className="text-[11px] text-zinc-300 leading-snug">{f}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key levels from technical data */}
            {techBias?.keyLevels && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[hsl(var(--secondary))] p-3 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1">Support</p>
                  <p className="text-sm font-bold font-mono text-emerald-400">{techBias.keyLevels.support}</p>
                </div>
                <div className="rounded-lg bg-[hsl(var(--secondary))] p-3 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1">Resistance</p>
                  <p className="text-sm font-bold font-mono text-red-400">{techBias.keyLevels.resistance}</p>
                </div>
              </div>
            )}

            {/* Session behavior */}
            {techBias?.sessionBehavior && (
              <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Session Behavior</p>
                <p className="text-[11px] text-zinc-300 leading-relaxed">{techBias.sessionBehavior}</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      <DetailModal open={!!selectedCatalyst} onClose={() => setSelectedCatalyst(null)} title={selectedCatalyst?.title}>
        {selectedCatalyst && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
                selectedCatalyst.importance === "high" ? "bg-red-500/15 text-red-400" :
                selectedCatalyst.importance === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-zinc-500/15 text-zinc-400")}>
                {selectedCatalyst.importance}
              </span>
            </div>
            <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--primary))] mb-1.5">Why It Matters</p>
              <p className="text-xs leading-relaxed">{selectedCatalyst.explanation}</p>
            </div>
            {selectedCatalyst.affectedMarkets?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedCatalyst.affectedMarkets.map((m: string) => (
                  <span key={m} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-zinc-400">{m}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Take Trade Modal */}
      {takingTrade && entry && stopLoss && tp1 && rrRatio && direction && (
        <TakeTradeModal
          symbol={activeSymbol}
          symbolDisplay={getSymbolLabel(activeSymbol)}
          direction={finalBias === "bearish" ? "SELL" : "BUY"}
          entry={entry}
          stopLoss={stopLoss}
          tp1={tp1}
          tp2={exec?.tp2 ?? tradePlan?.tp2 ?? null}
          rrRatio={rrRatio}
          timeframe="H1"
          onClose={() => setTakingTrade(false)}
          onTaken={() => { setTradeLog(loadTradeLog()); setTakingTrade(false); }}
        />
      )}

      {/* Close Trade Modal */}
      {closingTrade && (
        <CloseTradeModal
          trade={closingTrade}
          onClose={() => setClosingTrade(null)}
          onClosed={() => { setTradeLog(loadTradeLog()); setClosingTrade(null); }}
        />
      )}
    </div>
    </>
  );
}
