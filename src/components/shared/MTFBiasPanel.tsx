"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MTFResult, TFAnalysis } from "@/app/api/agents/mtf/route";

const TF_ROWS: { key: keyof Pick<MTFResult, "D1" | "H4" | "H1" | "M15">; label: string }[] = [
  { key: "D1",  label: "D1"  },
  { key: "H4",  label: "H4"  },
  { key: "H1",  label: "H1"  },
  { key: "M15", label: "M15" },
];

function BiasRow({
  label,
  tf,
  isLoading,
}: {
  label: string;
  tf?: TFAnalysis;
  isLoading: boolean;
}) {
  const bias = tf?.bias ?? "neutral";
  const confidence = tf?.confidence ?? 0;
  const rsi = tf?.rsi ?? 50;

  const Icon =
    bias === "bullish" ? TrendingUp :
    bias === "bearish" ? TrendingDown :
    Minus;

  const arrow   = bias === "bullish" ? "▲" : bias === "bearish" ? "▼" : "→";
  const biasLbl = bias === "bullish" ? "BULLISH" : bias === "bearish" ? "BEARISH" : "NEUTRAL";

  const textCls =
    bias === "bullish" ? "text-emerald-400" :
    bias === "bearish" ? "text-red-400" :
    "text-zinc-500";

  const barCls =
    bias === "bullish" ? "bg-emerald-500" :
    bias === "bearish" ? "bg-red-500" :
    "bg-zinc-700";

  return (
    <div className="flex items-center gap-2.5 py-2">
      {/* TF label */}
      <span className="w-7 shrink-0 text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-wider">
        {label}
      </span>

      {/* Arrow + bias text */}
      {isLoading ? (
        <div className="h-3 w-28 rounded bg-white/5 animate-pulse shrink-0" />
      ) : (
        <div className="flex items-center gap-1.5 w-[118px] shrink-0">
          <Icon className={cn("h-3 w-3 shrink-0", textCls)} />
          <span className={cn("text-[10px] font-bold tracking-wide leading-none", textCls)}>
            {arrow} {biasLbl}
          </span>
        </div>
      )}

      {/* Confidence bar */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <div className="flex-1 h-[3px] rounded-full bg-zinc-800/80 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barCls)}
            style={{ width: isLoading ? "0%" : `${confidence}%` }}
          />
        </div>
        <span className="w-8 shrink-0 text-right text-[10px] font-mono text-zinc-600">
          {isLoading ? " - " : `${confidence}%`}
        </span>
      </div>

      {/* RSI pill  -  compact, right-aligned */}
      {!isLoading && tf && (
        <span className={cn(
          "shrink-0 text-[9px] font-mono px-1 py-0.5 rounded border",
          rsi > 60 ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" :
          rsi < 40 ? "border-red-500/25 bg-red-500/10 text-red-400" :
          "border-zinc-700/40 bg-transparent text-zinc-600"
        )}>
          {rsi}
        </span>
      )}
    </div>
  );
}

interface MTFBiasPanelProps {
  data?: MTFResult;
  isLoading?: boolean;
}

export function MTFBiasPanel({ data, isLoading = false }: MTFBiasPanelProps) {
  const loading = isLoading || !data;

  return (
    <div className="space-y-0">
      {/* Column headers */}
      <div className="flex items-center gap-2.5 pb-1 border-b border-white/[0.05]">
        <span className="w-7 shrink-0" />
        <span className="w-[118px] shrink-0 text-[9px] uppercase tracking-[0.15em] text-zinc-700">Bias</span>
        <span className="flex-1 text-[9px] uppercase tracking-[0.15em] text-zinc-700">Strength</span>
        <span className="w-8 shrink-0" />
        <span className="w-[38px] shrink-0 text-[9px] uppercase tracking-[0.15em] text-zinc-700">RSI</span>
      </div>

      {/* TF rows */}
      <div className="divide-y divide-white/[0.04]">
        {TF_ROWS.map(({ key, label }) => (
          <BiasRow
            key={key}
            label={label}
            tf={data?.[key]}
            isLoading={loading}
          />
        ))}
      </div>

      {/* Summary line */}
      <div className="pt-2.5 mt-1 border-t border-white/[0.05]">
        {loading ? (
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded bg-white/5 animate-pulse" />
            <div className="h-2 w-3/4 rounded bg-white/5 animate-pulse" />
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed text-zinc-400">
            {data?.summary}
          </p>
        )}
      </div>
    </div>
  );
}
