"use client";

import React, { useState } from "react";
import { Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

const ACCOUNT_PRESETS = [1000, 5000, 10000, 25000, 50000, 100000];
const RISK_PRESETS = [0.5, 1, 1.5, 2, 3];

export function LotCalculatorWidget() {
  const { settings } = useSettings();
  const [accountSize, setAccountSize] = useState(() => settings.accountBalance ?? 10000);
  const [riskPct, setRiskPct] = useState(() => settings.riskPerTrade ?? 1);
  const [entry, setEntry] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  const entryNum = parseFloat(entry);
  const slNum = parseFloat(stopLoss);
  const hasValidPrices = !isNaN(entryNum) && !isNaN(slNum) && entryNum > 0 && slNum > 0;

  const slPoints = hasValidPrices ? Math.abs(entryNum - slNum) : 0;
  const pointValue = hasValidPrices && entryNum > 100 ? 100 : 10;
  const riskAmount = accountSize * (riskPct / 100);
  const rawLots = slPoints > 0 ? riskAmount / (slPoints * pointValue) : 0;
  const lots =
    rawLots >= 1
      ? parseFloat(rawLots.toFixed(2))
      : rawLots >= 0.1
      ? parseFloat(rawLots.toFixed(2))
      : parseFloat(rawLots.toFixed(3));
  const displayLots = rawLots <= 0 ? "—" : lots < 0.01 ? "< 0.01" : lots.toFixed(lots >= 1 ? 2 : lots >= 0.1 ? 2 : 3);

  return (
    <div className="p-3 space-y-3 h-full overflow-y-auto">
      {/* Account presets */}
      <div className="flex flex-wrap gap-1.5">
        {ACCOUNT_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setAccountSize(preset)}
            className={cn(
              "rounded px-2 py-1 text-[10px] font-semibold transition-all",
              accountSize === preset
                ? "border border-amber-500/30 bg-amber-500/20 text-amber-300"
                : "border border-white/[0.08] bg-white/[0.04] text-zinc-500 hover:text-zinc-300"
            )}
          >
            ${preset >= 1000 ? `${preset / 1000}k` : preset}
          </button>
        ))}
        <input
          type="number"
          value={accountSize}
          onChange={(e) => setAccountSize(Math.max(100, Number(e.target.value)))}
          className="w-20 rounded border border-white/[0.08] bg-[#0d0d0d] px-2 py-1 text-right text-[10px] text-zinc-300 outline-none focus:border-amber-500/40 [color-scheme:dark]"
          placeholder="Custom"
        />
      </div>

      {/* Risk % */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Risk</span>
        {RISK_PRESETS.map((r) => (
          <button
            key={r}
            onClick={() => setRiskPct(r)}
            className={cn(
              "rounded px-2 py-1 text-[10px] font-semibold transition-all",
              riskPct === r && RISK_PRESETS.includes(riskPct)
                ? "border border-amber-500/30 bg-amber-500/20 text-amber-300"
                : "border border-white/[0.08] bg-white/[0.04] text-zinc-500 hover:text-zinc-300"
            )}
          >
            {r}%
          </button>
        ))}
        <input
          type="number"
          min={0.1}
          max={100}
          step={0.1}
          value={riskPct}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v > 0) setRiskPct(parseFloat(v.toFixed(1)));
          }}
          className="w-16 rounded border border-white/[0.08] bg-[#0d0d0d] px-2 py-1 text-right text-[10px] text-zinc-300 outline-none focus:border-amber-500/40 [color-scheme:dark]"
          placeholder="Custom"
        />
        <span className="text-[10px] text-zinc-600">%</span>
      </div>

      {/* Entry + SL inputs */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Entry</div>
            <input
              type="number"
              min={0}
              step="any"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="e.g. 3250"
              className="w-full rounded border border-white/[0.08] bg-[#0d0d0d] px-2 py-1.5 text-[10px] font-mono text-zinc-300 outline-none focus:border-amber-500/40 [color-scheme:dark]"
            />
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">Stop Loss</div>
            <input
              type="number"
              min={0}
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="e.g. 3235"
              className="w-full rounded border border-white/[0.08] bg-[#0d0d0d] px-2 py-1.5 text-[10px] font-mono text-zinc-300 outline-none focus:border-amber-500/40 [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="mb-3 flex items-center gap-2">
          <Calculator className="h-3.5 w-3.5 text-amber-300" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Lot Size Calculator</span>
          <span className="ml-auto text-[10px] text-zinc-600">@ {riskPct}% risk</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Recommended Size</div>
            <div className="mt-1 text-xl font-black font-mono text-amber-300">{displayLots}</div>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-[10px] text-zinc-600">Risk amount</div>
            <div className="text-sm font-mono font-semibold text-zinc-300">${riskAmount.toFixed(0)}</div>
            <div className="text-[10px] text-zinc-600">SL distance</div>
            <div className="text-xs font-mono text-zinc-400">
              {slPoints > 0 ? `${slPoints.toFixed(entryNum > 100 ? 1 : 4)} pts` : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
