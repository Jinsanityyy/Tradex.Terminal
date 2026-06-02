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

// ── Price-only highlighter ────────────────────────────────────────────────────
const PRICE_RE = /(\$[\d,]+(?:\.\d+)?[KMBTk]?|\b\d+\.?\d*%)/g;

function PriceHighlight({ text }: { text: string }) {
  const parts: { text: string; isPrice: boolean }[] = [];
  let last = 0, m: RegExpExecArray | null;
  PRICE_RE.lastIndex = 0;
  while ((m = PRICE_RE.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), isPrice: false });
    parts.push({ text: m[0], isPrice: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), isPrice: false });
  return (
    <>
      {parts.map((p, i) =>
        p.isPrice
          ? <span key={i} className="font-semibold" style={{ color: "var(--t-accent)" }}>{p.text}</span>
          : <span key={i}>{p.text}</span>
      )}
    </>
  );
}

// ── Bias badge ────────────────────────────────────────────────────────────────
function BiasBadge({ bias }: { bias: string }) {
  const b = bias.toLowerCase();
  const s =
    b === "bullish" ? { color: "var(--t-bullish)", bg: "color-mix(in srgb, var(--t-bullish) 15%, transparent)", border: "color-mix(in srgb, var(--t-bullish) 30%, transparent)" } :
    b === "bearish" ? { color: "var(--t-bearish)", bg: "color-mix(in srgb, var(--t-bearish) 15%, transparent)", border: "color-mix(in srgb, var(--t-bearish) 30%, transparent)" } :
                      { color: "var(--t-muted)",   bg: "color-mix(in srgb, var(--t-muted)   10%, transparent)", border: "var(--t-border)" };
  const Icon = b === "bullish" ? TrendingUp : b === "bearish" ? TrendingDown : Minus;
  const label = b === "bullish" ? "RISK-ON" : b === "bearish" ? "RISK-OFF" : "NEUTRAL";
  return (
    <span
      className="inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0"
      style={{ color: s.color, background: s.bg, borderColor: s.border, borderRadius: "var(--t-badge-radius)" }}
    >
      <Icon className="h-2.5 w-2.5" />{label}
    </span>
  );
}

// ── ImpactBadge (used in detail modal) ───────────────────────────────────────
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

// ── Detail modal body ─────────────────────────────────────────────────────────
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

  const meaningfulReasoning = (() => {
    const r = assetImpact.reasoning;
    if (!r || r.toLowerCase().startsWith("neutral macro backdrop")) return null;
    return r;
  })();

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

