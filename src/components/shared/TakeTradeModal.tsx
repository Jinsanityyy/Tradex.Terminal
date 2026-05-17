"use client";

import React, { useState, useEffect } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import {
  suggestLotSize,
  takeTrade,
  type TakenSignal,
} from "@/lib/trades/trade-log";

interface Props {
  symbol: string;
  symbolDisplay: string;
  direction: "BUY" | "SELL";
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2?: number | null;
  rrRatio: number;
  grade?: string;
  signalId?: string;
  timeframe?: string;
  onClose: () => void;
  onTaken: (t: TakenSignal) => void;
}

function fmt(n: number): string {
  return n > 100 ? n.toFixed(2) : n.toFixed(4);
}

export function TakeTradeModal({
  symbol, symbolDisplay, direction, entry, stopLoss, tp1, tp2,
  rrRatio, grade, signalId, timeframe, onClose, onTaken,
}: Props) {
  const { settings, saveSettings } = useSettings();
  const defaultRisk = settings.riskPerTrade ?? 1;

  // Editable account balance — initialised from persisted settings
  const [accountStr, setAccountStr] = useState(() =>
    String(settings.accountBalance ?? 10000)
  );
  const accountBalance = Math.max(1, parseFloat(accountStr) || 10000);

  function commitBalance() {
    const v = parseFloat(accountStr);
    if (!isNaN(v) && v > 0) {
      saveSettings({ ...settings, accountBalance: v });
    }
  }

  const [riskPct, setRiskPct] = useState(defaultRisk);
  const [lotStr, setLotStr] = useState("");
  const [saving, setSaving] = useState(false);

  const suggested = suggestLotSize(symbol, entry, stopLoss, accountBalance, riskPct);
  const lotSize = parseFloat(lotStr) || suggested;
  const riskAmount = accountBalance * (riskPct / 100);

  useEffect(() => {
    setLotStr(suggested.toString());
  }, [suggested]);

  const isBuy = direction === "BUY";

  async function confirm() {
    if (lotSize <= 0 || isNaN(lotSize)) return;
    setSaving(true);
    try {
      const trade = takeTrade({
        signalId,
        symbol,
        symbolDisplay,
        direction,
        timeframe,
        entry,
        stopLoss,
        tp1,
        tp2,
        rrRatio,
        grade,
        lotSize,
        riskAmount: parseFloat(riskAmount.toFixed(2)),
      });

      // Auto-log to PNL calendar (Supabase) — fire-and-forget
      fetch("/api/manual-trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          symbol: symbolDisplay,
          direction: direction.toLowerCase(),
          pnl: 0,
          fees: 0,
          open_time: new Date().toISOString(),
          notes: `[TradeX Signal] ${direction} ${symbolDisplay}${grade ? ` · Grade ${grade}` : ""}${timeframe ? ` · ${timeframe}` : ""} | Entry: ${fmt(entry)}  SL: ${fmt(stopLoss)}  TP: ${fmt(tp1)}  R:R: ${rrRatio}:1 | Lot: ${lotSize}  Risk: $${riskAmount.toFixed(2)}`,
        }),
      }).catch(() => {/* silently ignore — trade already saved locally */});

      onTaken(trade);
      onClose();
    } finally {
      setSaving(false);
    }
  }

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
              {isBuy
                ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                : <TrendingDown className="w-4 h-4 text-red-400" />
              }
            </div>
            <div>
              <p className="text-sm font-bold text-white">Take This Trade</p>
              <p className="text-[10px] text-zinc-500">
                {symbolDisplay} · {direction} {grade && `· Grade ${grade}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Setup grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Entry", value: fmt(entry),    color: "text-zinc-100" },
              { label: "SL",    value: fmt(stopLoss),  color: "text-red-400" },
              { label: "TP1",   value: fmt(tp1),       color: "text-emerald-400" },
              { label: "R:R",   value: `${rrRatio}:1`, color: "text-amber-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-white/4 border border-white/6 p-2.5 text-center">
                <p className="text-[8px] text-zinc-600 uppercase mb-0.5">{label}</p>
                <p className={cn("text-[11px] font-mono font-bold", color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Risk % */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500">Risk %</label>
              {/* Editable account balance — tap to change, persists to settings */}
              <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                <span className="text-zinc-600">Account: $</span>
                <input
                  type="number"
                  min="1"
                  step="100"
                  value={accountStr}
                  onChange={e => setAccountStr(e.target.value)}
                  onBlur={commitBalance}
                  onKeyDown={e => e.key === "Enter" && (e.currentTarget.blur())}
                  className="w-[72px] bg-transparent border-b border-zinc-700 text-zinc-300 text-[10px] font-mono text-right outline-none focus:border-[hsl(var(--primary))]/60 transition-colors"
                />
              </span>
            </div>
            <div className="flex gap-2">
              {[0.5, 1, 1.5, 2].map(p => (
                <button
                  key={p}
                  onClick={() => setRiskPct(p)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold border transition-colors",
                    riskPct === p
                      ? "bg-[hsl(var(--primary))]/20 border-[hsl(var(--primary))]/50 text-[hsl(var(--primary))]"
                      : "border-white/8 text-zinc-500 hover:text-zinc-300"
                  )}
                >{p}%</button>
              ))}
            </div>
          </div>

          {/* Lot size */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">
              Lot Size
              <span className="ml-1 text-zinc-600">(suggested: {suggested})</span>
            </label>
            <input
              type="number"
              min="0.001"
              step="0.01"
              value={lotStr}
              onChange={e => setLotStr(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-mono text-white outline-none focus:border-[hsl(var(--primary))]/50"
            />
          </div>

          {/* Risk amount display */}
          <div className="rounded-xl bg-white/3 border border-white/6 px-4 py-2.5 flex justify-between items-center">
            <span className="text-[11px] text-zinc-500">Risking</span>
            <span className="text-sm font-bold text-red-400">
              ${riskAmount.toFixed(2)} ({riskPct}%)
            </span>
          </div>

          <button
            onClick={confirm}
            disabled={saving || lotSize <= 0}
            className={cn(
              "w-full py-3 rounded-xl text-sm font-bold transition-all",
              isBuy
                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 active:scale-98"
                : "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 active:scale-98",
              (saving || lotSize <= 0) && "opacity-40"
            )}
          >
            {saving ? "Saving…" : `Confirm ${direction} Trade`}
          </button>
        </div>
      </div>
    </div>
  );
}
