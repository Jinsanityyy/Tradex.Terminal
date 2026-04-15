"use client";

import React from "react";
import Image from "next/image";

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

export function TradeXLogo({
  variant = "wordmark",
  size = "sm",
  tagline = false,
  className,
}: TradeXLogoProps) {
  const px = SIZE_PX[size];

  // icon-only (collapsed sidebar, favicon placeholder)
  if (variant === "icon") {
    return (
      <span className={className} style={{ display: "inline-flex", alignItems: "center" }}>
        <Image
          src="/logo.png"
          alt="TradeX"
          width={px}
          height={px}
          style={{ objectFit: "contain", borderRadius: 6 }}
          priority
        />
      </span>
    );
  }

  // wordmark — icon + "tradeX" text (sidebar expanded, mobile header)
  if (variant === "wordmark") {
    return (
      <span
        className={className}
        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
      >
        <Image
          src="/logo.png"
          alt="TradeX"
          width={px}
          height={px}
          style={{ objectFit: "contain", borderRadius: 6 }}
          priority
        />
      </span>
    );
  }

  // banner — large centered logo (login, pricing, reset password)
  const bannerPx = SIZE_PX[size] * 1.8;
  return (
    <div
      className={className}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 0 }}
    >
      <Image
        src="/logo.png"
        alt="TradeX"
        width={bannerPx}
        height={bannerPx}
        style={{ objectFit: "contain" }}
        priority
      />
    </div>
  );
}
