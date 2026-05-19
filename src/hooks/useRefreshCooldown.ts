"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = "tradex_agent_refresh_ts";

export function useRefreshCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const raw = typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null;
    if (raw) {
      const lastRefresh = parseInt(raw, 10);
      const elapsed = Date.now() - lastRefresh;
      const remaining = Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000));
      if (remaining > 0) startCountdown(remaining);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCountdown(initialSeconds: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(initialSeconds);
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  const markRefreshed = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    startCountdown(Math.ceil(COOLDOWN_MS / 1000));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOnCooldown = secondsLeft > 0;

  const countdownLabel = (() => {
    if (secondsLeft <= 0) return null;
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  })();

  return { isOnCooldown, secondsLeft, countdownLabel, markRefreshed };
}
