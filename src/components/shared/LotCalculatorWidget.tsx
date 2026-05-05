"use client";

import React, { useState } from "react";
import { Calculator } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface AssetConfig {
  label: string;
  // dollarPerPoint per 1.0 lot (Gold: 100, BTC: 1, Forex: 100000 * pipSize)
  dollarPerPointPerLot: number;
  pointLabel: string;
  defaultSL: number;
  placeholder: string;
}

const ASSETS: Record<string, AssetConfig> = {
  XAUUSD: {
    label: "Gold (XAU/USD)",
    dollarPerPointPerLot: 100,
    pointLabel: "pts ($1/pt)",
    defaultSL: 15,
    placeholder: "e.g. 4700",
  },
  EURUSD: {
    label: "EUR/USD",
    dollarPerPointPerLot: 10,       // $10/pip/lot
    pointLabel: "pips",
    defaultSL: 20,
    placeholder: "e.g. 1.0850",
  },
  GBPUSD: {
    label: "GBP/USD",
    dollarPerPointPerLot: 10,
    pointLabel: "pips",
    defaultSL: 25,
    placeholder: "e.g. 1.2700",
  },
  BTCUSD: {
    label: "Bitcoin (BTC)",
    dollarPerPointPerLot: 1,
    pointLabel: "pts ($1/pt)",
    defaultSL: 500,
    placeholder: "e.g. 65000",
  },
  CUSTOM: {
    label: "Custom",
    dollarPerPointPerLot: 10,
    pointLabel: "units",
    defaultSL: 20,
    placeholder: "any asset",
  },
};

const RISK_PRESETS = [0.5, 1, 1.5, 2, 3];

