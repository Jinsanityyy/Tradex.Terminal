"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronRight,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SignalState, TradePlan as TradePlanType } from "@/lib/agents/schemas";

interface TradePlanProps {
  tradePlan: TradePlanType | null;
  signalState?: SignalState;
  signalStateReason?: string;
  distanceToEntry?: number | null;
  loading?: boolean;
}

function SignalStateBanner({
  state,
  reason,
  distanceToEntry,
}: {
  state: SignalState;
  reason: string;
  distanceToEntry?: number | null;
}) {
  const config = {
    ARMED: {
      bg: "bg-emerald-500/12",
      border: "border-emerald-500/30",
      dot: "bg-emerald-400",
      label: "ARMED",
      labelColor: "text-emerald-300",
      textColor: "text-emerald-200/80",
    },
    PENDING: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      dot: "bg-amber-400",
      label: "PENDING",
      labelColor: "text-amber-300",
      textColor: "text-amber-200/70",
    },
    EXPIRED: {
      bg: "bg-zinc-800/60",
      border: "border-zinc-600/30",
      dot: "bg-zinc-500",
      label: "EXPIRED",
      labelColor: "text-zinc-400",
      textColor: "text-zinc-500",
    },
    NO_TRADE: {
      bg: "bg-zinc-900/60",
      border: "border-zinc-700/30",
      dot: "bg-zinc-600",
      label: "NO TRADE",
      labelColor: "text-zinc-500",
      textColor: "text-zinc-600",
    },
  }[state];

  return (
    <div className={cn("mb-3 rounded-xl border px-3.5 py-3", config.bg, config.border)}>
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", config.dot)} />
        <span className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", config.labelColor)}>
          {config.label}
        </span>
        {distanceToEntry != null && state !== "NO_TRADE" ? (
          <span className="ml-auto font-mono text-[10px] text-zinc-500">{distanceToEntry.toFixed(2)}% from entry</span>
        ) : null}
      </div>
      <p className={cn("mt-2 text-[11px] leading-5", config.textColor)}>{reason}</p>
    </div>
  );
}

const ACCOUNT_PRESETS = [1000, 5000, 10000, 25000, 50000, 100000];

function LotSizeCalculator({
  entry,
  stopLoss,
  riskPercent,
}: {
  entry: number;
  stopLoss: number;
  riskPercent: number;
}) {
  const [accountSize, setAccountSize] = useState(10000);
  const slPoints = Math.abs(entry - stopLoss);
  const pointValue = entry > 100 ? 100 : 10;
  const riskAmount = accountSize * (riskPercent / 100);
  const rawLots = slPoints > 0 ? riskAmount / (slPoints * pointValue) : 0;
  const lots =
    rawLots >= 1 ? parseFloat(rawLots.toFixed(2)) : rawLots >= 0.1 ? parseFloat(rawLots.toFixed(2)) : parseFloat(rawLots.toFixed(3));
  const displayLots = lots < 0.01 ? "< 0.01" : lots.toFixed(lots >= 1 ? 2 : lots >= 0.1 ? 2 : 3);

  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="mb-3 flex items-center gap-2">
        <Calculator className="h-3.5 w-3.5 text-violet-400" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Lot Size Calculator</span>
        <span className="ml-auto text-[10px] text-zinc-600">@ {riskPercent}% risk</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {ACCOUNT_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setAccountSize(preset)}
            className={cn(
              "rounded px-2 py-1 text-[10px] font-semibold transition-all",
              accountSize === preset
                ? "border border-violet-500/30 bg-violet-500/20 text-violet-300"
                : "border border-white/8 bg-white/4 text-zinc-500 hover:text-zinc-300"
            )}
          >
            ${preset >= 1000 ? `${preset / 1000}k` : preset}
          </button>
        ))}
        <input
          type="number"
          value={accountSize}
          onChange={(event) => setAccountSize(Math.max(100, Number(event.target.value)))}
          className="w-20 rounded border border-white/8 bg-[#0d0d0d] px-2 py-1 text-right text-[10px] text-zinc-300 outline-none focus:border-violet-500/40 [color-scheme:dark]"
          placeholder="Custom"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Recommended Size</div>
          <div className="mt-1 text-xl font-black font-mono text-violet-300">{displayLots}</div>
        </div>
        <div className="space-y-1 text-right">
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
  Entry: "Primary execution zone. Wait for price to trade into this level instead of chasing momentum.",
  "Stop Loss": "Invalidation level for the thesis. If price breaks this area, the setup is considered wrong.",
  "Take Profit 1": "First partial target used to reduce exposure and protect the trade after early confirmation.",
  "Take Profit 2": "Final objective at the next major structural target for the remaining position.",
};

function PriceRow({
  label,
  value,
  sublabel,
  color,
  icon,
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
        onClick={() => setExpanded((current) => !current)}
        className="group -mx-1 flex w-full items-center justify-between rounded px-1 py-2.5 text-left transition-colors hover:bg-white/2"
      >
        <div className="flex items-center gap-2.5">
          {icon ? <div className={color}>{icon}</div> : null}
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</div>
            {sublabel ? <div className="mt-0.5 max-w-52 truncate text-[11px] text-zinc-500">{sublabel}</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("text-[15px] font-mono font-bold", color)}>
            {value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: value > 100 ? 2 : 5,
            })}
          </div>
          {explanation ? (
            expanded ? (
              <ChevronDown className="h-3 w-3 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400" />
            )
          ) : null}
        </div>
      </button>

      {expanded && explanation ? (
        <div className="px-1 pb-3">
          <div className="rounded-lg border border-white/6 bg-white/3 px-3 py-2.5">
            <p className="text-[11px] leading-5 text-zinc-400">{explanation}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NoTradeCard({ fillHeight = false }: { fillHeight?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
        fillHeight && "flex h-full min-h-[430px] flex-col items-center justify-center"
      )}
    >
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
        <Shield className="h-4.5 w-4.5 text-amber-400" />
      </div>
      <div className="text-sm font-semibold text-amber-400">No Active Trade Plan</div>
      <p className="mx-auto mt-2 max-w-xs text-[11px] leading-5 text-zinc-500">
        Consensus or risk conditions are not strong enough yet. Stand aside and wait for structure to improve.
      </p>
    </div>
  );
}

