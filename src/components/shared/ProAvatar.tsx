"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * The avatar, wearing its rank.
 *
 * Pro should be visible, but the photo is the person's, so the mark sits
 * beside it rather than around it: a small gold seal with a check at the
 * bottom-right, the way a verified badge works. The earlier milled-metal bezel
 * read as bronze on the light theme (its glow and dark chamfer turned muddy on
 * a pale page) and weighed the header down at 36px; a seal stays legible at
 * that size in every theme.
 *
 * The seal is cut out of the page with a ring of the page's own background, so
 * it reads as sitting on top of the photo in OLED and Light alike.
 */

const SIZES = { sm: 36, md: 48, lg: 64 } as const;
export type ProAvatarSize = keyof typeof SIZES | number;

// Champagne through deep gold, lit from the top-left.
const SEAL_FILL = "linear-gradient(145deg, #F3E3A6 0%, #C9A44A 55%, #9C7B30 100%)";

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
  /** Small PRO pill under the seal. Off by default: the seal already marks
   *  the tier, and most places label it beside the name as well. */
  showBadge?: boolean;
  className?: string;
  /** Overlay inside the photo circle, e.g. the camera hint. */
  children?: React.ReactNode;
}) {
  const px = typeof size === "number" ? size : SIZES[size];

  const photo = src ? (
    <img src={src} alt="" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-[hsl(var(--muted))]">
      <span
        className="font-bold leading-none"
        style={{ fontSize: px * 0.4, color: isPro ? "#C9A44A" : "hsl(var(--primary))" }}
      >
        {fallback}
      </span>
    </div>
  );

  const circle = (
    <div
      className="relative w-full h-full rounded-full overflow-hidden"
      // outline, not box-shadow: the true-black themes (OLED, Phosphor,
      // Nebula) strip every box-shadow, which erased this edge and the seal's
      // cut-out on the default theme.
      style={{ outline: "1px solid hsl(var(--border))" }}
    >
      {photo}
      {children}
    </div>
  );

  if (!isPro) {
    return (
      <div className={cn("relative shrink-0", className)} style={{ width: px, height: px }}>
        {circle}
      </div>
    );
  }

  const seal  = Math.max(12, Math.round(px * 0.36));
  const cut   = px >= 56 ? 2 : 1.5;
  const check = Math.round(seal * 0.56);

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: px, height: px }}>
      {circle}

      <span
        role="img"
        aria-label="Pro member"
        className="absolute flex items-center justify-center rounded-full"
        style={{
          width: seal,
          height: seal,
          right: -1,
          bottom: -1,
          background: SEAL_FILL,
          outline: `${cut}px solid hsl(var(--background))`,
        }}
      >
        <svg width={check} height={check} viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#2A2110" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      {showBadge && (
        <span
          className="absolute left-1/2 -translate-x-1/2 -bottom-[14px] rounded-full px-1.5 py-[1px] text-[9px] font-mono uppercase tracking-widest leading-none"
          style={{ background: "hsl(var(--card))", color: "#C9A44A", border: "1px solid #C9A44A" }}
        >
          Pro
        </span>
      )}
    </div>
  );
}
