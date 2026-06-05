"use client";

import React, { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, Radio, TrendingUp, TrendingDown, Minus, Target, Shield, ChevronRight, Timer, Eye, Zap, Loader2 } from "lucide-react";
import type { EconomicEvent } from "@/types";
import { DetailModal } from "./DetailModal";
import { getSymbolLabel, getSymbolShort, getEventImpactForSymbol } from "@/lib/assetImpact";

// ── AI After-Release Analysis ─────────────────────────────────────────────────
interface AIEventAnalysis {
  outcome: string;
  marketReaction: string;
  goldImpact: "bullish" | "bearish" | "neutral";
  goldAnalysis: string;
  usdImpact: "bullish" | "bearish" | "neutral";
  usdAnalysis: string;
  traderFocus: string[];
  timeframe: string;
}

const analysisCache = new Map<string, AIEventAnalysis>();

function useAfterReleaseAnalysis(ev: EconomicEvent) {
  const [analysis, setAnalysis] = useState<AIEventAnalysis | null>(null);
  const [loading, setLoading]   = useState(false);
  const fetchedRef = useRef(false);

  const hasActual = !!(ev.actual && ev.actual !== "Pending..." && ev.actual !== "—" && ev.actual !== " — " && ev.actual !== "-");
  // Trigger for ALL completed events — with or without actual
  const cacheKey  = `${ev.event}-${ev.actual ?? "pending"}-${ev.date}`;

  useEffect(() => {
    if (ev.status !== "completed" || fetchedRef.current) return;
    if (analysisCache.has(cacheKey)) {
      setAnalysis(analysisCache.get(cacheKey)!);
      return;
    }
    fetchedRef.current = true;
    setLoading(true);

    const summary = hasActual
      ? `Actual: ${ev.actual} | Forecast: ${ev.forecast} | Previous: ${ev.previous} | Result: ${(() => { try { return parseFloat(String(ev.actual)) > parseFloat(String(ev.forecast)) ? "BEAT vs forecast" : "MISSED forecast"; } catch { return "vs forecast " + ev.forecast; } })()}`
      : `Forecast: ${ev.forecast} | Previous: ${ev.previous} | Actual not yet published — analyze based on pre-release expectations and what traders should watch now that event window has passed`;

    const url = `/api/market/post-event?title=${encodeURIComponent(ev.event)}&summary=${encodeURIComponent(summary)}&markets=XAUUSD,DXY,USDJPY,EURUSD`;

    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then((data: AIEventAnalysis | null) => {
        if (data && data.outcome) {
          analysisCache.set(cacheKey, data);
          setAnalysis(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cacheKey, ev.status, ev.actual, ev.forecast, ev.previous, ev.event, hasActual]);

  return { analysis, loading, hasActual };
}

// ── Countdown Timer ───────────────────────────────────────────────────────────
function useCountdown(utcTimestamp?: number) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    if (!utcTimestamp) return;
    const tick = () => setDiff(utcTimestamp - Date.now());
    tick();
    const ms = (utcTimestamp - Date.now()) < 5 * 60_000 ? 1000 : 30_000;
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [utcTimestamp]);

  return diff;
}

function Countdown({ utcTimestamp, compact }: { utcTimestamp?: number; compact?: boolean }) {
  const diff = useCountdown(utcTimestamp);
  if (diff === null || diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const label = hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  const urgent = diff < 30 * 60_000;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
      urgent ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
    )}>
      <Timer className="h-2.5 w-2.5 shrink-0" />
      {label}
    </span>
  );
}

