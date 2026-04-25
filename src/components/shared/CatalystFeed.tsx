"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { Zap, Clock, CheckCircle2, Radio, TrendingUp, TrendingDown, Minus, ChevronDown, Loader2 } from "lucide-react";
import type { Catalyst } from "@/types";

interface CatalystFeedProps {
  catalysts: Catalyst[];
  limit?: number;
  compact?: boolean;
}

interface NewsAnalysis {
  whatHappened: string;
  whyItMatters: string;
  assets: {
    gold: { bias: string; reason: string };
    usd: { bias: string; reason: string };
    stocks: { bias: string; reason: string };
    oil: { bias: string; reason: string };
  };
  riskScenario: string;
}

function BiasTag({ bias }: { bias: string }) {
  const color = bias === "bullish" ? "text-emerald-400" : bias === "bearish" ? "text-red-400" : "text-zinc-500";
  const icon = bias === "bullish" ? <TrendingUp className="h-3 w-3" /> : bias === "bearish" ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />;
  return <span className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider", color)}>{icon}{bias}</span>;
}

function MarketTag({ label }: { label: string }) {
  return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">{label}</span>;
}

function CatalystCard({ cat }: { cat: Catalyst }) {
  const [expanded, setExpanded] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<NewsAnalysis | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [fetched, setFetched] = React.useState(false);

  function handleExpand() {
    setExpanded(prev => !prev);
    if (!fetched) {
      setFetched(true);
      setLoading(true);
      fetch("/api/ai/news-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cat.title, explanation: cat.explanation, affectedMarkets: cat.affectedMarkets, importance: cat.importance })
      })
      .then(r => r.json())
      .then(data => setAnalysis(data))
      .catch(() => setAnalysis(null))
      .finally(() => setLoading(false));
    }
  }

  return (
    <div className={cn("rounded-lg border bg-[hsl(var(--card))] overflow-hidden", cat.status === "live" ? "border-amber-500/25" : "border-[hsl(var(--border))]")}>
      {/* Header */}
      <div className="px-3 pt-3 pb-3 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={handleExpand}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {cat.status === "live" ? <Radio className="h-3 w-3 text-amber-400 shrink-0" /> : cat.status === "completed" ? <CheckCircle2 className="h-3 w-3 text-zinc-600 shrink-0" /> : <Clock className="h-3 w-3 text-zinc-600 shrink-0" />}
            <h4 className="text-[12px] font-semibold text-[hsl(var(--foreground))] leading-tight">{cat.title}</h4>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={cat.importance}>{cat.importance}</Badge>
            <ChevronDown className={cn("h-3 w-3 text-zinc-600 transition-transform shrink-0", expanded && "rotate-180")} />
          </div>
        </div>
        <div className="flex items-center justify-between pl-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {cat.affectedMarkets.slice(0, 4).map(m => <MarketTag key={m} label={m} />)}
          </div>
          <span className="text-[10px] text-zinc-600">{timeAgo(cat.timestamp)}</span>
        </div>
      </div>

      {/* Analysis panel */}
      {expanded && (
        <div className="border-t border-white/5">
          {loading ? (
            <div className="px-4 py-5 space-y-4">
              <div className="flex items-center gap-2 text-zinc-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[10px] uppercase tracking-widest">Analyzing market impact…</span>
              </div>
              {[65, 85, 70, 90].map((w, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="h-2 w-24 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: `${w}%` }} />
                  <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: `${w - 15}%` }} />
                </div>
              ))}
            </div>
          ) : analysis ? (
            <div className="px-4 py-4 space-y-4">

              {/* 1. What Happened */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-1.5">What Happened</p>
                <p className="text-[12px] text-zinc-300 leading-relaxed">{analysis.whatHappened}</p>
              </div>

              <div className="h-px bg-white/5" />

              {/* 2. Why It Matters */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-1.5">Why It Matters</p>
                <p className="text-[12px] text-zinc-300 leading-relaxed">{analysis.whyItMatters}</p>
              </div>

              <div className="h-px bg-white/5" />

              {/* 3+4. Market Impact per Asset */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-2.5">Market Impact</p>
                <div className="space-y-3">
                  {[
                    { label: "Gold", key: "gold" },
                    { label: "USD", key: "usd" },
                    { label: "Stocks", key: "stocks" },
                    { label: "Oil", key: "oil" },
                  ].map(({ label, key }) => {
                    const asset = analysis.assets[key as keyof typeof analysis.assets];
                    return (
                      <div key={key} className="grid grid-cols-[56px_1fr] gap-3 items-start">
                        <span className="text-[10px] font-mono text-zinc-600 uppercase pt-0.5">{label}</span>
                        <div>
                          <BiasTag bias={asset.bias} />
                          <p className="text-[11px] text-zinc-500 leading-relaxed mt-0.5">{asset.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-white/5" />

              {/* 5. Risk Scenario */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-1.5">Risk Scenario</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{analysis.riskScenario}</p>
              </div>

            </div>
          ) : (
            <div className="px-4 py-4">
              <p className="text-[11px] text-zinc-600">{cat.explanation || "Analysis unavailable."}</p>
            </div>
          )}
        </div>
      )}
    </div>
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
