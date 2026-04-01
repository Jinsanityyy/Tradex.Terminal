"use client";

import React, { useState } from "react";
import { useQuotes, useMarketBias, useKeyLevels, useCatalysts, useMarketAnalysis } from "@/hooks/useMarketData";
import { TrendingUp, TrendingDown, Minus, Target, Zap, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { DetailModal } from "@/components/shared/DetailModal";
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
  const [generating, setGenerating] = useState(false);
  const [selectedCatalyst, setSelectedCatalyst] = useState<Catalyst | null>(null);

  const goldBias = biasData.find((b) => b.asset?.toLowerCase().includes("gold")) ?? biasData[0];

  const keyAssets = ["XAUUSD", "BTCUSD", "EURUSD", "USDJPY", "USOIL", "GBPUSD"];
  const displayQuotes = keyAssets
    .map((sym) => quotes.find((q) => q.symbol === sym))
    .filter(Boolean)
    .slice(0, 6) as typeof quotes;

  async function handleGenerate() {
    setGenerating(true);
    try { await generateFresh(); } finally { setGenerating(false); }
  }

  return (
    <div className="px-4 py-4 space-y-5 pb-6">

      {/* Prices grid */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider">Live Prices</span>
          <LiveBadge />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {displayQuotes.length > 0
            ? displayQuotes.map((q) => (
                <PriceCard key={q.symbol} symbol={q.symbol} price={q.price} change={q.changePercent} />
              ))
            : Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[hsl(var(--card))] rounded-xl p-3.5 border border-white/5 h-[70px] animate-pulse" />
              ))
          }
        </div>
      </section>

      {/* Gold Bias */}
      {goldBias && (
        <section>
          <p className="text-[11px] font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider mb-3">Gold Bias</p>
          <div className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-[hsl(var(--foreground))]">XAU/USD</span>
              <span className={cn(
                "text-[10px] font-bold px-3 py-1 rounded-full",
                goldBias.bias === "bullish" ? "bg-emerald-500/15 text-emerald-400" :
                goldBias.bias === "bearish" ? "bg-red-500/15 text-red-400" :
                "bg-zinc-500/15 text-zinc-400"
              )}>
                {goldBias.bias?.toUpperCase()}
              </span>
            </div>
            {/* Conviction bar */}
            <div>
              <div className="flex justify-between text-[9px] text-[hsl(var(--muted-foreground))] mb-1.5">
                <span>Conviction</span>
                <span>{goldBias.confidence}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5">
                <div
                  className={cn("h-full rounded-full transition-all", goldBias.bias === "bullish" ? "bg-emerald-400" : goldBias.bias === "bearish" ? "bg-red-400" : "bg-zinc-400")}
                  style={{ width: `${goldBias.confidence}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Market regime */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider">AI Analysis</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1 text-[9px] text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30 px-2 py-1 rounded-lg"
          >
            {generating ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
            {generating ? "..." : "Refresh"}
          </button>
        </div>
        <div className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5 space-y-2">
          {narrative.regime && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Regime</span>
              <span className="text-[10px] font-semibold text-amber-400">{narrative.regime}</span>
            </div>
          )}
          {narrative.dominantTheme && (
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed">{narrative.dominantTheme}</p>
          )}
          {narrative.summary && (
            <p className="text-xs text-[hsl(var(--foreground))]/80 leading-relaxed">{narrative.summary}</p>
          )}
        </div>
      </section>

      {/* Key Levels */}
      {levels.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider mb-3">Key Levels — Gold</p>
          <div className="space-y-2">
            {levels.slice(0, 4).map((lvl, i) => (
              <div key={i} className="bg-[hsl(var(--card))] rounded-xl px-4 py-3 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{lvl.bias}</p>
                  <p className="text-xs font-semibold text-[hsl(var(--foreground))] font-mono">{lvl.asset}</p>
                </div>
                <span className={cn(
                  "text-sm font-bold font-mono",
                  lvl.bias === "bearish" ? "text-red-400" : lvl.bias === "bullish" ? "text-emerald-400" : "text-amber-400"
                )}>
                  {lvl.price?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top Catalysts */}
      {catalysts.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider mb-3">Top Catalysts</p>
          <div className="space-y-2">
            {catalysts.slice(0, 3).map((c, i) => (
              <div key={i} onClick={() => setSelectedCatalyst(c)} className="bg-[hsl(var(--card))] rounded-xl px-4 py-3 border border-white/5 active:bg-[hsl(var(--secondary))] cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-[hsl(var(--foreground))] leading-snug flex-1">{c.title}</p>
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0",
                    c.importance === "high" ? "bg-red-500/15 text-red-400" :
                    c.importance === "medium" ? "bg-amber-500/15 text-amber-400" :
                    "bg-zinc-500/15 text-zinc-400"
                  )}>
                    {c.importance?.toUpperCase()}
                  </span>
                </div>
                {c.affectedMarkets?.[0] && <p className="text-[9px] text-[hsl(var(--muted-foreground))] mt-1">{c.affectedMarkets[0]}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <DetailModal open={!!selectedCatalyst} onClose={() => setSelectedCatalyst(null)} title={selectedCatalyst?.title}>
        {selectedCatalyst && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
                selectedCatalyst.importance === "high" ? "bg-red-500/15 text-red-400" :
                selectedCatalyst.importance === "medium" ? "bg-amber-500/15 text-amber-400" :
                "bg-zinc-500/15 text-zinc-400"
              )}>{selectedCatalyst.importance}</span>
              <span className={cn("text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full",
                selectedCatalyst.status === "live" ? "bg-amber-500/15 text-amber-400" :
                selectedCatalyst.status === "completed" ? "bg-emerald-500/15 text-emerald-400" :
                "bg-blue-500/15 text-blue-400"
              )}>{selectedCatalyst.status}</span>
            </div>
            <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">Why High Impact</p>
              <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{selectedCatalyst.explanation}</p>
            </div>
            {selectedCatalyst.affectedMarkets?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Affected Markets</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCatalyst.affectedMarkets.map((m) => (
                    <span key={m} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">{m}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1">Market Effect</p>
              <p className="text-xs text-gray-300 leading-relaxed">
                {selectedCatalyst.importance === "high"
                  ? "High-impact catalyst — expect increased volatility and potential trend acceleration. Monitor price action closely near key levels."
                  : selectedCatalyst.importance === "medium"
                  ? "Medium-impact catalyst — may cause short-term volatility. Watch for confirmation before entering positions."
                  : "Low-impact catalyst — limited directional effect expected. Use as secondary context only."}
              </p>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
}
