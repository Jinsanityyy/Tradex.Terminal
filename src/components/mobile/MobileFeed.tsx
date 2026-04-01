"use client";

import React, { useState } from "react";
import { useCatalysts, useEconomicCalendar, useTrumpPosts } from "@/hooks/useMarketData";
import { cn } from "@/lib/utils";
import { Zap, CalendarDays, AtSign, TrendingUp, TrendingDown, Minus, Target, Shield } from "lucide-react";
import { DetailModal } from "@/components/shared/DetailModal";
import type { Catalyst, EconomicEvent } from "@/types";

type Tab = "catalysts" | "calendar" | "trump";

interface TrumpPost {
  content: string;
  timestamp: string;
  sentimentClassification?: string;
  marketImplication?: string;
  affectedAssets?: string[];
}

export function MobileFeed() {
  const [tab, setTab] = useState<Tab>("catalysts");
  const { catalysts } = useCatalysts();
  const { events } = useEconomicCalendar();
  const { posts } = useTrumpPosts();

  const [selectedCatalyst, setSelectedCatalyst] = useState<Catalyst | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EconomicEvent | null>(null);
  const [selectedPost, setSelectedPost] = useState<TrumpPost | null>(null);

  const tabs: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { id: "catalysts", label: "Catalysts", Icon: Zap },
    { id: "calendar",  label: "Calendar",  Icon: CalendarDays },
    { id: "trump",     label: "Trump",     Icon: AtSign },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="px-4 pt-3 pb-0 flex gap-1 shrink-0 border-b border-white/5">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider border-b-2 transition-all -mb-px",
              tab === id
                ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                : "border-transparent text-[hsl(var(--muted-foreground))]"
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">

        {/* Catalysts */}
        {tab === "catalysts" && (
          catalysts.length === 0
            ? <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-8">No catalysts available</p>
            : catalysts.map((c, i) => (
              <div key={i} onClick={() => setSelectedCatalyst(c)} className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5 active:bg-[hsl(var(--secondary))] cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-medium text-[hsl(var(--foreground))] leading-snug flex-1">{c.title}</p>
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase",
                    c.importance === "high" ? "bg-red-500/15 text-red-400" :
                    c.importance === "medium" ? "bg-amber-500/15 text-amber-400" :
                    "bg-zinc-500/15 text-zinc-400"
                  )}>
                    {c.importance}
                  </span>
                </div>
                {c.explanation && <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed">{c.explanation}</p>}
                <div className="flex items-center gap-2 mt-2">
                  {c.affectedMarkets?.[0] && <span className="text-[9px] text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-1.5 py-0.5 rounded">{c.affectedMarkets[0]}</span>}
                  {c.status && <span className="text-[9px] text-[hsl(var(--muted-foreground))]">{c.status}</span>}
                </div>
              </div>
            ))
        )}

        {/* Calendar */}
        {tab === "calendar" && (
          events.length === 0
            ? <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-8">No events available</p>
            : events.map((e, i) => (
              <div key={i} onClick={() => setSelectedEvent(e)} className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5 active:bg-[hsl(var(--secondary))] cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-medium text-[hsl(var(--foreground))] leading-snug flex-1">{e.event}</p>
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase",
                    e.impact === "high" ? "bg-red-500/15 text-red-400" :
                    e.impact === "medium" ? "bg-amber-500/15 text-amber-400" :
                    "bg-zinc-500/15 text-zinc-400"
                  )}>
                    {e.impact}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[9px] text-[hsl(var(--muted-foreground))]">
                  <span>{e.currency}</span>
                  {e.time && <span>{e.time}</span>}
                  {e.actual !== undefined && e.actual !== null && (
                    <span className="text-emerald-400">A: {e.actual}</span>
                  )}
                  {e.forecast !== undefined && e.forecast !== null && (
                    <span>F: {e.forecast}</span>
                  )}
                </div>
                {e.goldImpact && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-semibold",
                      e.goldImpact === "bullish" ? "bg-emerald-500/15 text-emerald-400" :
                      e.goldImpact === "bearish" ? "bg-red-500/15 text-red-400" :
                      "bg-zinc-500/15 text-zinc-400"
                    )}>
                      GOLD {e.goldImpact?.toUpperCase()}
                    </span>
                    {e.usdImpact && (
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-semibold",
                        e.usdImpact === "bullish" ? "bg-blue-500/15 text-blue-400" :
                        e.usdImpact === "bearish" ? "bg-red-500/15 text-red-400" :
                        "bg-zinc-500/15 text-zinc-400"
                      )}>
                        USD {e.usdImpact?.toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
        )}

        {/* Trump */}
        {tab === "trump" && (
          posts.length === 0
            ? <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-8">No posts available</p>
            : posts.map((p, i) => (
              <div key={i} onClick={() => setSelectedPost(p as TrumpPost)} className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5 active:bg-[hsl(var(--secondary))] cursor-pointer">
                <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed mb-2">{p.content}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-[hsl(var(--muted-foreground))]">{p.timestamp}</span>
                  {p.sentimentClassification && (
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                      p.sentimentClassification === "bullish" ? "bg-emerald-500/15 text-emerald-400" :
                      p.sentimentClassification === "bearish" ? "bg-red-500/15 text-red-400" :
                      "bg-amber-500/15 text-amber-400"
                    )}>
                      {p.sentimentClassification}
                    </span>
                  )}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Catalyst Detail Modal */}
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

      {/* Calendar Event Detail Modal */}
      <DetailModal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={selectedEvent?.event}>
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{selectedEvent.currency} · {selectedEvent.time}</span>
              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
                selectedEvent.impact === "high" ? "bg-red-500/15 text-red-400" :
                selectedEvent.impact === "medium" ? "bg-amber-500/15 text-amber-400" :
                "bg-zinc-500/15 text-zinc-400"
              )}>{selectedEvent.impact} impact</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Forecast", value: selectedEvent.forecast, color: "text-blue-400" },
                { label: "Previous", value: selectedEvent.previous, color: "text-gray-400" },
                { label: "Actual",   value: selectedEvent.actual || "—", color: selectedEvent.actual ? "text-[hsl(var(--primary))]" : "text-gray-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg bg-[hsl(var(--secondary))] p-3 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">{label}</p>
                  <p className={cn("text-sm font-bold font-mono", color)}>{value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {selectedEvent.goldImpact && (
                <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                  selectedEvent.goldImpact === "bullish" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                  selectedEvent.goldImpact === "bearish" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                  "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                )}>
                  {selectedEvent.goldImpact === "bullish" ? <TrendingUp className="h-2.5 w-2.5" /> : selectedEvent.goldImpact === "bearish" ? <TrendingDown className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                  GOLD {selectedEvent.goldImpact.toUpperCase()}
                </span>
              )}
              {selectedEvent.usdImpact && (
                <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                  selectedEvent.usdImpact === "bullish" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" :
                  selectedEvent.usdImpact === "bearish" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                  "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
                )}>
                  {selectedEvent.usdImpact === "bullish" ? <TrendingUp className="h-2.5 w-2.5" /> : selectedEvent.usdImpact === "bearish" ? <TrendingDown className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                  USD {selectedEvent.usdImpact.toUpperCase()}
                </span>
              )}
            </div>
            {selectedEvent.goldReasoning && (
              <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Gold Analysis</span>
                </div>
                <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{selectedEvent.goldReasoning}</p>
              </div>
            )}
            {selectedEvent.usdReasoning && (
              <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">USD Analysis</span>
                </div>
                <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{selectedEvent.usdReasoning}</p>
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* Trump Post Detail Modal */}
      <DetailModal open={!!selectedPost} onClose={() => setSelectedPost(null)} title="Trump Post Analysis">
        {selectedPost && (
          <div className="space-y-4">
            <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5">
              <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{selectedPost.content}</p>
              <p className="text-[9px] text-[hsl(var(--muted-foreground))] mt-2">{selectedPost.timestamp}</p>
            </div>
            {selectedPost.sentimentClassification && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Sentiment</span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                  selectedPost.sentimentClassification === "bullish" ? "bg-emerald-500/15 text-emerald-400" :
                  selectedPost.sentimentClassification === "bearish" ? "bg-red-500/15 text-red-400" :
                  "bg-amber-500/15 text-amber-400"
                )}>{selectedPost.sentimentClassification}</span>
              </div>
            )}
            {selectedPost.marketImplication && (
              <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">Market Implication</p>
                <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{selectedPost.marketImplication}</p>
              </div>
            )}
            {selectedPost.affectedAssets && selectedPost.affectedAssets.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Affected Assets</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPost.affectedAssets.map((a) => (
                    <span key={a} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
