"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuotes, useMarketBias, useKeyLevels, useCatalysts, useMarketAnalysis, useAgentResult, useSessions, useMTFBias, useTrumpPosts, useLastSignal } from "@/hooks/useMarketData";
import { useWebSocketPrices } from "@/hooks/useWebSocketPrices";
import { TrendingUp, TrendingDown, Minus, Target, Zap, RefreshCw, Sparkles, ChevronDown, ChevronUp, Brain, BarChart2, Settings2 } from "lucide-react";
import { TerminalSectionHeader, TerminalBadge, TerminalDataRow, SegmentedBar } from "@/components/shared/TerminalUI";
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
import { InstitutionalConfluence } from "@/components/shared/InstitutionalConfluence";
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E24]">
          <div>
            <p className="text-[9px] text-[#6B6B7A] uppercase mb-0.5"
              style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace", letterSpacing: "1.2px" }}>
              PNL CALENDAR
            </p>
            <p className="text-[11px] font-bold text-[#E8E8E8]"
              style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
              {now.toLocaleString("default", { month: "long" }).toUpperCase()} {now.getFullYear()}
            </p>
          </div>
          <button
            onClick={() => {
              document.dispatchEvent(new CustomEvent("tradex:open-more", { detail: { appId: "pnl-calendar" } }));
            }}
            className="text-[9px] t-accent border border-t-accent-30 px-2.5 py-1 rounded-[2px] active:opacity-70"
            style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}
          >
            OPEN →
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-[#1E1E24]">
          {[
            { label: "NET P&L", value: thisMonth
                ? `${thisMonth.pnl >= 0 ? "+" : ""}$${Math.abs(thisMonth.pnl) >= 1000 ? (thisMonth.pnl / 1000).toFixed(1) + "k" : thisMonth.pnl.toFixed(0)}`
                : "$0",
              color: !thisMonth || thisMonth.pnl === 0 ? "text-[#6B6B7A]" : thisMonth.pnl > 0 ? "text-[#00C853]" : "text-[#FF3D3D]" },
            { label: "WIN RATE", value: thisMonth?.trades ? `${winRate}%` : "—",
              color: winRate >= 50 ? "text-[#00C853]" : winRate > 0 ? "text-[#FF3D3D]" : "text-[#6B6B7A]" },
            { label: "TRADES", value: thisMonth?.trades ?? 0, color: "text-[#E8E8E8]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-4 py-3 text-center">
              <p className="text-[8px] text-[#6B6B7A] uppercase mb-1"
                style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace", letterSpacing: "1.2px" }}>
                {label}
              </p>
              <p className={cn("text-sm font-bold tabular-nums", color)}
                style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                {value}
              </p>
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
    <span className="flex items-center gap-1 text-[9px] t-accent uppercase tracking-wider"
      style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
      <span className="w-1.5 h-1.5 rounded-[1px] pulse-accent" />
      Live
    </span>
  );
}

function PriceCard({ symbol, price, change, isActive }: { symbol: string; price: number | string; change?: number; isActive?: boolean }) {
  const up = (change ?? 0) > 0;
  const down = (change ?? 0) < 0;
  return (
    <div className={cn(
      "p-3.5 border transition-all rounded-[2px]",
      isActive ? "bg-t-accent-8 border-t-accent-35" : "bg-[hsl(var(--card))] border-[hsl(var(--border))]"
    )}>
      <p className={cn("text-[10px] uppercase mb-1", isActive ? "t-accent-70" : "text-[hsl(var(--muted-foreground))]")}
        style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace", letterSpacing: "1.2px" }}>
        {symbol}
      </p>
      <p className="text-lg font-bold text-[#E8E8E8] leading-tight tabular-nums"
        style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
        {typeof price === "number" ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : price}
      </p>
      {change !== undefined && (
        <p className={cn("text-[10px] font-semibold mt-0.5 tabular-nums", up ? "text-[#00C853]" : down ? "text-[#FF3D3D]" : "text-[#6B6B7A]")}
          style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
          {up ? "▲" : down ? "▼" : ""}{Math.abs(change).toFixed(2)}%
        </p>
      )}
    </div>
  );
}

const DEFAULT_ASSETS = ["XAUUSD", "BTCUSD", "EURUSD", "USDJPY", "USOIL", "GBPUSD"];

export function MobileHome() {
  const { settings } = useSettings();
  const activeSymbol = isAgentSupported(settings.selectedSymbol ?? "XAUUSD")
    ? (settings.selectedSymbol as "XAUUSD" | "EURUSD" | "GBPUSD" | "BTCUSD")
    : "XAUUSD";

  const { quotes } = useQuotes();

  const keyAssets = useMemo(
    () => settings.trackedAssets.length > 0 ? settings.trackedAssets : DEFAULT_ASSETS,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.trackedAssets.join(",")]
  );

  // Subscribe only to displayed symbols — routes everything through Finnhub WSS (port 443)
  // including BTC via BINANCE:BTCUSDT proxy. Uses FINNHUB_API_KEY server-side (no NEXT_PUBLIC_).
  const { prices: wsPrices } = useWebSocketPrices(keyAssets);

  // Merge WebSocket per-tick prices on top of SWR quotes (% change still from SWR prev close)
  const liveQuotes = useMemo(() => {
    if (wsPrices.size === 0) return quotes;
    return quotes.map(q => {
      const lp = wsPrices.get(q.symbol);
      if (!lp) return q;
      const prevClose = q.changePercent != null && q.price > 0
        ? q.price / (1 + q.changePercent / 100)
        : q.price;
      const newChange = prevClose > 0 ? ((lp - prevClose) / prevClose) * 100 : q.changePercent;
      return { ...q, price: lp, changePercent: newChange };
    });
  }, [quotes, wsPrices]);

  const { biasData } = useMarketBias();
  const { levels } = useKeyLevels();
  const { catalysts } = useCatalysts();
  const { narrative, sentiment, generateFresh } = useMarketAnalysis();
  const { result: agentData, isLoading: agentLoading, error: agentError, refresh: refreshAgent } = useAgentResult(activeSymbol, "H1");
  const { sessions } = useSessions();
  const { mtfData, mtfLoading } = useMTFBias(activeSymbol);
  const { posts: trumpPosts } = useTrumpPosts();
  const { isWin: lastSignalWin, isLoss: lastSignalLoss } = useLastSignal(activeSymbol);
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

  useEffect(() => { setTradeLog(loadTradeLog()); }, []);

  const symbolBiasLabel = getSymbolLabel(activeSymbol);
  const symbolBiasShort = getSymbolShort(activeSymbol);

  const displayQuotes = useMemo(() => {
    const matched = keyAssets.map((sym) => liveQuotes.find((q) => q.symbol === sym)).filter(Boolean) as typeof quotes;
    if (matched.length === 0 && liveQuotes.length > 0) {
      return DEFAULT_ASSETS.map((sym) => liveQuotes.find((q) => q.symbol === sym)).filter(Boolean) as typeof quotes;
    }
    return matched;
  }, [keyAssets, liveQuotes]);

  // Agent signal data  -  exec has signalState + entry/SL/TP
  const master = agentData?.agents?.master;
  const exec = agentData?.agents?.execution;
  const tradePlan = master?.tradePlan;
  // If master agent says no-trade, honour it regardless of what the execution
  // agent computed — execution can find a B/B+ setup while master still vetoes.
  const signalState: string =
    master?.finalBias === "no-trade" || master?.noTradeReason
      ? "NO_TRADE"
      : exec?.signalState ?? "NO_TRADE";
  const finalBias = master?.finalBias ?? "neutral";

  const isCrypto = SYMBOL_META[activeSymbol]?.group === "Crypto";
  const isWeekend = (() => { const d = new Date().getUTCDay(); return d === 0 || d === 6; })();
  // Suppress ARMED/PENDING when market is closed — agent data is stale from last week
  const effectiveSignalState = (isWeekend && !isCrypto && (signalState === "ARMED" || signalState === "PENDING"))
    ? "NO_TRADE"
    : signalState;

  // Entry/SL/TP  -  exec has live values, tradePlan has logged values
  const liveEntry    = exec?.entry    ?? tradePlan?.entry    ?? null;
  const liveStopLoss = exec?.stopLoss ?? tradePlan?.stopLoss ?? null;
  const liveTp1      = exec?.tp1      ?? tradePlan?.tp1      ?? null;
  const liveRrRatio  = exec?.rrRatio  ?? tradePlan?.rrRatio  ?? null;
  const liveDirection = exec?.direction ?? tradePlan?.direction ?? null;
  const liveTrigger   = exec?.trigger   ?? tradePlan?.trigger   ?? null;

  // Persist last known setup per symbol so "Last Setup" survives a NO_TRADE refresh
  const lastSetupKey = `tradex_last_setup_${activeSymbol}`;
  useEffect(() => {
    if (!liveEntry || !liveStopLoss || !liveTp1) return;
    try {
      localStorage.setItem(lastSetupKey, JSON.stringify({
        entry: liveEntry, stopLoss: liveStopLoss, tp1: liveTp1,
        rrRatio: liveRrRatio, direction: liveDirection, trigger: liveTrigger,
      }));
    } catch {}
  }, [liveEntry, liveStopLoss, liveTp1, liveRrRatio, liveDirection, liveTrigger, lastSetupKey]);

  const cachedSetup = (() => {
    try { return JSON.parse(localStorage.getItem(lastSetupKey) ?? "null"); } catch { return null; }
  })();

  // Open trade for active symbol
  const openTrade = tradeLog.find(t => t.status === "open" && t.symbol === activeSymbol);
  // Most recent trade (open OR closed) — for Last Setup fallback when analysis has no setup
  const recentTrade = tradeLog.find(t => t.symbol === activeSymbol);

  const entry     = liveEntry    ?? cachedSetup?.entry    ?? recentTrade?.entry    ?? null;
  const stopLoss  = liveStopLoss ?? cachedSetup?.stopLoss ?? recentTrade?.stopLoss ?? null;
  const tp1       = liveTp1      ?? cachedSetup?.tp1      ?? recentTrade?.tp1      ?? null;
  const rrRatio   = liveRrRatio  ?? cachedSetup?.rrRatio  ?? recentTrade?.rrRatio  ?? null;
  const direction = liveDirection ?? cachedSetup?.direction ?? (recentTrade ? (recentTrade.direction === "BUY" ? "long" : "short") : null);
  const trigger   = liveTrigger  ?? cachedSetup?.trigger  ?? null;

  // Use liveQuotes (same source as ticker) for consistency — avoids stale WS reads
  const livePrice: number | null = liveQuotes.find(q => q.symbol === activeSymbol)?.price ?? null;

  // True when the cached last-setup SL was breached by live price before the trade
  // was ever entered (no DB record exists, so useLastSignal returns nothing).
  const slBreachedBeforeEntry = !!(
    stopLoss && livePrice && direction &&
    !lastSignalWin && !lastSignalLoss &&
    (direction === "long" ? livePrice <= stopLoss : livePrice >= stopLoss)
  );

  const hitBadge: { label: string; className: string } | null =
    lastSignalWin        ? { label: "TP1 HIT ✅",     className: "bg-[#00C853]/15 text-[#00C853]" } :
    lastSignalLoss       ? { label: "SL HIT ❌",       className: "bg-red-500/15 text-red-400" } :
    slBreachedBeforeEntry ? { label: "SL BREACHED ❌", className: "bg-red-500/15 text-red-400" } :
    null;

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
    prevSignalRef.current = effectiveSignalState;
    if (effectiveSignalState !== "ARMED") return;
    if (prev === null) return; // skip initial render
    const key = `${activeSymbol}_${entry}`;
    if (key === lastArmedKeyRef.current) return;
    lastArmedKeyRef.current = key;
    playSignalArmed();
  }, [effectiveSignalState, activeSymbol, entry]);

  const handleRefresh = useCallback(async () => {
    // Always refresh quotes/catalysts so pull-to-refresh gives visible feedback
    await Promise.all([
      mutate("/api/market/quotes").catch(() => {}),
      mutate("/api/market/catalysts").catch(() => {}),
    ]);
    if (isOnCooldown) return;
    await refreshAgent().catch(() => {});
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

  const signalColor = effectiveSignalState === "ARMED" ? "text-[#00C853]" : effectiveSignalState === "PENDING" ? "t-accent" : "text-[#3A3A45]";
  const signalBg = effectiveSignalState === "ARMED" ? "bg-[#00C853]/8 border-[#00C853]/25" : effectiveSignalState === "PENDING" ? "bg-t-accent-8 border-t-accent-25" : "bg-[hsl(var(--card))] border-[hsl(var(--border))]";

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
            <span className="flex items-center gap-1 text-[9px] font-mono t-accent-80 bg-t-accent-10 border border-t-accent-20 px-2 py-0.5 rounded-[2px]">
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
            <div className="border border-t-accent-25 bg-t-accent-5 rounded-[2px] px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] t-accent-70 uppercase tracking-wider" style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace", letterSpacing: "1.2px" }}>OPEN TRADE · {takenAgo}</p>
                  <p className={cn("text-[12px] font-bold mt-0.5", isBuy ? "text-[#00C853]" : "text-[#FF3D3D]")}
                    style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                    {openTrade.direction} {openTrade.symbolDisplay}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-[#6B6B7A]" style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace", letterSpacing: "1.2px" }}>ENTRY</p>
                  <p className="text-[11px] text-[#E8E8E8] tabular-nums" style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                    {openTrade.entry > 100 ? openTrade.entry.toFixed(2) : openTrade.entry.toFixed(4)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setClosingTrade(openTrade)}
                  className="flex-1 py-2 rounded-[2px] text-[11px] font-bold border border-t-accent-40 bg-t-accent-10 t-accent"
                  style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}
                >
                  CLOSE TRADE
                </button>
                <button
                  onClick={() => { discardTrade(openTrade.id); setTradeLog(loadTradeLog()); }}
                  className="px-3 py-2 rounded-[2px] text-[11px] border border-[#1E1E24] text-[#6B6B7A] active:text-[#FF3D3D]"
                  style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}
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
                  <div className={cn("rounded-[2px] p-3.5 border", signalBg)}>
                    <p className="text-[9px] text-[#6B6B7A] uppercase mb-1"
                      style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace", letterSpacing: "1.2px" }}>
                      Signal
                    </p>
                    <div className="mb-1">
                      <TerminalBadge
                        label={effectiveSignalState.replace("_", " ")}
                        variant={
                          effectiveSignalState === "ARMED" ? "armed" :
                          effectiveSignalState === "PENDING" ? "pending" :
                          "no-trade"
                        }
                      />
                    </div>
                    {direction && direction.toLowerCase() !== "none" && effectiveSignalState !== "NO_TRADE" && (
                      <p className="text-[9px] text-[#6B6B7A] mt-1 truncate"
                        style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                        {direction.toUpperCase()} · {trigger && trigger.toLowerCase() !== "none" ? trigger : "—"}
                      </p>
                    )}
                    {signalState === "NO_TRADE" && master?.noTradeReason && (
                      <p className="text-[9px] text-[#6B6B7A] mt-1 leading-tight line-clamp-2"
                        style={{ fontFamily: "var(--font-dm-sans),system-ui,sans-serif" }}>
                        {master.noTradeReason}
                      </p>
                    )}
                  </div>

                  {/* Active Session */}
                  <div className="bg-[#141418] rounded-[2px] p-3.5 border border-[#1E1E24]">
                    <p className="text-[9px] text-[#6B6B7A] uppercase mb-1"
                      style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace", letterSpacing: "1.2px" }}>
                      Session
                    </p>
                    {isWeekend && !isCrypto ? (
                      <>
                        <p className="text-[13px] font-bold text-[#3A3A45]"
                          style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                          CLOSED
                        </p>
                        <p className="text-[9px] text-[#3A3A45] mt-1"
                          style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                          REOPENS MON
                        </p>
                      </>
                    ) : activeSession ? (
                      <>
                        <p className="text-[13px] font-bold text-[#E8E8E8]"
                          style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                          {activeSession.session}
                        </p>
                        <span className={cn("text-[9px] font-bold uppercase",
                          activeSession.volatilityTone === "high" ? "text-[#FF3D3D]" :
                          activeSession.volatilityTone === "moderate" ? "t-accent" : "text-[#00C853]")}
                          style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                          {activeSession.volatilityTone} VOL
                        </span>
                      </>
                    ) : isCrypto ? (
                      <>
                        <p className="text-[13px] font-bold text-[#00C853]"
                          style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                          24/7
                        </p>
                        <span className="text-[9px] font-bold uppercase text-[#00C853]/60"
                          style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                          ALWAYS ACTIVE
                        </span>
                      </>
                    ) : (
                      <>
                        <p className="text-[13px] font-bold text-[#3A3A45]"
                          style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                          BETWEEN
                        </p>
                        <p className="text-[9px] text-[#3A3A45] mt-1"
                          style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                          SESSIONS
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );

            case "entry_strip":
              return entry ? (
                <div key="entry_strip" className={cn("border rounded-[2px] px-4 py-3",
                  effectiveSignalState === "ARMED"   ? "bg-[#00C853]/5 border-[#00C853]/20" :
                  effectiveSignalState === "PENDING" ? "bg-t-accent-5 border-t-accent-20" :
                  "bg-[#141418] border-[#1E1E24]")}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TerminalBadge
                        label={
                          effectiveSignalState === "ARMED" ? "ARMED" :
                          effectiveSignalState === "PENDING" ? "PENDING" :
                          "LAST SETUP"
                        }
                        variant={
                          effectiveSignalState === "ARMED" ? "armed" :
                          effectiveSignalState === "PENDING" ? "pending" :
                          "default"
                        }
                      />
                      {finalBias && finalBias !== "no-trade" && (
                        <TerminalBadge
                          label={finalBias.toUpperCase()}
                          variant={finalBias === "bullish" ? "bullish" : finalBias === "bearish" ? "bearish" : "neutral"}
                        />
                      )}
                    </div>
                    {hitBadge && effectiveSignalState !== "ARMED" && effectiveSignalState !== "PENDING" && (
                      <TerminalBadge
                        label={hitBadge.label.replace(" ✅","").replace(" ❌","")}
                        variant={hitBadge.label.includes("HIT ✅") ? "bullish" : "bearish"}
                      />
                    )}
                  </div>
                  <div className="space-y-0">
                    <TerminalDataRow
                      label="ENTRY"
                      value={entry > 100 ? entry.toFixed(2) : entry.toFixed(4)}
                    />
                    <TerminalDataRow
                      label="SL"
                      value={stopLoss ? (stopLoss > 100 ? stopLoss.toFixed(2) : stopLoss.toFixed(4)) : "—"}
                      valueColor="text-[#FF3D3D]"
                    />
                    <TerminalDataRow
                      label="TP1"
                      value={tp1 ? (tp1 > 100 ? tp1.toFixed(2) : tp1.toFixed(4)) : "—"}
                      valueColor={lastSignalWin ? "text-[#00C853] animate-pulse" : "text-[#00C853]"}
                    />
                    <TerminalDataRow
                      label="R:R"
                      value={rrRatio ? `${rrRatio}:1` : "—"}
                      valueColor="text-[#E8E8E8]"
                    />
                  </div>
                  {exec?.signalStateReason && (
                    <p className="text-[10px] text-[#6B6B7A] mt-2 leading-tight"
                      style={{ fontFamily: "var(--font-dm-sans),system-ui,sans-serif" }}>
                      {exec.signalStateReason}
                    </p>
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
                            <span className="text-[9px] text-[#6B6B7A]"
                              style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                              OPEN @ <span className="text-[#E8E8E8]">{openTrade.entry > 100 ? openTrade.entry.toFixed(2) : openTrade.entry.toFixed(4)}</span>
                              {" · "}{openTrade.direction}{" · "}{takenAgo}
                            </span>
                            <button
                              onClick={() => { discardTrade(openTrade.id); setTradeLog(loadTradeLog()); }}
                              className="text-[9px] text-[#6B6B7A] active:text-[#FF3D3D] px-1 py-0.5"
                              style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}
                            >
                              DISCARD ×
                            </button>
                          </div>
                          <button
                            onClick={() => setClosingTrade(openTrade)}
                            className="w-full py-2 rounded-[2px] text-[11px] font-bold border border-t-accent-40 bg-t-accent-10 t-accent"
                            style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}
                          >
                            CLOSE TRADE
                          </button>
                        </div>
                      );
                    }
                    if (effectiveSignalState === "ARMED" || effectiveSignalState === "PENDING") {
                      return (
                        <button
                          onClick={() => setTakingTrade(true)}
                          className="mt-3 w-full py-2 rounded-[2px] text-[11px] font-bold border border-t-accent-40 bg-t-accent-10 t-accent"
                          style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}
                        >
                          + TAKE TRADE
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
                      catalysts[0].importance === "medium" ? "bg-t-accent-15 t-accent" :
                      "bg-zinc-500/15 text-zinc-400")}>
                      {catalysts[0].importance?.toUpperCase()}
                    </span>
                  </div>
                  <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-[2px]",
                    catalystImpact.impact === "bullish" ? "bg-[#00C853]/15 text-[#00C853]" :
                    catalystImpact.impact === "bearish" ? "bg-red-500/15 text-red-400" :
                    "bg-zinc-500/15 text-zinc-400")}>
                    {symbolBiasShort} {catalystImpact.impact.toUpperCase()}
                  </span>
                </div>
              ) : null;

            case "live_prices":
              return (
                <section key="live_prices">
                  <TerminalSectionHeader label="LIVE PRICES" right={<LiveBadge />} />
                  <div className="grid grid-cols-2 gap-[1px] border border-[#1E1E24] rounded-[2px] overflow-hidden">
                    {displayQuotes.length > 0
                      ? displayQuotes.map((q) => <PriceCard key={q.symbol} symbol={q.symbol} price={q.price} change={q.changePercent} isActive={q.symbol === activeSymbol} />)
                      : Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-[#141418] p-3.5 h-[70px] animate-pulse" />)
                    }
                  </div>
                </section>
              );

            case "asset_bias":
              return activeBias ? (
                <section key="asset_bias">
                  <TerminalSectionHeader label={`${symbolBiasLabel.toUpperCase()} BIAS`} />
                  <div
                    className="bg-[#141418] rounded-[2px] p-4 border border-[#1E1E24] cursor-pointer active:opacity-75"
                    onClick={() => setBiasModalOpen(true)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-[#E8E8E8]"
                        style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                        {symbolBiasShort}
                      </span>
                      <div className="flex items-center gap-2">
                        <TerminalBadge
                          label={activeBias.bias?.toUpperCase() ?? "NEUTRAL"}
                          variant={activeBias.bias === "bullish" ? "bullish" : activeBias.bias === "bearish" ? "bearish" : "neutral"}
                        />
                        <ChevronDown className="h-3.5 w-3.5 text-[#3A3A45]" />
                      </div>
                    </div>
                    <div className="flex justify-between text-[9px] text-[#6B6B7A] mb-2"
                      style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace", letterSpacing: "1.2px" }}>
                      <span>CONVICTION</span><span>{activeBias.confidence}%</span>
                    </div>
                    <SegmentedBar
                      value={activeBias.confidence}
                      total={20}
                      activeColor={activeBias.bias === "bullish" ? "var(--t-bullish, #00C853)" : activeBias.bias === "bearish" ? "var(--t-bearish, #FF3D3D)" : "hsl(var(--primary))"}
                    />
                  </div>
                </section>
              ) : null;

            case "mtf_bias":
              return (
                <section key="mtf_bias">
                  <TerminalSectionHeader label="MTF BIAS" />
                  <MTFBiasPanel data={mtfData ?? undefined} isLoading={mtfLoading} />
                </section>
              );

            case "key_levels":
              return levels.length > 0 ? (
                <section key="key_levels">
                  <TerminalSectionHeader label="KEY LEVELS" />
                  <KeyLevelsCard levels={levels} compact />
                </section>
              ) : null;

            case "ai_analysis":
              return (
                <section key="ai_analysis">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase text-[#6B6B7A]"
                      style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace", letterSpacing: "2px" }}>
                      ── AI ANALYSIS
                    </span>
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
                    className="bg-[#141418] rounded-[2px] p-4 border border-[#1E1E24] space-y-2 cursor-pointer active:opacity-80"
                    onClick={() => setAiExpanded((v: boolean) => !v)}
                  >
                    {narrative.regime && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-[#6B6B7A] uppercase"
                            style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace", letterSpacing: "1.2px" }}>
                            REGIME
                          </span>
                          <span className="text-[10px] font-semibold t-accent"
                            style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                            {narrative.regime}
                          </span>
                        </div>
                        {aiExpanded
                          ? <ChevronUp className="h-3 w-3 text-[#3A3A45]" />
                          : <ChevronDown className="h-3 w-3 text-[#3A3A45]" />}
                      </div>
                    )}
                    {narrative.summary && (
                      <p className={cn("text-[12px] text-[#6B6B7A] leading-relaxed", !aiExpanded && "line-clamp-2")}
                        style={{ fontFamily: "var(--font-dm-sans),system-ui,sans-serif" }}>
                        {narrative.summary}
                      </p>
                    )}
                  </div>
                </section>
              );

            case "more_catalysts":
              return catalysts.length > 1 ? (
                <section key="more_catalysts">
                  <TerminalSectionHeader label="CATALYSTS" />
                  <div className="space-y-[1px] border border-[#1E1E24] rounded-[2px] overflow-hidden">
                    {catalysts.slice(1, 4).map((c, i) => (
                      <div key={i} onClick={() => setSelectedCatalyst(c)}
                        className="bg-[#141418] px-4 py-3 border-b border-[#1E1E24] last:border-0 active:bg-[#1A1A1F] cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[12px] text-[#E8E8E8] leading-snug flex-1"
                            style={{ fontFamily: "var(--font-dm-sans),system-ui,sans-serif" }}>
                            {c.title}
                          </p>
                          <TerminalBadge
                            label={c.importance?.toUpperCase() ?? "LOW"}
                            variant={c.importance === "high" ? "bearish" : c.importance === "medium" ? "pending" : "default"}
                            className="shrink-0 mt-0.5"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null;

            case "trump_feed":
              return (
                <section key="trump_feed">
                  <TerminalSectionHeader label="TRUMP IMPACT" />
                  <TrumpFeedPanel posts={trumpPosts} compact />
                </section>
              );

            case "agents": {
              const ad = agentData?.agents;
              const mTone = (b?: string) =>
                b === "bullish" || b === "valid" ? "green" :
                b === "bearish" || b === "blocked" ? "red" :
                b === "opposing" || b === "no-trade" ? "orange" : "gray";
              const agentDots: { id: string; tone: string }[] = [
                { id: "TR", tone: mTone(ad?.trend?.bias) },
                { id: "PA", tone: mTone(ad?.smc?.bias) },
                { id: "NW", tone: mTone(ad?.news?.impact) },
                { id: "RG", tone: ad?.risk ? (ad.risk.valid ? "green" : "red") : "gray" },
                { id: "CT", tone: ad?.contrarian?.challengesBias ? "red" : "gray" },
                { id: "EX", tone: ad?.execution?.direction === "long" ? "green" : ad?.execution?.direction === "short" ? "red" : ad?.execution?.signalState === "ARMED" ? "orange" : "gray" },
                { id: "MA", tone: mTone(ad?.master?.finalBias) },
              ];
              return (
                <section key="agents">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="shrink-0 text-[10px] uppercase text-[#6B6B7A]"
                      style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace", letterSpacing: "2px" }}>
                      ── 7-AGENT
                    </span>
                    {agentData && (
                      <div className="flex shrink-0 items-center gap-2">
                        {agentDots.map(({ id, tone }) => (
                          <div key={id} className="flex flex-col items-center gap-0.5">
                            <div className={cn("h-[6px] w-[6px]",
                              tone === "green"  ? "bg-[#00C853] shadow-[0_0_4px_rgba(0,200,83,0.8)]" :
                              tone === "red"    ? "bg-[#FF3D3D] shadow-[0_0_4px_rgba(255,61,61,0.8)]" :
                              tone === "orange" ? "pulse-accent shadow-none" :
                                                 "bg-[#3A3A45]")} />
                            <span className="text-[6px] text-[#3A3A45]"
                              style={{ fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" }}>
                              {id}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex-1 h-px bg-[#1E1E24]" />
                  </div>
                  {agentError && !agentData ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <p className="text-[11px] text-zinc-500">Analysis unavailable</p>
                      <button onClick={() => refreshAgent().catch(() => {})}
                        className="text-[10px] text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30 px-3 py-1.5 rounded-lg active:opacity-70">
                        Retry
                      </button>
                    </div>
                  ) : (
                  <AgentCardsWidget
                    data={agentData ?? undefined}
                    isLoading={agentLoading && !agentData}
                    visibleAgents={new Set(["trend", "smc", "news", "risk", "contrarian", "execution", "master"])}
                  />
                  )}
                </section>
              );
            }

            case "globe":
              return (
                <section key="globe">
                  <div className="rounded-[2px] overflow-hidden border border-[#1E1E24]" style={{ height: 340 }}>
                    <GlobeClient embedded />
                  </div>
                </section>
              );

            case "live_tv":
              return (
                <section key="live_tv">
                  <TerminalSectionHeader label="LIVE FEED" />
                  <LiveTVPanel showHeader={false} showFooterNote={false} />
                </section>
              );

            case "community":
              return (
                <section key="community">
                  <TerminalSectionHeader label="COMMUNITY" />
                  <CommunityPanel />
                </section>
              );

            case "lot_calculator":
              return (
                <section key="lot_calculator">
                  <TerminalSectionHeader label="LOT CALCULATOR" />
                  <LotCalculatorWidget />
                </section>
              );

            case "pnl_calendar":
              return <MobilePnLWidget key="pnl_calendar" />;

            case "institutional":
              return (
                <section key="institutional">
                  <InstitutionalConfluence />
                </section>
              );

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
            <div className={cn("rounded-[2px] p-4 border",
              activeBias.bias === "bullish" ? "bg-[#00C853]/8 border-[#00C853]/20" :
              activeBias.bias === "bearish" ? "bg-[#FF3D3D]/8 border-[#FF3D3D]/20" :
              "bg-[#141418] border-[#1E1E24]")}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-zinc-100">{symbolBiasShort}</span>
                <span className={cn("text-[11px] font-bold px-3 py-1 rounded-[2px]",
                  activeBias.bias === "bullish" ? "bg-[#00C853]/20 text-[#00C853]" :
                  activeBias.bias === "bearish" ? "bg-[#FF3D3D]/20 text-[#FF3D3D]" :
                  "bg-[#1E1E24] text-[#6B6B7A]")}>
                  {activeBias.bias?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 mb-2">
                <span>Conviction</span><span className="font-mono font-bold text-zinc-300">{activeBias.confidence}%</span>
              </div>
              <div className="h-2 rounded-full bg-black/30">
                <div className={cn("h-full transition-all", activeBias.bias === "bullish" ? "bg-[#00C853]" : activeBias.bias === "bearish" ? "bg-[#FF3D3D]" : "bg-[#3A3A45]")}
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
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#00C853]/70 mb-2">Supporting Factors</p>
                <div className="space-y-1.5">
                  {(techBias?.supportingFactors ?? master?.supports ?? []).map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[#00C853] shrink-0 mt-0.5 text-[11px]">✓</span>
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
                  <p className="text-sm font-bold font-mono text-[#00C853]">{techBias.keyLevels.support}</p>
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
              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-[2px] uppercase",
                selectedCatalyst.importance === "high" ? "bg-[#FF3D3D]/15 text-[#FF3D3D]" :
                selectedCatalyst.importance === "medium" ? "bg-t-accent-15 t-accent" : "bg-zinc-500/15 text-zinc-400")}>
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
