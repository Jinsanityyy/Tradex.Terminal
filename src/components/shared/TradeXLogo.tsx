"use client";

import React, { useState } from "react";

interface TradeXLogoProps {
  variant?: "wordmark" | "banner" | "icon";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  tagline?: boolean;
  className?: string;
}

// Height in px for each size
const SIZE_PX = {
  xs: 28,
  sm: 36,
  md: 56,
  lg: 72,
  xl: 96,
} as const;

// Banner sizes are larger  -  used on login/pricing/reset pages
const BANNER_SIZE_PX = {
  xs: 80,
  sm: 120,
  md: 180,
  lg: 240,
  xl: 300,
} as const;

// Plain <img> (not next/image) so the logo loads the raw /logo.png directly.
// The Next image optimizer (/_next/image) frequently fails inside the Capacitor
// webview / on the remote-loaded mobile shell, which showed a broken-image icon
// in the header. A raw <img> with a text fallback is robust everywhere.
function LogoImg({ px }: { px: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        style={{
          fontWeight: 800,
          fontSize: Math.max(12, px * 0.5),
          letterSpacing: "0.04em",
          color: "#f5a623",
          lineHeight: 1,
        }}
      >
        TradeX
      </span>
    );
  }
  return (
    <img
      src="/logo.png"
      alt="TradeX"
      width={px}
      height={px}
      style={{ objectFit: "contain", borderRadius: 6 }}
      onError={() => setFailed(true)}
    />
  );
}

export function TradeXLogo({
  variant = "wordmark",
  size = "sm",
  className,
}: TradeXLogoProps) {
  const px = SIZE_PX[size];

  // icon-only (collapsed sidebar, favicon placeholder)
  if (variant === "icon") {
    return (
      <span className={className} style={{ display: "inline-flex", alignItems: "center" }}>
        <LogoImg px={px} />
      </span>
    );
  }

  // wordmark  -  icon + "tradeX" text (sidebar expanded, mobile header)
  if (variant === "wordmark") {
    return (
      <span
        className={className}
        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
      >
        <LogoImg px={px} />
      </span>
    );
  }

  // banner  -  large centered logo (login, pricing, reset password)
  const bannerPx = BANNER_SIZE_PX[size];
  return (
    <div
      className={className}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 0 }}
    >
      <LogoImg px={bannerPx} />
    </div>
  );
}
