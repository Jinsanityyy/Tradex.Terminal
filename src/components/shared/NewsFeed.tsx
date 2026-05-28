"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus,
  Target, ChevronLeft, ChevronRight, Newspaper,
  BookOpen, Zap,
} from "lucide-react";
import type { NewsItem } from "@/types";
import { useSettings } from "@/contexts/SettingsContext";
import { getSymbolLabel, getSymbolShort, getImpactForSymbol } from "@/lib/assetImpact";

interface NewsFeedProps {
  items: NewsItem[];
  limit?: number;
  compact?: boolean;
}

// ── Sentiment / impact helpers ──────────────────────────────────────────────

function sentimentChip(s: string) {
  if (s === "bullish") return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25";
  if (s === "bearish") return "bg-red-500/15 text-red-400 border border-red-500/25";
  return "bg-zinc-800/60 text-zinc-400 border border-zinc-700/40";
}

function sentimentLabel(s: string) {
  return s === "bullish" ? "RISK-ON" : s === "bearish" ? "RISK-OFF" : "NEUTRAL";
}

function impactColor(score: number) {
  if (score >= 8) return "text-red-400";
  if (score >= 6) return "text-amber-400";
  return "text-zinc-500";
}

function ImpactBadge({ impact, label }: { impact?: "bullish" | "bearish" | "neutral"; label: string }) {
  if (!impact) return null;
  const Icon = impact === "bullish" ? TrendingUp : impact === "bearish" ? TrendingDown : Minus;
  const cls = {
    bullish: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    bearish: "bg-red-500/15 text-red-400 border-red-500/30",
    neutral: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  }[impact];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", cls)}>
      <Icon className="h-2.5 w-2.5" />
      {label} {impact.toUpperCase()}
    </span>
  );
}

// ── Full-screen article reader ──────────────────────────────────────────────

