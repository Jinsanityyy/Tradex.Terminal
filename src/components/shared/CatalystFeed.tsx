"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import {
  Zap, Clock, CheckCircle2, Radio,
  TrendingUp, TrendingDown, Minus, Loader2, X, Eye
} from "lucide-react";
import type { Catalyst } from "@/types";

/* ─── Types ─────────────────────────────────────────────────── */
interface CatalystFeedProps {
  catalysts: Catalyst[];
  limit?: number;
  compact?: boolean;
}

interface AssetBlock {
  name: string;
  ticker: string;
  bias: string;
  context: string;
}

interface NewsAnalysis {
  analysisType: string;
  mainAnalysis: string;
  nowWatch: string[];
  assets: AssetBlock[];
  confirmationNote: string;
}

/* ─── Helpers ────────────────────────────────────────────────── */
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
      b === "bullish"  ? "bg-emerald-500/15 text-emerald-400" :
      b === "bearish"  ? "bg-red-500/15 text-red-400" :
      b === "mixed"    ? "bg-amber-500/15 text-amber-400" :
                         "bg-zinc-800 text-zinc-500"
    )}>
      {b === "bullish" && <TrendingUp className="h-2.5 w-2.5" />}
      {b === "bearish" && <TrendingDown className="h-2.5 w-2.5" />}
      {(b === "neutral" || b === "mixed") && <Minus className="h-2.5 w-2.5" />}
      {bias}
    </span>
  );
}

