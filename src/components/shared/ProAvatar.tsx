"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * The avatar, wearing its rank.
 *
 * Pro buys more than unlocked features — it should be visible. A Pro account
 * gets an ornate gilt frame; everyone else keeps the plain ring, so the frame
 * stays a signal rather than decoration.
 *
 * Drawn as inline SVG rather than shipped as artwork: it is sharp at 28px in a
 * header and at 64px in the profile sheet, costs no request, and is ours.
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
  const inset = isPro ? "14%" : "0";

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
            <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#FBECC0" />
              <stop offset="35%"  stopColor="#E8C877" />
              <stop offset="70%"  stopColor="#B4862B" />
              <stop offset="100%" stopColor="#7A5716" />
            </linearGradient>
          </defs>

          <g fill={`url(#${uid}-gold)`} stroke="none">
            {/* Ring */}
            <circle
              cx="50" cy="50" r="43"
              fill="none"
              stroke={`url(#${uid}-gold)`}
              strokeWidth="2.4"
            />
            <circle
              cx="50" cy="50" r="39.5"
              fill="none"
              stroke="#7A5716"
              strokeOpacity="0.55"
              strokeWidth="0.7"
            />

            {/* Wings — drawn once, mirrored for the other side */}
            <g>
              <path d="M14 56 C6 60 3 68 5 76 C10 70 15 67 21 66 C17 63 15 60 14 56 Z" />
              <path d="M19 64 C12 69 9 76 11 84 C16 78 21 75 27 74 C23 71 20 68 19 64 Z" opacity="0.9" />
              <path d="M25 71 C19 76 17 82 19 89 C23 84 28 81 33 80 C29 77 26 74 25 71 Z" opacity="0.75" />
            </g>
            <g transform="translate(100,0) scale(-1,1)">
              <path d="M14 56 C6 60 3 68 5 76 C10 70 15 67 21 66 C17 63 15 60 14 56 Z" />
              <path d="M19 64 C12 69 9 76 11 84 C16 78 21 75 27 74 C23 71 20 68 19 64 Z" opacity="0.9" />
              <path d="M25 71 C19 76 17 82 19 89 C23 84 28 81 33 80 C29 77 26 74 25 71 Z" opacity="0.75" />
            </g>

            {/* Crown */}
            <path d="M50 1 L54.5 8 L61 4.5 L59 13 L50 16 L41 13 L39 4.5 L45.5 8 Z" />
            <circle cx="50" cy="8.5" r="1.9" fill="#FFF6DC" />

            {/* Bottom gem */}
            <path d="M50 84 L55 91 L50 99 L45 91 Z" />
            <path d="M50 87.5 L52.4 91 L50 95 L47.6 91 Z" fill="#FFF6DC" opacity="0.85" />

            {/* Side studs */}
            <circle cx="7"  cy="50" r="2.2" />
            <circle cx="93" cy="50" r="2.2" />
          </g>
        </svg>
      )}
    </div>
  );
}
