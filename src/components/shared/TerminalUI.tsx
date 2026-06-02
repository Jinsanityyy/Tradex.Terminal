"use client";

import React from "react";
import { cn } from "@/lib/utils";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-ibm-plex-mono), 'IBM Plex Mono', 'Courier New', monospace",
};

// ── TerminalSectionHeader ────────────────────────────────────────────────────
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
        className="shrink-0 text-[10px] uppercase whitespace-nowrap"
        style={{ ...MONO, letterSpacing: "2px", color: "hsl(var(--muted-foreground))" }}
      >
        ── {label}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: "hsl(var(--border))" }} />
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

const BADGE_STYLES: Record<TerminalBadgeVariant, React.CSSProperties> = {
  "default":  { borderColor: "hsl(var(--border))",                                                              color: "hsl(var(--muted-foreground))" },
  "bullish":  { borderColor: "color-mix(in srgb, var(--t-bullish, #00C853) 40%, transparent)",                  color: "var(--t-bullish, #00C853)" },
  "bearish":  { borderColor: "color-mix(in srgb, var(--t-bearish, #FF3D3D) 40%, transparent)",                  color: "var(--t-bearish, #FF3D3D)" },
  "no-trade": { borderColor: "var(--t-text-muted2, #3A3A45)",                                                    color: "var(--t-text-muted2, #3A3A45)" },
  "neutral":  { borderColor: "var(--t-text-muted2, #3A3A45)",                                                    color: "hsl(var(--muted-foreground))" },
  "armed":    { borderColor: "color-mix(in srgb, var(--t-bullish, #00C853) 40%, transparent)",                  color: "var(--t-bullish, #00C853)" },
  "pending":  { borderColor: "color-mix(in srgb, hsl(var(--primary)) 40%, transparent)",                        color: "hsl(var(--primary))" },
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
        className
      )}
      style={{ ...MONO, letterSpacing: "1.2px", ...BADGE_STYLES[variant] }}
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
      className={cn("flex items-center justify-between py-2 last:border-0", className)}
      style={{ borderBottom: "1px solid hsl(var(--border))" }}
    >
      <span
        className="text-[10px] uppercase"
        style={{ ...MONO, letterSpacing: "1.2px", color: "hsl(var(--muted-foreground))" }}
      >
        {label}
      </span>
      <span
        className="text-[12px] font-bold tabular-nums"
        style={{ ...MONO, color: valueColor ?? "hsl(var(--foreground))" }}
      >
        {value}
      </span>
    </div>
  );
}

// ── SegmentedBar ─────────────────────────────────────────────────────────────
export function SegmentedBar({
  value,
  total = 20,
  activeColor,
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
      <span style={{ color: activeColor ?? "hsl(var(--primary))" }}>{"█".repeat(filled)}</span>
      <span style={{ color: "hsl(var(--border))" }}>{"░".repeat(total - filled)}</span>
    </span>
  );
}
