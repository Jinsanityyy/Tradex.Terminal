"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * The avatar, wearing its rank.
 *
 * Pro buys more than unlocked features — it should be visible. A Pro account
 * gets a precision-milled metal bezel; everyone else keeps a plain ring, so it
 * reads as a signal rather than decoration.
 *
 * The sheen is a conic gradient, not artwork: it renders as a continuous
 * brushed-metal sweep at any diameter, needs no request, and never blurs. The
 * bevels are layered box-shadows — a light catch at the top, shadow at the
 * bottom — which is what sells a chamfered edge at 36px, where real detail
 * would only turn to noise.
 */

const SIZES = { sm: 36, md: 48, lg: 64 } as const;
export type ProAvatarSize = keyof typeof SIZES | number;

// Deep gold through champagne brass, swept so the highlight lands off-axis the
// way a milled edge catches light.
const BEZEL =
  "conic-gradient(from 212deg at 50% 50%," +
  " #997D33 0deg, #E6CA65 38deg, #F7ECC6 66deg, #C9A951 104deg," +
  " #6E5722 150deg, #997D33 196deg, #E6CA65 232deg, #F7ECC6 262deg," +
  " #997D33 304deg, #6E5722 336deg, #997D33 360deg)";

const OUTER_SHADOW = [
  "0 1px 2px rgba(0,0,0,0.65)",          // seat it against the surface
  "0 0 0 0.5px rgba(26,24,19,0.9)",      // dark chamfer line
  "0 0 12px rgba(230,202,101,0.2)",      // ambient warmth
].join(", ");

const INNER_BEVEL = [
  "inset 0 1px 0 rgba(255,255,255,0.28)", // light catch, top
  "inset 0 -1px 0 rgba(0,0,0,0.55)",      // shadow, bottom
].join(", ");

export function ProAvatar({
  src,
  fallback,
  isPro,
  size = "md",
  showBadge = false,
  className,
  children,
}: {
  src?: string | null;
  /** Shown when there is no photo — usually the first letter of the name. */
  fallback: string;
  isPro: boolean;
  size?: ProAvatarSize;
  /** Small PRO pill overlapping the bottom-right. Off by default: most places
   *  already label the tier beside the name, and two labels is one too many. */
  showBadge?: boolean;
  className?: string;
  /** Overlay inside the photo circle, e.g. the camera hint. */
  children?: React.ReactNode;
}) {
  const px = typeof size === "number" ? size : SIZES[size];
  const ring = px >= 56 ? 2.5 : 2;

  const photo = src ? (
    <img src={src} alt="" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-[#1A1813]">
      <span
        className="font-bold leading-none"
        style={{ fontSize: px * 0.4, color: isPro ? "#E6CA65" : "hsl(var(--primary))" }}
      >
        {fallback}
      </span>
    </div>
  );

  if (!isPro) {
    return (
      <div
        className={cn("relative shrink-0 rounded-full overflow-hidden border border-white/10", className)}
        style={{ width: px, height: px }}
      >
        {photo}
        {children}
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: px, height: px }}>
      <div
        className="w-full h-full rounded-full"
        style={{ background: BEZEL, padding: ring, boxShadow: OUTER_SHADOW }}
      >
        <div
          className="relative w-full h-full rounded-full overflow-hidden bg-[#1A1813]"
          style={{ boxShadow: INNER_BEVEL }}
        >
          {photo}
          {children}
        </div>
      </div>

      {showBadge && (
        <span
          className="absolute -bottom-[3px] -right-[3px] rounded-full px-1.5 py-[1px] text-[9px] font-mono uppercase tracking-widest leading-none"
          style={{
            background: "#1A1813",
            color: "#E6CA65",
            border: "1px solid #997D33",
            boxShadow: "0 1px 3px rgba(0,0,0,0.7)",
          }}
        >
          Pro
        </span>
      )}
    </div>
  );
}
