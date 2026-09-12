"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * The avatar, wearing its rank.
 *
 * Pro buys more than unlocked features — it should be visible. A Pro account
 * gets a gold bezel; everyone else keeps the plain ring, so it stays a signal
 * rather than decoration.
 *
 * Deliberately restrained. An ornate winged-and-crowned frame belongs to a
 * game, not to a terminal in mono type, and at 30px its detail is only noise.
 * Two hairlines and four index marks read as an instrument — which is what
 * this product is.
 *
 * Inline SVG rather than shipped artwork: sharp at 30px and at 72px, no
 * request, and ours.
 */

let gradientSeq = 0;

export function ProAvatar({
  src,
  fallback,
  isPro,
  size,
  className,
  children,
}: {
  src?: string | null;
  /** Shown when there is no photo — usually the first letter of the name. */
  fallback: string;
  isPro: boolean;
  /** Rendered box in px; the photo sits inside the frame. */
  size: number;
  className?: string;
  /** Overlay inside the photo circle, e.g. the camera hint. */
  children?: React.ReactNode;
}) {
  // Gradient ids must be unique per instance or the first one on the page wins
  // and later frames render flat.
  const uid = React.useMemo(() => `pro-av-${++gradientSeq}`, []);

  // The frame's flourishes need room, so the photo is inset when it is shown.
  const inset = isPro ? "6%" : "0";

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <div
        className={cn(
          "absolute rounded-full overflow-hidden",
          isPro ? "ring-1 ring-[#E8C877]/50" : "border border-white/10 bg-zinc-900"
        )}
        style={{ inset }}
      >
        {src ? (
          <img src={src} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[hsl(var(--secondary))] flex items-center justify-center">
            <span
              className="font-bold"
              style={{ fontSize: size * 0.38, color: isPro ? "#E8C877" : "hsl(var(--primary))" }}
            >
              {fallback}
            </span>
          </div>
        )}
        {children}
      </div>

      {isPro && (
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0%"   stopColor="#F3E3B4" />
              <stop offset="45%"  stopColor="#C9A24B" />
              <stop offset="100%" stopColor="#8A6A22" />
            </linearGradient>
          </defs>

          {/* Bezel: two hairlines, the way a watch or an instrument reads
              expensive — restraint, not ornament. */}
          <circle
            cx="50" cy="50" r="48"
            fill="none"
            stroke={`url(#${uid}-gold)`}
            strokeWidth="2"
          />
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke={`url(#${uid}-gold)`}
            strokeWidth="0.6"
            strokeOpacity="0.55"
          />

          {/* Index marks at the quarters — the terminal's own geometry. */}
          <g stroke={`url(#${uid}-gold)`} strokeWidth="2.4" strokeLinecap="butt">
            <line x1="50" y1="0.5" x2="50" y2="6" />
            <line x1="50" y1="94"  x2="50" y2="99.5" />
            <line x1="0.5" y1="50" x2="6"  y2="50" />
            <line x1="94"  y1="50" x2="99.5" y2="50" />
          </g>
        </svg>
      )}
    </div>
  );
}
