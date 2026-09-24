"use client";

import React, { useEffect, useState } from "react";
import { useEconomicCalendar } from "@/hooks/useMarketData";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

/**
 * Opens the full Economic Calendar from the home screen.
 *
 * MobileLayout listens for this, switches to the More tab, then re-dispatches
 * tradex:open-app for MobileMore to resolve  -  the same relay the PNL shortcut
 * uses. The full page is where the archive search lives, so the widget has to
 * be a way in rather than a dead end.
 */
function openCalendar() {
  document.dispatchEvent(
    new CustomEvent("tradex:open-more", { detail: { appId: "economic-calendar" } })
  );
}

const MONO = { fontFamily: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace" };

/** "2h 15m", "45m", "12s" — the shape a trader scans for, not a date. */
function countdown(msAway: number): string {
  const total = Math.floor(msAway / 1000);
  if (total <= 0) return "now";
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${total}s`;
}

/**
 * The next releases, with how long until each one.
 *
 * A time on its own is not what a trader needs — the question is always "how
 * long have I got". The countdown re-renders on its own clock so the row stays
 * true without waiting for the next data refresh.
 */
export function EconCalendarWidget() {
  const { events } = useEconomicCalendar();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Sorted by when it actually happens. The API's own order is not
  // chronological, and the formatted clock string cannot be sorted across
  // midnight — which is why 22:00 was listing above 20:15.
  const upcoming = events
    .filter((e) => e.status !== "completed" && typeof e.utcTimestamp === "number")
    .sort((a, b) => (a.utcTimestamp ?? 0) - (b.utcTimestamp ?? 0))
    .slice(0, 5);

  if (upcoming.length === 0) {
    return (
      <button
        onClick={openCalendar}
        className="w-full rounded-[2px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-4 text-left active:bg-[hsl(var(--muted))]"
      >
        <p className="text-[11px] text-[hsl(var(--text-secondary))] text-center">
          No releases scheduled &middot; tap to search past events
        </p>
      </button>
    );
  }

  return (
    <div className="rounded-[2px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] divide-y divide-[hsl(var(--border))]">
      {upcoming.map((e) => {
        const away = (e.utcTimestamp ?? 0) - now;
        const imminent = away <= 30 * 60 * 1000;   // inside half an hour
        const soon     = away <= 2 * 60 * 60 * 1000;

        return (
          <button
            key={e.id}
            onClick={openCalendar}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-[hsl(var(--muted))]"
          >
            <div className="w-[52px] shrink-0">
              <p className="text-[11px] text-[hsl(var(--foreground))] leading-none" style={MONO}>{e.time}</p>
              <p
                className={cn(
                  "text-[11px] leading-none mt-1",
                  imminent ? "text-red-400" : soon ? "t-accent" : "text-[hsl(var(--text-secondary))]"
                )}
                style={MONO}
              >
                {countdown(away)}
              </p>
            </div>

            <span className="text-[11px] font-bold t-accent w-[28px] shrink-0" style={MONO}>
              {e.currency}
            </span>

            <p className="flex-1 min-w-0 text-[11px] text-[hsl(var(--foreground))] truncate">{e.event}</p>

            <span
              className={cn(
                "shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-[2px] uppercase",
                e.impact === "high"   ? "bg-red-500/15 text-red-400" :
                e.impact === "medium" ? "bg-t-accent-15 t-accent" :
                                        "bg-[hsl(var(--text-secondary)_/_0.15)] text-[hsl(var(--text-secondary))]"
              )}
            >
              {e.impact}
            </span>

            <ChevronRight className="h-3 w-3 shrink-0 text-[hsl(var(--text-secondary))]" />
          </button>
        );
      })}

      <button
        onClick={openCalendar}
        className="w-full px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--text-secondary))] active:bg-[hsl(var(--muted))]"
      >
        Full calendar &amp; past releases
      </button>
    </div>
  );
}
