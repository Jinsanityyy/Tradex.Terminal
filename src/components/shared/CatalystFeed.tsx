"use client";

import React, { useState } from "react";
import { cn, timeAgo } from "@/lib/utils";
import {
  Zap, Clock, CheckCircle2, Radio, TrendingUp, TrendingDown,
  Minus, BookOpen, ChevronRight, Lightbulb,
} from "lucide-react";
import type { Catalyst } from "@/types";
import { useSettings } from "@/contexts/SettingsContext";
import { getSymbolShort, getCatalystImpactForSymbol } from "@/lib/assetImpact";

// ── Rich text highlighter ─────────────────────────────────────────────────────
// Highlights price levels ($X,XXX), percentages (X%), and bias keywords inline.

const BEARISH_TERMS = /\b(bearish|bear|sell|downside|breakdown|break below|rejected|resistance|caution|stop loss|risk|warning|danger)\b/gi;
const BULLISH_TERMS = /\b(bullish|bull|buy|upside|breakout|break above|support|bounce|rally|recovery|surge)\b/gi;
const PRICE_PATTERN = /(\$[\d,]+(?:\.\d+)?(?:[KMB])?|\b\d{1,3}(?:,\d{3})*(?:\.\d+)?%)/g;

function HighlightedText({ text, className }: { text: string; className?: string }) {
  // Build an array of segments: { text, type: "normal"|"price"|"bearish"|"bullish" }
  type Seg = { text: string; type: "normal" | "price" | "bearish" | "bullish" };

  const segments: Seg[] = [];
  let remaining = text;

  // Combined regex — order matters: price first, then bias terms
  const combined = new RegExp(
    `(${PRICE_PATTERN.source}|${BEARISH_TERMS.source}|${BULLISH_TERMS.source})`,
    "gi"
  );

  let last = 0;
  let m: RegExpExecArray | null;
  combined.lastIndex = 0;
  while ((m = combined.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ text: text.slice(last, m.index), type: "normal" });
    }
    const word = m[0];
    const type: Seg["type"] = PRICE_PATTERN.test(word)
      ? "price"
      : BEARISH_TERMS.test(word)
      ? "bearish"
      : "bullish";
    segments.push({ text: word, type });
    last = m.index + word.length;
    // Reset stateful regexes after test()
    PRICE_PATTERN.lastIndex = 0;
    BEARISH_TERMS.lastIndex = 0;
    BULLISH_TERMS.lastIndex = 0;
  }
  if (last < text.length) {
    segments.push({ text: text.slice(last), type: "normal" });
  }

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === "price") {
          return (
            <span key={i} className="font-semibold" style={{ color: "var(--t-accent)" }}>
              {seg.text}
            </span>
          );
        }
        if (seg.type === "bearish") {
          return (
            <span
              key={i}
              className="font-semibold rounded-sm px-0.5"
              style={{ color: "var(--t-bearish)", background: "color-mix(in srgb, var(--t-bearish) 12%, transparent)" }}
            >
              {seg.text}
            </span>
          );
        }
        if (seg.type === "bullish") {
          return (
            <span key={i} className="font-semibold" style={{ color: "var(--t-bullish)" }}>
              {seg.text}
            </span>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </span>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BiasBadge({ bias }: { bias: string }) {
  const b = bias.toLowerCase();
  const style =
    b === "bullish"
      ? { color: "var(--t-bullish)", background: "color-mix(in srgb, var(--t-bullish) 15%, transparent)", borderColor: "color-mix(in srgb, var(--t-bullish) 30%, transparent)" }
      : b === "bearish"
      ? { color: "var(--t-bearish)", background: "color-mix(in srgb, var(--t-bearish) 15%, transparent)", borderColor: "color-mix(in srgb, var(--t-bearish) 30%, transparent)" }
      : b === "mixed"
      ? { color: "var(--t-accent)", background: "color-mix(in srgb, var(--t-accent) 15%, transparent)", borderColor: "color-mix(in srgb, var(--t-accent) 30%, transparent)" }
      : { color: "var(--t-muted)", background: "color-mix(in srgb, var(--t-muted) 10%, transparent)", borderColor: "var(--t-border)" };

  const Icon = b === "bullish" ? TrendingUp : b === "bearish" ? TrendingDown : Minus;
  return (
    <span
      className="inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{ ...style, borderRadius: "var(--t-badge-radius)" }}
    >
      <Icon className="h-2.5 w-2.5" />
      {b === "mixed" ? "MIXED" : bias.toUpperCase()}
    </span>
  );
}

function ImportanceDot({ level }: { level: string }) {
  const color =
    level === "high"   ? "var(--t-bearish)" :
    level === "medium" ? "var(--t-accent)"  :
                         "var(--t-muted)";
  return (
    <span
      className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest"
      style={{ color }}
    >
      <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: color }} />
      {level}
    </span>
  );
}

