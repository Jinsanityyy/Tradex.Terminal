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

// Build article body client-side from available RSS data — no API needed
function buildArticleContent(item: NewsItem): string {
  const parts: string[] = [];
  const cat = item.category;
  const sent = item.sentiment;

  // Para 1: what happened
  if (item.summary && item.summary.trim().length > 40) {
    parts.push(item.summary.trim());
  } else {
    // Derive a lead sentence from category
    const catLabel = cat === "central-banks" ? "central bank" : cat.replace(/-/g, " ");
    const sentLabel = sent === "bullish" ? "positive" : sent === "bearish" ? "negative" : "mixed";
    parts.push(`${item.headline}. This ${catLabel} development carries ${sentLabel} implications for global markets.`);
  }

  // Para 2: market context based on category
  const contextMap: Record<string, string> = {
    "geopolitics": "Geopolitical events of this nature typically shift risk appetite across markets. Escalation or de-escalation signals drive flows into or out of safe-haven assets like gold and the Japanese yen, while risk currencies and equities react inversely to the perceived threat level.",
    "politics": "Political developments influence market sentiment by altering the outlook for fiscal policy, trade agreements, and regulatory environments. Traders watch for policy clarity as uncertainty itself is typically priced into risk premiums across asset classes.",
    "central-banks": "Central bank communication directly moves rate expectations and yield differentials. Even subtle shifts in tone can reprice entire asset classes — particularly gold (which is sensitive to real yields) and currency pairs driven by interest rate spreads.",
    "inflation": "Inflation prints are among the highest-impact data releases for markets. Above or below-consensus figures directly reprice Fed rate expectations, which flows through to real yields, the US dollar, and inversely, gold prices.",
    "tariffs": "Trade policy shifts introduce supply chain uncertainty and inflation risk simultaneously. Tariff escalation tends to support gold as a hedge while pressuring risk assets and complicating central bank policy paths.",
    "economy": "Economic data shapes the growth and recession outlook, influencing central bank projections and risk appetite. Strong data reduces rate-cut expectations while weak data raises them — driving divergent moves in yield-sensitive assets.",
    "commodities": "Commodity-specific catalysts often have direct transmission into inflation expectations and currency dynamics, particularly for commodity-linked currencies like AUD and CAD, and for gold as an inflation hedge.",
    "crypto": "Cryptocurrency market moves reflect broader risk appetite and institutional flow dynamics, with limited direct macro transmission unless the move is large enough to impact broader liquidity or sentiment.",
  };
  const context = contextMap[cat] ?? `This development falls under the ${cat.replace(/-/g, " ")} category and carries implications for risk appetite, capital flows, and asset pricing across correlated markets.`;
  parts.push(context);

  // Para 3: what to watch
  const assets = item.affectedAssets?.length ? item.affectedAssets.slice(0, 3).join(", ") : "key markets";
  const watchSuffix = sent === "bearish"
    ? "Watch for safe-haven demand in gold and JPY, and monitor risk assets for signs of follow-through selling."
    : sent === "bullish"
    ? "A risk-on response may see equities and commodity currencies outperform while safe-haven demand fades."
    : "Price action around key technical levels will confirm whether this event triggers a sustained directional move.";
  parts.push(`Monitor ${assets} for follow-through price action in the coming sessions. ${watchSuffix} Confirm directional conviction with volume and session close rather than acting on the initial spike.`);

  return parts.join("\n\n");
}

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

  // Sync generated body — always available immediately
  const generatedBody = buildArticleContent(item);
  const [articleBody, setArticleBody] = useState<string | null>(null);
  const [bodySource, setBodySource] = useState<"scrape" | "ai" | null>(null);

  useEffect(() => {
    setArticleBody(null);
    setBodySource(null);
    // Try AI expand in background — if it works, upgrades generatedBody
    fetch("/api/market/news/expand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: item.headline, summary: item.summary, category: item.category,
        sentiment: item.sentiment, goldReasoning: item.goldReasoning,
        usdReasoning: item.usdReasoning, affectedAssets: item.affectedAssets,
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.body) { setArticleBody(data.body); setBodySource("ai"); } })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const displayBody = articleBody ?? generatedBody;

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

        {/* Article body */}
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
              para.startsWith("•") ? "text-[13px] text-zinc-400 pl-1" : "text-[14px] text-zinc-300"
            )}>
              {para.trim()}
            </p>
          ))}
        </div>

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
