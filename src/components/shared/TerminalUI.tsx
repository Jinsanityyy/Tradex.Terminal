"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useThemePersonality } from "@/lib/themePersonality";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-ibm-plex-mono), 'IBM Plex Mono', 'Courier New', monospace",
};

const THEME_FONT: React.CSSProperties = {
  fontFamily: "var(--t-font-label, var(--font-geist-sans), system-ui, sans-serif)",
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
  const personality = useThemePersonality();

  if (personality.sectionHeaderStyle === "terminal") {
    // Bloomberg: ── LABEL ─────────────────────
    return (
      <div className={cn("flex items-center gap-2 mb-3", className)}>
        <span
          className="shrink-0 text-[10px] uppercase whitespace-nowrap"
          style={{
            ...MONO,
            letterSpacing: "var(--t-section-spacing, 2px)",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          ── {label}
        </span>
        <div
          className="flex-1 h-px"
          style={{ backgroundColor: "hsl(var(--border))" }}
        />
        {right && <div className="shrink-0">{right}</div>}
      </div>
    );
  }

  if (personality.sectionHeaderStyle === "minimal") {
    // OLED: bare text only, no line
    return (
      <div className={cn("flex items-center justify-between mb-3", className)}>
        <span
          className="text-[10px] uppercase"
          style={{
            ...THEME_FONT,
            letterSpacing: "var(--t-label-spacing, 2px)",
            color: "hsl(var(--muted-foreground))",
            fontWeight: "var(--t-label-weight, 400)" as React.CSSProperties["fontWeight"],
          }}
        >
          {label}
        </span>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    );
  }

  // "normal" — title with subtle divider line
  return (
    <div className={cn("flex items-center gap-3 mb-3", className)}>
      <span
        className="shrink-0 text-[11px] uppercase whitespace-nowrap"
        style={{
          ...THEME_FONT,
          letterSpacing: "var(--t-label-spacing, 0.8px)",
          color: "hsl(var(--muted-foreground))",
          fontWeight: "var(--t-label-weight, 500)" as React.CSSProperties["fontWeight"],
        }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px opacity-40"
        style={{ backgroundColor: "hsl(var(--border))" }}
      />
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

const BADGE_COLORS: Record<TerminalBadgeVariant, { border: string; color: string; bg: string }> = {
  default:   { border: "hsl(var(--border))",                                                               color: "hsl(var(--muted-foreground))",      bg: "transparent" },
  bullish:   { border: "color-mix(in srgb, var(--t-bullish, #00C853) 40%, transparent)",                  color: "var(--t-bullish, #00C853)",          bg: "color-mix(in srgb, var(--t-bullish, #00C853) 10%, transparent)" },
  bearish:   { border: "color-mix(in srgb, var(--t-bearish, #FF3D3D) 40%, transparent)",                  color: "var(--t-bearish, #FF3D3D)",          bg: "color-mix(in srgb, var(--t-bearish, #FF3D3D) 10%, transparent)" },
  "no-trade":{ border: "var(--t-text-muted2, #3A3A45)",                                                    color: "var(--t-text-muted2, #3A3A45)",      bg: "transparent" },
  neutral:   { border: "var(--t-text-muted2, #3A3A45)",                                                    color: "hsl(var(--muted-foreground))",        bg: "transparent" },
  armed:     { border: "color-mix(in srgb, var(--t-bullish, #00C853) 40%, transparent)",                  color: "var(--t-bullish, #00C853)",          bg: "color-mix(in srgb, var(--t-bullish, #00C853) 10%, transparent)" },
  pending:   { border: "color-mix(in srgb, hsl(var(--primary)) 40%, transparent)",                        color: "hsl(var(--primary))",               bg: "color-mix(in srgb, hsl(var(--primary)) 10%, transparent)" },
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
  const personality = useThemePersonality();
  const colors = BADGE_COLORS[variant];

  if (personality.badgeStyle === "flat") {
    // Bloomberg: flat bordered, monospace, no fill
    return (
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.5 border text-[9px] uppercase",
          className
        )}
        style={{
          ...MONO,
          letterSpacing: "1.5px",
          borderRadius: "var(--t-badge-radius, 2px)",
          borderColor: colors.border,
          color: colors.color,
          backgroundColor: "transparent",
        }}
      >
        {label}
      </span>
    );
  }

  if (personality.badgeStyle === "outline") {
    // OLED: outline only, white/accent border, transparent fill
    return (
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.5 border text-[9px] uppercase",
          className
        )}
        style={{
          ...THEME_FONT,
          letterSpacing: "var(--t-label-spacing, 2px)",
          borderRadius: "var(--t-badge-radius, 0px)",
          borderColor: colors.border,
          color: colors.color,
          backgroundColor: "transparent",
          fontWeight: "var(--t-label-weight, 400)" as React.CSSProperties["fontWeight"],
        }}
      >
        {label}
      </span>
    );
  }

  // "pill" — rounded pill with semi-transparent fill
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 border text-[10px] uppercase",
        className
      )}
      style={{
        ...THEME_FONT,
        letterSpacing: "var(--t-label-spacing, 0.8px)",
        borderRadius: "var(--t-badge-radius, 9999px)",
        borderColor: colors.border,
        color: colors.color,
        backgroundColor: colors.bg,
        fontWeight: "var(--t-label-weight, 500)" as React.CSSProperties["fontWeight"],
      }}
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
  const personality = useThemePersonality();
  const isMonoTheme = personality.fontFamily === "mono";
  const showDivider = personality.dividerStyle === "line";

  return (
    <div
      className={cn("flex items-center justify-between py-2 last:border-0", className)}
      style={showDivider ? { borderBottom: "1px solid hsl(var(--border))" } : undefined}
    >
      <span
        className="text-[10px] uppercase"
        style={{
          fontFamily: isMonoTheme
            ? "var(--font-ibm-plex-mono), 'IBM Plex Mono', monospace"
            : "var(--t-font-label, var(--font-geist-sans), system-ui, sans-serif)",
          letterSpacing: "var(--t-label-spacing, 1.2px)",
          color: "hsl(var(--muted-foreground))",
          fontSize: "var(--t-label-size, 10px)",
          fontWeight: "var(--t-label-weight, 400)" as React.CSSProperties["fontWeight"],
        }}
      >
        {label}
      </span>
      <span
        className="tabular-nums"
        style={{
          fontFamily: isMonoTheme
            ? "var(--font-ibm-plex-mono), 'IBM Plex Mono', monospace"
            : "var(--t-font-number, var(--font-geist-sans), system-ui, sans-serif)",
          fontSize: "12px",
          fontWeight: "var(--t-number-weight, 700)" as React.CSSProperties["fontWeight"],
          color: valueColor ?? "hsl(var(--foreground))",
        }}
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

// ── ThemedProgressBar ─────────────────────────────────────────────────────────
// Renders SegmentedBar for Bloomberg, smooth Progress for all others
export function ThemedProgressBar({
  value,
  activeColor,
  className,
}: {
  value: number;
  activeColor?: string;
  className?: string;
}) {
  const personality = useThemePersonality();

  if (personality.progressBarStyle === "segmented") {
    return <SegmentedBar value={value} activeColor={activeColor} className={className} />;
  }

  return (
    <div
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full", className)}
      style={{ backgroundColor: "hsl(var(--secondary))" }}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${Math.min(Math.max(value, 0), 100)}%`,
          backgroundColor: activeColor ?? "hsl(var(--primary))",
        }}
      />
    </div>
  );
}
