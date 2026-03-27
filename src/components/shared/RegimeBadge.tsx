"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { MarketRegime, Sentiment } from "@/types";

const regimeStyles: Record<MarketRegime, string> = {
  "inflation-sensitive": "bg-red-500/10 text-red-400 border-red-500/20",
  "risk-off": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "usd-dominant": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "yield-driven": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "geopolitical": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "policy-headline": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "risk-on": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "liquidity-driven": "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

export function RegimeBadge({ regime }: { regime: MarketRegime }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
      regimeStyles[regime]
    )}>
      {regime.replace(/-/g, " ")}
    </span>
  );
}

const sentimentStyles: Record<Sentiment, { bg: string; dot: string }> = {
  "risk-on": { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  "risk-off": { bg: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
  "mixed": { bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
};

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const style = sentimentStyles[sentiment];
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
      style.bg
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot, sentiment === "risk-off" && "pulse-live")} />
      {sentiment.replace("-", " ")}
    </span>
  );
}
