"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";
import { withTz, todayLocal } from "@/lib/trades/local-date";
import { computeGuard, type Level, type TradingRules } from "@/lib/trades/risk-guard";

/**
 * Bloomberg-style strip along the bottom of every desktop screen: the four FX
 * centres and whether each is trading, today's P&L, the MT5 EA's heartbeat,
 * Risk Guard, and the command-bar shortcut.
 */

const CENTRES = [
  { code: "SYD", tz: "Australia/Sydney", open: 7, close: 16 },
  { code: "TYO", tz: "Asia/Tokyo",       open: 9, close: 18 },
  { code: "LDN", tz: "Europe/London",    open: 8, close: 17 },
  { code: "NY",  tz: "America/New_York", open: 8, close: 17 },
] as const;

function partsIn(tz: string, now: Date) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => p.find(x => x.type === t)?.value ?? "";
  return { hour: Number(get("hour")), minute: Number(get("minute")), weekday: get("weekday"), hhmm: `${get("hour")}:${get("minute")}` };
}

/** Spot FX shuts from Friday 17:00 to Sunday 17:00 New York time. */
function fxWeekendClosed(now: Date): boolean {
  const ny = partsIn("America/New_York", now);
  return ny.weekday === "Sat" || (ny.weekday === "Fri" && ny.hour >= 17) || (ny.weekday === "Sun" && ny.hour < 17);
}

const LEVEL: Record<Level, { label: string; cls: string }> = {
  ok:     { label: "CLEAR",   cls: "text-emerald-400" },
  warn:   { label: "CAUTION", cls: "text-amber-400" },
  breach: { label: "STOP",    cls: "text-red-400" },
};

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 11 * 60) return "live";   // the EA (v1.03+) pings every 5 minutes
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function StatusBar() {
  const [now, setNow] = useState(() => new Date());
  const [pnl, setPnl] = useState<number | null>(null);
  const [mt5, setMt5] = useState<{ lastSeen: string | null } | null>(null);
  const [guard, setGuard] = useState<Level | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      const headers = await getAuthHeaders();
      const today = todayLocal();
      const [pnlRes, connRes, rulesRes, tradesRes] = await Promise.allSettled([
        fetch(withTz("/api/pnl"), { headers }).then(r => r.ok ? r.json() : null),
        fetch("/api/exchanges/list", { headers }).then(r => r.ok ? r.json() : null),
        fetch("/api/rules", { headers }).then(r => r.ok ? r.json() : null),
        fetch(withTz(`/api/pnl/trades?from=${today}`), { headers }).then(r => r.ok ? r.json() : null),
      ]);
      if (stopped) return;
      if (pnlRes.status === "fulfilled" && pnlRes.value) {
        const day = (pnlRes.value.daily ?? []).find((d: { date: string }) => d.date === today);
        setPnl(day ? day.pnl : 0);
      }
      if (connRes.status === "fulfilled" && connRes.value) {
        const conn = (connRes.value.data ?? []).find((c: { exchange: string; is_active?: boolean }) => c.exchange === "mt5" && c.is_active !== false);
        setMt5(conn ? { lastSeen: conn.last_synced_at ?? null } : null);
      }
      if (rulesRes.status === "fulfilled" && rulesRes.value?.rules && tradesRes.status === "fulfilled" && tradesRes.value) {
        const rules = rulesRes.value.rules as TradingRules;
        const any = rules.daily_loss_limit || rules.max_trades_per_day || rules.max_consecutive_losses;
        setGuard(any ? computeGuard({ ...rules, prop_enabled: false }, tradesRes.value.data ?? [], today).level : null);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { stopped = true; clearInterval(id); };
  }, []);

  const weekend = fxWeekendClosed(now);
  const [isMac, setIsMac] = useState(false);
  useEffect(() => { setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)); }, []);

  return (
    <footer className="hidden h-6 shrink-0 items-center gap-4 border-t border-white/[0.06] bg-black/40 px-3 font-mono text-[10px] text-zinc-500 md:flex">
      {CENTRES.map(c => {
        const p = partsIn(c.tz, now);
        const isOpen = !weekend && p.hour >= c.open && p.hour < c.close;
        return (
          <span key={c.code} className="flex items-center gap-1.5" title={`${c.code} ${isOpen ? "open" : "closed"} · local ${p.hhmm}`}>
            <span className={cn("h-1.5 w-1.5 rounded-full", isOpen ? "bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400/60" : "bg-zinc-700")} />
            <span className={isOpen ? "text-zinc-300" : ""}>{c.code}</span>
            <span className="text-zinc-600">{p.hhmm}</span>
          </span>
        );
      })}
      {weekend && <span className="text-amber-500/80">FX CLOSED · WEEKEND</span>}

      <span className="ml-auto flex items-center gap-4">
        {pnl !== null && (
          <Link href="/dashboard/pnl-calendar" className="hover:text-zinc-300">
            DAY P&L <span className={pnl > 0 ? "text-emerald-400" : pnl < 0 ? "text-red-400" : "text-zinc-400"}>
              {pnl >= 0 ? "+" : "-"}${Math.abs(pnl).toFixed(2)}
            </span>
          </Link>
        )}
        {guard && (
          <Link href="/dashboard/pnl-calendar" className="hover:text-zinc-300">
            RISK <span className={LEVEL[guard].cls}>{LEVEL[guard].label}</span>
          </Link>
        )}
        {mt5 && (
          <span title={mt5.lastSeen ? `EA last seen ${new Date(mt5.lastSeen).toLocaleString()}` : "EA hasn't connected yet"}>
            MT5 <span className={mt5.lastSeen && ago(mt5.lastSeen) === "live" ? "text-emerald-400" : "text-zinc-400"}>
              {mt5.lastSeen ? ago(mt5.lastSeen) : "waiting"}
            </span>
          </span>
        )}
        <button onClick={() => window.dispatchEvent(new Event("tradex:command-palette"))}
          className="flex items-center gap-1 rounded border border-white/10 px-1.5 text-zinc-400 hover:border-white/25 hover:text-zinc-200">
          <span className="text-[hsl(var(--primary))]">{isMac ? "⌘K" : "CTRL K"}</span> COMMAND
        </button>
      </span>
    </footer>
  );
}
