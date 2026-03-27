"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, Radio, TrendingUp, TrendingDown, Minus, Target, Shield } from "lucide-react";
import type { EconomicEvent } from "@/types";

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

export function EconomicEventTable({ events, showInterpretation = false, compact = false }: EconomicEventTableProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-[hsl(var(--muted-foreground))]">No high-impact USD events found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((ev) => {
        const StatusIcon = ev.status === "completed" ? CheckCircle2 : ev.status === "live" ? Radio : Clock;
        const statusColor = ev.status === "completed" ? "text-emerald-500" : ev.status === "live" ? "text-amber-400 pulse-live" : "text-blue-400";

        return (
          <div
            key={ev.id}
            className={cn(
              "rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden transition-colors",
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
              {/* Gold & USD Impact Badges */}
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

              {/* Gold Analysis */}
              {ev.goldReasoning && !compact && (
                <div className="rounded-md bg-[hsl(var(--secondary))]/60 px-2.5 py-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3 w-3 text-amber-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Gold Analysis</span>
                  </div>
                  <p className="text-[11px] text-[hsl(var(--foreground))] leading-relaxed">{ev.goldReasoning}</p>
                </div>
              )}

              {/* USD Analysis */}
              {ev.usdReasoning && !compact && (
                <div className="rounded-md bg-[hsl(var(--secondary))]/60 px-2.5 py-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">USD Analysis</span>
                  </div>
                  <p className="text-[11px] text-[hsl(var(--foreground))] leading-relaxed">{ev.usdReasoning}</p>
                </div>
              )}

              {/* Trade Implication */}
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
  );
}
