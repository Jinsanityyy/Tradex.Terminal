"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { Newspaper, TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import type { NewsItem } from "@/types";
import { DetailModal } from "./DetailModal";
import { useSettings } from "@/contexts/SettingsContext";
import { getSymbolLabel, getSymbolShort, getImpactForSymbol } from "@/lib/assetImpact";
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
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";
  const symbolLabel = getSymbolLabel(selectedSymbol);
  const symbolShort = getSymbolShort(selectedSymbol);

  const [paragraphs, setParagraphs] = useState<string[] | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);

  useEffect(() => {
    if (!item.url) return;
    setArticleLoading(true);
    setParagraphs(null);
    fetch(`/api/market/news/article?url=${encodeURIComponent(item.url)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.paragraphs?.length) setParagraphs(data.paragraphs); })
      .catch(() => {})
      .finally(() => setArticleLoading(false));
  }, [item.url]);

  const assetImpact = getImpactForSymbol({
    goldImpact: item.goldImpact,
    goldReasoning: item.goldReasoning,
    usdImpact: item.usdImpact,
    usdReasoning: item.usdReasoning,
    sentimentTag: item.sentiment,
  }, selectedSymbol);

  const impactColor =
    assetImpact.impact === "bullish" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" :
    assetImpact.impact === "bearish" ? "text-red-400 bg-red-500/10 border-red-500/25" :
    "text-zinc-400 bg-zinc-500/10 border-zinc-600/30";

  // Reasoning is non-trivial only if it's not just the generic "Neutral macro..." fallback
  const meaningfulReasoning = (() => {
    const r = assetImpact.reasoning;
    if (!r || r.toLowerCase().startsWith("neutral macro backdrop")) return null;
    return r;
  })();

  // Article body: fetched full content > RSS summary > headline (wire items have no body)
  // Use summary if paragraphs is null (not yet fetched) OR empty (paywall/no content)
  const bodyParagraphs: string[] = (paragraphs && paragraphs.length > 0)
    ? paragraphs
    : item.summary
      ? [item.summary]
      : [item.headline];

  return (
    <div className="space-y-5">
      {/* Source · time · category */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-zinc-300">{item.source}</span>
        <span className="text-zinc-700">·</span>
        <span className="text-[11px] text-zinc-500">{timeAgo(item.timestamp)}</span>
        <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-zinc-500 uppercase">
          {item.category.replace("-", " ")}
        </span>
      </div>

      {/* Article body */}
      {articleLoading ? (
        <div className="space-y-2.5">
          {[1, 0.9, 0.7, 0.5].map((w, i) => (
            <div key={i} className="h-3.5 rounded bg-white/5 animate-pulse" style={{ width: `${w * 100}%` }} />
          ))}
        </div>
      ) : bodyParagraphs.length > 0 ? (
        <div className="space-y-3">
          {bodyParagraphs.map((p, i) => (
            <p key={i} className="text-[14px] text-zinc-200 leading-[1.75]">{p}</p>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-zinc-500 italic">
          Article content unavailable for this wire item.
        </p>
      )}

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* Impact on selected symbol */}
      <div className={cn("rounded-xl border px-4 py-3 space-y-2", impactColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 opacity-70" />
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{symbolLabel} Impact</span>
          </div>
          <ImpactBadge impact={assetImpact.impact} label={symbolShort} />
        </div>
        {meaningfulReasoning && (
          <p className="text-[12px] leading-relaxed opacity-90">{meaningfulReasoning}</p>
        )}
      </div>

      {/* Tags row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={item.sentiment}>
          {item.sentiment === "bullish" ? "RISK-ON" : item.sentiment === "bearish" ? "RISK-OFF" : "NEUTRAL"}
        </Badge>
        <span className={cn(
          "text-[10px] font-mono font-bold px-2 py-0.5 rounded",
          item.impactScore >= 8 ? "bg-red-500/15 text-red-400" :
          item.impactScore >= 6 ? "bg-amber-500/15 text-amber-400" :
          "bg-zinc-800 text-zinc-400"
        )}>
          {item.impactScore}/10
        </span>
        {item.affectedAssets?.map((a) => (
          <span key={a} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-zinc-500">
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

export function NewsFeed({ items, limit, compact = false }: NewsFeedProps) {
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";
  const symbolShort = getSymbolShort(selectedSymbol);

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
                  <ImpactBadge
                    impact={getImpactForSymbol({ goldImpact: item.goldImpact, usdImpact: item.usdImpact, goldReasoning: item.goldReasoning, usdReasoning: item.usdReasoning, sentimentTag: item.sentiment }, selectedSymbol).impact}
                    label={symbolShort}
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
