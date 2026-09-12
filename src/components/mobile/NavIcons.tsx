"use client";

import React from "react";

/**
 * The tab bar's own icons.
 *
 * Outline icons from a shared set read as generic — everyone ships them, so
 * they signal "built quickly" no matter how good the rest looks. These are
 * solid, weighted shapes drawn for this product: a candlestick for the chart
 * rather than a trend arrow, an agent cluster for the floor rather than a bar
 * graph. Filled forms also hold their colour at 24px, where a 1.5px stroke
 * goes grey and disappears.
 */

type Props = { className?: string; style?: React.CSSProperties };

export function HomeIcon({ className, style }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <rect x="3"    y="3"    width="8" height="8" rx="2.2" />
      <rect x="13"   y="3"    width="8" height="5" rx="2" opacity="0.55" />
      <rect x="13"   y="10"   width="8" height="11" rx="2.2" />
      <rect x="3"    y="13"   width="8" height="8" rx="2" opacity="0.55" />
    </svg>
  );
}

export function ChartIcon({ className, style }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      {/* Candles, not a trend arrow — this is a trading terminal. */}
      <rect x="3.2"  y="8"  width="4" height="9"  rx="1.4" />
      <rect x="4.5"  y="5"  width="1.4" height="15" rx="0.7" />
      <rect x="10"   y="4"  width="4" height="13" rx="1.4" opacity="0.55" />
      <rect x="11.3" y="2"  width="1.4" height="18" rx="0.7" opacity="0.55" />
      <rect x="16.8" y="10" width="4" height="7"  rx="1.4" />
      <rect x="18.1" y="7"  width="1.4" height="13" rx="0.7" />
    </svg>
  );
}

export function FeedIcon({ className, style }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M13.6 2.2 5.2 12.6c-.5.6-.1 1.5.7 1.5h4.2l-.9 7.5c-.1.8.9 1.2 1.4.6l8.4-10.4c.5-.6.1-1.5-.7-1.5h-4.2l.9-7.5c.1-.8-.9-1.2-1.4-.6Z" />
    </svg>
  );
}

export function BrainIcon({ className, style }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      {/* Seven agents reporting to one: the product's actual shape. */}
      <circle cx="12"   cy="12"   r="3.4" />
      <circle cx="12"   cy="3.4"  r="2.1" opacity="0.7" />
      <circle cx="19.4" cy="7.7"  r="2.1" opacity="0.55" />
      <circle cx="19.4" cy="16.3" r="2.1" opacity="0.7" />
      <circle cx="12"   cy="20.6" r="2.1" opacity="0.55" />
      <circle cx="4.6"  cy="16.3" r="2.1" opacity="0.7" />
      <circle cx="4.6"  cy="7.7"  r="2.1" opacity="0.55" />
    </svg>
  );
}
