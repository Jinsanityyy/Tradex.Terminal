"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const COOLDOWN_MS    = 5 * 60 * 1000;
const STORAGE_KEY    = "tradex_agent_refresh_ts";
const DAILY_DATE_KEY = "tradex_brain_daily_date";
const DAILY_CNT_KEY  = "tradex_brain_daily_count";

export const FREE_DAILY_LIMIT = 3;

function getTodayCount(): number {
  if (typeof window === "undefined") return 0;
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(DAILY_DATE_KEY) !== today) return 0;
  return parseInt(localStorage.getItem(DAILY_CNT_KEY) ?? "0", 10);
}

function incrementTodayCount(): number {
  const today = new Date().toISOString().slice(0, 10);
  const next = getTodayCount() + 1;
  localStorage.setItem(DAILY_DATE_KEY, today);
  localStorage.setItem(DAILY_CNT_KEY, String(next));
  return next;
}

export function useRefreshCooldown(isPro = false) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [dailyCount, setDailyCount]   = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Restore cooldown countdown
    const raw = typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const elapsed   = Date.now() - parseInt(raw, 10);
      const remaining = Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000));
      if (remaining > 0) startCountdown(remaining);
    }
    // Restore daily count
    setDailyCount(getTodayCount());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCountdown(initialSeconds: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(initialSeconds);
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(intervalRef.current!); intervalRef.current = null; return 0; }
        return s - 1;
      });
    }, 1000);
  }

  const markRefreshed = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    startCountdown(Math.ceil(COOLDOWN_MS / 1000));
    if (!isPro) setDailyCount(incrementTodayCount());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro]);

  const isOnCooldown    = secondsLeft > 0;
  const dailyLeft       = isPro ? Infinity : Math.max(0, FREE_DAILY_LIMIT - dailyCount);
  const hasHitDailyLimit = !isPro && dailyCount >= FREE_DAILY_LIMIT;

  const countdownLabel = (() => {
    if (secondsLeft <= 0) return null;
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  })();

  return { isOnCooldown, secondsLeft, countdownLabel, markRefreshed, dailyCount, dailyLeft, hasHitDailyLimit };
}