// ── Main Card ─────────────────────────────────────────────────────────────────

function CatalystCard({ cat, index }: { cat: Catalyst; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";
  const assetShort = getSymbolShort(selectedSymbol);
  const assetImpact = getCatalystImpactForSymbol(cat, selectedSymbol);

  const isLive = cat.status === "live";
  const bias = cat.sentimentTag ?? "neutral";

  // Derived content — prefer AI-generated, fall back to existing fields
  const bodyText = cat.analysis?.eventOverview || cat.explanation;
  const bullets: string[] = cat.keyPoints?.length
    ? cat.keyPoints
    : cat.analysis
    ? [cat.analysis.marketLogic, cat.analysis.conditions].filter(Boolean)
    : [cat.marketImplication].filter(Boolean);

  const borderAccentColor =
    isLive              ? "var(--t-accent)" :
    bias === "bearish"  ? "var(--t-bearish)" :
    bias === "bullish"  ? "var(--t-bullish)" :
                          "var(--t-border)";

  return (
    <div
      className="relative overflow-hidden transition-all"
      style={{
        borderRadius: "var(--t-card-radius)",
        border: `1px solid ${borderAccentColor}`,
        background: "var(--t-card)",
        borderLeftWidth: 3,
        borderLeftColor: borderAccentColor,
      }}
    >
      {/* ── Header strip ─── */}
      <div
        className="flex items-center justify-between px-3.5 pt-3 pb-2"
        style={{ borderBottom: `1px solid var(--t-border)` }}
      >
        <div className="flex items-center gap-2">
          {isLive
            ? <Radio className="h-3 w-3" style={{ color: "var(--t-accent)" }} />
            : cat.status === "completed"
            ? <CheckCircle2 className="h-3 w-3" style={{ color: "var(--t-muted)" }} />
            : <Clock className="h-3 w-3" style={{ color: "var(--t-muted)" }} />
          }
          <span
            className="text-[9px] font-bold uppercase tracking-[0.18em]"
            style={{ color: isLive ? "var(--t-accent)" : "var(--t-muted)" }}
          >
            Driver #{index + 1}
            {cat.driverCategory ? ` · ${cat.driverCategory}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ImportanceDot level={cat.importance} />
          <span className="text-[9px]" style={{ color: "var(--t-muted)", opacity: 0.5 }}>
            {timeAgo(cat.timestamp)}
          </span>
        </div>
      </div>

      {/* ── Headline + bias ─── */}
      <div className="px-3.5 pt-3 pb-2.5">
        <div className="flex items-start gap-2 flex-wrap mb-2">
          <h3
            className="text-[13px] font-black leading-snug tracking-tight flex-1 min-w-0 uppercase"
            style={{ color: "var(--t-text)" }}
          >
            {cat.title}
          </h3>
          <BiasBadge bias={bias} />
        </div>

        {/* Affected market chips */}
        <div className="flex flex-wrap gap-1 mb-3">
          {cat.affectedMarkets.slice(0, 5).map(m => (
            <span
              key={m}
              className="text-[9px] font-mono px-1.5 py-0.5"
              style={{
                color: "var(--t-muted)",
                background: "color-mix(in srgb, var(--t-text) 5%, transparent)",
                borderRadius: "var(--t-badge-radius)",
                border: "1px solid var(--t-border)",
              }}
            >
              {m}
            </span>
          ))}
          {assetImpact.impact && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5"
              style={{
                color: assetImpact.impact === "bullish" ? "var(--t-bullish)" : assetImpact.impact === "bearish" ? "var(--t-bearish)" : "var(--t-muted)",
                background: assetImpact.impact === "bullish"
                  ? "color-mix(in srgb, var(--t-bullish) 12%, transparent)"
                  : assetImpact.impact === "bearish"
                  ? "color-mix(in srgb, var(--t-bearish) 12%, transparent)"
                  : "color-mix(in srgb, var(--t-muted) 10%, transparent)",
                borderRadius: "var(--t-badge-radius)",
                border: `1px solid ${assetImpact.impact === "bullish" ? "color-mix(in srgb, var(--t-bullish) 25%, transparent)" : assetImpact.impact === "bearish" ? "color-mix(in srgb, var(--t-bearish) 25%, transparent)" : "var(--t-border)"}`,
              }}
            >
              {assetShort} {assetImpact.impact?.toUpperCase()}
            </span>
          )}
        </div>

        {/* Body text */}
        <p className="text-[11.5px] leading-relaxed mb-3" style={{ color: "var(--t-muted)" }}>
          <HighlightedText text={bodyText} />
        </p>

        {/* Key bullet points */}
        {bullets.length > 0 && (
          <div
            className="rounded-lg p-3 mb-3 space-y-1.5"
            style={{
              background: "color-mix(in srgb, var(--t-text) 4%, transparent)",
              border: "1px solid var(--t-border)",
            }}
          >
            {bullets.slice(0, expanded ? 99 : 3).map((b, i) => (
              <div key={i} className="flex items-start gap-2">
                <ChevronRight
                  className="h-3 w-3 mt-0.5 shrink-0"
                  style={{ color: borderAccentColor, opacity: 0.8 }}
                />
                <span className="text-[10.5px] leading-snug" style={{ color: "var(--t-muted)" }}>
                  <HighlightedText text={b} />
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Beginner tip */}
        {cat.beginnerTip && (
          <div
            className="rounded-lg p-3"
            style={{
              background: "color-mix(in srgb, var(--t-accent) 6%, transparent)",
              border: "1px solid color-mix(in srgb, var(--t-accent) 18%, transparent)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Lightbulb className="h-3 w-3" style={{ color: "var(--t-accent)" }} />
              <span
                className="text-[9px] font-bold uppercase tracking-widest"
                style={{ color: "var(--t-accent)" }}
              >
                Beginner Tip
              </span>
            </div>
            <p className="text-[10.5px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
              {cat.beginnerTip}
            </p>
          </div>
        )}

        {/* Expand / collapse for extra analysis */}
        {cat.analysis?.whyMarketsCare && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-2.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest transition-opacity hover:opacity-80"
            style={{ color: "var(--t-muted)" }}
          >
            {expanded ? "Show less" : "Full analysis ↓"}
          </button>
        )}

        {/* Expanded: deeper analysis */}
        {expanded && cat.analysis && (
          <div className="mt-3 space-y-2.5">
            {cat.analysis.whyMarketsCare && (
              <div
                className="rounded-lg p-3"
                style={{ background: "color-mix(in srgb, var(--t-text) 4%, transparent)", border: "1px solid var(--t-border)" }}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--t-muted)", opacity: 0.6 }}>Why Markets Care</p>
                <p className="text-[10.5px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                  <HighlightedText text={cat.analysis.whyMarketsCare} />
                </p>
              </div>
            )}
            {cat.analysis.assets && cat.analysis.assets.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--t-muted)", opacity: 0.6 }}>Asset Impact</p>
                {cat.analysis.assets.slice(0, 4).map(a => (
                  <div
                    key={a.ticker || a.name}
                    className="rounded-lg p-2.5 flex gap-2.5"
                    style={{ background: "color-mix(in srgb, var(--t-text) 3%, transparent)", border: "1px solid var(--t-border)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold" style={{ color: "var(--t-text)" }}>{a.name}</span>
                        {a.ticker && (
                          <span className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ color: "var(--t-muted)", background: "color-mix(in srgb, var(--t-text) 5%, transparent)" }}>{a.ticker}</span>
                        )}
                      </div>
                      <p className="text-[10px] leading-snug" style={{ color: "var(--t-muted)" }}>{a.context}</p>
                    </div>
                    <BiasBadge bias={a.bias} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Feed ──────────────────────────────────────────────────────────────────────

export function CatalystFeed({ catalysts, limit }: { catalysts: Catalyst[]; limit?: number }) {
  const items = limit ? catalysts.slice(0, limit) : catalysts;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <Zap className="h-5 w-5" style={{ color: "var(--t-muted)" }} />
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>No catalysts at the moment</p>
        <p className="text-[10px]" style={{ color: "var(--t-muted)", opacity: 0.5 }}>Refreshes every 3 minutes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((cat, i) => (
        <CatalystCard key={cat.id} cat={cat} index={i} />
      ))}
    </div>
  );
}
