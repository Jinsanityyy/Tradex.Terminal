"use client";

import React, { useState } from "react";
import { cn, timeAgo } from "@/lib/utils";
import {
  Zap, Clock, CheckCircle2, Radio,
  TrendingUp, TrendingDown, Minus,
  ChevronRight, Lightbulb, X, Target, Shield,
} from "lucide-react";
import { createPortal } from "react-dom";
import type { Catalyst } from "@/types";
import { useSettings } from "@/contexts/SettingsContext";
import { getSymbolShort, getSymbolLabel, getCatalystImpactForSymbol } from "@/lib/assetImpact";

// ── Price-only highlighter (only $X,XXX and X% — no word-level noise) ─────────
const PRICE_RE = /(\$[\d,]+(?:\.\d+)?[KMBTk]?|\b\d+\.?\d*%)/g;

function PriceHighlight({ text, className }: { text: string; className?: string }) {
  const parts: { text: string; isPrice: boolean }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  PRICE_RE.lastIndex = 0;
  while ((m = PRICE_RE.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), isPrice: false });
    parts.push({ text: m[0], isPrice: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), isPrice: false });

  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.isPrice
          ? <span key={i} className="font-semibold" style={{ color: "var(--t-accent)" }}>{p.text}</span>
          : <span key={i}>{p.text}</span>
      )}
    </span>
  );
}

// ── Bias badge ────────────────────────────────────────────────────────────────
function BiasBadge({ bias }: { bias: string }) {
  const b = bias.toLowerCase();
  const s =
    b === "bullish" ? { color: "var(--t-bullish)", bg: "color-mix(in srgb, var(--t-bullish) 15%, transparent)", border: "color-mix(in srgb, var(--t-bullish) 30%, transparent)" } :
    b === "bearish" ? { color: "var(--t-bearish)", bg: "color-mix(in srgb, var(--t-bearish) 15%, transparent)", border: "color-mix(in srgb, var(--t-bearish) 30%, transparent)" } :
    b === "mixed"   ? { color: "var(--t-accent)",  bg: "color-mix(in srgb, var(--t-accent)  15%, transparent)", border: "color-mix(in srgb, var(--t-accent)  30%, transparent)" } :
                      { color: "var(--t-muted)",   bg: "color-mix(in srgb, var(--t-muted)   10%, transparent)", border: "var(--t-border)" };

  const Icon = b === "bullish" ? TrendingUp : b === "bearish" ? TrendingDown : Minus;
  return (
    <span
      className="inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0"
      style={{ color: s.color, background: s.bg, borderColor: s.border, borderRadius: "var(--t-badge-radius)" }}
    >
      <Icon className="h-2.5 w-2.5" />
      {b === "mixed" ? "MIXED" : b.toUpperCase()}
    </span>
  );
}

