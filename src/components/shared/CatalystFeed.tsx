"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { Zap, Clock, CheckCircle2, Radio, TrendingUp, TrendingDown, Minus, X, Target, Shield, BookOpen, ChevronRight } from "lucide-react";
import type { Catalyst } from "@/types";
import { useSettings } from "@/contexts/SettingsContext";
import { getSymbolLabel, getSymbolShort, getCatalystImpactForSymbol } from "@/lib/assetImpact";

interface CatalystFeedProps {
  catalysts: Catalyst[];
  limit?: number;
  compact?: boolean;
}

function ImpactBadge({ impact, label }: { impact?: "bullish" | "bearish" | "neutral"; label: string }) {
  if (!impact) return null;
  const Icon = impact === "bullish" ? TrendingUp : impact === "bearish" ? TrendingDown : Minus;
  const colors = {
    bullish: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    bearish: "bg-red-500/15 text-red-400 border-red-500/30",
    neutral: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", colors[impact])}>
      <Icon className="h-2.5 w-2.5" />
      {label} {impact.toUpperCase()}
    </span>
  );
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
  const isCompleted = cat.status === "completed";
  const isUpcoming  = cat.status === "upcoming";
  const a = cat.analysis;
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";
  const assetLabel = getSymbolLabel(selectedSymbol);
  const assetShort = getSymbolShort(selectedSymbol);
  const assetImpact = getCatalystImpactForSymbol(cat, selectedSymbol);

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
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                  cat.status === "live"      ? "bg-amber-500/15 text-amber-400" :
                  cat.status === "completed" ? "bg-emerald-500/10 text-emerald-600" :
                  "bg-blue-500/15 text-blue-400"
                )}>
                  {cat.status === "completed" ? "✓ Completed" : cat.status}
                </span>
                <span className="text-[10px] text-zinc-600">{timeAgo(cat.timestamp)}</span>
              </div>
              <h2 className="text-[13px] font-semibold text-white leading-snug">{cat.title}</h2>
            </div>
            <button onClick={onClose} className="shrink-0 p-1 text-zinc-600 hover:text-zinc-300 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ══════════════════════════════════════════════════════
              COMPLETED EVENT  -  static market context
          ══════════════════════════════════════════════════════ */}
          {isCompleted && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-emerald-500/15">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Completed  -  Market Context</span>
              </div>
              <div className="px-3.5 py-3">
                <p className="text-[12px] text-zinc-200 leading-relaxed">{cat.explanation}</p>
              </div>
              {cat.marketImplication && (
                <div className="px-3.5 pb-3.5 space-y-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/70">Market Implication</p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{cat.marketImplication}</p>
                </div>
              )}
            </div>
          )}

          {isCompleted && (cat.goldImpact || cat.usdImpact) && (
            <>
              <div className="flex gap-2 flex-wrap">
                <ImpactBadge impact={assetImpact.impact} label={assetShort} />
                <ImpactBadge impact={cat.usdImpact} label="USD" />
              </div>
              {assetImpact.reasoning && (
                <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">{assetLabel} Context</span>
                  </div>
                  <p className="text-[11.5px] text-zinc-300 leading-relaxed">{assetImpact.reasoning}</p>
                </div>
              )}
              {cat.usdReasoning && (
                <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">USD Context</span>
                  </div>
                  <p className="text-[11.5px] text-zinc-300 leading-relaxed">{cat.usdReasoning}</p>
                </div>
              )}
            </>
          )}

          {/* ══════════════════════════════════════════════════════
              UPCOMING / LIVE  -  pre-event analysis (existing logic)
          ══════════════════════════════════════════════════════ */}
          {!isCompleted && (() => {
            const borderCls = isUpcoming ? "border-blue-500/25" : "border-amber-500/25";
            const bgCls     = isUpcoming ? "bg-blue-500/[0.04]" : "bg-amber-500/[0.05]";
            const dividerCls= isUpcoming ? "border-blue-500/15" : "border-amber-500/15";
            const iconCls   = isUpcoming ? "text-blue-400"      : "text-amber-400";
            const Icon      = a ? BookOpen : Zap;
            const label     = a ? "Market Impact Analysis" : "Catalyst Analysis";

            const narrative = a
              ? [a.eventOverview, a.whyMarketsCare].filter(Boolean).join("\n\n")
              : cat.explanation;

            const bullets: string[] = a
              ? [a.conditions, a.marketLogic, ...(a.assets ?? []).slice(0, 3).map(
                  as => `${as.name}${as.ticker ? ` (${as.ticker})` : ""}: ${as.bias.toUpperCase()}  -  ${as.context}`
                )].filter((b): b is string => Boolean(b))
              : [
                  assetImpact.impact === "bullish"
                    ? `${assetLabel} expected to benefit — watch for breakout above prior session high`
                    : assetImpact.impact === "bearish"
                    ? `${assetLabel} faces headwinds — sell rallies toward prior resistance`
                    : `${assetLabel} direction uncertain — wait for price action confirmation`,
                  cat.usdImpact === "bullish"  ? "USD strength expected  -  watch DXY for breakout above key resistance"
                  : cat.usdImpact === "bearish" ? "USD weakness likely  -  EURUSD and GBPUSD may benefit"
                  : null,
                  cat.marketImplication ?? null,
                ].filter((b): b is string => Boolean(b));

            return (
              <>
                <div className={cn("rounded-xl border overflow-hidden", borderCls, bgCls)}>
                  <div className={cn("flex items-center gap-2 px-3.5 py-2.5 border-b", dividerCls)}>
                    <Icon className={cn("h-3.5 w-3.5", iconCls)} />
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", iconCls)}>{label}</span>
                    <span className={cn("ml-auto text-[9px] uppercase tracking-wider opacity-50", iconCls)}>
                      {cat.status.charAt(0).toUpperCase() + cat.status.slice(1)}
                    </span>
                  </div>
                  <div className="px-3.5 py-3">
                    {narrative.split("\n\n").map((para, i) => (
                      <p key={i} className={cn("text-[12px] text-zinc-200 leading-relaxed", i > 0 && "mt-2 text-zinc-400")}>{para}</p>
                    ))}
                  </div>
                  {bullets.length > 0 && (
                    <div className="px-3.5 pb-3.5 space-y-2">
                      <p className={cn("text-[9px] font-bold uppercase tracking-widest opacity-70", iconCls)}>
                        {isUpcoming ? "What To Watch" : "Key Context"}
                      </p>
                      <ul className="space-y-1.5">
                        {bullets.slice(0, 5).map((b, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <ChevronRight className={cn("h-3 w-3 mt-0.5 shrink-0 opacity-60", iconCls)} />
                            <span className="text-[11px] text-zinc-400 leading-snug">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {(cat.goldImpact || cat.usdImpact) && (
                  <div className="flex gap-2 flex-wrap">
                    <ImpactBadge impact={assetImpact.impact} label={assetShort} />
                    <ImpactBadge impact={cat.usdImpact} label="USD" />
                  </div>
                )}

                {assetImpact.reasoning && (
                  <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-amber-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">{assetLabel} Context</span>
                    </div>
                    <p className="text-[11.5px] text-zinc-300 leading-relaxed">{assetImpact.reasoning}</p>
                  </div>
                )}

                {cat.usdReasoning && (
                  <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-blue-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">USD Context</span>
                    </div>
                    <p className="text-[11.5px] text-zinc-300 leading-relaxed">{cat.usdReasoning}</p>
                  </div>
                )}

                {a?.assets && a.assets.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-600 mb-2.5">Asset Impact</p>
                    <div className="space-y-2">
                      {a.assets.map((asset) => (
                        <div key={asset.ticker || asset.name} className="rounded-lg border border-white/5 bg-white/[0.025] p-3">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-zinc-300">{asset.name}</span>
                              {asset.ticker && <span className="text-[9px] font-mono text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded">{asset.ticker}</span>}
                            </div>
                            <BiasBadge bias={asset.bias} />
                          </div>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">{asset.context}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Affected markets */}
          {cat.affectedMarkets?.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {cat.affectedMarkets.map(m => <MarketTag key={m} label={m} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CatalystCard({ cat }: { cat: Catalyst }) {
  const [open, setOpen] = React.useState(false);
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";
  const cardAssetShort = getSymbolShort(selectedSymbol);
  const cardAssetImpact = getCatalystImpactForSymbol(cat, selectedSymbol);

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
        {(cat.goldImpact || cat.usdImpact) && (
          <div className="flex items-center gap-1.5 pl-4 mb-1.5 flex-wrap">
            <ImpactBadge impact={cardAssetImpact.impact} label={cardAssetShort} />
            <ImpactBadge impact={cat.usdImpact} label="USD" />
          </div>
        )}
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