interface EconomicEventTableProps {
  events: EconomicEvent[];
  showInterpretation?: boolean;
  compact?: boolean;
  symbol?: string;
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

function ImpactBadge({ impact, label }: { impact?: "bullish" | "bearish" | "neutral"; label: string }) {
  if (!impact) return null;
  const Icon = impact === "bullish" ? TrendingUp : impact === "bearish" ? TrendingDown : Minus;
  const colors = {
    bullish: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    bearish: "bg-red-500/15 text-red-400 border-red-500/30",
    neutral: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide", colors[impact])}>
      <Icon className="h-2.5 w-2.5" />
      {label} {impact.toUpperCase()}
    </span>
  );
}

function DataInline({ text }: { text: string }) {
  const parts = text.split(/([\$±]?[\d,]+\.?\d*[KkMmBb%]?(?:\s*[KkMmBb%])?)/g);
  return (
    <>
      {parts.map((part, i) =>
        /[\d]/.test(part)
          ? <span key={i} className="font-data tabular-nums text-zinc-200">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// ── Detail modal body (unchanged) ─────────────────────────────────────────────
function EventDetail({ ev, symbol = "XAUUSD" }: { ev: EconomicEvent; symbol?: string }) {
  const isCompleted = ev.status === "completed";
  const { analysis: aiAnalysis, loading: aiLoading, hasActual } = useAfterReleaseAnalysis(ev);
  const assetImpact = getEventImpactForSymbol(ev, symbol);
  const assetLabel = getSymbolLabel(symbol);

  const tradeGlow =
    assetImpact.impact === "bullish" || ev.usdImpact === "bullish"
      ? "border-emerald-500/30 bg-emerald-500/[0.06] shadow-[0_0_18px_rgba(52,211,153,0.12)]"
      : assetImpact.impact === "bearish" || ev.usdImpact === "bearish"
      ? "border-red-500/30 bg-red-500/[0.06] shadow-[0_0_18px_rgba(239,68,68,0.12)]"
      : "border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5";

  const tradeTextColor =
    assetImpact.impact === "bullish" || ev.usdImpact === "bullish" ? "text-emerald-400" :
    assetImpact.impact === "bearish" || ev.usdImpact === "bearish" ? "text-red-400" :
    "text-[hsl(var(--primary))]";

  return (
    <div className="space-y-4">
      {/* Time + status */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-data text-[11px] tabular-nums text-[hsl(var(--muted-foreground))]">{ev.time} PHT</span>
        <Badge variant={ev.impact === "high" ? "high" : "medium"} className="text-[9px]">
          {ev.impact === "high" ? "HIGH IMPACT" : "MEDIUM IMPACT"}
        </Badge>
        {isCompleted && (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
            <CheckCircle2 className="h-2.5 w-2.5" /> COMPLETED
          </span>
        )}
        {ev.status === "upcoming" && <Countdown utcTimestamp={ev.utcTimestamp} />}
      </div>

      {/* Forecast / Previous / Actual */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Forecast", value: ev.forecast,        color: "text-blue-400" },
          { label: "Previous", value: ev.previous,        color: "text-zinc-400" },
          { label: "Actual",   value: ev.actual || " — ", color: ev.actual ? "text-[hsl(var(--primary))]" : "text-zinc-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg bg-[hsl(var(--secondary))] p-3 text-center">
            <p className="text-[9px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-1.5">{label}</p>
            <p className={cn("font-data text-sm font-bold tabular-nums tracking-tight", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* COMPLETED — post-event analysis */}
      {isCompleted && ev.postEventSummary && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] overflow-hidden">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-emerald-500/15">
            <Eye className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Post-Event Analysis</span>
            <span className="ml-auto text-[9px] text-emerald-400/50 uppercase tracking-wider">Completed</span>
          </div>
          <div className="px-3.5 py-3">
            <p className="text-[12px] text-zinc-200 leading-relaxed">{ev.postEventSummary}</p>
          </div>
          {ev.postEventBullets && ev.postEventBullets.length > 0 && (
            <div className="px-3.5 pb-3.5 space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/70">Now Watch</p>
              <ul className="space-y-1.5">
                {ev.postEventBullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 text-emerald-400/60 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-zinc-400 leading-snug">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* COMPLETED — AI after-release analysis (triggers for all completed events) */}
      {isCompleted && (aiLoading || aiAnalysis) && (
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.04] overflow-hidden">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-violet-500/15">
            <Zap className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">After Release Analysis</span>
            <span className="ml-auto text-[9px] text-violet-400/50 uppercase tracking-wider">
              {hasActual ? `Actual: ${ev.actual}` : "Actual pending"}
            </span>
          </div>

          {aiLoading ? (
            <div className="flex items-center gap-2 px-3.5 py-4">
              <Loader2 className="h-3.5 w-3.5 text-violet-400 animate-spin shrink-0" />
              <span className="text-[11px] text-zinc-500">Generating market reaction analysis...</span>
            </div>
          ) : aiAnalysis ? (
            <div className="px-3.5 py-3 space-y-3">
              {/* Outcome */}
              <p className="text-[12px] text-zinc-100 font-medium leading-relaxed">{aiAnalysis.outcome}</p>

              {/* Market Reaction */}
              {aiAnalysis.marketReaction && (
                <p className="text-[11px] text-zinc-300 leading-relaxed">{aiAnalysis.marketReaction}</p>
              )}

              {/* Gold + USD impact */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Gold (XAU/USD)", impact: aiAnalysis.goldImpact, text: aiAnalysis.goldAnalysis },
                  { label: "USD (DXY)",      impact: aiAnalysis.usdImpact,  text: aiAnalysis.usdAnalysis  },
                ].map(({ label, impact, text }) => (
                  <div key={label} className={cn("rounded-lg p-2.5", impact === "bullish" ? "bg-emerald-500/10 border border-emerald-500/20" : impact === "bearish" ? "bg-red-500/10 border border-red-500/20" : "bg-white/5 border border-white/10")}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
                      <span className={cn("text-[9px] font-bold uppercase", impact === "bullish" ? "text-emerald-400" : impact === "bearish" ? "text-red-400" : "text-zinc-400")}>{impact}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-snug">{text}</p>
                  </div>
                ))}
              </div>

              {/* Trader Focus */}
              {aiAnalysis.traderFocus?.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400/70 mb-1.5">Now Watch</p>
                  <ul className="space-y-1">
                    {aiAnalysis.traderFocus.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight className="h-3 w-3 text-violet-400/60 mt-0.5 shrink-0" />
                        <span className="text-[11px] text-zinc-400 leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timeframe */}
              {aiAnalysis.timeframe && (
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Outlook: </span>
                  <span className="text-[10px] text-zinc-400">{aiAnalysis.timeframe}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* UPCOMING / LIVE — pre-event analysis */}
      {!isCompleted && ev.preEventSummary && (
        <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.04] overflow-hidden">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-blue-500/15">
            <Eye className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Pre-Event Analysis</span>
            <span className="ml-auto text-[9px] text-blue-400/50 uppercase tracking-wider">
              {ev.status === "live" ? "Event Starting" : "Upcoming"}
            </span>
          </div>
          <div className="px-3.5 py-3">
            <p className="text-[12px] text-[hsl(var(--foreground))] leading-relaxed">{ev.preEventSummary}</p>
          </div>
          {ev.preEventBullets && ev.preEventBullets.length > 0 && (
            <div className="px-3.5 pb-3.5 space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400/70">What To Watch</p>
              <ul className="space-y-1.5">
                {ev.preEventBullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 text-blue-400/60 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))] leading-snug">
                      <DataInline text={b} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Pre-event asset / USD context */}
      {!isCompleted && (
        <>
          <div className="flex gap-2 flex-wrap">
            <ImpactBadge impact={assetImpact.impact} label={getSymbolShort(symbol)} />
            <ImpactBadge impact={ev.usdImpact} label="USD" />
          </div>
          {assetImpact.reasoning && (
            <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">{assetLabel} Analysis</span>
              </div>
              <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{assetImpact.reasoning}</p>
            </div>
          )}
          {ev.usdReasoning && (
            <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">USD Analysis</span>
              </div>
              <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{ev.usdReasoning}</p>
            </div>
          )}
          {ev.tradeImplication && (
            <div className={cn("rounded-lg border p-3.5 transition-all", tradeGlow)}>
              <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1.5", tradeTextColor)}>Trade Implication</p>
              <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">
                <DataInline text={ev.tradeImplication} />
              </p>
            </div>
          )}
        </>
      )}

      {/* Affected assets */}
      {ev.affectedAssets?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Affected Assets</p>
          <div className="flex flex-wrap gap-1.5">
            {ev.affectedAssets.map((a) => (
              <span key={a} className="font-data text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-zinc-300">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Preview card (callisto style) ─────────────────────────────────────────────
function EventCard({
  ev, index, symbol, onClick,
}: {
  ev: EconomicEvent;
  index: number;
  symbol: string;
  onClick: () => void;
}) {
  const StatusIcon = ev.status === "completed" ? CheckCircle2 : ev.status === "live" ? Radio : Clock;
  const rowImpact = getEventImpactForSymbol(ev, symbol);
  const assetShort = getSymbolShort(symbol);

  const accentColor =
    ev.status === "live" ? "var(--t-accent)" :
    ev.status === "completed" ? "var(--t-bullish)" :
    "color-mix(in srgb, var(--t-muted) 40%, transparent)";

  const statusColor =
    ev.status === "live" ? "var(--t-accent)" :
    ev.status === "completed" ? "var(--t-bullish)" :
    "var(--t-muted)";

  const statusLabel =
    ev.status === "live" ? "LIVE NOW" :
    ev.status === "completed" ? "COMPLETED" : "UPCOMING";

  const impactLabel = ev.impact === "high" ? "HIGH" : "MED";
  const impactColor = ev.impact === "high" ? "var(--t-bearish)" : "var(--t-accent)";

  const tradeSnippet = ev.tradeImplication
    ? ev.tradeImplication.split(".")[0] + "."
    : null;

  const assetChip = (impact: "bullish" | "bearish" | "neutral" | undefined, label: string) => {
    if (!impact) return null;
    return (
      <span key={label} className="text-[8.5px] font-bold px-1.5 py-0.5"
        style={{
          color: impact === "bullish" ? "var(--t-bullish)" : impact === "bearish" ? "var(--t-bearish)" : "var(--t-muted)",
          background: impact === "bullish" ? "color-mix(in srgb, var(--t-bullish) 12%, transparent)" : impact === "bearish" ? "color-mix(in srgb, var(--t-bearish) 12%, transparent)" : "color-mix(in srgb, var(--t-muted) 10%, transparent)",
          borderRadius: "var(--t-badge-radius)",
          border: `1px solid ${impact === "bullish" ? "color-mix(in srgb, var(--t-bullish) 25%, transparent)" : impact === "bearish" ? "color-mix(in srgb, var(--t-bearish) 25%, transparent)" : "var(--t-border)"}`,
        }}>
        {label} {impact.toUpperCase()}
      </span>
    );
  };

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
          <StatusIcon className="h-3 w-3" style={{ color: accentColor }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--t-muted)" }}>
            EVENT #{index + 1} · USD DATA
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: impactColor }}>● {impactLabel}</span>
          {ev.status === "upcoming" && <Countdown utcTimestamp={ev.utcTimestamp} compact />}
          <span className="text-[8px]" style={{ color: "var(--t-muted)", opacity: 0.45 }}>{ev.time} PHT</span>
        </div>
      </div>

      <div className="px-3.5 pt-2.5 pb-3">
        {/* Event name + status badge */}
        <div className="flex items-start gap-2 mb-2.5">
          <h3 className="text-[12.5px] font-black uppercase leading-snug flex-1 min-w-0" style={{ color: "var(--t-text)" }}>
            {ev.event}
          </h3>
          <span
            className="inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0"
            style={{
              color: statusColor,
              background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
              borderColor: `color-mix(in srgb, ${statusColor} 30%, transparent)`,
              borderRadius: "var(--t-badge-radius)",
            }}
          >
            <StatusIcon className="h-2.5 w-2.5" />
            {statusLabel}
          </span>
        </div>

        {/* F / P / A data row */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            { label: "Forecast", value: ev.forecast, color: "#60a5fa" },
            { label: "Previous", value: ev.previous, color: "var(--t-muted)" },
            { label: "Actual",   value: ev.actual || "—", color: ev.actual ? "var(--t-accent)" : "var(--t-muted)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg p-2 text-center"
              style={{ background: "color-mix(in srgb, var(--t-text) 4%, transparent)", border: "1px solid var(--t-border)" }}>
              <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "var(--t-muted)", opacity: 0.6 }}>{label}</p>
              <p className="font-mono text-[11px] font-bold tabular-nums" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Asset impact chips */}
        <div className="flex flex-wrap gap-1 mb-3">
          {ev.affectedAssets.slice(0, 3).map(a => (
            <span key={a} className="text-[8.5px] font-mono px-1.5 py-0.5"
              style={{ color: "var(--t-muted)", background: "color-mix(in srgb, var(--t-text) 5%, transparent)", borderRadius: "var(--t-badge-radius)", border: "1px solid var(--t-border)" }}>
              {a}
            </span>
          ))}
          {assetChip(rowImpact.impact, assetShort)}
          {assetChip(ev.usdImpact, "USD")}
        </div>

        {/* Trade implication snippet */}
        {tradeSnippet && (
          <p className="text-[11px] leading-relaxed mb-3" style={{ color: "var(--t-muted)" }}>
            <PriceHighlight text={tradeSnippet} />
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

// ── Table ─────────────────────────────────────────────────────────────────────
export function EconomicEventTable({ events, showInterpretation = false, compact = false, symbol = "XAUUSD" }: EconomicEventTableProps) {
  const [selected, setSelected] = useState<EconomicEvent | null>(null);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center"
        style={{ borderRadius: "var(--t-card-radius)", border: "1px solid var(--t-border)" }}>
        <Clock className="h-5 w-5" style={{ color: "var(--t-muted)" }} />
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>No high-impact USD events found</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {events.map((ev, i) => (
          <EventCard
            key={ev.id}
            ev={ev}
            index={i}
            symbol={symbol}
            onClick={() => setSelected(ev)}
          />
        ))}
      </div>

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.event}
      >
        {selected && <EventDetail ev={selected} symbol={symbol} />}
      </DetailModal>
    </>
  );
}
