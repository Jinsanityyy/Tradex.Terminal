"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  closeTrade, loadTradeLog, syncAllClosedTrades, syncClosedTradeToServer, type TakenSignal,
} from "@/lib/trades/trade-log";
import type { RecentSignal } from "@/hooks/useMarketData";
import { hitFromCandles, hitFromPrice, timeframeFor, type CandleBar, type TradeHit } from "@/lib/trades/auto-resolve";

// Candles cost a TwelveData credit and an entitlement check per symbol; ticks
// cover the live case, so this only has to catch what happened off-screen.
const CANDLE_CHECK_MS = 5 * 60_000;
const RANK = { M5: 0, M15: 1, H1: 2 } as const;

function fmtPrice(n: number): string {
  return n > 100 ? n.toFixed(2) : n.toFixed(4);
}

/**
 * The tracked signal a trade was taken from: same side, same entry and stop.
 * Its outcome is what the TP/SL badge on the setup card shows, so when it has
 * one the trade takes it — the card and the trade log can never disagree.
 */
function signalHit(t: TakenSignal, signals: RecentSignal[]): TradeHit | null {
  const takenMs = new Date(t.takenAt).getTime();
  for (const s of signals) {
    const p = s.tradePlan;
    if (!p || p.entry <= 0 || p.stopLoss <= 0) continue;
    if ((p.direction === "long") !== (t.direction === "BUY")) continue;
    if (Math.abs(p.entry - t.entry) / p.entry >= 0.001) continue;
    if (Math.abs(p.stopLoss - t.stopLoss) / p.stopLoss >= 0.002) continue;
    const at = s.outcome?.resolvedAt ?? new Date().toISOString();
    // Resolved before the trade existed: that outcome belongs to someone else's entry.
    if (new Date(at).getTime() < takenMs) continue;
    if (s.status === "win_tp1" || s.status === "win_tp2") return { kind: "tp1", price: t.tp1, at };
    if (s.status === "loss_sl") return { kind: "sl", price: t.stopLoss, at };
  }
  return null;
}

/**
 * Closes open taken trades by themselves when price reaches TP1 or the stop,
 * and logs them to the P&L calendar.
 * `prices` is the live quote per symbol; `signals` the tracked signals for the
 * symbol on screen; `onResolved` reloads the caller's log.
 */
export function useTradeAutoResolve(
  prices: Record<string, number | undefined>,
  onResolved: () => void,
  signals: RecentSignal[] = [],
) {
  const inFlight = useRef(new Set<string>());
  // Until the first candle pass has run, the price on screen says nothing about
  // what happened while the app was closed: a trade that hit TP at 3am and is
  // now back through the stop must close as the win it was.
  const caughtUp = useRef(false);
  const pricesRef = useRef(prices);
  pricesRef.current = prices;
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  function resolve(t: TakenSignal, hit: TradeHit, source: "live" | "candles" | "signal") {
    if (inFlight.current.has(t.id)) return;
    // Re-read: another tab or the other check may have closed it already.
    const current = loadTradeLog().find(x => x.id === t.id);
    if (!current || current.status !== "open") return;
    inFlight.current.add(t.id);

    const label = hit.kind === "tp1" ? "TP1 hit" : "SL hit";
    const when = source !== "live" ? ` at ${new Date(hit.at).toLocaleString()}` : "";
    const closed = closeTrade(
      t.id,
      hit.price,
      `Auto-closed: ${label} @ ${fmtPrice(hit.price)}${when}${t.notes ? ` · ${t.notes}` : ""}`,
      hit.at,
    );
    if (closed) {
      const pnl = closed.pnlDollar ?? 0;
      const msg = `${label} · ${t.direction} ${t.symbolDisplay} @ ${fmtPrice(hit.price)} · ${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toFixed(2)}`;
      if (hit.kind === "tp1") toast.success(msg); else toast.error(msg);
      onResolvedRef.current();
      void syncClosedTradeToServer(closed).then(ok => {
        if (!ok) toast.warning("Couldn't reach the PnL calendar — it will be logged next time the app opens");
      });
    }
    inFlight.current.delete(t.id);
  }

  // The tracker's verdict, whenever a signal's status actually changes (the
  // list itself is a new array on every render).
  const signalKey = signals.map(s => `${s.timestamp}:${s.status}`).join("|");
  useEffect(() => {
    if (signals.length === 0) return;
    for (const t of loadTradeLog()) {
      if (t.status !== "open") continue;
      const hit = signalHit(t, signals);
      if (hit) resolve(t, hit, "signal");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalKey]);

  // Live ticks.
  useEffect(() => {
    if (!caughtUp.current) return;
    for (const t of loadTradeLog()) {
      if (t.status !== "open") continue;
      const p = prices[t.symbol];
      if (p === undefined) continue;
      const hit = hitFromPrice(t, p);
      if (hit) resolve(t, hit, "live");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices]);

  // Candles: on open, then every few minutes while trades are open.
  useEffect(() => {
    let cancelled = false;

    async function check() {
      const open = loadTradeLog().filter(t => t.status === "open");
      if (open.length === 0) return;

      // One fetch per symbol, at the timeframe that reaches its oldest trade.
      const bySymbol = new Map<string, "M5" | "M15" | "H1">();
      for (const t of open) {
        const tf = timeframeFor(t.takenAt);
        const prev = bySymbol.get(t.symbol);
        if (!prev || RANK[tf] > RANK[prev]) bySymbol.set(t.symbol, tf);
      }

      for (const [symbol, tf] of bySymbol) {
        try {
          const res = await fetch(`/api/market/candles?symbol=${symbol}&timeframe=${tf}`);
          if (!res.ok || cancelled) continue;
          const { candles } = (await res.json()) as { candles?: CandleBar[] };
          if (!candles?.length || cancelled) continue;
          const live = pricesRef.current[symbol] ?? null;
          for (const t of open.filter(x => x.symbol === symbol)) {
            const hit = hitFromCandles(t, candles, live);
            if (hit) resolve(t, hit, "candles");
          }
        } catch {
          // Next pass retries; the live check still runs meanwhile.
        }
      }
    }

    // Closes whose calendar write failed (offline, database down) go out now.
    void syncAllClosedTrades();
    void check().finally(() => { caughtUp.current = true; });
    const id = setInterval(check, CANDLE_CHECK_MS);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void syncAllClosedTrades();
      void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
