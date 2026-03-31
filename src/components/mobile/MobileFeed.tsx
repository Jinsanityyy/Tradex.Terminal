"use client";

import React, { useState } from "react";
import { useCatalysts, useEconomicCalendar, useTrumpPosts } from "@/hooks/useMarketData";
import { cn } from "@/lib/utils";
import { Zap, CalendarDays, AtSign } from "lucide-react";

type Tab = "catalysts" | "calendar" | "trump";

export function MobileFeed() {
  const [tab, setTab] = useState<Tab>("catalysts");
  const { catalysts } = useCatalysts();
  const { events } = useEconomicCalendar();
  const { posts } = useTrumpPosts();

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
              <div key={i} className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-medium text-[hsl(var(--foreground))] leading-snug flex-1">{c.title}</p>
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase",
                    c.impact === "high" ? "bg-red-500/15 text-red-400" :
                    c.impact === "medium" ? "bg-amber-500/15 text-amber-400" :
                    "bg-zinc-500/15 text-zinc-400"
                  )}>
                    {c.impact}
                  </span>
                </div>
                {c.description && <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed">{c.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  {c.asset && <span className="text-[9px] text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-1.5 py-0.5 rounded">{c.asset}</span>}
                  {c.source && <span className="text-[9px] text-[hsl(var(--muted-foreground))]">{c.source}</span>}
                </div>
              </div>
            ))
        )}

        {/* Calendar */}
        {tab === "calendar" && (
          events.length === 0
            ? <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-8">No events available</p>
            : events.map((e, i) => (
              <div key={i} className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-medium text-[hsl(var(--foreground))] leading-snug flex-1">{e.name}</p>
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
                {/* Gold/USD impact badges */}
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
              <div key={i} className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5">
                <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed mb-2">{p.content}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-[hsl(var(--muted-foreground))]">{p.timestamp}</span>
                  {p.marketImpact && (
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                      p.marketImpact === "bullish" ? "bg-emerald-500/15 text-emerald-400" :
                      p.marketImpact === "bearish" ? "bg-red-500/15 text-red-400" :
                      "bg-amber-500/15 text-amber-400"
                    )}>
                      {p.marketImpact}
                    </span>
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