function ArticleReader({
  item,
  idx,
  total,
  onBack,
  onPrev,
  onNext,
}: {
  item: NewsItem;
  idx: number;
  total: number;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";
  const symbolLabel    = getSymbolLabel(selectedSymbol);
  const symbolShort    = getSymbolShort(selectedSymbol);

  const assetImpact = getImpactForSymbol({
    goldImpact:    item.goldImpact,
    goldReasoning: item.goldReasoning,
    usdImpact:     item.usdImpact,
    usdReasoning:  item.usdReasoning,
    sentimentTag:  item.sentiment,
  }, selectedSymbol);

  const contextBullets: string[] = [
    item.sentiment === "bullish"
      ? "Risk-on macro backdrop — broad risk appetite rising"
      : item.sentiment === "bearish"
      ? "Risk-off macro backdrop — defensive positioning expected"
      : "Neutral macro backdrop — no strong directional signal",
    item.impactScore >= 8
      ? `High impact (${item.impactScore}/10) — warrants immediate attention`
      : null,
  ].filter((b): b is string => Boolean(b));

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-zinc-500 active:text-zinc-200 transition-colors py-1 -ml-0.5"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          <span className="text-[11px] uppercase tracking-wider font-medium">Feed</span>
        </button>
        {/* Source branding — TradingView style */}
        <div className="text-right">
          <p className="text-[7.5px] font-semibold tracking-[0.18em] text-zinc-700 uppercase leading-none">
            Powered by
          </p>
          <p className="text-[10px] font-bold tracking-[0.08em] text-zinc-500 uppercase leading-none mt-[2px]">
            {item.source}
          </p>
        </div>
      </div>

      {/* ── Scrollable article body ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-5 pb-16">

        {/* Category + time + impact */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-[9.5px] font-bold uppercase tracking-[0.12em] px-2 py-[3px] rounded-full", sentimentChip(item.sentiment))}>
            {sentimentLabel(item.sentiment)}
          </span>
          <span className="text-[10px] font-mono px-2 py-[3px] rounded-full bg-zinc-800/60 text-zinc-500 border border-zinc-700/40 uppercase">
            {item.category.replace(/-/g, " ")}
          </span>
          <span className={cn("text-[10px] font-mono font-bold ml-auto shrink-0", impactColor(item.impactScore))}>
            {item.impactScore}/10
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-[21px] font-bold text-zinc-100 leading-[1.28] tracking-[-0.01em]">
          {item.headline}
        </h2>

        {/* Timestamp */}
        <p className="text-[11px] text-zinc-600 -mt-2">
          {new Date(item.timestamp).toLocaleString(undefined, {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })} · {timeAgo(item.timestamp)}
        </p>

        {/* Asset impact chip */}
        <div className="flex gap-2 flex-wrap">
          <ImpactBadge impact={assetImpact.impact} label={symbolShort} />
        </div>

        {/* Body text — only real summaries, not the derived reasoning fallback */}
        {item.summary && item.summary.trim().length > 25 && (
          <p className="text-[14px] text-zinc-300 leading-[1.7] tracking-[0.01em]">
            {item.summary}
          </p>
        )}

        {/* Key context block */}
        {contextBullets.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
              <BookOpen className="h-3.5 w-3.5 text-zinc-600" strokeWidth={1.5} />
              <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-600">
                Key Context
              </span>
            </div>
            <ul className="px-3.5 py-3 space-y-2.5">
              {contextBullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <ChevronRight className="h-3 w-3 mt-[2px] shrink-0 text-zinc-700" strokeWidth={1.5} />
                  <span className="text-[12px] text-zinc-400 leading-snug">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Symbol context block */}
        {assetImpact.reasoning && (
          <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.03] p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-amber-500/70" strokeWidth={1.5} />
              <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-amber-500/70">
                {symbolLabel} Context
              </span>
            </div>
            <p className="text-[12.5px] text-zinc-300 leading-relaxed">
              {assetImpact.reasoning}
            </p>
          </div>
        )}

        {/* Affected assets */}
        {item.affectedAssets?.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-600">
              Affected Assets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {item.affectedAssets.map((a) => (
                <span
                  key={a}
                  className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/40 text-zinc-400"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Source credit footer */}
        <p className="text-[10px] text-zinc-700 pb-2">
          © {new Date(item.timestamp).getFullYear()} {item.source}. All rights reserved.
        </p>
      </div>

      {/* ── Fixed bottom nav — TradingView style ─────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 pt-3 border-t border-white/[0.06]">
        <button
          onClick={onPrev}
          disabled={idx === 0}
          className="flex items-center gap-1 text-zinc-500 disabled:opacity-25 active:text-zinc-200 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          <span className="text-[11px] font-medium">Prev</span>
        </button>

        <span className="flex-1 text-center text-[10px] font-mono text-zinc-700">
          {idx + 1} / {total}
        </span>

        <button
          onClick={onNext}
          disabled={idx === total - 1}
          className="flex items-center gap-1 text-zinc-500 disabled:opacity-25 active:text-zinc-200 transition-colors"
        >
          <span className="text-[11px] font-medium">Next</span>
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

    </div>
  );
}

// ── Feed list item ──────────────────────────────────────────────────────────

function FeedItem({
  item,
  compact,
  selectedSymbol,
  onClick,
}: {
  item: NewsItem;
  compact: boolean;
  selectedSymbol: string;
  onClick: () => void;
}) {
  const symbolShort = getSymbolShort(selectedSymbol);
  const assetImpact = getImpactForSymbol({
    goldImpact:    item.goldImpact,
    usdImpact:     item.usdImpact,
    goldReasoning: item.goldReasoning,
    usdReasoning:  item.usdReasoning,
    sentimentTag:  item.sentiment,
  }, selectedSymbol);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 cursor-pointer active:bg-white/[0.04] transition-colors",
        item.impactScore >= 8 && "border-amber-500/20"
      )}
    >
      {/* Top row: impact dot + source + time */}
      <div className="flex items-center gap-2 mb-1.5">
        {item.impactScore >= 8 && (
          <Zap className="h-3 w-3 text-amber-400 shrink-0" strokeWidth={1.5} />
        )}
        <span className="text-[10px] text-zinc-600 truncate flex-1">
          {item.source}
        </span>
        <span className="text-[10px] text-zinc-700 shrink-0 font-mono">
          {timeAgo(item.timestamp)}
        </span>
      </div>

      {/* Headline */}
      <h4 className="text-[12.5px] font-semibold text-zinc-200 leading-snug mb-2">
        {item.headline}
      </h4>

      {!compact && (
        <p className="text-[11px] text-zinc-500 leading-relaxed mb-2 line-clamp-2">
          {item.summary}
        </p>
      )}

      {/* Chips row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={cn("text-[9px] font-bold uppercase tracking-[0.10em] px-1.5 py-[2px] rounded", sentimentChip(item.sentiment))}>
          {sentimentLabel(item.sentiment)}
        </span>
        <ImpactBadge impact={assetImpact.impact} label={symbolShort} />
        <span className="text-[9px] font-mono px-1.5 py-[2px] rounded bg-zinc-800/50 text-zinc-600 border border-zinc-700/30">
          {item.category.replace(/-/g, " ")}
        </span>
        <span className={cn("ml-auto text-[9px] font-mono font-bold shrink-0", impactColor(item.impactScore))}>
          {item.impactScore}/10
        </span>
      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export function NewsFeed({ items, limit, compact = false }: NewsFeedProps) {
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";

  const displayed = limit ? items.slice(0, limit) : items;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Reader view — full screen
  if (selectedIdx !== null) {
    return (
      <ArticleReader
        item={displayed[selectedIdx]}
        idx={selectedIdx}
        total={displayed.length}
        onBack={() => setSelectedIdx(null)}
        onPrev={() => setSelectedIdx(i => (i !== null && i > 0 ? i - 1 : i))}
        onNext={() => setSelectedIdx(i => (i !== null && i < displayed.length - 1 ? i + 1 : i))}
      />
    );
  }

  // List view
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
    <div className="space-y-1.5">
      {displayed.map((item, i) => (
        <FeedItem
          key={item.id}
          item={item}
          compact={compact}
          selectedSymbol={selectedSymbol}
          onClick={() => setSelectedIdx(i)}
        />
      ))}
    </div>
  );
}
