"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Radio } from "lucide-react";
import type { NewsItem } from "@/types";

interface LiveNewsTickerProps {
  items: NewsItem[];
  isLive?: boolean;
}

function SentimentDot({ sentiment }: { sentiment?: string }) {
  if (sentiment === "bullish") return <TrendingUp className="h-2.5 w-2.5 text-emerald-400 shrink-0" />;
  if (sentiment === "bearish") return <TrendingDown className="h-2.5 w-2.5 text-red-400 shrink-0" />;
  return <Minus className="h-2.5 w-2.5 text-zinc-500 shrink-0" />;
}

function sentimentColor(s?: string) {
  if (s === "bullish") return "text-emerald-300";
  if (s === "bearish") return "text-red-300";
  return "text-zinc-300";
}

export function LiveNewsTicker({ items, isLive = false }: LiveNewsTickerProps) {
  const [speed, setSpeed] = useState(60);
  const trackRef = useRef<HTMLDivElement>(null);

  // Adjust speed based on number of items so it feels consistent
  useEffect(() => {
    if (items.length > 0) {
      setSpeed(Math.max(40, Math.min(90, items.length * 4)));
    }
  }, [items.length]);

  if (items.length === 0) return null;

  // Duplicate items so the scroll loops seamlessly
  const doubled = [...items, ...items];

  return (
    <div className="relative flex items-center border-y border-white/8 bg-[#09090c] overflow-hidden h-9">
      {/* LIVE badge  -  static on the left */}
      <div className="shrink-0 flex items-center gap-1.5 px-3 border-r border-white/8 h-full bg-[#0d0e12] z-10">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-400">Live</span>
      </div>

      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={trackRef}
          className="ticker-track"
          style={{ animationDuration: `${speed}s` }}
        >
          {doubled.map((item, i) => (
            <span key={`${item.id}-${i}`} className="inline-flex items-center gap-2 px-5 border-r border-white/5">
              <SentimentDot sentiment={item.sentiment} />
              <span className={cn("text-[11px] font-medium whitespace-nowrap", sentimentColor(item.sentiment))}>
                {item.headline}
              </span>
              <span className="text-[9px] text-zinc-600 whitespace-nowrap">{item.source}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Fade edges */}
      <div className="absolute left-[88px] top-0 h-full w-8 pointer-events-none bg-gradient-to-r from-[#09090c] to-transparent z-10" />
      <div className="absolute right-0 top-0 h-full w-12 pointer-events-none bg-gradient-to-l from-[#09090c] to-transparent z-10" />
    </div>
  );
}
