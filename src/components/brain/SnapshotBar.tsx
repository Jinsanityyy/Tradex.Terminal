"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { MarketSnapshot } from "@/lib/agents/schemas";

interface SnapshotBarProps {
  snapshot: MarketSnapshot;
}

export function SnapshotBar({ snapshot }: SnapshotBarProps) {
  const { price, structure, indicators } = snapshot;
  const isUp = price.changePercent >= 0;

  const fields = [
    {
      label: "Price",
      value: price.current.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: price.current > 100 ? 2 : 5,
      }),
      color: isUp ? "text-emerald-400" : "text-red-400",
    },
    {
      label: "Change",
      value: `${isUp ? "+" : ""}${price.changePercent.toFixed(2)}%`,
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
          {i > 0 && <div className="w-px h-7 bg-white/8 shrink-0" />}
          <div className="flex flex-col items-center px-4 shrink-0">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{f.label}</span>
            <span className={cn("text-xs font-mono font-semibold mt-0.5", f.color)}>{f.value}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