export function TradePlan({
  tradePlan,
  signalState,
  signalStateReason,
  distanceToEntry,
  loading,
}: TradePlanProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-3 rounded-xl border border-white/6 bg-[#111]/60 p-4">
        <div className="h-5 w-28 rounded bg-white/8" />
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-10 w-full rounded bg-white/5" />
        ))}
      </div>
    );
  }

  if (!tradePlan) {
    return (
      <div className="flex h-full flex-col">
        {signalState && signalStateReason && signalState !== "NO_TRADE" ? (
          <SignalStateBanner state={signalState} reason={signalStateReason} distanceToEntry={distanceToEntry} />
        ) : null}
        <NoTradeCard fillHeight />
      </div>
    );
  }

  const isLong = tradePlan.direction === "long";
  const entryColor = isLong ? "text-emerald-400" : "text-red-400";

  return (
    <>
      {signalState && signalStateReason ? (
        <SignalStateBanner state={signalState} reason={signalStateReason} distanceToEntry={distanceToEntry} />
      ) : null}

      <div
        className="overflow-hidden rounded-2xl border bg-[linear-gradient(180deg,rgba(14,14,14,0.95),rgba(10,10,10,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm"
        style={{ borderColor: isLong ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)" }}
      >
        <div className={cn("flex items-center justify-between border-b border-white/5 px-4 py-3.5", isLong ? "bg-emerald-500/8" : "bg-red-500/8")}>
          <div className="flex items-center gap-2.5">
            {isLong ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-red-400" />}
            <div>
              <div className={cn("text-sm font-semibold", isLong ? "text-emerald-400" : "text-red-400")}>
                {isLong ? "LONG" : "SHORT"} - {tradePlan.trigger}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-400">Execution-ready plan with defined invalidation.</div>
            </div>
          </div>

          <div className="grid gap-2 text-right sm:grid-cols-2 sm:gap-3">
            <div className="rounded-lg border border-white/6 bg-black/20 px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">RR Ratio</div>
              <div className={cn("mt-1 text-sm font-mono font-bold", tradePlan.rrRatio >= 2 ? "text-emerald-400" : "text-amber-400")}>
                {tradePlan.rrRatio.toFixed(1)}:1
              </div>
            </div>
            <div className="rounded-lg border border-white/6 bg-black/20 px-3 py-2">
              <div className="text-[9px] uppercase tracking-[0.14em] text-zinc-500">Max Risk</div>
              <div className="mt-1 text-sm font-mono font-bold text-zinc-200">{tradePlan.maxRiskPercent}%</div>
            </div>
          </div>
        </div>

        <div className="grid gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3 sm:grid-cols-4">
          <div className="rounded-lg border border-white/6 bg-black/10 px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-500">Bias</div>
            <div className={cn("mt-1 text-[12px] font-semibold", entryColor)}>{isLong ? "Long" : "Short"}</div>
          </div>
          <div className="rounded-lg border border-white/6 bg-black/10 px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-500">Trigger</div>
            <div className="mt-1 text-[12px] font-semibold text-zinc-200">{tradePlan.trigger}</div>
          </div>
          <div className="rounded-lg border border-white/6 bg-black/10 px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-500">Entry Zone</div>
            <div className="mt-1 text-[12px] font-semibold text-zinc-200">{tradePlan.entryZone}</div>
          </div>
          <div className="rounded-lg border border-white/6 bg-black/10 px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-500">State</div>
            <div className="mt-1 text-[12px] font-semibold text-zinc-200">{signalState ?? "ACTIVE"}</div>
          </div>
        </div>

        <div className="px-4 py-2">
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
            color="text-red-400"
            icon={<Shield className="h-3.5 w-3.5" />}
          />
          <PriceRow
            label="Take Profit 1"
            value={tradePlan.tp1}
            sublabel={tradePlan.tp1Zone}
            color="text-emerald-400"
            icon={<ChevronRight className="h-3.5 w-3.5" />}
          />
          {tradePlan.tp2 ? (
            <PriceRow
              label="Take Profit 2"
              value={tradePlan.tp2}
              color="text-emerald-300"
              icon={<ChevronRight className="h-3.5 w-3.5" />}
            />
          ) : null}
        </div>

        <div className="grid gap-3 px-4 pb-4 pt-2 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <LotSizeCalculator entry={tradePlan.entry} stopLoss={tradePlan.stopLoss} riskPercent={tradePlan.maxRiskPercent} />

          <div className="space-y-3">
            <div className="rounded-xl border border-white/6 bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Trigger Condition</div>
              <p className="mt-2 text-[12px] leading-5 text-zinc-400">{tradePlan.triggerCondition}</p>
            </div>

            {tradePlan.managementNotes.length > 0 ? (
              <div className="rounded-xl border border-white/6 bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Trade Management</div>
                <div className="mt-3 space-y-2.5">
                  {tradePlan.managementNotes.map((note, index) => (
                    <div key={index} className="flex items-start gap-2.5">
                      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" />
                      <p className="text-[12px] leading-5 text-zinc-400">{note}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
