"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { MarketSnapshot } from "@/lib/agents/schemas";

interface SnapshotBarProps {
  snapshot: MarketSnapshot;
  livePrice?: number;
  liveChangePercent?: number;
}

export function SnapshotBar({ snapshot, livePrice, liveChangePercent }: SnapshotBarProps) {
  const { price, structure, indicators } = snapshot;
  const displayPrice = livePrice ?? price.current;
  const displayPct   = liveChangePercent ?? price.changePercent;
  const isUp = displayPct >= 0;

  const fields = [
    {
      label: "Price",
      value: displayPrice.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: displayPrice > 100 ? 2 : 5,
      }),
      color: isUp ? "text-emerald-400" : "text-red-400",
    },
    {
      label: "Change",
      value: `${isUp ? "+" : ""}${displayPct.toFixed(2)}%`,
      color: isUp ? "text-emerald-400" : "text-red-400",
    },
    {
      label: "RSI",
      value: indicators.rsi.toFixed(1),
      color: indicators.rsi > 70 ? "text-red-400" : indicators.rsi < 30 ? "text-emerald-400" : "text-zinc-300",
    },
    {
      label: "Zone",
      value: structure.zone,
      color: structure.zone === "DISCOUNT" ? "text-emerald-400" : structure.zone === "PREMIUM" ? "text-red-400" : "text-zinc-400",
    },
    {
      label: "52W Pos",
      value: `${structure.pos52w}%`,
      color: "text-zinc-300",
    },
    {
      label: "Session",
      value: indicators.session,
      color: indicators.session === "London" || indicators.session === "New York" ? "text-amber-400" : "text-zinc-500",
    },
    {
      label: "HTF Bias",
      value: structure.htfBias.toUpperCase(),
      color: structure.htfBias === "bullish" ? "text-emerald-400" : structure.htfBias === "bearish" ? "text-red-400" : "text-zinc-400",
    },
  ];

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto rounded-xl border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] px-2 py-1.5"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="hidden shrink-0 items-center gap-2 rounded-lg border border-emerald-500/12 bg-emerald-500/[0.04] px-3 py-1.5 md:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Live Bias Snapshot</span>
      </div>
      {fields.map((f, i) => (
        <React.Fragment key={f.label}>
          {i > 0 && <div className="hidden h-6 w-px shrink-0 bg-white/8 md:block" />}
          <div className="flex shrink-0 flex-col rounded-lg border border-transparent px-3 py-1.5 md:min-w-[78px] md:items-center md:bg-white/[0.02]">
            <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500">{f.label}</span>
            <span className={cn("mt-1 text-[11px] font-mono font-semibold", f.color)}>{f.value}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