// ── Preview card (callisto style) ─────────────────────────────────────────────
function NewsCard({
  item, index, selectedSymbol, onClick,
}: {
  item: NewsItem;
  index: number;
  selectedSymbol: string;
  onClick: () => void;
}) {
  const assetShort = getSymbolShort(selectedSymbol);
  const assetImpact = getImpactForSymbol({
    goldImpact: item.goldImpact, usdImpact: item.usdImpact,
    goldReasoning: item.goldReasoning, usdReasoning: item.usdReasoning,
    sentimentTag: item.sentiment,
  }, selectedSymbol);

  const bias = item.sentiment ?? "neutral";
  const accentColor =
    bias === "bearish" ? "var(--t-bearish)" :
    bias === "bullish" ? "var(--t-bullish)" :
                         "var(--t-border)";

  const impactLabel = item.impactScore >= 7 ? "HIGH" : item.impactScore >= 5 ? "MED" : "LOW";
  const impactColor =
    item.impactScore >= 7 ? "var(--t-bearish)" :
    item.impactScore >= 5 ? "var(--t-accent)" :
    "var(--t-muted)";

  const categoryLabel = item.category.replace(/-/g, " ").toUpperCase();

  return (
    <div
      onClick={onClick}
      className="cursor-pointer active:opacity-80 transition-opacity overflow-hidden"
      style={{
        borderRadius: "var(--t-card-radius)",
        border: "1px solid var(--t-border)",
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
        background: "var(--t-card)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2" style={{ borderBottom: "1px solid var(--t-border)" }}>
        <div className="flex items-center gap-2">
          <Newspaper className="h-3 w-3" style={{ color: "var(--t-muted)" }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--t-muted)" }}>
            NEWS #{index + 1} · {categoryLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: impactColor }}>● {impactLabel}</span>
          <span className="text-[8px]" style={{ color: "var(--t-muted)", opacity: 0.45 }}>{timeAgo(item.timestamp)}</span>
        </div>
      </div>

      <div className="px-3.5 pt-2.5 pb-3">
        {/* Headline + bias badge */}
        <div className="flex items-start gap-2 mb-2.5">
          <h3 className="text-[12.5px] font-black uppercase leading-snug flex-1 min-w-0" style={{ color: "var(--t-text)" }}>
            {item.headline}
          </h3>
          <BiasBadge bias={bias} />
        </div>

        {/* Asset + source chips */}
        <div className="flex flex-wrap gap-1 mb-3">
          {item.affectedAssets?.slice(0, 4).map(a => (
            <span key={a} className="text-[8.5px] font-mono px-1.5 py-0.5"
              style={{ color: "var(--t-muted)", background: "color-mix(in srgb, var(--t-text) 5%, transparent)", borderRadius: "var(--t-badge-radius)", border: "1px solid var(--t-border)" }}>
              {a}
            </span>
          ))}
          {assetImpact.impact && (
            <span className="text-[8.5px] font-bold px-1.5 py-0.5"
              style={{
                color: assetImpact.impact === "bullish" ? "var(--t-bullish)" : assetImpact.impact === "bearish" ? "var(--t-bearish)" : "var(--t-muted)",
                background: assetImpact.impact === "bullish" ? "color-mix(in srgb, var(--t-bullish) 12%, transparent)" : assetImpact.impact === "bearish" ? "color-mix(in srgb, var(--t-bearish) 12%, transparent)" : "color-mix(in srgb, var(--t-muted) 10%, transparent)",
                borderRadius: "var(--t-badge-radius)",
                border: `1px solid ${assetImpact.impact === "bullish" ? "color-mix(in srgb, var(--t-bullish) 25%, transparent)" : assetImpact.impact === "bearish" ? "color-mix(in srgb, var(--t-bearish) 25%, transparent)" : "var(--t-border)"}`,
              }}>
              {assetShort} {assetImpact.impact.toUpperCase()}
            </span>
          )}
          <span className="text-[8.5px] font-mono px-1.5 py-0.5"
            style={{ color: "var(--t-muted)", background: "color-mix(in srgb, var(--t-text) 5%, transparent)", borderRadius: "var(--t-badge-radius)", border: "1px solid var(--t-border)" }}>
            {item.source}
          </span>
        </div>

        {/* Summary with price highlights */}
        {item.summary && (
          <p className="text-[11px] leading-relaxed mb-3 line-clamp-3" style={{ color: "var(--t-muted)" }}>
            <PriceHighlight text={item.summary} />
          </p>
        )}

        {/* Tap hint */}
        <p className="text-[9px] text-right" style={{ color: "var(--t-muted)", opacity: 0.4 }}>
          Tap for full analysis →
        </p>
      </div>
    </div>
  );
}

// ── Feed ──────────────────────────────────────────────────────────────────────
export function NewsFeed({ items, limit, compact = false }: NewsFeedProps) {
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";

  const displayed = limit ? items.slice(0, limit) : items;
  const [selected, setSelected] = useState<NewsItem | null>(null);

  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center"
        style={{ borderRadius: "var(--t-card-radius)", border: "1px solid var(--t-border)" }}>
        <Newspaper className="h-5 w-5" style={{ color: "var(--t-muted)" }} />
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>No news available</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {displayed.map((item, i) => (
          <NewsCard
            key={item.id}
            item={item}
            index={i}
            selectedSymbol={selectedSymbol}
            onClick={() => setSelected(item)}
          />
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