function fmt(n: number, decimals = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function LotCalculatorWidget() {
  const { settings } = useSettings();

  const [asset, setAsset] = useState<string>("XAUUSD");
  const [balance, setBalance] = useState(() => settings.accountBalance ?? 10000);
  const [riskPct, setRiskPct] = useState(() => settings.riskPerTrade ?? 1);
  const [entry, setEntry] = useState<string>("");
  const [sl, setSl] = useState<string>("");
  const [manualSL, setManualSL] = useState<string>("");

  const cfg = ASSETS[asset];

  // SL distance: prefer entry-sl price difference if both provided, else manual pts
  const entryNum = parseFloat(entry);
  const slNum = parseFloat(sl);
  const manualSlNum = parseFloat(manualSL) || cfg.defaultSL;

  const slPts =
    !isNaN(entryNum) && !isNaN(slNum) && entryNum > 0 && slNum > 0
      ? Math.abs(entryNum - slNum)
      : manualSlNum;

  const riskAmt = balance * (riskPct / 100);
  const rawLots = slPts > 0 ? riskAmt / (slPts * cfg.dollarPerPointPerLot) : 0;

  const lots = rawLots >= 0.01 ? parseFloat(rawLots.toFixed(2)) : parseFloat(rawLots.toFixed(3));
  const lotsDisplay = rawLots <= 0 ? "—" : rawLots < 0.001 ? "< 0.001" : lots.toFixed(lots >= 1 ? 2 : 3);
  const hasResult = rawLots > 0;

  return (
    <div className="p-3 space-y-3 h-full overflow-y-auto">
      {/* Asset selector */}
      <div className="flex flex-wrap gap-1">
        {Object.entries(ASSETS).map(([key, c]) => (
          <button
            key={key}
            onClick={() => setAsset(key)}
            className="px-2.5 py-1 rounded text-[10px] font-semibold transition-all"
            style={{
              background: asset === key ? "#00C89615" : "var(--t-card)",
              border: `1px solid ${asset === key ? "#00C89640" : "var(--t-border-sub)"}`,
              color: asset === key ? "#00C896" : "var(--t-muted)",
            }}
          >
            {key === "CUSTOM" ? "Custom" : key}
          </button>
        ))}
      </div>

      {/* Account + Risk */}
      <div
        className="rounded-xl p-3 space-y-2"
        style={{ background: "var(--t-card)", border: "1px solid var(--t-border-sub)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>
            Balance
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px]" style={{ color: "var(--t-muted)" }}>$</span>
            <input
              type="number"
              min={100}
              step={100}
              value={balance}
              onChange={(e) => setBalance(Math.max(100, Number(e.target.value)))}
              className="w-24 rounded px-2 py-1 text-right text-[10px] font-mono outline-none"
              style={{
                background: "var(--t-bg)",
                border: "1px solid var(--t-border-sub)",
                color: "var(--t-text)",
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>
            Risk %
          </span>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {RISK_PRESETS.map((r) => (
              <button
                key={r}
                onClick={() => setRiskPct(r)}
                className="px-2 py-1 rounded text-[10px] font-mono font-semibold transition-all"
                style={{
                  background: riskPct === r ? "#F59E0B15" : "var(--t-bg)",
                  border: `1px solid ${riskPct === r ? "#F59E0B40" : "var(--t-border-sub)"}`,
                  color: riskPct === r ? "#F59E0B" : "var(--t-muted)",
                }}
              >
                {r}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Entry + SL inputs */}
      <div
        className="rounded-xl p-3 space-y-2"
        style={{ background: "var(--t-card)", border: "1px solid var(--t-border-sub)" }}
      >
        <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--t-muted)" }}>
          Price Inputs (optional — or enter SL distance below)
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[9px] mb-1" style={{ color: "var(--t-muted)" }}>Entry</div>
            <input
              type="number"
              min={0}
              step="any"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder={cfg.placeholder}
              className="w-full rounded px-2 py-1.5 text-[10px] font-mono outline-none"
              style={{
                background: "var(--t-bg)",
                border: "1px solid var(--t-border-sub)",
                color: "var(--t-text)",
              }}
            />
          </div>
          <div>
            <div className="text-[9px] mb-1" style={{ color: "var(--t-muted)" }}>Stop Loss</div>
            <input
              type="number"
              min={0}
              step="any"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              placeholder={cfg.placeholder}
              className="w-full rounded px-2 py-1.5 text-[10px] font-mono outline-none"
              style={{
                background: "var(--t-bg)",
                border: "1px solid var(--t-border-sub)",
                color: "var(--t-text)",
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] whitespace-nowrap" style={{ color: "var(--t-muted)" }}>
            Or SL distance ({cfg.pointLabel}):
          </span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={manualSL}
            onChange={(e) => setManualSL(e.target.value)}
            placeholder={String(cfg.defaultSL)}
            className="w-20 rounded px-2 py-1 text-[10px] font-mono outline-none"
            style={{
              background: "var(--t-bg)",
              border: "1px solid var(--t-border-sub)",
              color: "var(--t-text)",
            }}
          />
          {!isNaN(entryNum) && !isNaN(slNum) && entryNum > 0 && slNum > 0 && (
            <span className="text-[9px]" style={{ color: "#00C896" }}>
              Auto: {slPts.toFixed(slPts > 10 ? 1 : 4)} pts
            </span>
          )}
        </div>
      </div>

      {/* Result */}
      <div
        className="rounded-xl p-4"
        style={{
          background: hasResult ? "#00C89610" : "var(--t-card)",
          border: `1px solid ${hasResult ? "#00C89640" : "var(--t-border-sub)"}`,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="h-3.5 w-3.5" style={{ color: hasResult ? "#00C896" : "var(--t-muted)" }} />
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: hasResult ? "#00C89680" : "var(--t-muted)" }}>
            {cfg.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--t-muted)", opacity: 0.6 }}>
              Lot Size
            </div>
            <div
              className="text-3xl font-black font-mono"
              style={{ color: hasResult ? "#00C896" : "var(--t-muted)" }}
            >
              {lotsDisplay}
            </div>
          </div>
          <div className="space-y-1.5 text-right">
            <div>
              <div className="text-[9px]" style={{ color: "var(--t-muted)", opacity: 0.6 }}>Dollar risk</div>
              <div className="text-sm font-mono font-bold" style={{ color: "var(--t-text)" }}>
                ${fmt(riskAmt)}
              </div>
            </div>
            <div>
              <div className="text-[9px]" style={{ color: "var(--t-muted)", opacity: 0.6 }}>SL distance</div>
              <div className="text-xs font-mono" style={{ color: "var(--t-muted)" }}>
                {slPts > 0 ? `${slPts.toFixed(slPts > 10 ? 1 : 4)} ${cfg.pointLabel}` : "—"}
              </div>
            </div>
            <div>
              <div className="text-[9px]" style={{ color: "var(--t-muted)", opacity: 0.6 }}>Pip value/lot</div>
              <div className="text-xs font-mono" style={{ color: "var(--t-muted)" }}>
                ${cfg.dollarPerPointPerLot}/pt
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
