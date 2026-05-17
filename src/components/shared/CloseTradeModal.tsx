"use client";

import React, { useState } from "react";
import { X, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { closeTrade, calcPnLDollar, type TakenSignal } from "@/lib/trades/trade-log";

interface Props {
  trade: TakenSignal;
  onClose: () => void;
  onClosed: (t: TakenSignal) => void;
}

function fmt(n: number): string {
  return n > 100 ? n.toFixed(2) : n.toFixed(4);
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` };
  } catch {}
  return {};
}

export function CloseTradeModal({ trade, onClose, onClosed }: Props) {
  const [exitStr, setExitStr] = useState("");
  const [notes, setNotes] = useState(trade.notes ?? "");
  const [saving, setSaving] = useState(false);

  const exitPrice = parseFloat(exitStr);
  const validExit = exitStr !== "" && !isNaN(exitPrice) && exitPrice > 0;

  const previewPnl = validExit
    ? calcPnLDollar(trade.symbol, trade.direction, trade.entry, exitPrice, trade.lotSize)
    : null;
  const riskDist = Math.abs(trade.entry - trade.stopLoss);
  const previewR = (validExit && riskDist > 0)
    ? parseFloat(((trade.direction === "BUY" ? exitPrice - trade.entry : trade.entry - exitPrice) / riskDist).toFixed(2))
    : null;

  async function save() {
    if (!validExit) return;
    setSaving(true);
    try {
      const closed = closeTrade(trade.id, exitPrice, notes);
      if (!closed) { toast.error("Trade not found"); return; }

      // Auto-log to PnL calendar
      const date = new Date().toISOString().split("T")[0];
      const headers = await getAuthHeaders();
      const res = await fetch("/api/manual-trades", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          date,
          symbol: trade.symbol,
          direction: trade.direction === "BUY" ? "long" : "short",
          pnl: parseFloat(closed.pnlDollar!.toFixed(2)),
          fees: 0,
          notes: `Signal trade · ${trade.direction} ${trade.symbolDisplay} @ ${fmt(trade.entry)} → ${fmt(exitPrice)} · ${closed.pnlR! >= 0 ? "+" : ""}${closed.pnlR}R${notes ? ` · ${notes}` : ""}`,
        }),
      });

      if (res.ok) {
        toast.success(`Trade closed: ${closed.pnlDollar! >= 0 ? "+" : ""}$${Math.abs(closed.pnlDollar!).toFixed(2)} logged to PnL calendar`);
      } else {
        toast.success(`Trade closed: ${closed.pnlDollar! >= 0 ? "+" : ""}$${Math.abs(closed.pnlDollar!).toFixed(2)}`);
        toast.warning("Couldn't auto-log to calendar — add manually");
      }

      onClosed(closed);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const isBuy = trade.direction === "BUY";
  const takenAgo = (() => {
    const ms = Date.now() - new Date(trade.takenAt).getTime();
    const m = Math.floor(ms / 60_000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[hsl(220,18%,6%)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              isBuy ? "bg-emerald-500/15" : "bg-red-500/15"
            )}>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Close Trade</p>
              <p className="text-[10px] text-zinc-500">
                {trade.symbolDisplay} · {trade.direction} · taken {takenAgo}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Open trade summary */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Entry",    value: fmt(trade.entry),    color: "text-zinc-100" },
              { label: "SL",       value: fmt(trade.stopLoss), color: "text-red-400" },
              { label: "TP1",      value: fmt(trade.tp1),      color: "text-emerald-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-white/4 border border-white/6 p-2.5 text-center">
                <p className="text-[8px] text-zinc-600 uppercase mb-0.5">{label}</p>
                <p className={cn("text-[11px] font-mono font-bold", color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Exit price */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
              Exit Price
            </label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder={`e.g. ${fmt(trade.tp1)}`}
              value={exitStr}
              onChange={e => setExitStr(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-mono text-white outline-none focus:border-[hsl(var(--primary))]/50 placeholder:text-zinc-700"
            />
          </div>

          {/* PnL preview */}
          {previewPnl !== null && (
            <div className={cn(
              "rounded-xl border px-4 py-3 flex items-center justify-between",
              previewPnl >= 0
                ? "bg-emerald-500/8 border-emerald-500/20"
                : "bg-red-500/8 border-red-500/20"
            )}>
              <div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">P&L</p>
                <p className={cn("text-xl font-bold font-mono", previewPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {previewPnl >= 0 ? "+" : ""}${Math.abs(previewPnl).toFixed(2)}
                </p>
              </div>
              {previewR !== null && (
                <div className="text-right">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-0.5">Result</p>
                  <p className={cn("text-lg font-bold font-mono", previewR >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {previewR >= 0 ? "+" : ""}{previewR}R
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
              Notes (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. TP1 hit, moved to BE…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[hsl(var(--primary))]/50 placeholder:text-zinc-700"
            />
          </div>

          <button
            onClick={save}
            disabled={saving || !validExit}
            className={cn(
              "w-full py-3 rounded-xl text-sm font-bold border transition-all",
              "bg-amber-500/15 border-amber-500/35 text-amber-400 hover:bg-amber-500/25 active:scale-98",
              (saving || !validExit) && "opacity-40"
            )}
          >
            {saving ? "Saving…" : "Log & Close Trade"}
          </button>
        </div>
      </div>
    </div>
  );
}
