"use client";

import React, { useState, useEffect } from "react";
import { cn, timeAgo } from "@/lib/utils";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus,
  ChevronLeft, ChevronRight, Newspaper, Zap, Target,
} from "lucide-react";
import type { NewsItem } from "@/types";
import { useSettings } from "@/contexts/SettingsContext";
import { getSymbolLabel, getSymbolShort, getImpactForSymbol } from "@/lib/assetImpact";

interface NewsFeedProps {
  items: NewsItem[];
  limit?: number;
  compact?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function impactColor(impact?: "bullish" | "bearish" | "neutral") {
  if (impact === "bullish") return { bg: "bg-emerald-500/12", text: "text-emerald-400", border: "border-emerald-500/20", icon: TrendingUp };
  if (impact === "bearish") return { bg: "bg-red-500/12",     text: "text-red-400",     border: "border-red-500/20",     icon: TrendingDown };
  return                           { bg: "bg-zinc-800/50",    text: "text-zinc-500",    border: "border-zinc-700/30",    icon: Minus };
}

function scoreColor(score: number) {
  if (score >= 8) return "text-red-400";
  if (score >= 6) return "text-amber-400";
  return "text-zinc-600";
}

// Split summary into 2-3 key-point bullets (split on period + space)
function extractKeyPoints(text: string): string[] {
  if (!text || text.length < 20) return [];
  const sentences = text
    .split(/(?<=\.)\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200);
  return sentences.slice(0, 3);
}

// Estimate read time in minutes
function readTime(text: string): string {
  const words = (text || "").split(/\s+/).length;
  const mins  = Math.max(1, Math.ceil(words / 200));
  return `${mins} min read`;
}

// Source display name (keep original casing)
function sourceLabel(s: string) {
  return s ?? "Unknown";
}

// ── Asset impact chip (TradingView-style) ────────────────────────────────────

function AssetChip({ impact, label }: { impact?: "bullish" | "bearish" | "neutral"; label: string }) {
  const c = impactColor(impact);
  const Icon = c.icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded px-1.5 py-[3px] text-[10px] font-semibold border tracking-wide",
      c.bg, c.text, c.border
    )}>
      <Icon className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
      {label} {(impact ?? "neutral").toUpperCase()}
    </span>
  );
}

