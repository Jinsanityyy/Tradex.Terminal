"use client";

import React, { useState, useRef, useCallback } from "react";
import { useQuotes, useMarketBias, useKeyLevels, useCatalysts, useMarketAnalysis, useAgentResult, useSessions } from "@/hooks/useMarketData";
import { TrendingUp, TrendingDown, Minus, Target, Zap, RefreshCw, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DetailModal } from "@/components/shared/DetailModal";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { mutate } from "swr";
import type { Catalyst } from "@/types";

function LiveBadge() {
  return (
    <span className="flex items-center gap-1 text-[9px] font-medium text-[hsl(var(--primary))] uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
      Live
    </span>
  );
}

function PriceCard({ symbol, price, change }: { symbol: string; price: number | string; change?: number }) {
  const up = (change ?? 0) > 0;
  const down = (change ?? 0) < 0;
  return (
    <div className="bg-[hsl(var(--card))] rounded-xl p-3.5 border border-white/5">
      <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-1">{symbol}</p>
      <p className="text-lg font-bold font-mono text-[hsl(var(--foreground))] leading-tight">
        {typeof price === "number" ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : price}
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
  const { quotes } = useQuotes();
  const { biasData } = useMarketBias();
  const { levels } = useKeyLevels();
  const { catalysts } = useCatalysts();
  const { narrative, sentiment, generateFresh } = useMarketAnalysis();
  const { result: agentData } = useAgentResult("XAUUSD", "H1");
  const { sessions } = useSessions();
  const [generating, setGenerating] = useState(false);
  const [selectedCatalyst, setSelectedCatalyst] = useState<Catalyst | null>(null);
  const containerRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLElement>;

  const goldBias = biasData.find((b) => b.asset?.toLowerCase().includes("gold")) ?? biasData[0];
  const keyAssets = ["XAUUSD", "BTCUSD", "EURUSD", "USDJPY", "USOIL", "GBPUSD"];
  const displayQuotes = keyAssets.map((sym) => quotes.find((q) => q.symbol === sym)).filter(Boolean).slice(0, 6) as typeof quotes;

  // Agent signal data — exec has signalState + entry/SL/TP
  const master = agentData?.agents?.master;
  const exec = agentData?.agents?.execution;
  const tradePlan = master?.tradePlan;
  const signalState = exec?.signalState ?? "NO_TRADE";
  const finalBias = master?.finalBias ?? "neutral";

  // Entry/SL/TP — exec has live values, tradePlan has logged values
  const entry = exec?.entry ?? tradePlan?.entry ?? null;
  const stopLoss = exec?.stopLoss ?? tradePlan?.stopLoss ?? null;
  const tp1 = exec?.tp1 ?? tradePlan?.tp1 ?? null;
  const rrRatio = exec?.rrRatio ?? tradePlan?.rrRatio ?? null;
  const direction = exec?.direction ?? tradePlan?.direction ?? null;
  const trigger = exec?.trigger ?? tradePlan?.trigger ?? null;

  // Active session
  const activeSession = sessions.find(s => s.status === "active");

  const divRef = useRef<HTMLDivElement>(null);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      mutate("/api/market/quotes"),
      mutate("/api/market/catalysts"),
      mutate("/api/agents/run"),
    ]);
  }, []);

  const { refreshing, pullDistance, THRESHOLD } = usePullToRefresh(handleRefresh, divRef as React.RefObject<HTMLElement>);


  async function handleGenerate() {
    setGenerating(true);
    try { await generateFresh(); } finally { setGenerating(false); }
  }

  const signalColor = signalState === "ARMED" ? "text-emerald-400" : signalState === "PENDING" ? "text-amber-400" : "text-zinc-500";
  const signalBg = signalState === "ARMED" ? "bg-emerald-500/10 border-emerald-500/30" : signalState === "PENDING" ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/5";

  return (
    <div ref={divRef} className="overflow-y-auto h-full pb-6">
      {/* Pull to refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div className="flex items-center justify-center py-3 transition-all"
          style={{ height: refreshing ? 48 : Math.min(pullDistance * 0.5, 48) }}>
          <RefreshCw className={cn("h-4 w-4 text-[hsl(var(--primary))]", refreshing ? "animate-spin" : pullDistance >= THRESHOLD ? "text-emerald-400" : "")} />
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {/* Signal + Session row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Signal State */}
          <div className={cn("rounded-xl p-3.5 border", signalBg)}>
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Signal</p>
            <p className={cn("text-[13px] font-bold uppercase", signalColor)}>{signalState.replace("_", " ")}</p>
            {direction && (
              <p className="text-[9px] text-zinc-600 mt-1 truncate">
                {direction.toUpperCase()} · {trigger ?? "—"}
              </p>
            )}
          </div>

          {/* Active Session */}
          <div className="bg-[hsl(var(--card))] rounded-xl p-3.5 border border-white/5">
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Session</p>
            {activeSession ? (
              <>
                <p className="text-[13px] font-bold text-zinc-200">{activeSession.session}</p>
                <span className={cn("text-[9px] font-bold uppercase",
                  activeSession.volatilityTone === "high" ? "text-red-400" :
                  activeSession.volatilityTone === "moderate" ? "text-amber-400" : "text-emerald-400")}>
                  {activeSession.volatilityTone} vol
                </span>
              </>
            ) : (
              <>
                <p className="text-[13px] font-bold text-zinc-500">Closed</p>
                <p className="text-[9px] text-zinc-700 mt-1">Between sessions</p>
              </>
            )}
          </div>
        </div>

        {/* Entry strip — show whenever we have entry data */}
        {entry && (
          <div className={cn("border rounded-xl px-4 py-3",
            signalState === "ARMED"   ? "bg-emerald-500/8 border-emerald-500/25" :
            signalState === "PENDING" ? "bg-amber-500/8 border-amber-500/25" :
            "bg-white/5 border-white/10")}>
            <p className={cn("text-[9px] uppercase tracking-wider mb-2",
              signalState === "ARMED"   ? "text-emerald-500/70" :
              signalState === "PENDING" ? "text-amber-500/70" :
              "text-zinc-600")}>
              {signalState === "ARMED" ? "⚡ Armed — Confirm trigger" :
               signalState === "PENDING" ? "⏳ Pending — Waiting for entry" :
               "Last Setup"}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Entry", value: entry > 100 ? entry.toFixed(2) : entry.toFixed(4), color: "text-zinc-100" },
                { label: "SL",    value: stopLoss ? (stopLoss > 100 ? stopLoss.toFixed(2) : stopLoss.toFixed(4)) : "—", color: "text-red-400" },
                { label: "TP1",   value: tp1 ? (tp1 > 100 ? tp1.toFixed(2) : tp1.toFixed(4)) : "—", color: "text-emerald-400" },
                { label: "RR",    value: rrRatio ? `${rrRatio}:1` : "—", color: "text-zinc-300" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="text-[8px] text-zinc-600 mb-0.5">{label}</p>
                  <p className={cn("text-[11px] font-mono font-bold", color)}>{value}</p>
                </div>
              ))}
            </div>
            {exec?.signalStateReason && (
              <p className="text-[10px] text-zinc-600 mt-2 leading-tight">{exec.signalStateReason}</p>
            )}
          </div>
        )}

        {/* Top Catalyst highlight */}
        {catalysts[0] && (
          <div onClick={() => setSelectedCatalyst(catalysts[0])}
            className="bg-[hsl(var(--card))] rounded-xl px-4 py-3 border border-white/5 active:bg-[hsl(var(--secondary))] cursor-pointer">
            <div className="flex items-start justify-between gap-2">
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
          </div>
        )}

        {/* Prices grid */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Live Prices</span>
            <LiveBadge />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {displayQuotes.length > 0
              ? displayQuotes.map((q) => <PriceCard key={q.symbol} symbol={q.symbol} price={q.price} change={q.changePercent} />)
              : Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-[hsl(var(--card))] rounded-xl p-3.5 border border-white/5 h-[70px] animate-pulse" />)
            }
          </div>
        </section>

        {/* Gold Bias */}
        {goldBias && (
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-3">Gold Bias</p>
            <div className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold">XAU/USD</span>
                <span className={cn("text-[10px] font-bold px-3 py-1 rounded-full",
                  goldBias.bias === "bullish" ? "bg-emerald-500/15 text-emerald-400" :
                  goldBias.bias === "bearish" ? "bg-red-500/15 text-red-400" : "bg-zinc-500/15 text-zinc-400")}>
                  {goldBias.bias?.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-[9px] text-zinc-600 mb-1.5">
                <span>Conviction</span><span>{goldBias.confidence}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5">
                <div className={cn("h-full rounded-full", goldBias.bias === "bullish" ? "bg-emerald-400" : goldBias.bias === "bearish" ? "bg-red-400" : "bg-zinc-400")}
                  style={{ width: `${goldBias.confidence}%` }} />
              </div>
            </div>
          </section>
        )}

        {/* AI Analysis */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider">AI Analysis</p>
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-1 text-[9px] text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30 px-2 py-1 rounded-lg">
              {generating ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
              {generating ? "..." : "Refresh"}
            </button>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5 space-y-2">
            {narrative.regime && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Regime</span>
                <span className="text-[10px] font-semibold text-amber-400">{narrative.regime}</span>
              </div>
            )}
            {narrative.summary && <p className="text-xs text-zinc-400 leading-relaxed">{narrative.summary}</p>}
          </div>
        </section>

        {/* More catalysts */}
        {catalysts.length > 1 && (
          <section>
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
        )}
      </div>

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
                {selectedCatalyst.affectedMarkets.map((m) => (
                  <span key={m} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-zinc-400">{m}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
