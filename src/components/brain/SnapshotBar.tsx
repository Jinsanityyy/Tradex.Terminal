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
    <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {fields.map((f, i) => (
        <React.Fragment key={f.label}>
          {i > 0 && <div className="h-6 w-px shrink-0 bg-white/8" />}
          <div className="flex shrink-0 flex-col items-center px-3">
            <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{f.label}</span>
            <span className={cn("mt-0.5 text-[11px] font-mono font-semibold", f.color)}>{f.value}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
