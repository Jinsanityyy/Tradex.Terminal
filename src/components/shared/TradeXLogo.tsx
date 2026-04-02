"use client";

import React from "react";

/**
 * TradeX brand logo component
 *
 * variant:
 *   "wordmark"  — "trade" + gradient X (text only)
 *   "banner"    — green X icon box  +  wordmark  +  optional tagline
 *   "icon"      — green X box only (for collapsed sidebar, favicons, etc.)
 *
 * size: controls font / box dimensions
 *   "xs" | "sm" | "md" | "lg" | "xl"
 *
 * tagline: show "MARKET INTELLIGENCE" sub-label (banner variant only)
 */

interface TradeXLogoProps {
  variant?: "wordmark" | "banner" | "icon";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  tagline?: boolean;
  className?: string;
}

const SIZE = {
  xs: { font: 14, iconBox: 20, iconFont: 11, iconR: 4 },
  sm: { font: 18, iconBox: 26, iconFont: 14, iconR: 5 },
  md: { font: 22, iconBox: 32, iconFont: 18, iconR: 6 },
  lg: { font: 30, iconBox: 40, iconFont: 22, iconR: 8 },
  xl: { font: 48, iconBox: 56, iconFont: 30, iconR: 10 },
} as const;

const GLOW_STYLE = {
  animation: "tradex-glow 3s ease-in-out infinite",
} as const;

export function TradeXLogo({
  variant = "wordmark",
  size = "sm",
  tagline = false,
  className,
}: TradeXLogoProps) {
  const s = SIZE[size];

  // ── shared: gradient X text ────────────────────────────────────────────────
  const GradientX = () => (
    <span
      style={{
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        fontSize: s.font,
        fontWeight: 800,
        letterSpacing: "-0.04em",
        background: "linear-gradient(135deg, #00C853 0%, #69F0AE 50%, #00E676 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        ...GLOW_STYLE,
      }}
    >
      X
    </span>
  );

  // ── shared: "trade" text ───────────────────────────────────────────────────
  const TradeText = () => (
    <span
      style={{
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        fontSize: s.font,
        fontWeight: 300,
        color: "white",
        letterSpacing: "-0.04em",
      }}
    >
      trade
    </span>
  );

  // ── shared: green X icon box ───────────────────────────────────────────────
  const IconBox = () => (
    <div
      style={{
        width: s.iconBox,
        height: s.iconBox,
        borderRadius: s.iconR,
        background: "linear-gradient(135deg, #00C853, #69F0AE)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...GLOW_STYLE,
      }}
    >
      <span
        style={{
          fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
          fontSize: s.iconFont,
          fontWeight: 900,
          color: "#080808",
          lineHeight: 1,
          letterSpacing: "-0.03em",
        }}
      >
        X
      </span>
    </div>
  );

  // ── keyframes injected once ────────────────────────────────────────────────
  const Keyframes = () => (
    <style>{`
      @keyframes tradex-glow {
        0%, 100% {
          filter: drop-shadow(0 0 8px #00C85360) drop-shadow(0 0 20px #00C85330);
        }
        50% {
          filter: drop-shadow(0 0 14px #00C85390) drop-shadow(0 0 35px #00C85350);
        }
      }
    `}</style>
  );

  // ── variant: icon only ─────────────────────────────────────────────────────
  if (variant === "icon") {
    return (
      <span className={className}>
        <Keyframes />
        <IconBox />
      </span>
    );
  }

  // ── variant: wordmark ─────────────────────────────────────────────────────
  if (variant === "wordmark") {
    return (
      <span
        className={className}
        style={{ display: "inline-flex", alignItems: "center", gap: 0 }}
      >
        <Keyframes />
        <TradeText />
        <GradientX />
      </span>
    );
  }

  // ── variant: banner (icon + wordmark + optional tagline) ──────────────────
  return (
    <div
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
    >
      <Keyframes />
      <IconBox />
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <TradeText />
          <GradientX />
        </div>
        {tagline && (
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 7,
              fontWeight: 500,
              letterSpacing: "0.2em",
              color: "#2a2a2a",
              textTransform: "uppercase",
            }}
          >
            MARKET INTELLIGENCE
          </span>
        )}
      </div>
    </div>
  );
}
