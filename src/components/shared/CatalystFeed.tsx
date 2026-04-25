"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { Zap, Clock, CheckCircle2, Radio, TrendingUp, TrendingDown, Minus, X, Eye } from "lucide-react";
import type { Catalyst } from "@/types";

interface CatalystFeedProps {
  catalysts: Catalyst[];
  limit?: number;
  compact?: boolean;
}

function MarketTag({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-500">
      {label}
    </span>
  );
}

function BiasBadge({ bias }: { bias: string }) {
  const b = bias.toLowerCase();
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
      b === "bullish" ? "bg-emerald-500/15 text-emerald-400" :
      b === "bearish" ? "bg-red-500/15 text-red-400" :
      b === "mixed"   ? "bg-amber-500/15 text-amber-400" :
                        "bg-zinc-800 text-zinc-500"
    )}>
      {b === "bullish" ? <TrendingUp className="h-2.5 w-2.5" /> :
       b === "bearish" ? <TrendingDown className="h-2.5 w-2.5" /> :
       <Minus className="h-2.5 w-2.5" />}
      {bias}
    </span>
  );
}

function AnalysisModal({ cat, onClose }: { cat: Catalyst; onClose: () => void }) {
  const a = cat.analysis;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl border border-white/8 bg-[#0b0c0e] shadow-[0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge variant={cat.importance}>{cat.importance}</Badge>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                  cat.status === "live" ? "bg-amber-500/15 text-amber-400" :
                  cat.status === "completed" ? "bg-zinc-800 text-zinc-500" :
                  "bg-blue-500/15 text-blue-400"
                )}>{cat.status}</span>
                <span className="text-[10px] text-zinc-600">{timeAgo(cat.timestamp)}</span>
              </div>
              <h2 className="text-[13px] font-semibold text-white leading-snug">{cat.title}</h2>
            </div>
            <button onClick={onClose} className="shrink-0 p-1 text-zinc-600 hover:text-zinc-300 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {a ? (
            <>
              {/* Main Analysis */}
              <div className="rounded-xl border border-[hsl(var(--primary))]/15 bg-[hsl(var(--primary))]/[0.04] px-4 py-3.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--primary))]/50 mb-2">Market Impact Analysis</p>
                <p className="text-[12.5px] text-zinc-200 leading-relaxed">{a.eventOverview}</p>
              </div>

              {/* Why Markets Care */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-600 mb-2">Why Markets Care</p>
                <p className="text-[12px] text-zinc-300 leading-relaxed">{a.whyMarketsCare}</p>
              </div>

              <div className="h-px bg-white/5" />

              {/* Asset Context */}
              {a.assets?.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-600 mb-2.5">Asset Impact</p>
                  <div className="space-y-2.5">
                    {a.assets.map((asset) => (
                      <div key={asset.ticker || asset.name} className="rounded-lg border border-white/5 bg-white/[0.025] p-3.5">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-zinc-300">{asset.name}</span>
                            {asset.ticker && (
                              <span className="text-[9px] font-mono text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded">{asset.ticker}</span>
                            )}
                          </div>
                          <BiasBadge bias={asset.bias} />
                        </div>
                        <p className="text-[11.5px] text-zinc-500 leading-relaxed">{asset.context}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="h-px bg-white/5" />

              {/* Market Logic */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-3 w-3 text-zinc-600" />
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-600">Market Logic</p>
                </div>
                <p className="text-[12px] text-zinc-400 leading-relaxed">{a.marketLogic}</p>
              </div>

              {/* Conditions */}
              {a.conditions && (
                <div className="rounded-lg bg-white/[0.02] border border-white/5 px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-700 mb-1.5">Confirmation & Conditions</p>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">{a.conditions}</p>
                </div>
              )}

              {/* Market tags */}
              {cat.affectedMarkets?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {cat.affectedMarkets.map(m => <MarketTag key={m} label={m} />)}
                </div>
              )}
            </>
          ) : (
            /* Fallback — no AI analysis available */
            <div className="space-y-4">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-600 mb-2">Summary</p>
                <p className="text-[12.5px] text-zinc-300 leading-relaxed">{cat.explanation}</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-600 mb-1.5">Market Implication</p>
                <p className="text-[12px] text-zinc-400 leading-relaxed">{cat.marketImplication}</p>
              </div>
              {cat.affectedMarkets?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {cat.affectedMarkets.map(m => <MarketTag key={m} label={m} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CatalystCard({ cat }: { cat: Catalyst }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className={cn(
          "group rounded-lg border px-3 py-3 cursor-pointer transition-all hover:bg-white/[0.03]",
          cat.status === "live" ? "border-amber-500/25 bg-amber-500/[0.02]" : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {cat.status === "live" ? <Radio className="h-3 w-3 text-amber-400 shrink-0" /> :
             cat.status === "completed" ? <CheckCircle2 className="h-3 w-3 text-zinc-700 shrink-0" /> :
             <Clock className="h-3 w-3 text-zinc-700 shrink-0" />}
            <h4 className="text-[12px] font-medium text-zinc-200 leading-snug">{cat.title}</h4>
          </div>
          <Badge variant={cat.importance} className="shrink-0">{cat.importance}</Badge>
        </div>
        <div className="flex items-center justify-between pl-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {cat.affectedMarkets.slice(0, 4).map(m => <MarketTag key={m} label={m} />)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-700">{timeAgo(cat.timestamp)}</span>
            <span className="text-[9px] text-zinc-700 group-hover:text-zinc-500 transition-colors">
              {cat.analysis ? "tap for analysis" : "tap for overview"}
            </span>
          </div>
        </div>
      </div>
      {open && <AnalysisModal cat={cat} onClose={() => setOpen(false)} />}
    </>
  );
}

export function CatalystFeed({ catalysts, limit }: CatalystFeedProps) {
  const items = limit ? catalysts.slice(0, limit) : catalysts;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <Zap className="h-5 w-5 text-zinc-700" />
        <p className="text-xs text-zinc-600">No catalysts at the moment</p>
        <p className="text-[10px] text-zinc-700">Refreshes every 3 minutes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(cat => <CatalystCard key={cat.id} cat={cat} />)}
    </div>
  );
}
