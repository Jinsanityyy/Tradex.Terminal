"use client";

import React, { useState } from "react";
import { Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

const ACCOUNT_PRESETS = [1000, 5000, 10000, 25000, 50000, 100000];
const RISK_PRESETS = [0.5, 1, 1.5, 2, 3];

type InstrumentType = "forex" | "gold" | "oil" | "indices" | "crypto";

const INSTRUMENTS: { id: InstrumentType; label: string; pointValue: number; note: string }[] = [
  { id: "forex",   label: "Forex",   pointValue: 10,  note: "USD-quoted pairs (EUR/USD, GBP/USD…)" },
  { id: "gold",    label: "Gold",    pointValue: 100, note: "XAU/USD — $1 per 0.01 per lot" },
  { id: "oil",     label: "Oil",     pointValue: 100, note: "USOIL, UKOIL" },
  { id: "indices", label: "Indices", pointValue: 1,   note: "US30, NAS100, SPX500" },
  { id: "crypto",  label: "Crypto",  pointValue: 1,   note: "BTC, ETH — micro lot based" },
];

export function LotCalculatorWidget() {
  const { settings } = useSettings();
  const [accountSize, setAccountSize]   = useState(() => settings.accountBalance ?? 10000);
  const [riskPct, setRiskPct]           = useState(() => settings.riskPerTrade ?? 1);
  const [entry, setEntry]               = useState("");
  const [stopLoss, setStopLoss]         = useState("");
  const [instrument, setInstrument]     = useState<InstrumentType>("forex");

  const entryNum       = parseFloat(entry);
  const slNum          = parseFloat(stopLoss);
  const hasValidPrices = !isNaN(entryNum) && !isNaN(slNum) && entryNum > 0 && slNum > 0;

  const slPoints   = hasValidPrices ? Math.abs(entryNum - slNum) : 0;
  const pointValue = INSTRUMENTS.find(i => i.id === instrument)?.pointValue ?? 10;
  const riskAmount = accountSize * (riskPct / 100);
  const rawLots    = slPoints > 0 ? riskAmount / (slPoints * pointValue) : 0;
  const displayLots = rawLots <= 0
    ? " - "
    : rawLots < 0.01
    ? "< 0.01"
    : rawLots.toFixed(rawLots >= 1 ? 2 : rawLots >= 0.1 ? 2 : 3);

  const isCrypto  = instrument === "crypto";
  const slDisplay = slPoints > 0
    ? isCrypto
      ? `$${slPoints.toFixed(2)}`
      : instrument === "forex"
      ? `${(slPoints * 10000).toFixed(1)} pips`
      : `${slPoints.toFixed(2)} pts`
    : " - ";

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

      {/* Instrument selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">Instrument</span>
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.id}
            onClick={() => setInstrument(inst.id)}
            className={cn(
              "rounded px-2 py-1 text-[10px] font-semibold transition-all",
              instrument === inst.id
                ? "border border-blue-500/30 bg-blue-500/20 text-blue-300"
                : "border border-white/[0.08] bg-white/[0.04] text-zinc-500 hover:text-zinc-300"
            )}
          >
            {inst.label}
          </button>
        ))}
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
              placeholder={instrument === "forex" ? "e.g. 1.0850" : instrument === "gold" ? "e.g. 3250" : "e.g. 100000"}
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
              placeholder={instrument === "forex" ? "e.g. 1.0800" : instrument === "gold" ? "e.g. 3235" : "e.g. 98000"}
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
            <div className="text-[9px] text-zinc-600 mt-0.5">
              {INSTRUMENTS.find(i => i.id === instrument)?.note}
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-[10px] text-zinc-600">Risk amount</div>
            <div className="text-sm font-mono font-semibold text-zinc-300">${riskAmount.toFixed(0)}</div>
            <div className="text-[10px] text-zinc-600">SL distance</div>
            <div className="text-xs font-mono text-zinc-400">{slDisplay}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
