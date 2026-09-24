"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  isTradeLogged,
  loadTradeLog,
  markTradeLogged,
  syncClosedTradeToServer,
  TRADES_CHANGED_EVENT,
  type TakenSignal,
} from "@/lib/trades/trade-log";

const WINDOW_MS = 14 * 86_400_000;

function fmt(n: number): string {
  return n > 100 ? n.toFixed(2) : n.toFixed(4);
}

/**
 * Every trade taken in TradeX over the last two weeks, with where it stands:
 * open, closed and on the calendar, or closed and missing from it (the write
 * failed while offline or while the database was down). Taken trades live
 * only on this device, so this is the one place a trader can see what
 * happened to one.
 */
export function UnloggedTakenTrades({ onLogged }: { onLogged: () => void }) {
  const [trades, setTrades] = useState<TakenSignal[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const reload = useCallback(() => {
    const cutoff = Date.now() - WINDOW_MS;
    setTrades(loadTradeLog().filter(t => new Date(t.closedAt ?? t.takenAt).getTime() >= cutoff));
    setTick(n => n + 1);   // isTradeLogged() is read at render
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener(TRADES_CHANGED_EVENT, reload);
    return () => window.removeEventListener(TRADES_CHANGED_EVENT, reload);
  }, [reload]);

  async function add(t: TakenSignal) {
    setBusy(t.id);
    const ok = await syncClosedTradeToServer(t);
    setBusy(null);
    if (ok) {
      toast.success("Added to your PnL calendar");
      onLogged();
    } else {
      toast.error("Couldn't reach the PnL calendar. Try again in a moment.");
    }
    reload();
  }

  const missing = trades.filter(t => t.status === "closed" && !isTradeLogged(t.id)).length;
  const build = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7);

  if (trades.length === 0) {
    return (
      <p className="text-[11px] text-[hsl(var(--text-secondary))]">
        No trades taken with Take Trade in the last 14 days on this device.
        {build && <span className="opacity-60"> · build {build}</span>}
      </p>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border px-4 py-3 space-y-2",
      missing > 0
        ? "border-[hsl(var(--primary)_/_0.35)] bg-[hsl(var(--primary)_/_0.06)]"
        : "border-[hsl(var(--border))]",
    )}>
      <div>
        <p className="text-xs font-bold text-[hsl(var(--foreground))]">
          TradeX trades · last 14 days
        </p>
        <p className="text-[11px] text-[hsl(var(--text-secondary))]">
          {missing > 0
            ? `${missing} closed but not in your calendar yet — the save didn't go through.`
            : "Trades you took with Take Trade, and whether each is on your calendar."}
        </p>
      </div>
      {trades.map(t => {
        const pnl = t.pnlDollar ?? 0;
        const open = t.status === "open";
        const logged = !open && isTradeLogged(t.id);
        const how = t.notes?.startsWith("Auto-closed:")
          ? (t.notes.includes("TP1 hit") ? "TP1 hit" : t.notes.includes("SL hit") ? "SL hit" : "Closed")
          : "Closed by hand";
        return (
          <div key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[hsl(var(--border))] pt-2">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
                {t.direction} {t.symbolDisplay} @ {fmt(t.entry)}
                {open ? " · open" : ` · ${how} @ ${t.exitPrice != null ? fmt(t.exitPrice) : "—"}`}
              </p>
              <p className="text-[11px] text-[hsl(var(--text-secondary))]">
                {open
                  ? `Taken ${new Date(t.takenAt).toLocaleString()} · TP1 ${fmt(t.tp1)} / SL ${fmt(t.stopLoss)}`
                  : `${new Date(t.closedAt ?? t.takenAt).toLocaleString()} · ${logged ? "in your calendar" : "not in your calendar"}`}
              </p>
            </div>
            {!open && (
              <span className={cn("font-mono text-sm font-bold", pnl >= 0 ? "text-[#00C853]" : "text-[#FF3D3D]")}>
                {pnl >= 0 ? "+" : "-"}${Math.abs(pnl).toFixed(2)}
              </span>
            )}
            {!open && !logged && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy === t.id}
                  onClick={() => void add(t)}
                  className="min-h-[44px] rounded-lg bg-[hsl(var(--primary))] px-3 text-[12px] font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60"
                >
                  {busy === t.id ? "Adding…" : "Add to calendar"}
                </button>
                <button
                  type="button"
                  onClick={() => markTradeLogged(t.id)}
                  className="min-h-[44px] rounded-lg border border-[hsl(var(--border))] px-3 text-[12px] text-[hsl(var(--text-secondary))]"
                >
                  Hide
                </button>
              </div>
            )}
          </div>
        );
      })}
      {build && <p className="text-[10px] text-[hsl(var(--text-secondary)_/_0.6)]">build {build}</p>}
    </div>
  );
}