// ── Full-detail modal ─────────────────────────────────────────────────────────
function CatalystModal({ cat, index, onClose }: { cat: Catalyst; index: number; onClose: () => void }) {
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";
  const assetShort  = getSymbolShort(selectedSymbol);
  const assetLabel  = getSymbolLabel(selectedSymbol);
  const assetImpact = getCatalystImpactForSymbol(cat, selectedSymbol);
  const bias = cat.sentimentTag ?? "neutral";

  const bullets: string[] = cat.keyPoints?.length
    ? cat.keyPoints
    : cat.analysis
    ? [cat.analysis.marketLogic, cat.analysis.conditions].filter(Boolean)
    : [cat.marketImplication].filter(Boolean);

  const accentColor =
    bias === "bearish" ? "var(--t-bearish)" :
    bias === "bullish" ? "var(--t-bullish)" :
                         "var(--t-accent)";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative z-10 mt-auto flex flex-col overflow-hidden"
        style={{
          background: "var(--t-card)",
          borderRadius: "var(--t-card-radius) var(--t-card-radius) 0 0",
          borderTop: `2px solid ${accentColor}`,
          maxHeight: "88vh",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ background: "var(--t-border)" }} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-1" style={{ borderBottom: "1px solid var(--t-border)" }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                Driver #{index + 1}{cat.driverCategory ? ` · ${cat.driverCategory}` : ""}
              </span>
            </div>
            <h2 className="text-[13px] font-black uppercase leading-snug" style={{ color: "var(--t-text)" }}>
              {cat.title}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button onClick={onClose} className="p-1 rounded-full" style={{ color: "var(--t-muted)" }}>
              <X className="h-4 w-4" />
            </button>
            <BiasBadge bias={bias} />
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">

          {/* Asset chips */}
          <div className="flex flex-wrap gap-1.5">
            {cat.affectedMarkets.map(m => (
              <span key={m} className="text-[9px] font-mono px-1.5 py-0.5"
                style={{ color: "var(--t-muted)", background: "color-mix(in srgb, var(--t-text) 5%, transparent)", borderRadius: "var(--t-badge-radius)", border: "1px solid var(--t-border)" }}>
                {m}
              </span>
            ))}
            {assetImpact.impact && (
              <span className="text-[9px] font-bold px-1.5 py-0.5"
                style={{
                  color: assetImpact.impact === "bullish" ? "var(--t-bullish)" : assetImpact.impact === "bearish" ? "var(--t-bearish)" : "var(--t-muted)",
                  background: assetImpact.impact === "bullish" ? "color-mix(in srgb, var(--t-bullish) 12%, transparent)" : assetImpact.impact === "bearish" ? "color-mix(in srgb, var(--t-bearish) 12%, transparent)" : "color-mix(in srgb, var(--t-muted) 10%, transparent)",
                  borderRadius: "var(--t-badge-radius)",
                  border: `1px solid ${assetImpact.impact === "bullish" ? "color-mix(in srgb, var(--t-bullish) 25%, transparent)" : assetImpact.impact === "bearish" ? "color-mix(in srgb, var(--t-bearish) 25%, transparent)" : "var(--t-border)"}`,
                }}>
                {assetShort} {assetImpact.impact.toUpperCase()}
              </span>
            )}
          </div>

          {/* Overview paragraph */}
          <div className="rounded-lg p-3.5" style={{ background: "color-mix(in srgb, var(--t-text) 4%, transparent)", border: "1px solid var(--t-border)" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: accentColor, opacity: 0.8 }}>Overview</p>
            <p className="text-[11.5px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
              <PriceHighlight text={cat.analysis?.eventOverview || cat.explanation} />
            </p>
            {cat.analysis?.whyMarketsCare && (
              <p className="text-[11px] leading-relaxed mt-2" style={{ color: "var(--t-muted)", opacity: 0.8 }}>
                <PriceHighlight text={cat.analysis.whyMarketsCare} />
              </p>
            )}
          </div>

          {/* Key bullets */}
          {bullets.length > 0 && (
            <div className="rounded-lg p-3.5" style={{ background: "color-mix(in srgb, var(--t-text) 4%, transparent)", border: "1px solid var(--t-border)" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2.5" style={{ color: accentColor, opacity: 0.8 }}>Key Points</p>
              <div className="space-y-2">
                {bullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" style={{ color: accentColor }} />
                    <span className="text-[11px] leading-snug" style={{ color: "var(--t-muted)" }}>
                      <PriceHighlight text={b} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Asset-specific impact */}
          {assetImpact.reasoning && (
            <div className="rounded-lg p-3.5" style={{ background: "color-mix(in srgb, var(--t-accent) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--t-accent) 20%, transparent)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target className="h-3 w-3" style={{ color: "var(--t-accent)" }} />
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--t-accent)" }}>{assetLabel} Impact</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{assetImpact.reasoning}</p>
            </div>
          )}

          {/* Gold + USD reasoning */}
          {(cat.goldReasoning || cat.usdReasoning) && (
            <div className="space-y-2">
              {cat.goldReasoning && (
                <div className="rounded-lg p-3" style={{ background: "color-mix(in srgb, var(--t-text) 4%, transparent)", border: "1px solid var(--t-border)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--t-muted)", opacity: 0.5 }}>Gold</p>
                  <p className="text-[10.5px] leading-snug" style={{ color: "var(--t-muted)" }}>{cat.goldReasoning}</p>
                </div>
              )}
              {cat.usdReasoning && (
                <div className="rounded-lg p-3" style={{ background: "color-mix(in srgb, var(--t-text) 4%, transparent)", border: "1px solid var(--t-border)" }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Shield className="h-3 w-3" style={{ color: "var(--t-muted)", opacity: 0.5 }} />
                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--t-muted)", opacity: 0.5 }}>USD</p>
                  </div>
                  <p className="text-[10.5px] leading-snug" style={{ color: "var(--t-muted)" }}>{cat.usdReasoning}</p>
                </div>
              )}
            </div>
          )}

          {/* Per-asset breakdown from AI */}
          {cat.analysis?.assets && cat.analysis.assets.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-muted)", opacity: 0.5 }}>Asset Breakdown</p>
              <div className="space-y-2">
                {cat.analysis.assets.map(a => (
                  <div key={a.ticker || a.name} className="rounded-lg p-3 flex gap-2.5"
                    style={{ background: "color-mix(in srgb, var(--t-text) 3%, transparent)", border: "1px solid var(--t-border)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold" style={{ color: "var(--t-text)" }}>{a.name}</span>
                        {a.ticker && <span className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ color: "var(--t-muted)", background: "color-mix(in srgb, var(--t-text) 5%, transparent)" }}>{a.ticker}</span>}
                      </div>
                      <p className="text-[10px] leading-snug" style={{ color: "var(--t-muted)" }}>{a.context}</p>
                    </div>
                    <BiasBadge bias={a.bias} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Beginner Tip */}
          {cat.beginnerTip && (
            <div className="rounded-lg p-3.5" style={{ background: "color-mix(in srgb, var(--t-accent) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--t-accent) 18%, transparent)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="h-3 w-3" style={{ color: "var(--t-accent)" }} />
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--t-accent)" }}>Beginner Tip</span>
              </div>
              <p className="text-[10.5px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{cat.beginnerTip}</p>
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Preview card ──────────────────────────────────────────────────────────────
function CatalystCard({ cat, index }: { cat: Catalyst; index: number }) {
  const [open, setOpen] = useState(false);
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";
  const assetShort  = getSymbolShort(selectedSymbol);
  const assetImpact = getCatalystImpactForSymbol(cat, selectedSymbol);
  const bias = cat.sentimentTag ?? "neutral";
  const isLive = cat.status === "live";

  const accentColor =
    isLive            ? "var(--t-accent)"   :
    bias === "bearish"? "var(--t-bearish)"  :
    bias === "bullish"? "var(--t-bullish)"  :
                        "var(--t-border)";

  // Preview body — first 2 sentences of explanation
  const preview = (() => {
    const src = cat.analysis?.eventOverview || cat.explanation || "";
    const sentences = src.match(/[^.!?]+[.!?]+/g) ?? [src];
    return sentences.slice(0, 2).join(" ").trim();
  })();

  const bullets: string[] = cat.keyPoints?.length
    ? cat.keyPoints.slice(0, 3)
    : cat.analysis
    ? [cat.analysis.marketLogic].filter(Boolean)
    : [];

  return (
    <>
      <div
        onClick={() => setOpen(true)}
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
            {isLive
              ? <Radio className="h-3 w-3" style={{ color: "var(--t-accent)" }} />
              : cat.status === "completed"
              ? <CheckCircle2 className="h-3 w-3" style={{ color: "var(--t-muted)" }} />
              : <Clock className="h-3 w-3" style={{ color: "var(--t-muted)" }} />
            }
            <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: isLive ? "var(--t-accent)" : "var(--t-muted)" }}>
              Driver #{index + 1}{cat.driverCategory ? ` · ${cat.driverCategory}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8.5px] font-bold uppercase tracking-wider"
              style={{ color: bias === "bearish" ? "var(--t-bearish)" : bias === "bullish" ? "var(--t-bullish)" : "var(--t-muted)" }}>
              ● {cat.importance}
            </span>
            <span className="text-[8px]" style={{ color: "var(--t-muted)", opacity: 0.45 }}>{timeAgo(cat.timestamp)}</span>
          </div>
        </div>

        <div className="px-3.5 pt-2.5 pb-3">
          {/* Headline + badge */}
          <div className="flex items-start gap-2 mb-2.5">
            <h3 className="text-[12.5px] font-black uppercase leading-snug flex-1 min-w-0" style={{ color: "var(--t-text)" }}>
              {cat.title}
            </h3>
            <BiasBadge bias={bias} />
          </div>

          {/* Market chips */}
          <div className="flex flex-wrap gap-1 mb-3">
            {cat.affectedMarkets.slice(0, 4).map(m => (
              <span key={m} className="text-[8.5px] font-mono px-1.5 py-0.5"
                style={{ color: "var(--t-muted)", background: "color-mix(in srgb, var(--t-text) 5%, transparent)", borderRadius: "var(--t-badge-radius)", border: "1px solid var(--t-border)" }}>
                {m}
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
          </div>

          {/* Preview paragraph */}
          {preview && (
            <p className="text-[11px] leading-relaxed mb-3 line-clamp-3" style={{ color: "var(--t-muted)" }}>
              <PriceHighlight text={preview} />
            </p>
          )}

          {/* Bullet preview */}
          {bullets.length > 0 && (
            <div className="rounded-lg px-3 py-2.5 mb-3 space-y-1.5"
              style={{ background: "color-mix(in srgb, var(--t-text) 4%, transparent)", border: "1px solid var(--t-border)" }}>
              {bullets.map((b, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <ChevronRight className="h-2.5 w-2.5 mt-0.5 shrink-0" style={{ color: accentColor, opacity: 0.7 }} />
                  <span className="text-[10px] leading-snug line-clamp-2" style={{ color: "var(--t-muted)" }}>
                    <PriceHighlight text={b} />
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Beginner tip preview */}
          {cat.beginnerTip && (
            <div className="rounded-lg px-3 py-2.5 flex items-start gap-2"
              style={{ background: "color-mix(in srgb, var(--t-accent) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--t-accent) 18%, transparent)" }}>
              <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "var(--t-accent)" }} />
              <p className="text-[10px] leading-snug line-clamp-2" style={{ color: "var(--t-muted)" }}>{cat.beginnerTip}</p>
            </div>
          )}

          {/* Tap hint */}
          <p className="text-[9px] mt-2.5 text-right" style={{ color: "var(--t-muted)", opacity: 0.4 }}>
            Tap for full analysis →
          </p>
        </div>
      </div>

      {open && <CatalystModal cat={cat} index={index} onClose={() => setOpen(false)} />}
    </>
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
