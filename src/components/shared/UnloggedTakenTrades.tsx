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
 * Trades taken in TradeX that closed (by hand or at TP/SL) but never reached
 * the P&L calendar — the write failed while offline or while the database was
 * down. They live only on this device, so without this list a missing trade
 * had no trace anywhere the trader could see.
 */
export function UnloggedTakenTrades({ onLogged }: { onLogged: () => void }) {
  const [trades, setTrades] = useState<TakenSignal[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(() => {
    const cutoff = Date.now() - WINDOW_MS;
    setTrades(
      loadTradeLog().filter(t =>
        t.status === "closed" &&
        !isTradeLogged(t.id) &&
        new Date(t.closedAt ?? t.takenAt).getTime() >= cutoff,
      ),
    );
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

  if (trades.length === 0) return null;

  return (
    <div className="rounded-xl border border-[hsl(var(--primary)_/_0.35)] bg-[hsl(var(--primary)_/_0.06)] px-4 py-3 space-y-2">
      <div>
        <p className="text-xs font-bold text-[hsl(var(--foreground))]">
          {trades.length === 1 ? "1 TradeX trade isn't" : `${trades.length} TradeX trades aren't`} in your calendar yet
        </p>
        <p className="text-[11px] text-[hsl(var(--text-secondary))]">
          Closed in TradeX, but the save to your calendar didn&apos;t go through.
        </p>
      </div>
      {trades.map(t => {
        const pnl = t.pnlDollar ?? 0;
        const auto = t.notes?.startsWith("Auto-closed:");
        const hit = auto ? (t.notes!.includes("TP1 hit") ? "TP1 hit" : t.notes!.includes("SL hit") ? "SL hit" : "Closed") : "Closed";
        return (
          <div key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[hsl(var(--border))] pt-2">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
                {t.direction} {t.symbolDisplay} · {hit} @ {t.exitPrice != null ? fmt(t.exitPrice) : "—"}
              </p>
              <p className="text-[11px] text-[hsl(var(--text-secondary))]">
                {new Date(t.closedAt ?? t.takenAt).toLocaleString()}
              </p>
            </div>
            <span className={cn("font-mono text-sm font-bold", pnl >= 0 ? "text-[#00C853]" : "text-[#FF3D3D]")}>
              {pnl >= 0 ? "+" : "-"}${Math.abs(pnl).toFixed(2)}
            </span>
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
          </div>
        );
      })}
    </div>
  );
}
