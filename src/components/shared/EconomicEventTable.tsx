"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, Radio, TrendingUp, TrendingDown, Minus, Target, Shield } from "lucide-react";
import type { EconomicEvent } from "@/types";
import { DetailModal } from "./DetailModal";

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

function EventDetail({ ev }: { ev: EconomicEvent }) {
  return (
    <div className="space-y-4">
      {/* Time + numbers */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{ev.time} ET</span>
        <Badge variant="high" className="text-[9px]">HIGH IMPACT</Badge>
      </div>

      {/* Forecast / Previous / Actual */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Forecast", value: ev.forecast, color: "text-blue-400" },
          { label: "Previous", value: ev.previous, color: "text-gray-400" },
          { label: "Actual", value: ev.actual || "—", color: ev.actual ? "text-[hsl(var(--primary))]" : "text-gray-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg bg-[hsl(var(--secondary))] p-3 text-center">
            <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">{label}</p>
            <p className={cn("text-sm font-bold font-mono", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Impact badges */}
      <div className="flex gap-2 flex-wrap">
        <ImpactBadge impact={ev.goldImpact} label="GOLD" />
        <ImpactBadge impact={ev.usdImpact} label="USD" />
      </div>

      {/* Gold analysis */}
      {ev.goldReasoning && (
        <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Gold Analysis</span>
          </div>
          <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{ev.goldReasoning}</p>
        </div>
      )}

      {/* USD analysis */}
      {ev.usdReasoning && (
        <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">USD Analysis</span>
          </div>
          <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{ev.usdReasoning}</p>
        </div>
      )}

      {/* Trade implication */}
      {ev.tradeImplication && (
        <div className="rounded-lg border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5 p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--primary))] mb-1.5">Trade Implication</p>
          <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{ev.tradeImplication}</p>
        </div>
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
                  <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] shrink-0">{ev.time} ET</span>
                  <span className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">{ev.event}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge variant="high" className="text-[9px]">HIGH</Badge>
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
