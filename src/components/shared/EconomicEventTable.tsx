"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, Radio, TrendingUp, TrendingDown, Minus, Target, Shield, BookOpen, ChevronRight, Timer, Eye } from "lucide-react";
import type { EconomicEvent } from "@/types";
import { DetailModal } from "./DetailModal";

// ── Countdown Timer ──────────────────────────────────────────────────────────
function useCountdown(utcTimestamp?: number) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    if (!utcTimestamp) return;
    const tick = () => setDiff(utcTimestamp - Date.now());
    tick();
    // Update every second if < 5 min away, else every 30s
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

  const label = hours > 0
    ? `${hours}h ${minutes}m`
    : minutes > 0
    ? `${minutes}m ${seconds}s`
    : `${seconds}s`;

  const urgent = diff < 30 * 60_000; // under 30 min

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
      urgent
        ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
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

// Wraps ±N.N% / $N / NK patterns in a monospace span for Bloomberg-style data rendering
function DataInline({ text }: { text: string }) {
  const parts = text.split(/([\$±]?[\d,]+\.?\d*[KkMmBb%]?(?:\s*[KkMmBb%])?)/g);
  return (
    <>
      {parts.map((part, i) =>
        /[\d]/.test(part) ? (
          <span key={i} className="font-data tabular-nums text-zinc-200">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function EventDetail({ ev }: { ev: EconomicEvent }) {
  const isCompleted = ev.status === "completed";

  // Determine glow for Trade Implication box
  const tradeGlow =
    ev.goldImpact === "bullish" || ev.usdImpact === "bullish"
      ? "border-emerald-500/30 bg-emerald-500/[0.06] shadow-[0_0_18px_rgba(52,211,153,0.12)]"
      : ev.goldImpact === "bearish" || ev.usdImpact === "bearish"
      ? "border-red-500/30 bg-red-500/[0.06] shadow-[0_0_18px_rgba(239,68,68,0.12)]"
      : "border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5";

  const tradeTextColor =
    ev.goldImpact === "bullish" || ev.usdImpact === "bullish"
      ? "text-emerald-400"
      : ev.goldImpact === "bearish" || ev.usdImpact === "bearish"
      ? "text-red-400"
      : "text-[hsl(var(--primary))]";

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
          { label: "Forecast", value: ev.forecast,       color: "text-blue-400" },
          { label: "Previous", value: ev.previous,       color: "text-zinc-400" },
          { label: "Actual",   value: ev.actual || " - ", color: ev.actual ? "text-[hsl(var(--primary))]" : "text-zinc-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg bg-[hsl(var(--secondary))] p-3 text-center">
            <p className="text-[9px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-1.5">{label}</p>
            <p className={cn("font-data text-sm font-bold tabular-nums tracking-tight", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* ══ COMPLETED  -  static post-event analysis ══ */}
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

      {/* ══ UPCOMING / LIVE  -  pre-event analysis ══ */}
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

      {/* Pre-event Gold / USD context */}
      {!isCompleted && (
        <>
          <div className="flex gap-2 flex-wrap">
            <ImpactBadge impact={ev.goldImpact} label="GOLD" />
            <ImpactBadge impact={ev.usdImpact} label="USD" />
          </div>
          {ev.goldReasoning && (
            <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Gold Analysis</span>
              </div>
              <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{ev.goldReasoning}</p>
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

export function EconomicEventTable({ events, showInterpretation = false, compact = false }: EconomicEventTableProps) {
  const [selected, setSelected] = useState<EconomicEvent | null>(null);

  if (events.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-[hsl(var(--muted-foreground))]">No high-impact USD events found</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {events.map((ev) => {
          const StatusIcon = ev.status === "completed" ? CheckCircle2 : ev.status === "live" ? Radio : Clock;
          const statusColor = ev.status === "completed" ? "text-emerald-500" : ev.status === "live" ? "text-amber-400 pulse-live" : "text-blue-400";

          return (
            <div
              key={ev.id}
              onClick={() => setSelected(ev)}
              className={cn(
                "rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden transition-colors cursor-pointer hover:bg-[hsl(var(--secondary))]",
                ev.status === "live" && "border-amber-500/30 bg-amber-500/[0.03]"
              )}
            >
              {/* Header Row */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-[hsl(var(--border))]/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", statusColor)} />
                  <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] shrink-0">{ev.time} PHT</span>
                  <span className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">{ev.event}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {ev.status === "upcoming" && (
                    <Countdown utcTimestamp={ev.utcTimestamp} compact />
                  )}
                  <Badge variant={ev.impact === "high" ? "high" : "medium"} className="text-[9px]">
                    {ev.impact === "high" ? "HIGH" : "MED"}
                  </Badge>
                  <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                    F: {ev.forecast} | P: {ev.previous}
                    {ev.actual && ev.status === "completed" ? ` | A: ${ev.actual}` : ""}
                  </span>
                </div>
              </div>

              {/* Analysis Row */}
              <div className={cn("px-3 py-2", compact ? "space-y-1" : "space-y-2")}>
                <div className="flex items-center gap-2 flex-wrap">
                  <ImpactBadge impact={ev.goldImpact} label="GOLD" />
                  <ImpactBadge impact={ev.usdImpact} label="USD" />
                  <div className="flex items-center gap-1 ml-auto">
                    {ev.affectedAssets.slice(0, 4).map((a) => (
                      <span key={a} className="text-[9px] font-mono px-1 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                {ev.goldReasoning && !compact && (
                  <div className="rounded-md bg-[hsl(var(--secondary))]/60 px-2.5 py-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3 w-3 text-amber-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Gold Analysis</span>
                    </div>
                    <p className="text-[11px] text-[hsl(var(--foreground))] leading-relaxed">{ev.goldReasoning}</p>
                  </div>
                )}

                {ev.usdReasoning && !compact && (
                  <div className="rounded-md bg-[hsl(var(--secondary))]/60 px-2.5 py-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-blue-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">USD Analysis</span>
                    </div>
                    <p className="text-[11px] text-[hsl(var(--foreground))] leading-relaxed">{ev.usdReasoning}</p>
                  </div>
                )}

                {ev.tradeImplication && (
                  <div className={cn(
                    "rounded-md px-2.5 py-2",
                    compact ? "bg-transparent" : "bg-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/10"
                  )}>
                    <p className={cn(
                      "text-[11px] leading-relaxed",
                      compact ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--primary))]"
                    )}>
                      {compact ? ev.tradeImplication.split(".")[0] + "." : ev.tradeImplication}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.event}
      >
        {selected && <EventDetail ev={selected} />}
      </DetailModal>
    </>
  );
}
