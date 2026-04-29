"use client";

import React, { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, Radio, TrendingUp, TrendingDown, Minus, Target, Shield, BookOpen, ChevronRight, Timer, Eye, Loader2, AlertCircle, Zap } from "lucide-react";
import type { EconomicEvent } from "@/types";
import { DetailModal } from "./DetailModal";
import type { PostEventAnalysis } from "@/app/api/market/post-event/route";

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
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", colors[impact])}>
      <Icon className="h-2.5 w-2.5" />
      {label} {impact.toUpperCase()}
    </span>
  );
}

function ImpactPill({ impact, label }: { impact?: "bullish" | "bearish" | "neutral"; label: string }) {
  if (!impact) return null;
  const colors = {
    bullish: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    bearish: "bg-red-500/15 text-red-400 border-red-500/30",
    neutral: "bg-zinc-700/40 text-zinc-400 border-zinc-600/30",
  };
  const Icon = impact === "bullish" ? TrendingUp : impact === "bearish" ? TrendingDown : Minus;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold", colors[impact])}>
      <Icon className="h-2.5 w-2.5" />
      {label} {impact.toUpperCase()}
    </span>
  );
}

function EventDetail({ ev, postEvent, peLoading, peError }: {
  ev: EconomicEvent;
  postEvent: PostEventAnalysis | null;
  peLoading: boolean;
  peError: boolean;
}) {
  const isCompleted = ev.status === "completed";

  return (
    <div className="space-y-4">
      {/* Time + status */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{ev.time} PHT</span>
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
          { label: "Previous", value: ev.previous,        color: "text-gray-400" },
          { label: "Actual",   value: ev.actual || "—",   color: ev.actual ? "text-[hsl(var(--primary))]" : "text-gray-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg bg-[hsl(var(--secondary))] p-3 text-center">
            <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">{label}</p>
            <p className={cn("text-sm font-bold font-mono", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* ══ COMPLETED — on-demand post-event analysis ══ */}
      {isCompleted && (
        <>
          {peLoading && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] px-4 py-6 flex flex-col items-center gap-3">
              <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Generating post-event analysis…</p>
            </div>
          )}

          {peError && !peLoading && (
            <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] px-4 py-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-[11px] text-red-400">Could not load post-event analysis.</p>
            </div>
          )}

          {postEvent && !peLoading && (
            <>
              {/* Outcome banner */}
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] px-4 py-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 mb-1.5">Actual Outcome</p>
                <p className="text-[13px] font-semibold text-white leading-snug">{postEvent.outcome}</p>
              </div>

              {/* Statement highlights */}
              {postEvent.statementHighlights?.length > 0 && (
                <div className="rounded-xl border border-white/6 bg-white/[0.015] overflow-hidden">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/5">
                    <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Key Statement Highlights</span>
                  </div>
                  <ul className="px-3.5 py-3 space-y-2.5">
                    {postEvent.statementHighlights.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-amber-500/60" />
                        <span className="text-[11.5px] text-zinc-300 leading-snug">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Market reaction */}
              <div className="rounded-xl border border-white/6 bg-white/[0.015] px-3.5 py-3 space-y-1.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Market Reaction</p>
                <p className="text-[11.5px] text-zinc-300 leading-relaxed">{postEvent.marketReaction}</p>
                {postEvent.timeframe && (
                  <p className="text-[11px] text-zinc-500 italic">{postEvent.timeframe}</p>
                )}
              </div>

              {/* Gold + USD side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[hsl(var(--secondary))] p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-amber-400" />
                    <ImpactPill impact={postEvent.goldImpact} label="GOLD" />
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{postEvent.goldAnalysis}</p>
                </div>
                <div className="rounded-lg bg-[hsl(var(--secondary))] p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-blue-400" />
                    <ImpactPill impact={postEvent.usdImpact} label="USD" />
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{postEvent.usdAnalysis}</p>
                </div>
              </div>

              {/* Now watch */}
              {postEvent.traderFocus?.length > 0 && (
                <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.03] overflow-hidden">
                  <div className="flex items-center gap-2 px-3.5 py-2 border-b border-blue-500/10">
                    <Zap className="h-3 w-3 text-blue-400" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400">Now Watch</span>
                  </div>
                  <ul className="px-3.5 py-3 space-y-2">
                    {postEvent.traderFocus.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-blue-500/60" />
                        <span className="text-[11px] text-zinc-400 leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ══ UPCOMING / LIVE — pre-event analysis ══ */}
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
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))] leading-snug">{b}</span>
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
            <div className="rounded-lg border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--primary))] mb-1.5">Trade Implication</p>
              <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{ev.tradeImplication}</p>
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
              <span key={a} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
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
  const [analyses, setAnalyses] = useState<Record<string, PostEventAnalysis>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());
  const fetchedRef = useRef<Set<string>>(new Set());

  // Pre-fetch post-event analysis for all completed events when they appear
  useEffect(() => {
    const completed = events.filter(e => e.status === "completed");
    completed.forEach(ev => {
      if (fetchedRef.current.has(ev.id)) return;
      fetchedRef.current.add(ev.id);
      setLoadingIds(prev => new Set(prev).add(ev.id));
      const context = [
        ev.actual   ? `Actual: ${ev.actual}`   : "",
        ev.forecast ? `Forecast: ${ev.forecast}` : "",
        ev.previous ? `Previous: ${ev.previous}` : "",
      ].filter(Boolean).join(", ");
      const params = new URLSearchParams({
        title:   ev.event,
        summary: context || ev.goldReasoning || "",
        markets: ev.affectedAssets.join(", "),
      });
      fetch(`/api/market/post-event?${params}`)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(data => setAnalyses(prev => ({ ...prev, [ev.id]: data })))
        .catch(() => setErrorIds(prev => new Set(prev).add(ev.id)))
        .finally(() => setLoadingIds(prev => { const s = new Set(prev); s.delete(ev.id); return s; }));
    });
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

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
        {selected && (
          <EventDetail
            ev={selected}
            postEvent={analyses[selected.id] ?? null}
            peLoading={loadingIds.has(selected.id)}
            peError={errorIds.has(selected.id)}
          />
        )}
      </DetailModal>
    </>
  );
}
