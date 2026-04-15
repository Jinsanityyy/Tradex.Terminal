"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, Target, Shield, TrendingUp, TrendingDown, Info, ChevronRight } from "lucide-react";
import type { TradePlan as TradePlanType } from "@/lib/agents/schemas";

interface TradePlanProps {
  tradePlan: TradePlanType | null;
  loading?: boolean;
}

function PriceRow({
  label, value, sublabel, color, icon,
}: {
  label: string;
  value: number;
  sublabel?: string;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/4 last:border-0">
      <div className="flex items-center gap-2.5">
        {icon && <div className={cn(color, "opacity-80")}>{icon}</div>}
        <div>
          <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">{label}</div>
          {sublabel && <div className="text-[11px] text-zinc-500 mt-0.5 max-w-52 truncate">{sublabel}</div>}
        </div>
      </div>
      <div className={cn("text-base font-mono font-bold", color)}>
        {value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: value > 100 ? 2 : 5,
        })}
      </div>
    </div>
  );
}

function NoTradeCard() {
  return (
    <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-6 text-center">
      <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3.5">
        <Shield className="h-5 w-5 text-amber-400" />
      </div>
      <div className="text-sm font-semibold text-amber-400">No Active Trade Plan</div>
      <p className="text-xs text-zinc-500 mt-2 max-w-xs mx-auto leading-relaxed">
        Insufficient consensus or risk conditions not met. Stand aside and monitor for setup development.
      </p>
    </div>
  );
}

export function TradePlan({ tradePlan, loading }: TradePlanProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/6 bg-[#111]/60 p-5 animate-pulse space-y-3">
        <div className="h-5 w-28 bg-white/8 rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 w-full bg-white/5 rounded" />
        ))}
      </div>
    );
  }

  if (!tradePlan) {
    return <NoTradeCard />;
  }

  const isLong = tradePlan.direction === "long";
  const riskColor  = "text-red-400";
  const entryColor = isLong ? "text-emerald-400" : "text-red-400";
  const tp1Color   = "text-emerald-400";
  const tp2Color   = "text-emerald-300";

  return (
    <div className="rounded-xl border bg-[#0d0d0d]/80 backdrop-blur-sm overflow-hidden"
      style={{ borderColor: isLong ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)" }}>

      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-5 py-4 border-b border-white/5",
        isLong ? "bg-emerald-500/8" : "bg-red-500/8"
      )}>
        <div className="flex items-center gap-2.5">
          {isLong
            ? <TrendingUp className="h-4 w-4 text-emerald-400" />
            : <TrendingDown className="h-4 w-4 text-red-400" />
          }
          <span className={cn("font-bold text-sm", isLong ? "text-emerald-400" : "text-red-400")}>
            {isLong ? "LONG" : "SHORT"} — {tradePlan.trigger}
          </span>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">RR Ratio</div>
            <div className={cn("text-sm font-mono font-bold mt-0.5", tradePlan.rrRatio >= 2 ? "text-emerald-400" : "text-amber-400")}>
              {tradePlan.rrRatio.toFixed(1)}:1
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Max Risk</div>
            <div className="text-sm font-mono font-bold text-zinc-200 mt-0.5">
              {tradePlan.maxRiskPercent}%
            </div>
          </div>
        </div>
      </div>

      {/* Price levels */}
      <div className="px-5 py-1">
        <PriceRow
          label="Entry"
          value={tradePlan.entry}
          sublabel={tradePlan.entryZone}
          color={entryColor}
          icon={<Target className="h-3.5 w-3.5" />}
        />
        <PriceRow
          label="Stop Loss"
          value={tradePlan.stopLoss}
          sublabel={tradePlan.slZone}
          color={riskColor}
          icon={<Shield className="h-3.5 w-3.5" />}
        />
        <PriceRow
          label="Take Profit 1"
          value={tradePlan.tp1}
          sublabel={tradePlan.tp1Zone}
          color={tp1Color}
          icon={<ChevronRight className="h-3.5 w-3.5" />}
        />
        {tradePlan.tp2 && (
          <PriceRow
            label="Take Profit 2"
            value={tradePlan.tp2}
            color={tp2Color}
            icon={<ChevronRight className="h-3.5 w-3.5" />}
          />
        )}
      </div>

      {/* Trigger condition */}
      <div className="px-5 pb-4">
        <div className="rounded-lg bg-white/3 border border-white/6 p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Trigger Condition</div>
          <p className="text-xs text-zinc-400 leading-relaxed">{tradePlan.triggerCondition}</p>
        </div>
      </div>

      {/* Management notes */}
      {tradePlan.managementNotes.length > 0 && (
        <div className="px-5 pb-5 border-t border-white/4 pt-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Trade Management</div>
          <div className="space-y-2.5">
            {tradePlan.managementNotes.map((note, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <ArrowRight className="h-3 w-3 text-zinc-500 mt-0.5 shrink-0" />
                <p className="text-xs text-zinc-400 leading-relaxed">{note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
