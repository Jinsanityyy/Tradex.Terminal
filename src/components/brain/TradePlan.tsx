"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, Target, Shield, TrendingUp, TrendingDown, ChevronRight, ChevronDown, Calculator } from "lucide-react";
import type { TradePlan as TradePlanType } from "@/lib/agents/schemas";

interface TradePlanProps {
  tradePlan: TradePlanType | null;
  loading?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lot Size Calculator
// ─────────────────────────────────────────────────────────────────────────────

const ACCOUNT_PRESETS = [1000, 5000, 10000, 25000, 50000, 100000];

function LotSizeCalculator({
  entry, stopLoss, riskPercent,
}: {
  entry: number;
  stopLoss: number;
  riskPercent: number;
}) {
  const [accountSize, setAccountSize] = useState(10000);

  const slPoints = Math.abs(entry - stopLoss);

  // XAUUSD: $100 per point per standard lot (100 oz × $1/oz/point)
  // Other pairs with price > 100: similar scale; FX pairs: $10 per pip per lot
  const pointValue = entry > 100 ? 100 : 10; // gold/indices vs FX
  const riskAmount = accountSize * (riskPercent / 100);
  const rawLots = slPoints > 0 ? riskAmount / (slPoints * pointValue) : 0;

  // Round to nearest valid lot step
  const lots = rawLots >= 1
    ? parseFloat(rawLots.toFixed(2))
    : rawLots >= 0.1
    ? parseFloat(rawLots.toFixed(2))
    : parseFloat(rawLots.toFixed(3));

  const displayLots = lots < 0.01 ? "< 0.01" : lots.toFixed(lots >= 1 ? 2 : lots >= 0.1 ? 2 : 3);

  return (
    <div className="mx-5 mb-5 rounded-lg bg-white/3 border border-white/6 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="h-3.5 w-3.5 text-violet-400" />
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Lot Size Calculator</span>
        <span className="text-[10px] text-zinc-600 ml-auto">@ {riskPercent}% risk</span>
      </div>

      {/* Account size selector */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {ACCOUNT_PRESETS.map(preset => (
          <button
            key={preset}
            onClick={() => setAccountSize(preset)}
            className={cn(
              "px-2 py-1 rounded text-[10px] font-semibold transition-all",
              accountSize === preset
                ? "bg-violet-500/20 border border-violet-500/30 text-violet-300"
                : "bg-white/4 border border-white/8 text-zinc-500 hover:text-zinc-300"
            )}
          >
            ${preset >= 1000 ? `${preset / 1000}k` : preset}
          </button>
        ))}
        <input
          type="number"
          value={accountSize}
          onChange={e => setAccountSize(Math.max(100, Number(e.target.value)))}
          className="px-2 py-1 rounded border border-white/8 text-[10px] text-zinc-300 w-20 text-right focus:outline-none focus:border-violet-500/40"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", colorScheme: "dark" }}
          placeholder="Custom"
        />
      </div>

      {/* Result */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] text-zinc-500 mb-0.5">Recommended lot size</div>
          <div className="text-2xl font-black font-mono text-violet-300">{displayLots}
            <span className="text-sm font-normal text-zinc-500 ml-1.5">lots</span>
          </div>
        </div>
        <div className="text-right space-y-0.5">
          <div className="text-[10px] text-zinc-600">Risk amount</div>
          <div className="text-sm font-mono font-semibold text-zinc-300">${riskAmount.toFixed(0)}</div>
          <div className="text-[10px] text-zinc-600">SL distance</div>
          <div className="text-xs font-mono text-zinc-400">{slPoints.toFixed(entry > 100 ? 1 : 4)} pts</div>
        </div>
      </div>
    </div>
  );
}

const PRICE_ROW_EXPLANATIONS: Record<string, string> = {
  "Entry": "The exact price zone where you execute the trade. Wait for price to reach this level.do NOT chase. Entry is based on post-sweep confirmation or structure break retest.",
  "Stop Loss": "Your invalidation level. If price closes below this point, the trade setup is broken.exit immediately. Sized to the sweep low/high so lows/highs must hold for the thesis to remain valid.",
  "Take Profit 1": "First partial target (50% position). Closes half your trade to lock in profit and eliminate risk. After TP1 is hit, move your stop loss to breakeven on the remaining position.",
  "Take Profit 2": "Final target for the remainder of your position. Based on the next major structural level. Trail your stop as price approaches to protect gains.",
};

function PriceRow({
  label, value, sublabel, color, icon,
}: {
  label: string;
  value: number;
  sublabel?: string;
  color: string;
  icon?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const explanation = PRICE_ROW_EXPLANATIONS[label];

  return (
    <div className="border-b border-white/4 last:border-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between py-3 hover:bg-white/2 rounded transition-colors px-1 -mx-1 group"
      >
        <div className="flex items-center gap-2.5">
          {icon && <div className={cn(color, "opacity-80")}>{icon}</div>}
          <div className="text-left">
            <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">{label}</div>
            {sublabel && <div className="text-[11px] text-zinc-500 mt-0.5 max-w-52 truncate">{sublabel}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("text-base font-mono font-bold", color)}>
            {value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: value > 100 ? 2 : 5,
            })}
          </div>
          {explanation && (
            expanded
              ? <ChevronDown className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
              : <ChevronRight className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
          )}
        </div>
      </button>
      {expanded && explanation && (
        <div className="pb-3 px-1">
          <div className="rounded-lg bg-white/3 border border-white/6 px-3 py-2.5">
            <p className="text-[11px] text-zinc-400 leading-relaxed">{explanation}</p>
          </div>
        </div>
      )}
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
            {isLong ? "LONG" : "SHORT"}.{tradePlan.trigger}
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

      {/* Lot Size Calculator */}
      <LotSizeCalculator
        entry={tradePlan.entry}
        stopLoss={tradePlan.stopLoss}
        riskPercent={tradePlan.maxRiskPercent}
      />

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
