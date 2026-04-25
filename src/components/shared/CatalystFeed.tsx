"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { Zap, Clock, CheckCircle2, Radio, TrendingUp, TrendingDown, Minus, Loader2, X } from "lucide-react";
import type { Catalyst } from "@/types";

interface CatalystFeedProps {
  catalysts: Catalyst[];
  limit?: number;
  compact?: boolean;
}

interface AssetImpact {
  name: string;
  bias: string;
  explanation: string;
}

interface NewsAnalysis {
  eventOverview: string;
  whyMarketsCare: string;
  assets: AssetImpact[];
  marketLogic: string;
  conditions: string;
}

function BiasChip({ bias }: { bias: string }) {
  const b = bias.toLowerCase();
  const isB = b === "bullish";
  const isBear = b === "bearish";
  const isMixed = b === "mixed";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
      isB ? "bg-emerald-500/10 text-emerald-400" :
      isBear ? "bg-red-500/10 text-red-400" :
      isMixed ? "bg-amber-500/10 text-amber-400" :
      "bg-zinc-800 text-zinc-500"
    )}>
      {isB ? <TrendingUp className="h-2.5 w-2.5" /> :
       isBear ? <TrendingDown className="h-2.5 w-2.5" /> :
       <Minus className="h-2.5 w-2.5" />}
      {bias}
    </span>
  );
}

function MarketTag({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
      {label}
    </span>
  );
}

function AnalysisModal({ cat, onClose }: { cat: Catalyst; onClose: () => void }) {
  const [analysis, setAnalysis] = React.useState<NewsAnalysis | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/ai/news-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: cat.title,
        explanation: cat.explanation,
        affectedMarkets: cat.affectedMarkets,
        importance: cat.importance,
      })
    })
    .then(r => r.json())
    .then(data => setAnalysis(data))
    .catch(() => setAnalysis(null))
    .finally(() => setLoading(false));
  }, [cat.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="sticky top-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-white/5 bg-[#0d1117]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={cat.importance}>{cat.importance}</Badge>
              <span className="text-[10px] text-zinc-600">{timeAgo(cat.timestamp)}</span>
            </div>
            <h2 className="text-[13px] font-semibold text-white leading-snug">{cat.title}</h2>
          </div>
          <button onClick={onClose} className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal body */}
        <div className="px-5 py-5">
          {loading ? (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-zinc-600 mb-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[10px] uppercase tracking-widest">Analyzing this event…</span>
              </div>
              {[
                { label: "Event Overview", lines: [80, 65] },
                { label: "Why Markets Care", lines: [90, 70, 50] },
                { label: "Asset Impact", lines: [60, 85, 70] },
                { label: "Market Logic", lines: [75, 55] },
              ].map(({ label, lines }) => (
                <div key={label} className="space-y-2">
                  <div className="h-2 w-28 bg-white/5 rounded animate-pulse" />
                  {lines.map((w, i) => (
                    <div key={i} className="h-3 bg-white/5 rounded animate-pulse" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ))}
            </div>
          ) : analysis ? (
            <div className="space-y-6">

              {/* 1. Event Overview */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-2">Event Overview</p>
                <p className="text-[13px] text-zinc-200 leading-relaxed">{analysis.eventOverview}</p>
              </div>

              <div className="h-px bg-white/5" />

              {/* 2. Why Markets Care */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-2">Why Markets Care</p>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{analysis.whyMarketsCare}</p>
              </div>

              <div className="h-px bg-white/5" />

              {/* 3. Asset Impact */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-3">Asset Impact</p>
                <div className="space-y-4">
                  {analysis.assets.map((asset) => (
                    <div key={asset.name} className="flex gap-4">
                      <div className="w-[80px] shrink-0 pt-0.5">
                        <p className="text-[11px] font-semibold text-zinc-400">{asset.name}</p>
                        <div className="mt-1">
                          <BiasChip bias={asset.bias} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-zinc-400 leading-relaxed">{asset.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/5" />

              {/* 4. Market Logic */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-2">Market Logic</p>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{analysis.marketLogic}</p>
              </div>

              <div className="h-px bg-white/5" />

              {/* 5. Conditions */}
              <div className="rounded-lg bg-white/[0.03] border border-white/5 px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-1.5">Confidence & Conditions</p>
                <p className="text-[12px] text-zinc-500 leading-relaxed">{analysis.conditions}</p>
              </div>

            </div>
          ) : (
            <div className="py-4">
              <p className="text-[12px] text-zinc-500">{cat.explanation || "Analysis could not be generated for this item."}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CatalystCard({ cat }: { cat: Catalyst }) {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className={cn(
          "rounded-lg border bg-[hsl(var(--card))] px-3 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors",
          cat.status === "live" ? "border-amber-500/25" : "border-[hsl(var(--border))]"
        )}
      >
        {/* Headline row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {cat.status === "live"
              ? <Radio className="h-3 w-3 text-amber-400 shrink-0" />
              : cat.status === "completed"
              ? <CheckCircle2 className="h-3 w-3 text-zinc-600 shrink-0" />
              : <Clock className="h-3 w-3 text-zinc-600 shrink-0" />}
            <h4 className="text-[12px] font-semibold text-[hsl(var(--foreground))] leading-snug">{cat.title}</h4>
          </div>
          <Badge variant={cat.importance} className="shrink-0">{cat.importance}</Badge>
        </div>

        {/* Markets + time + tap hint */}
        <div className="flex items-center justify-between pl-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {cat.affectedMarkets.slice(0, 4).map(m => <MarketTag key={m} label={m} />)}
          </div>
          <span className="text-[10px] text-zinc-600">{timeAgo(cat.timestamp)}</span>
        </div>
      </div>

      {modalOpen && <AnalysisModal cat={cat} onClose={() => setModalOpen(false)} />}
    </>
  );
}

export function CatalystFeed({ catalysts, limit }: CatalystFeedProps) {
  const items = limit ? catalysts.slice(0, limit) : catalysts;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <Zap className="h-6 w-6 text-[hsl(var(--muted-foreground))]/30" />
        <p className="text-xs text-[hsl(var(--muted-foreground))]">No catalysts at the moment</p>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))]/60">Refreshes automatically every 3 minutes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(cat => <CatalystCard key={cat.id} cat={cat} />)}
    </div>
  );
}
