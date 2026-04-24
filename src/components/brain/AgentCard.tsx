"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agentId: string;
  label: string;
  icon: React.ReactNode;
  bias: string;
  confidence: number;
  reasons?: string[];
  invalidationLevel?: number | null;
  extra?: Record<string, string | number | boolean | null>;
  warnings?: string[];
  isGate?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

const BIAS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  bullish: { bg: "bg-emerald-500/8", border: "border-emerald-500/20", text: "text-emerald-400" },
  bearish: { bg: "bg-red-500/8", border: "border-red-500/20", text: "text-red-400" },
  neutral: { bg: "bg-zinc-500/8", border: "border-zinc-500/20", text: "text-zinc-400" },
  "no-trade": { bg: "bg-amber-500/8", border: "border-amber-500/20", text: "text-amber-400" },
  opposing: { bg: "bg-orange-500/8", border: "border-orange-500/20", text: "text-orange-400" },
  valid: { bg: "bg-emerald-500/8", border: "border-emerald-500/20", text: "text-emerald-400" },
  invalid: { bg: "bg-red-500/8", border: "border-red-500/20", text: "text-red-400" },
};

function getBiasLabel(bias: string, isGate?: boolean): string {
  if (isGate) return bias === "valid" ? "VALID" : "BLOCKED";

  const map: Record<string, string> = {
    bullish: "BULLISH",
    bearish: "BEARISH",
    neutral: "NEUTRAL",
    "no-trade": "NO TRADE",
    opposing: "CONTRARIAN",
  };

  return map[bias] ?? bias.toUpperCase();
}

function ConfidenceBar({ value, bias }: { value: number; bias: string }) {
  const color =
    bias === "bullish" || bias === "valid"
      ? "bg-emerald-500"
      : bias === "bearish" || bias === "invalid"
        ? "bg-red-500"
        : bias === "opposing"
          ? "bg-orange-500"
          : "bg-zinc-500";

  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-[10px] text-zinc-300">{value}%</span>
    </div>
  );
}

export function AgentCard({
  label,
  icon,
  bias,
  confidence,
  reasons = [],
  extra = {},
  warnings = [],
  isGate = false,
  loading = false,
  onClick,
}: AgentCardProps) {
  const colors = BIAS_COLORS[bias] ?? BIAS_COLORS.neutral;

  if (loading) {
    return (
      <div className="min-h-[180px] animate-pulse rounded-xl border border-white/6 bg-[#111]/60 p-4">
        <div className="mb-3 h-4 w-24 rounded bg-white/8" />
        <div className="mb-2 h-5 w-16 rounded bg-white/6" />
        <div className="h-1 w-full rounded bg-white/5" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-[180px] flex-col rounded-xl border bg-[#0d0d0d]/80 backdrop-blur-sm transition-all duration-200",
        colors.bg,
        colors.border,
        onClick && "cursor-pointer hover:brightness-110 hover:ring-1 hover:ring-white/10"
      )}
      onClick={onClick}
    >
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn("text-sm", colors.text)}>{icon}</div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] leading-none text-zinc-400">
                {label}
              </div>
              <div className={cn("mt-1 text-[15px] font-bold leading-none", colors.text)}>
                {getBiasLabel(bias, isGate)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-md border border-white/8 bg-white/4 px-2 py-1">
            {isGate ? (
              bias === "valid" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-400" />
              )
            ) : (
              <span className={cn("text-[11px] font-mono font-bold", colors.text)}>{confidence}%</span>
            )}
          </div>
        </div>

        {!isGate ? <ConfidenceBar value={confidence} bias={bias} /> : null}
      </div>

      {reasons.length > 0 ? (
        <div className="px-4 pb-3">
          <p className="line-clamp-3 text-[12px] leading-5 text-zinc-400">{reasons[0]}</p>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="px-4 pb-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
            <p className="line-clamp-2 text-[11px] leading-5 text-amber-400/80">{warnings[0]}</p>
          </div>
        </div>
      ) : null}

      {Object.keys(extra).length > 0 ? (
        <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-2 px-4 pb-4">
          {Object.entries(extra).slice(0, 4).map(([key, value]) => (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{key}</span>
              <span className={cn("text-[12px] font-mono font-semibold leading-5", colors.text)}>
                {value === null ? "--" : String(value)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