/* ─── Modal ──────────────────────────────────────────────────── */
function AnalysisModal({
  cat,
  onClose,
}: {
  cat: Catalyst & { forecast?: string; previous?: string; actual?: string; status?: string; source?: string };
  onClose: () => void;
}) {
  const [analysis, setAnalysis] = React.useState<NewsAnalysis | null>(null);
  const [loading, setLoading]   = React.useState(true);

  React.useEffect(() => {
    fetch("/api/ai/news-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:           cat.title,
        explanation:     cat.explanation,
        affectedMarkets: cat.affectedMarkets,
        importance:      cat.importance,
        forecast:        cat.forecast,
        previous:        cat.previous,
        actual:          cat.actual,
        status:          cat.status,
        source:          cat.source,
      }),
    })
      .then(r => r.json())
      .then(d => setAnalysis(d))
      .catch(() => setAnalysis(null))
      .finally(() => setLoading(false));
  }, [cat.id]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl border border-white/8 bg-[#0b0c0e] shadow-[0_32px_80px_rgba(0,0,0,0.8)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge variant={cat.importance}>{cat.importance}</Badge>
                {cat.status && (
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                    cat.status === "live" ? "bg-amber-500/15 text-amber-400" :
                    cat.status === "completed" ? "bg-zinc-800 text-zinc-500" :
                    "bg-blue-500/15 text-blue-400"
                  )}>{cat.status}</span>
                )}
                <span className="text-[10px] text-zinc-600">{timeAgo(cat.timestamp)}</span>
              </div>
              <h2 className="text-[13px] font-semibold text-white leading-snug">{cat.title}</h2>
            </div>
            <button onClick={onClose} className="shrink-0 p-1 text-zinc-600 hover:text-zinc-300 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Data row — forecast / previous / actual */}
          {(cat.forecast || cat.previous || cat.actual) && (
            <div className="flex gap-4 mt-3">
              {[
                { label: "Forecast", value: cat.forecast },
                { label: "Previous", value: cat.previous },
                { label: "Actual",   value: cat.actual },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[8px] uppercase tracking-widest text-zinc-700 mb-0.5">{label}</p>
                  <p className={cn(
                    "text-[12px] font-mono font-bold",
                    label === "Actual" && value && value !== "—" ? "text-[hsl(var(--primary))]" : "text-zinc-300"
                  )}>{value || "—"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="space-y-5 animate-pulse">
              <div className="h-3 w-36 bg-white/5 rounded" />
              <div className="space-y-2">
                <div className="h-3 bg-white/5 rounded w-full" />
                <div className="h-3 bg-white/5 rounded w-5/6" />
                <div className="h-3 bg-white/5 rounded w-4/6" />
              </div>
              <div className="h-3 w-28 bg-white/5 rounded mt-4" />
              <div className="space-y-2">
                {[90, 75, 85, 70].map((w, i) => (
                  <div key={i} className="h-2.5 bg-white/5 rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
              <div className="h-3 w-32 bg-white/5 rounded mt-4" />
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="rounded-lg bg-white/[0.03] p-3 space-y-1.5">
                    <div className="h-2.5 bg-white/5 rounded w-24" />
                    <div className="h-2.5 bg-white/5 rounded w-full" />
                    <div className="h-2.5 bg-white/5 rounded w-4/5" />
                  </div>
                ))}
              </div>
            </div>
          ) : analysis ? (
            <>
              {/* ── Main Analysis Box ── */}
              <div className="rounded-xl border border-[hsl(var(--primary))]/15 bg-[hsl(var(--primary))]/[0.04] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--primary))]/60 mb-2.5">
                  {analysis.analysisType}
                </p>
                <p className="text-[12.5px] text-zinc-200 leading-relaxed">{analysis.mainAnalysis}</p>
              </div>

              {/* ── Now Watch ── */}
              {analysis.nowWatch?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <Eye className="h-3 w-3 text-zinc-600" />
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-600">Now Watch</p>
                  </div>
                  <div className="space-y-1.5">
                    {analysis.nowWatch.filter(Boolean).map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[hsl(var(--primary))]/50 text-[10px] font-mono mt-0.5 shrink-0">→</span>
                        <p className="text-[11.5px] text-zinc-400 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Asset Context Blocks ── */}
              {analysis.assets?.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-600 mb-2.5">Asset Context</p>
                  <div className="space-y-2.5">
                    {analysis.assets.map((asset) => (
                      <div key={asset.ticker || asset.name} className="rounded-lg border border-white/5 bg-white/[0.025] p-3.5">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-zinc-300">{asset.name}</span>
                            {asset.ticker && (
                              <span className="text-[9px] font-mono text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded">
                                {asset.ticker}
                              </span>
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

              {/* ── Confirmation Note ── */}
              {analysis.confirmationNote && (
                <div className="rounded-lg bg-white/[0.02] border border-white/5 px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-700 mb-1.5">Confirmation & Invalidation</p>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">{analysis.confirmationNote}</p>
                </div>
              )}

              {/* ── Affected assets tags ── */}
              {cat.affectedMarkets?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {cat.affectedMarkets.map(m => <MarketTag key={m} label={m} />)}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-[12px] text-zinc-500 leading-relaxed">
                {cat.explanation || "Analysis could not be generated for this item."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Card ───────────────────────────────────────────────────── */
function CatalystCard({ cat }: { cat: Catalyst }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className={cn(
          "group rounded-lg border px-3 py-3 cursor-pointer transition-all hover:bg-white/[0.03]",
          cat.status === "live"
            ? "border-amber-500/25 bg-amber-500/[0.02]"
            : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {cat.status === "live"
              ? <Radio className="h-3 w-3 text-amber-400 shrink-0" />
              : cat.status === "completed"
              ? <CheckCircle2 className="h-3 w-3 text-zinc-700 shrink-0" />
              : <Clock className="h-3 w-3 text-zinc-700 shrink-0" />}
            <h4 className="text-[12px] font-medium text-zinc-200 leading-snug">{cat.title}</h4>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant={cat.importance}>{cat.importance}</Badge>
          </div>
        </div>

        <div className="flex items-center justify-between pl-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {cat.affectedMarkets.slice(0, 4).map(m => <MarketTag key={m} label={m} />)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-700">{timeAgo(cat.timestamp)}</span>
            <span className="text-[9px] text-zinc-700 group-hover:text-zinc-500 transition-colors">tap for analysis</span>
          </div>
        </div>
      </div>

      {open && <AnalysisModal cat={cat} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ─── Feed ───────────────────────────────────────────────────── */
export function CatalystFeed({ catalysts, limit }: CatalystFeedProps) {
  const items = limit ? catalysts.slice(0, limit) : catalysts;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <Zap className="h-5 w-5 text-zinc-700" />
        <p className="text-xs text-zinc-600">No catalysts at the moment</p>
        <p className="text-[10px] text-zinc-700">Refreshes automatically every 3 minutes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(cat => <CatalystCard key={cat.id} cat={cat} />)}
    </div>
  );
}
