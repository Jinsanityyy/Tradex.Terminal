"use client";

import React, { useEffect, useState } from "react";
import { Clock, Radio } from "lucide-react";

interface SessionDef {
  name: string;
  tz: string;
  openUTC: number;
  closeUTC: number;
  color: string;
  bg: string;
  border: string;
  dot: string;
}

const SESSIONS: SessionDef[] = [
  {
    name: "Asia / Tokyo",
    tz: "Asia/Tokyo",
    openUTC: 0,
    closeUTC: 9,
    color: "#A78BFA",
    bg: "#A78BFA12",
    border: "#A78BFA30",
    dot: "#A78BFA",
  },
  {
    name: "London",
    tz: "Europe/London",
    openUTC: 7,
    closeUTC: 16,
    color: "#60A5FA",
    bg: "#60A5FA12",
    border: "#60A5FA30",
    dot: "#60A5FA",
  },
  {
    name: "New York",
    tz: "America/New_York",
    openUTC: 13,
    closeUTC: 22,
    color: "#FCD34D",
    bg: "#FCD34D12",
    border: "#FCD34D30",
    dot: "#FCD34D",
  },
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function getLocalTime(tz: string): string {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function computeSession(session: SessionDef, now: Date) {
  const utcSecs =
    now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  const openSecs = session.openUTC * 3600;
  const closeSecs = session.closeUTC * 3600;

  const isActive = utcSecs >= openSecs && utcSecs < closeSecs;
  let countdown: number;
  let countdownLabel: string;

  if (isActive) {
    countdown = closeSecs - utcSecs;
    countdownLabel = "closes in";
  } else if (utcSecs < openSecs) {
    countdown = openSecs - utcSecs;
    countdownLabel = "opens in";
  } else {
    countdown = 86400 - utcSecs + openSecs;
    countdownLabel = "opens in";
  }

  return { isActive, countdown, countdownLabel };
}

export function SessionTimersWidget() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-2 p-3">
      {/* UTC clock */}
      <div
        className="flex items-center justify-between rounded-lg px-3 py-2"
        style={{ background: "var(--t-card)", border: "1px solid var(--t-border-sub)" }}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" style={{ color: "var(--t-muted)" }} />
          <span
            className="text-[10px] uppercase tracking-widest font-semibold"
            style={{ color: "var(--t-muted)" }}
          >
            UTC
          </span>
        </div>
        <span className="text-sm font-mono font-bold" style={{ color: "var(--t-text)" }}>
          {pad(now.getUTCHours())}:{pad(now.getUTCMinutes())}:{pad(now.getUTCSeconds())}
        </span>
      </div>

      {/* Session rows */}
      {SESSIONS.map((s) => {
        const { isActive, countdown, countdownLabel } = computeSession(s, now);
        const localTime = getLocalTime(s.tz);

        return (
          <div
            key={s.name}
            className="rounded-xl p-3 transition-all"
            style={{
              background: isActive ? s.bg : "var(--t-card)",
              border: `1px solid ${isActive ? s.border : "var(--t-border-sub)"}`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isActive ? (
                  <Radio
                    className="h-3.5 w-3.5"
                    style={{ color: s.color, animation: "pulse 2s infinite" }}
                  />
                ) : (
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ background: "var(--t-muted)", opacity: 0.3 }}
                  />
                )}
                <span
                  className="text-[11px] font-bold tracking-wide"
                  style={{ color: isActive ? s.color : "var(--t-muted)" }}
                >
                  {s.name}
                </span>
              </div>
              <span
                className="text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded"
                style={{
                  background: isActive ? s.border : "transparent",
                  color: isActive ? s.color : "var(--t-muted)",
                  border: `1px solid ${isActive ? s.border : "var(--t-border-sub)"}`,
                }}
              >
                {isActive ? "LIVE" : "CLOSED"}
              </span>
            </div>

            {/* Times */}
            <div className="flex items-end justify-between">
              <div>
                <div
                  className="text-[9px] uppercase tracking-widest mb-0.5"
                  style={{ color: "var(--t-muted)", opacity: 0.6 }}
                >
                  Local time
                </div>
                <div
                  className="text-sm font-mono font-bold"
                  style={{ color: isActive ? s.color : "var(--t-muted)" }}
                >
                  {localTime}
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-[9px] uppercase tracking-widest mb-0.5"
                  style={{ color: "var(--t-muted)", opacity: 0.6 }}
                >
                  {countdownLabel}
                </div>
                <div
                  className="text-sm font-mono font-bold tabular-nums"
                  style={{ color: isActive ? "var(--t-text)" : "var(--t-muted)" }}
                >
                  {formatCountdown(countdown)}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* London–NY overlap indicator */}
      {(() => {
        const utcH = now.getUTCHours();
        if (utcH >= 13 && utcH < 16) {
          return (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "#F59E0B10", border: "1px solid #F59E0B30" }}
            >
              <div className="h-2 w-2 rounded-full" style={{ background: "#F59E0B" }} />
              <span className="text-[10px] font-semibold" style={{ color: "#F59E0B" }}>
                London–NY Overlap · Highest liquidity window
              </span>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}
