"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { Newspaper, TrendingUp, TrendingDown, Minus, Target, Shield } from "lucide-react";
import type { NewsItem } from "@/types";
import { DetailModal } from "./DetailModal";

interface NewsFeedProps {
  items: NewsItem[];
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

function NewsDetail({ item }: { item: NewsItem }) {
  const sentimentColor =
    item.sentiment === "bullish" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
    item.sentiment === "bearish" ? "text-red-400 bg-red-500/10 border-red-500/20" :
    "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";

  const SentimentIcon =
    item.sentiment === "bullish" ? TrendingUp :
    item.sentiment === "bearish" ? TrendingDown : Minus;

  return (
    <div className="space-y-4">
      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={item.sentiment}>{item.sentiment}</Badge>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] uppercase">
          {item.category.replace("-", " ")}
        </span>
        <span className="text-[10px] text-[hsl(var(--muted-foreground))] ml-auto">
          {item.source} · {timeAgo(item.timestamp)}
        </span>
      </div>

      {/* Impact score */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-[hsl(var(--secondary))] px-4 py-2.5 text-center">
          <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-0.5">Impact Score</p>
          <p className={cn(
            "text-xl font-bold font-mono",
            item.impactScore >= 8 ? "text-red-400" :
            item.impactScore >= 6 ? "text-amber-400" : "text-[hsl(var(--primary))]"
          )}>
            {item.impactScore}<span className="text-xs text-[hsl(var(--muted-foreground))]">/10</span>
          </p>
        </div>
        <div className={cn("flex-1 rounded-lg border px-3 py-2.5 flex items-center gap-2", sentimentColor)}>
          <SentimentIcon className="h-4 w-4 shrink-0" />
          <div>
            <p className="text-[9px] uppercase tracking-wider opacity-70 mb-0.5">Market Sentiment</p>
            <p className="text-sm font-bold capitalize">{item.sentiment}</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      {item.summary && (
        <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">Summary</p>
          <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{item.summary}</p>
        </div>
      )}

      {/* Gold + USD directional impact */}
      {(item.goldImpact || item.usdImpact) && (
        <>
          <div className="flex gap-2 flex-wrap">
            <ImpactBadge impact={item.goldImpact} label="GOLD" />
            <ImpactBadge impact={item.usdImpact} label="USD" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {item.goldReasoning && (
              <div className="rounded-lg bg-[hsl(var(--secondary))] p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3 w-3 text-amber-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Gold Context</span>
                </div>
                <p className="text-[11px] text-[hsl(var(--foreground))] leading-relaxed">{item.goldReasoning}</p>
              </div>
            )}
            {item.usdReasoning && (
              <div className="rounded-lg bg-[hsl(var(--secondary))] p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-blue-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">USD Context</span>
                </div>
                <p className="text-[11px] text-[hsl(var(--foreground))] leading-relaxed">{item.usdReasoning}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* What it means for traders */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1.5">What It Means For Traders</p>
        <p className="text-xs text-gray-300 leading-relaxed">
          {item.sentiment === "bullish"
            ? `Bullish signal — this news supports upside momentum. Watch for breakout entries on affected assets. Confirm with price action before entering.`
            : item.sentiment === "bearish"
            ? `Bearish signal — this news adds downside pressure. Look for distribution patterns on affected assets. Avoid buying into weakness without confirmation.`
            : `Neutral/mixed signal — no strong directional bias. Use as background context. Wait for clearer price action before acting.`}
        </p>
      </div>

      {/* Affected assets */}
      {item.affectedAssets?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Affected Assets</p>
          <div className="flex flex-wrap gap-1.5">
            {item.affectedAssets.map((a) => (
              <span key={a} className="text-[10px] font-mono px-2 py-1 rounded-md bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function NewsFeed({ items, limit, compact = false }: NewsFeedProps) {
  const displayed = limit ? items.slice(0, limit) : items;
  const [selected, setSelected] = useState<NewsItem | null>(null);

  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-10 gap-3">
        <div className="h-10 w-10 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center">
          <Newspaper className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">No posts matching this filter.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        {displayed.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelected(item)}
            className={cn(
              "group rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 transition-colors hover:bg-[hsl(var(--secondary))] cursor-pointer",
              item.impactScore >= 8 && "border-amber-500/20"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] leading-tight mb-1">
                  {item.headline}
                </h4>
                {!compact && (
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed mb-1.5 line-clamp-2">
                    {item.summary}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={item.sentiment}>{item.sentiment}</Badge>
                  <ImpactBadge impact={item.goldImpact} label="GOLD" />
                  <ImpactBadge impact={item.usdImpact} label="USD" />
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                    {item.category}
                  </span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] ml-auto shrink-0">
                    {item.source} · {timeAgo(item.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.headline}
      >
        {selected && <NewsDetail item={selected} />}
      </DetailModal>
    </>
  );
}
