"use client";

import React from "react";
import { cn } from "@/lib/utils";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-ibm-plex-mono), 'IBM Plex Mono', 'Courier New', monospace",
};

// ── TerminalSectionHeader ────────────────────────────────────────────────────
// Renders: ── LIVE PRICES ──────────────────────────
export function TerminalSectionHeader({
  label,
  right,
  className,
}: {
  label: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 mb-3", className)}>
      <span
        className="shrink-0 text-[10px] uppercase text-[#6B6B7A] whitespace-nowrap"
        style={{ ...MONO, letterSpacing: "2px" }}
      >
        ── {label}
      </span>
      <div className="flex-1 h-px bg-[#1E1E24]" />
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

// ── TerminalBadge ────────────────────────────────────────────────────────────
type TerminalBadgeVariant =
  | "default"
  | "bullish"
  | "bearish"
  | "no-trade"
  | "neutral"
  | "armed"
  | "pending";

const BADGE_STYLES: Record<TerminalBadgeVariant, string> = {
  "default":  "border-[#1E1E24] text-[#6B6B7A]",
  "bullish":  "border-[#00C853]/40 text-[#00C853]",
  "bearish":  "border-[#FF3D3D]/40 text-[#FF3D3D]",
  "no-trade": "border-[#3A3A45] text-[#3A3A45]",
  "neutral":  "border-[#3A3A45] text-[#6B6B7A]",
  "armed":    "border-[#00C853]/40 text-[#00C853]",
  "pending":  "border-[#FF6B00]/40 text-[#FF6B00]",
};

export function TerminalBadge({
  label,
  variant = "default",
  className,
}: {
  label: string;
  variant?: TerminalBadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 border text-[9px] uppercase rounded-[2px]",
        BADGE_STYLES[variant],
        className
      )}
      style={{ ...MONO, letterSpacing: "1.2px" }}
    >
      {label}
    </span>
  );
}

// ── TerminalDataRow ──────────────────────────────────────────────────────────
export function TerminalDataRow({
  label,
  value,
  valueColor,
  className,
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 border-b border-[#1E1E24] last:border-0",
        className
      )}
    >
      <span
        className="text-[10px] uppercase text-[#6B6B7A]"
        style={{ ...MONO, letterSpacing: "1.2px" }}
      >
        {label}
      </span>
      <span
        className={cn("text-[12px] font-bold tabular-nums", valueColor ?? "text-[#E8E8E8]")}
        style={MONO}
      >
        {value}
      </span>
    </div>
  );
}

// ── SegmentedBar ─────────────────────────────────────────────────────────────
// Replaces progress bars with [██████░░░░] block characters
export function SegmentedBar({
  value,
  total = 20,
  activeColor = "#FF6B00",
  className,
}: {
  value: number;
  total?: number;
  activeColor?: string;
  className?: string;
}) {
  const filled = Math.min(Math.max(Math.round((value / 100) * total), 0), total);
  return (
    <span
      className={cn("text-[11px] leading-none tracking-tight", className)}
      style={MONO}
    >
      <span style={{ color: activeColor }}>{"█".repeat(filled)}</span>
      <span style={{ color: "#1E1E24" }}>{"░".repeat(total - filled)}</span>
    </span>
  );
}
