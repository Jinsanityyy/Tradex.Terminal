"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { Newspaper, TrendingUp, TrendingDown, Minus, Target, Shield, BookOpen, ChevronRight } from "lucide-react";
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
  const borderCls = item.sentiment === "bullish" ? "border-emerald-500/25" : item.sentiment === "bearish" ? "border-red-500/25" : "border-zinc-600/30";
  const bgCls     = item.sentiment === "bullish" ? "bg-emerald-500/[0.04]" : item.sentiment === "bearish" ? "bg-red-500/[0.04]"    : "bg-zinc-800/20";
  const divCls    = item.sentiment === "bullish" ? "border-emerald-500/15" : item.sentiment === "bearish" ? "border-red-500/15"    : "border-zinc-700/30";
  const iconCls   = item.sentiment === "bullish" ? "text-emerald-400"      : item.sentiment === "bearish" ? "text-red-400"         : "text-zinc-500";

  const bullets: string[] = [
    item.sentiment === "bullish"
      ? "Risk-on macro backdrop  -  broad risk appetite rising; this typically lifts equities and USD while reducing safe-haven demand for Gold"
      : item.sentiment === "bearish"
      ? "Risk-off macro backdrop  -  defensive positioning; expect flows into safe-havens (Gold, JPY, CHF) and out of risk assets"
      : "Neutral macro backdrop  -  no strong directional signal; focus on Gold/USD specific analysis below",
    item.goldImpact === "bullish"
      ? "Gold expected to bid higher  -  watch for breakout above session resistance"
      : item.goldImpact === "bearish"
      ? "Gold faces selling pressure  -  identify key support levels before considering bounce entries"
      : null,
    item.usdImpact === "bullish"
      ? "USD strength likely  -  DXY breakout above resistance confirms the signal"
      : item.usdImpact === "bearish"
      ? "USD weakness likely  -  EURUSD and GBPUSD benefit from dollar selling pressure"
      : null,
    item.impactScore >= 8 ? `High impact score (${item.impactScore}/10)  -  this news warrants immediate attention and position review` : null,
  ].filter((b): b is string => Boolean(b));

  return (
    <div className="space-y-4">
      {/* Meta + impact row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={item.sentiment}>
          {item.sentiment === "bullish" ? "RISK-ON" : item.sentiment === "bearish" ? "RISK-OFF" : "NEUTRAL"}
        </Badge>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] uppercase">
          {item.category.replace("-", " ")}
        </span>
        <span className={cn(
          "text-[10px] font-mono font-bold px-2 py-0.5 rounded",
          item.impactScore >= 8 ? "bg-red-500/15 text-red-400" :
          item.impactScore >= 6 ? "bg-amber-500/15 text-amber-400" :
          "bg-zinc-800 text-zinc-400"
        )}>
          {item.impactScore}/10
        </span>
        <span className="text-[10px] text-[hsl(var(--muted-foreground))] ml-auto">
          {item.source} · {timeAgo(item.timestamp)}
        </span>
      </div>

      {/* ── NEWS ANALYSIS BLOCK (uniform format) ─────────────────────────── */}
      <div className={cn("rounded-xl border overflow-hidden", borderCls, bgCls)}>
        <div className={cn("flex items-center gap-2 px-3.5 py-2.5 border-b", divCls)}>
          <BookOpen className={cn("h-3.5 w-3.5", iconCls)} />
          <span className={cn("text-[10px] font-bold uppercase tracking-widest", iconCls)}>News Analysis</span>
          <span className={cn("ml-auto text-[9px] uppercase tracking-wider opacity-50", iconCls)}>
            {item.category.replace("-", " ")}
          </span>
        </div>
        <div className="px-3.5 py-3">
          <p className="text-[12px] text-zinc-200 leading-relaxed">{item.summary}</p>
        </div>
        {bullets.length > 0 && (
          <div className="px-3.5 pb-3.5 space-y-2">
            <p className={cn("text-[9px] font-bold uppercase tracking-widest opacity-70", iconCls)}>Key Context</p>
            <ul className="space-y-1.5">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ChevronRight className={cn("h-3 w-3 mt-0.5 shrink-0 opacity-60", iconCls)} />
                  <span className="text-[11px] text-zinc-400 leading-snug">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Gold + USD badges  -  prevent both showing bullish (inverse assets) */}
      {(item.goldImpact || item.usdImpact) && (
        <div className="flex gap-2 flex-wrap">
          <ImpactBadge impact={item.goldImpact} label="GOLD" />
          <ImpactBadge
            impact={item.goldImpact === "bullish" && item.usdImpact === "bullish" ? "neutral" : item.usdImpact}
            label="USD"
          />
        </div>
      )}

      {/* Gold context */}
      {item.goldReasoning && (
        <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Gold Context</span>
          </div>
          <p className="text-[11.5px] text-[hsl(var(--foreground))] leading-relaxed">{item.goldReasoning}</p>
        </div>
      )}

      {/* USD context */}
      {item.usdReasoning && (
        <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">USD Context</span>
          </div>
          <p className="text-[11.5px] text-[hsl(var(--foreground))] leading-relaxed">{item.usdReasoning}</p>
        </div>
      )}

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
                  <Badge variant={item.sentiment}>
                    {item.sentiment === "bullish" ? "RISK-ON" : item.sentiment === "bearish" ? "RISK-OFF" : "NEUTRAL"}
                  </Badge>
                  <ImpactBadge impact={item.goldImpact} label="GOLD" />
                  <ImpactBadge
                    impact={item.goldImpact === "bullish" && item.usdImpact === "bullish" ? "neutral" : item.usdImpact}
                    label="USD"
                  />
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