// ── Article reader (TradingView-style) ───────────────────────────────────────

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
  const symbolShort    = getSymbolShort(selectedSymbol);
  const symbolLabel    = getSymbolLabel(selectedSymbol);

  const [articleBody, setArticleBody] = useState<string | null>(null);
  const [bodySource, setBodySource] = useState<"scrape" | "ai" | "local" | null>(null);

  // Phase 1: synthesize from existing fields — instant, always has content
  const localBody = React.useMemo(() => {
    const parts: string[] = [];
    if (item.summary && item.summary.trim().length > 20) parts.push(item.summary.trim());
    if (item.goldReasoning && item.goldReasoning.trim().length > 10)
      parts.push(`Gold market: ${item.goldReasoning.trim()}`);
    if (item.usdReasoning && item.usdReasoning.trim().length > 10)
      parts.push(`US Dollar: ${item.usdReasoning.trim()}`);
    const assets = item.affectedAssets?.length ? item.affectedAssets.join(", ") : null;
    if (assets) parts.push(`Key markets affected: ${assets}. Overall sentiment: ${item.sentiment}.`);
    return parts.length > 0 ? parts.join("\n\n") : null;
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setArticleBody(null);
    setBodySource(null);

    // Phase 2: try to fetch real article or AI expansion in the background
    const tryAiExpand = () =>
      fetch("/api/market/news/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline:       item.headline,
          summary:        item.summary,
          category:       item.category,
          sentiment:      item.sentiment,
          goldReasoning:  item.goldReasoning,
          usdReasoning:   item.usdReasoning,
          affectedAssets: item.affectedAssets,
        }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.body) { setArticleBody(data.body); setBodySource("ai"); } })
        .catch(() => {});

    if (item.url) {
      fetch(`/api/market/news/article?url=${encodeURIComponent(item.url)}`)
        .then(r => r.ok ? r.json() : null)
        .then(async data => {
          if (data?.body) { setArticleBody(data.body); setBodySource("scrape"); }
          else await tryAiExpand();
        })
        .catch(async () => { await tryAiExpand(); });
    } else {
      tryAiExpand();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  // Use AI/scrape result if available, otherwise show local synthesis
  const displayBody = articleBody ?? localBody;

  const assetImpact = getImpactForSymbol({
    goldImpact:    item.goldImpact,
    goldReasoning: item.goldReasoning,
    usdImpact:     item.usdImpact,
    usdReasoning:  item.usdReasoning,
    sentimentTag:  item.sentiment,
  }, selectedSymbol);

  const keyPoints  = extractKeyPoints(item.summary);
  const c          = impactColor(assetImpact.impact);
  const scoreStr   = `${item.impactScore}/10`;
  const dateStr    = new Date(item.timestamp).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // Truncate headline for breadcrumb
  const crumb = item.headline.length > 48
    ? item.headline.slice(0, 48) + "…"
    : item.headline;

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-5 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 active:text-zinc-200 transition-colors"
          aria-label="Back to feed"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="text-[11px] font-medium">News</span>
        </button>
        <span className="text-zinc-700 text-[11px]">/</span>
        <span className="text-[11px] text-zinc-500">{sourceLabel(item.source)}</span>
        <span className="text-zinc-700 text-[11px]">/</span>
        <span className="text-[11px] text-zinc-600 truncate">{crumb}</span>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-16 space-y-5">

        {/* Publisher row */}
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded flex items-center justify-center bg-zinc-800 border border-zinc-700/50">
            <Newspaper className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.5} />
          </span>
          <span className="text-[13px] font-bold text-zinc-200 tracking-tight">
            {sourceLabel(item.source)}
          </span>
        </div>

        {/* Headline */}
        <h2 className="text-[22px] font-bold text-zinc-50 leading-[1.26] tracking-[-0.015em]">
          {item.headline}
        </h2>

        {/* Meta row: date · read time · score */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-600 -mt-1">
          <span>{dateStr}</span>
          <span className="text-zinc-800">·</span>
          <span>{readTime(item.summary)}</span>
          <span className="text-zinc-800">·</span>
          <span className={cn("font-mono font-bold", scoreColor(item.impactScore))}>
            Impact {scoreStr}
          </span>
        </div>

        {/* Asset impact chips row */}
        <div className="flex flex-wrap gap-2 -mt-1">
          <AssetChip impact={assetImpact.impact} label={symbolShort} />
          {item.affectedAssets?.filter(a => a !== selectedSymbol).slice(0, 3).map(a => (
            <span
              key={a}
              className="inline-flex items-center px-1.5 py-[3px] rounded text-[10px] font-mono text-zinc-500 bg-zinc-800/50 border border-zinc-700/30"
            >
              {a}
            </span>
          ))}
          <span className={cn(
            "ml-auto inline-flex items-center gap-1 px-1.5 py-[3px] rounded text-[10px] font-semibold border",
            item.sentiment === "bullish" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            : item.sentiment === "bearish" ? "text-red-400 bg-red-500/10 border-red-500/20"
            : "text-zinc-500 bg-zinc-800/50 border-zinc-700/30"
          )}>
            {item.sentiment.toUpperCase()}
          </span>
        </div>

        {/* KEY POINTS ── only when we have bullets from summary */}
        {keyPoints.length > 0 && (
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/[0.06]">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                Key Points
              </span>
            </div>
            <ul className="px-4 py-3 space-y-2">
              {keyPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Zap className="h-3 w-3 mt-[3px] shrink-0 text-amber-400/70" strokeWidth={2} />
                  <span className="text-[13px] text-zinc-300 leading-snug">{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Category tag */}
        <span className="inline-flex px-2 py-[3px] rounded text-[10px] font-mono text-zinc-600 bg-zinc-800/40 border border-zinc-700/25 capitalize">
          {item.category.replace(/-/g, " ")}
        </span>

        {/* Article body — always has content (local synthesis → upgraded to AI when ready) */}
        {displayBody && (
          <div className="space-y-4">
            {bodySource === "ai" && (
              <div className="flex items-center gap-1.5 -mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded text-[9.5px] font-semibold bg-violet-500/10 border border-violet-500/20 text-violet-400 tracking-wide">
                  AI ANALYSIS
                </span>
              </div>
            )}
            {displayBody.split(/\n\n+/).filter(p => p.trim().length > 10).map((para, i) => (
              <p key={i} className={cn(
                "leading-[1.78] tracking-[0.005em]",
                para.startsWith("•") ? "text-[13px] text-zinc-400 pl-1"
                : para.startsWith("Gold market:") || para.startsWith("US Dollar:") || para.startsWith("Key markets")
                  ? "text-[13px] text-zinc-400"
                : "text-[14px] text-zinc-300"
              )}>
                {para.trim()}
              </p>
            ))}
          </div>
        )}

        {/* Gold/Asset context block */}
        {assetImpact.reasoning && (
          <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.04] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-500/10">
              <Target className="h-3.5 w-3.5 text-amber-500/60" strokeWidth={1.5} />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-500/60">
                {symbolLabel} Context
              </span>
            </div>
            <p className="px-4 py-3 text-[13px] text-zinc-300 leading-relaxed">
              {assetImpact.reasoning}
            </p>
          </div>
        )}

        {/* Footer tags + read original */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {[item.source, item.category.replace(/-/g, " ")].map(tag => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded text-[10px] font-medium text-zinc-500 bg-zinc-800/60 border border-zinc-700/40 capitalize"
            >
              {tag}
            </span>
          ))}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Read on {item.source} →
            </a>
          )}
        </div>

        {/* Copyright */}
        <p className="text-[10px] text-zinc-700 pb-2">
          © {new Date(item.timestamp).getFullYear()} {sourceLabel(item.source)}. All rights reserved.
        </p>
      </div>

      {/* ── Bottom prev/next ──────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 pt-3 border-t border-white/[0.06]">
        <button
          onClick={onPrev}
          disabled={idx === 0}
          className="flex items-center gap-1 text-zinc-500 disabled:opacity-25 hover:text-zinc-300 active:text-zinc-200 transition-colors cursor-pointer disabled:cursor-default"
          aria-label="Previous article"
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
          className="flex items-center gap-1 text-zinc-500 disabled:opacity-25 hover:text-zinc-300 active:text-zinc-200 transition-colors cursor-pointer disabled:cursor-default"
          aria-label="Next article"
        >
          <span className="text-[11px] font-medium">Next</span>
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

// ── Feed list item (TradingView row style) ───────────────────────────────────

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

  const isHighImpact = item.impactScore >= 8;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group px-0 py-3.5 cursor-pointer border-b border-white/[0.05] last:border-b-0",
        "hover:bg-white/[0.02] transition-colors duration-150 rounded-sm -mx-1 px-1",
        isHighImpact && "border-l-2 border-l-amber-500/50 pl-3"
      )}
    >
      {/* Source + time row */}
      <div className="flex items-center gap-2 mb-1.5">
        {isHighImpact && (
          <Zap className="h-2.5 w-2.5 text-amber-400 shrink-0" strokeWidth={2} />
        )}
        <span className="text-[10px] font-semibold text-zinc-600 tracking-wide truncate flex-1">
          {sourceLabel(item.source)}
        </span>
        <span className="text-[10px] font-mono text-zinc-700 shrink-0">
          {timeAgo(item.timestamp)}
        </span>
      </div>

      {/* Headline */}
      <h4 className={cn(
        "text-[13.5px] font-semibold leading-snug mb-2.5 group-hover:text-zinc-100 transition-colors",
        isHighImpact ? "text-zinc-100" : "text-zinc-200"
      )}>
        {item.headline}
      </h4>

      {/* Summary preview — only in non-compact mode */}
      {!compact && item.summary && item.summary.trim().length > 30 && (
        <p className="text-[11.5px] text-zinc-500 leading-relaxed mb-2.5 line-clamp-2">
          {item.summary}
        </p>
      )}

      {/* Chips row: asset impact · category · score */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <AssetChip impact={assetImpact.impact} label={symbolShort} />
        <span className="text-[9.5px] font-mono px-1.5 py-[2px] rounded bg-zinc-800/50 text-zinc-600 border border-zinc-700/25 capitalize">
          {item.category.replace(/-/g, " ")}
        </span>
        <span className={cn("ml-auto text-[9.5px] font-mono font-bold shrink-0", scoreColor(item.impactScore))}>
          {item.impactScore}/10
        </span>
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function NewsFeed({ items, limit, compact = false }: NewsFeedProps) {
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";

  const displayed = limit ? items.slice(0, limit) : items;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

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

  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="h-10 w-10 rounded-full bg-zinc-800/60 flex items-center justify-center">
          <Newspaper className="h-4 w-4 text-zinc-600" strokeWidth={1.5} />
        </div>
        <p className="text-[12px] text-zinc-600">No headlines matching this filter.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/[0.05]">
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
