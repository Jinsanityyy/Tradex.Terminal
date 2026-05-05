"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, Zap, Settings2, Filter, CheckCircle2, Clock, XCircle, Calculator } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import type { KeyLevel } from "@/app/api/market/keylevels/route";
import type { AssetAIAnalysis } from "@/types";

// ── Calculation config — SINGLE SOURCE OF TRUTH ──────────────────────────────
//
// DIRECT_DOLLAR_ASSETS: dollar = |entry - price|, exactly, no scaling.
//   XAUUSD: Entry 4713, SL 4882 → distance 169 → display -$169
//
// Pip assets (forex): dollar = pips × (lotSize/0.01) × pipVal01

// DIRECT_DOLLAR_ASSETS: dollar value = raw price distance (no pip scaling).
// Gold: $4676 move 169pts → -$169  |  BTC: $67,000 move $800 → -$800
const DIRECT_DOLLAR_ASSETS = new Set(["XAUUSD", "BTCUSD"]);

const PIP_CONFIG: Record<string, { multiplier: number; pipVal01: number; maxPips: number }> = {
  EURUSD: { multiplier: 10000, pipVal01: 0.10, maxPips: 500   },
  GBPUSD: { multiplier: 10000, pipVal01: 0.10, maxPips: 500   },
  USDJPY: { multiplier: 100,   pipVal01: 0.10, maxPips: 500   },
  USDCAD: { multiplier: 10000, pipVal01: 0.10, maxPips: 500   },
  BTCUSD: { multiplier: 1,     pipVal01: 1.00, maxPips: 10000 },
};

const MAX_SL_DISTANCE: Record<string, number> = {
  XAUUSD: 150,   // >$150 SL per oz is unrealistic for intraday gold
  BTCUSD: 5000,  // >$5000 SL per BTC is unrealistic for intraday
};

// ── Single dollar calculation — use everywhere, no exceptions ─────────────────
// Returns the dollar value for the move from entry to price.
// XAUUSD: dollar = Math.round(|entry - price|)  (1:1, ignores lotSize)
// Forex:  dollar = pips × (lotSize/0.01) × pipVal01
function levelDollar(entry: number, price: number, lotSize: number, asset: string): number {
  if (DIRECT_DOLLAR_ASSETS.has(asset)) {
    return Math.round(Math.abs(entry - price));
  }
  const cfg = PIP_CONFIG[asset] ?? { multiplier: 100, pipVal01: 0.10, maxPips: 500 };
  const pips = Math.round(Math.abs(entry - price) * cfg.multiplier);
  return parseFloat((pips * (lotSize / 0.01) * cfg.pipVal01).toFixed(2));
}

// Pip count — only used for forex display labels
function calcPips(a: number, b: number, asset: string): number {
  const cfg = PIP_CONFIG[asset] ?? { multiplier: 100, pipVal01: 0.10, maxPips: 500 };
  return Math.round(Math.abs(a - b) * cfg.multiplier);
}

// Unrealistic SL check
function isUnrealistic(entry: number, sl: number, asset: string): boolean {
  const distance = Math.abs(entry - sl);
  const maxDist = MAX_SL_DISTANCE[asset];
  if (maxDist !== undefined) return distance > maxDist;
  const cfg = PIP_CONFIG[asset] ?? { multiplier: 100, pipVal01: 0.10, maxPips: 500 };
  return Math.round(distance * cfg.multiplier) > cfg.maxPips;
}

// Format dollar value — XAUUSD uses whole numbers, forex uses 2 decimals
function fmtDollar(n: number, sign: "+" | "-", asset: string): string {
  const s = DIRECT_DOLLAR_ASSETS.has(asset) ? Math.round(n).toString() : n.toFixed(2);
  return sign === "+" ? `+$${s}` : `-$${s}`;
}

function fmt(price: number, asset: string): string {
  if (asset === "BTCUSD") return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (asset === "XAUUSD") return price.toFixed(2);
  if (asset.includes("JPY")) return price.toFixed(2);
  return price.toFixed(4);
}

// (fmtDollar is defined above in the calc section)

function setupLabel(q: string): { label: string; color: string; glow: boolean } {
  if (q === "A+") return { label: "A+",       color: "#00C896", glow: true  };
  if (q === "A")  return { label: "A",        color: "#00C896", glow: false };
  if (q === "B")  return { label: "B",        color: "#8B949E", glow: false };
  return                 { label: "NO TRADE", color: "#FF4D4F", glow: false };
}

function rrQuality(rr: number): { label: string; color: string } {
  if (rr >= 3.0) return { label: "STRONG",   color: "#00C896" };
  if (rr >= 2.5) return { label: "GOOD",     color: "#00C896" };
  if (rr >= 2.0) return { label: "FAIR",     color: "#8B949E" };
  if (rr >= 1.5) return { label: "MARGINAL", color: "#8B949E" };
  return               { label: "POOR",      color: "#FF4D4F" };
}

type AlignType = "continuation" | "counter-trend" | "reversal" | "ranging";

function alignmentConfig(type: AlignType): {
  label: string; shortLabel: string; color: string; bg: string; border: string; icon: string;
} {
  switch (type) {
    case "continuation":
      return { label: "Trend Continuation", shortLabel: "Continuation", color: "#00C896", bg: "#00C89610", border: "#00C89630", icon: "↑↑" };
    case "counter-trend":
      return { label: "Counter-Trend Pullback", shortLabel: "Counter-Trend", color: "#F59E0B", bg: "#F59E0B10", border: "#F59E0B30", icon: "⇅" };
    case "reversal":
      return { label: "Potential Reversal", shortLabel: "Reversal?", color: "#FF6B35", bg: "#FF6B3510", border: "#FF6B3530", icon: "⟳" };
    case "ranging":
    default:
      return { label: "Ranging / No Bias", shortLabel: "Ranging", color: "#8B949E", bg: "transparent", border: "var(--t-border-sub)", icon: "—" };
  }
}

import type { TradeStatus } from "@/app/api/market/keylevels/route";

function tradeStatusConfig(status: TradeStatus): {
  label: string; color: string; bg: string; border: string;
  glow: string; icon: typeof CheckCircle2;
} {
  switch (status) {
    case "TRADE READY":
      return {
        label: "TRADE READY", color: "#00C896", bg: "#00C89612", border: "#00C89635",
        glow: "0 0 20px rgba(0,200,150,0.10)", icon: CheckCircle2,
      };
    case "WATCHLIST":
      return {
        label: "WATCHLIST", color: "#F59E0B", bg: "#F59E0B10", border: "#F59E0B30",
        glow: "0 0 16px rgba(245,158,11,0.06)", icon: Clock,
      };
    case "NO TRADE":
    default:
      return {
        label: "NO TRADE", color: "#8B949E", bg: "transparent", border: "var(--t-border-sub)",
        glow: "none", icon: XCircle,
      };
  }
}

// ── Gradient R:R Line ─────────────────────────────────────────────────────────

function RRLine({ entry, sl, tp1, tp2, asset, lotSize }: {
  entry: number; sl: number; tp1: number | null; tp2: number | null; asset: string; lotSize: number;
}) {
  if (tp1 == null) return null; // no liquidity target identified — skip R:R line
  const isDirect  = DIRECT_DOLLAR_ASSETS.has(asset);
  const slDollar  = levelDollar(entry, sl,  lotSize, asset);
  const tp1Dollar = levelDollar(entry, tp1, lotSize, asset);
  const tp2Dollar = tp2 != null ? levelDollar(entry, tp2, lotSize, asset) : tp1Dollar * 1.5;

  const total = slDollar + tp2Dollar;
  if (total === 0) return null;

  const slPct    = (slDollar  / total) * 100;
  const entryPct = slPct;
  const tp1Pct   = ((tp1Dollar / total) * 100) + entryPct;

  // Pip labels only shown for forex assets
  const slPips  = !isDirect ? calcPips(entry, sl,  asset) : 0;
  const tp1Pips = !isDirect ? calcPips(entry, tp1, asset) : 0;
  const tp2Pips = !isDirect && tp2 != null ? calcPips(entry, tp2, asset) : 0;

  return (
    <div className="relative mt-4">
      <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "var(--t-muted)" }}>Risk / Reward</p>

      {/* Gradient bar */}
      <div
        className="h-[3px] w-full rounded-full"
        style={{
          background: `linear-gradient(to right,
            #FF4D4F 0%, #FF4D4F ${slPct.toFixed(1)}%,
            var(--t-card-2) ${slPct.toFixed(1)}%, var(--t-card-2) ${entryPct.toFixed(1)}%,
            #00C896 ${entryPct.toFixed(1)}%, #00C89650 100%)`,
        }}
      />

      {/* Entry marker */}
      <div
        className="absolute top-0 -translate-y-[2px] w-[2px] h-[7px] bg-white rounded-full"
        style={{ left: `${entryPct.toFixed(1)}%` }}
      />

      {/* TP1 tick */}
      <div
        className="absolute top-0 -translate-y-[1px] w-[2px] h-[5px] rounded-full"
        style={{ left: `${Math.min(tp1Pct, 97).toFixed(1)}%`, background: "#00C896" }}
      />

      {/* Labels — dollar only for XAUUSD, pips + dollar for forex */}
      <div className="flex justify-between mt-2">
        <div className="text-left">
          <p className="text-[9px] font-mono" style={{ color: "#FF4D4F" }}>SL</p>
          {!isDirect && (
            <p className="text-[9px] font-mono font-semibold" style={{ color: "#FF4D4F" }}>-{slPips}p</p>
          )}
          <p className="text-[9px] font-mono font-semibold" style={{ color: "#FF4D4F80" }}>
            {fmtDollar(slDollar, "-", asset)}
          </p>
        </div>
        <div className="text-center hidden xs:block sm:block">
          <p className="text-[9px] font-mono" style={{ color: "var(--t-muted)" }}>ENTRY</p>
          <p className="text-[9px] font-mono" style={{ color: "var(--t-muted)" }}>{fmt(entry, asset)}</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-mono" style={{ color: "#00C896" }}>TP1</p>
          {!isDirect && (
            <p className="text-[9px] font-mono font-semibold" style={{ color: "#00C896" }}>+{tp1Pips}p</p>
          )}
          <p className="text-[9px] font-mono font-semibold" style={{ color: "#00C89680" }}>
            {fmtDollar(tp1Dollar, "+", asset)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-mono" style={{ color: "#00C89680" }}>{tp2 != null ? "TP2" : "~TP2"}</p>
          {!isDirect && tp2 != null && (
            <p className="text-[9px] font-mono font-semibold" style={{ color: "#00C89680" }}>+{tp2Pips}p</p>
          )}
          <p className="text-[9px] font-mono font-semibold" style={{ color: "#00C89650" }}>
            {tp2 != null ? fmtDollar(tp2Dollar, "+", asset) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Price position bar ────────────────────────────────────────────────────────

function RangeDot({ price, support, resistance, pivot, asset }: {
  price: number; support: number; resistance: number; pivot: number; asset: string;
}) {
  const range = resistance - support;
  if (range <= 0) return null;
  const pos      = Math.max(2, Math.min(98, ((price - support) / range) * 100));
  const pivotPos = Math.max(2, Math.min(98, ((pivot - support) / range) * 100));
  const zone     = pos < 33 ? "NEAR SUPPORT" : pos > 67 ? "NEAR RESISTANCE" : "MID RANGE";
  const zoneCol  = pos < 33 ? "#00C896" : pos > 67 ? "#FF4D4F" : "var(--t-muted)";

  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>Price in Range</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: zoneCol }}>{zone}</span>
      </div>
      <div className="relative h-[3px] w-full rounded-full" style={{ background: "var(--t-card-2)" }}>
        <div className="absolute inset-0 rounded-full"
          style={{ background: "linear-gradient(to right, #00C89630, #8B949E20, #FF4D4F30)" }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-[2px] h-2"
          style={{ left: `${pivotPos}%`, background: "#8B949E50" }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border"
          style={{ left: `calc(${pos}% - 5px)`, background: "#fff", borderColor: "var(--t-bg)" }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-mono" style={{ color: "#00C896" }}>S {fmt(support, asset)}</span>
        <span className="text-[9px] font-mono" style={{ color: "var(--t-muted)" }}>P {fmt(pivot, asset)}</span>
        <span className="text-[9px] font-mono" style={{ color: "#FF4D4F" }}>R {fmt(resistance, asset)}</span>
      </div>
    </div>
  );
}

// ── Single level line (SL / TP) ───────────────────────────────────────────────

function LevelLine({ label, price, entry, asset, lotSize, direction }: {
  label: string; price: number; entry: number; asset: string; lotSize: number;
  direction: "risk" | "reward" | "reward2";
}) {
  const isRisk    = direction === "risk";
  const color     = isRisk ? "#FF4D4F" : direction === "reward" ? "#00C896" : "#00C89670";
  const sign      = isRisk ? "-" as const : "+" as const;
  const isDirect  = DIRECT_DOLLAR_ASSETS.has(asset);

  // Single dollar value — the only number shown on the right
  const dollar    = levelDollar(entry, price, lotSize, asset);
  const dollarStr = fmtDollar(dollar, sign, asset);

  // Pip count — only for forex, shown as secondary label
  const pipsLabel = !isDirect ? `${sign}${calcPips(entry, price, asset)} pips` : null;

  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--t-border-sub)" }}>
      <span className="text-[10px] font-semibold uppercase tracking-wider w-8" style={{ color }}>
        {label}
      </span>
      <span className="text-[13px] font-mono font-bold flex-1 text-center" style={{ color: isRisk ? "#FF4D4F" : "var(--t-text)" }}>
        {fmt(price, asset)}
      </span>
      <div className="text-right">
        {pipsLabel && (
          <span className="text-[10px] font-mono font-semibold" style={{ color }}>
            {pipsLabel}
          </span>
        )}
        <span className={`text-[10px] font-mono font-semibold${pipsLabel ? " ml-2" : ""}`} style={{ color: pipsLabel ? `${color}90` : color }}>
          {dollarStr}
        </span>
      </div>
    </div>
  );
}

// ── Single asset row ──────────────────────────────────────────────────────────

function AssetRow({ level, defaultOpen, lotSize, aiAnalysis }: {
  level: KeyLevel; defaultOpen: boolean; lotSize: number; aiAnalysis?: AssetAIAnalysis;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const isBull = level.bias === "bullish";
  const isBear = level.bias === "bearish";

  const sq         = setupLabel(level.setupQuality);
  const rr         = rrQuality(level.rrRatio ?? 0);
  const ltfColor   = isBull ? "#00C896" : isBear ? "#FF4D4F" : "#8B949E";
  const htfColor   = level.htfBias === "bullish" ? "#00C896" : level.htfBias === "bearish" ? "#FF4D4F" : "#8B949E";
  const align      = alignmentConfig(level.alignment?.type ?? "ranging");
  const tsc        = tradeStatusConfig(level.tradeStatus ?? "NO TRADE");
  const StatusIcon = tsc.icon;
  const isCounterTrend = level.alignment?.type === "counter-trend";
  const isReversal     = level.alignment?.type === "reversal";
  const isTradeReady   = level.tradeStatus === "TRADE READY";
  const isWatchlist    = level.tradeStatus === "WATCHLIST";

  // SL unrealistic check uses raw distance
  const unrealistic   = isUnrealistic(level.entry, level.stopLoss, level.asset);
  const isNT          = (level.tradeStatus === "NO TRADE") || unrealistic;
  const dimmed        = level.tradeStatus === "NO TRADE" && !unrealistic;

  const slDist        = Math.round(Math.abs(level.entry - level.stopLoss));
  const slBannerLabel = `SL distance $${slDist} — too large for current structure. Wait for tighter setup.`;

  // TP3 dollar via same levelDollar function
  const tp3Dollar = level.takeProfit3
    ? levelDollar(level.entry, level.takeProfit3, lotSize, level.asset)
    : 0;
  const tp3Str    = tp3Dollar > 0 ? fmtDollar(tp3Dollar, "+", level.asset) : "";

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: "var(--t-card)",
        border: `1px solid ${tsc.border}`,
        boxShadow: tsc.glow,
        opacity: dimmed ? 0.50 : 1,
      }}
    >
      {/* ── TOP STRIP ──────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-white/[0.015] transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
          {/* Trade Status — leading badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0"
            style={{ background: tsc.bg, border: `1px solid ${tsc.border}` }}>
            <StatusIcon className="h-3 w-3 shrink-0" style={{ color: tsc.color }} />
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: tsc.color }}>
              {tsc.label}
            </span>
          </div>

          {/* Asset name */}
          <span className="text-[13px] font-bold tracking-wide" style={{ color: "var(--t-text)" }}>
            {level.asset}
          </span>

          {/* HTF → LTF direction pair */}
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ color: htfColor, background: `${htfColor}12`, border: `1px solid ${htfColor}25` }}>
              HTF {level.htfBias}
            </span>
            <span className="text-[9px]" style={{ color: "var(--t-muted)" }}>→</span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ color: ltfColor, background: `${ltfColor}12`, border: `1px solid ${ltfColor}25` }}>
              LTF {level.bias}
            </span>
          </div>

          {/* Alignment badge — hidden on mobile */}
          <span className="hidden md:inline text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ color: align.color, background: align.bg, border: `1px solid ${align.border}` }}>
            {align.icon} {align.shortLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="text-[12px] font-mono font-semibold" style={{ color: "var(--t-text)" }}>
            {fmt(level.price, level.asset)}
          </span>
          <span className="text-[10px] font-mono font-bold hidden sm:block" style={{ color: rr.color }}>
            1:{level.rrRatio} <span style={{ color: "var(--t-muted)", fontWeight: 400 }}>R:R</span>
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider hidden lg:block" style={{ color: sq.color }}>
            {unrealistic ? "UNREALISTIC" : sq.label}
          </span>
          {open
            ? <ChevronUp className="h-3.5 w-3.5" style={{ color: "var(--t-muted)" }} />
            : <ChevronDown className="h-3.5 w-3.5" style={{ color: "var(--t-muted)" }} />
          }
        </div>
      </button>

      {/* ── EXPANDED ───────────────────────────────────────────── */}
      {open && (
        <div className="px-3 sm:px-4 pb-4 pt-1 space-y-3 sm:space-y-4" style={{ borderTop: "1px solid var(--t-border-sub)" }}>

          {/* ── TRADE STATUS REASON ──────────────────────────────── */}
          {level.tradeStatusReason && (
            <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
              style={{ background: tsc.bg, border: `1px solid ${tsc.border}` }}>
              <StatusIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: tsc.color }} />
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                {level.tradeStatusReason}
              </p>
            </div>
          )}

          {/* ── ALIGNMENT CONTEXT PANEL ─────────────────────────── */}
          {level.alignment && level.alignment.type !== "ranging" && (
            <div className="rounded-lg px-3 py-2.5"
              style={{ background: `${align.color}08`, border: `1px solid ${align.color}20` }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: align.color }}>
                  {align.icon} {align.label}
                </span>
                {isCounterTrend && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "#FF4D4F15", color: "#FF4D4F", border: "1px solid #FF4D4F30" }}>
                    HIGHER RISK
                  </span>
                )}
                {isReversal && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "#FF6B3515", color: "#FF6B35", border: "1px solid #FF6B3530" }}>
                    ELEVATED RISK
                  </span>
                )}
              </div>

              {/* 4-field summary: HTF Bias | LTF Setup | Phase | State */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <div className="rounded-lg px-2.5 py-2" style={{ background: "var(--t-bg)", border: `1px solid ${htfColor}25` }}>
                  <span className="text-[8px] uppercase tracking-widest block mb-0.5" style={{ color: "var(--t-muted)" }}>HTF Bias</span>
                  <span className="text-[11px] font-bold uppercase" style={{ color: htfColor }}>{level.htfBias}</span>
                  {level.htfConfidence != null && (
                    <span className="text-[8px] font-mono ml-1.5" style={{ color: `${htfColor}80` }}>{level.htfConfidence}%</span>
                  )}
                  <span className="text-[8px] block mt-0.5" style={{ color: "var(--t-muted)" }}>conviction</span>
                </div>
                <div className="rounded-lg px-2.5 py-2" style={{ background: "var(--t-bg)", border: `1px solid ${ltfColor}25` }}>
                  <span className="text-[8px] uppercase tracking-widest block mb-0.5" style={{ color: "var(--t-muted)" }}>LTF Setup</span>
                  <span className="text-[11px] font-bold uppercase" style={{ color: ltfColor }}>{level.bias}</span>
                  <span className="text-[8px] block mt-0.5" style={{ color: "var(--t-muted)" }}>structure</span>
                </div>
                <div className="rounded-lg px-2.5 py-2" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border-sub)" }}>
                  <span className="text-[8px] uppercase tracking-widest block mb-0.5" style={{ color: "var(--t-muted)" }}>Phase</span>
                  <span className="text-[10px] font-bold uppercase" style={{ color: align.color }}>{level.alignment.phase}</span>
                  <span className="text-[8px] block mt-0.5" style={{ color: "var(--t-muted)" }}>market cycle</span>
                </div>
                <div className="rounded-lg px-2.5 py-2" style={{ background: tsc.bg, border: `1px solid ${tsc.border}` }}>
                  <span className="text-[8px] uppercase tracking-widest block mb-0.5" style={{ color: "var(--t-muted)" }}>State</span>
                  <span className="text-[10px] font-bold uppercase" style={{ color: tsc.color }}>
                    {level.tradeStatus === "TRADE READY" ? "Ready" :
                     level.tradeStatus === "WATCHLIST"   ? "Watch" : "No Trade"}
                  </span>
                  <span className="text-[8px] block mt-0.5" style={{ color: "var(--t-muted)" }}>signal</span>
                </div>
              </div>

              <p className="text-[10px] leading-relaxed italic" style={{ color: "var(--t-muted)" }}>
                {level.alignment.explanation}
              </p>

              {isCounterTrend && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: "#F59E0B10", color: "#F59E0B", border: "1px solid #F59E0B20" }}>
                    Reduce size to 0.5×
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: "#F59E0B10", color: "#F59E0B", border: "1px solid #F59E0B20" }}>
                    Tighter stop loss
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: "#F59E0B10", color: "#F59E0B", border: "1px solid #F59E0B20" }}>
                    Target TP1 only
                  </span>
                </div>
              )}
            </div>
          )}

          {/* NO TRADE / Unrealistic banner */}
          {isNT && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "#FF4D4F10", border: "1px solid #FF4D4F20" }}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: "#FF4D4F" }} />
              <p className="text-[11px]" style={{ color: "#FF4D4F" }}>
                {unrealistic
                  ? slBannerLabel
                  : level.note}
              </p>
            </div>
          )}

          {!isNT && (
            <>
              {/* ── LTF SETUP: Entry price ────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>LTF Setup</p>
                  {isWatchlist && (
                    <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{ background: "#F59E0B12", color: "#F59E0B", border: "1px solid #F59E0B30" }}>
                      PROJECTED LEVELS
                    </span>
                  )}
                </div>

                {/* Entry row */}
                <div className="py-2 mb-1" style={{ borderBottom: "1px solid var(--t-border-sub)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider w-8" style={{ color: "var(--t-muted)" }}>
                      ENTRY
                    </span>
                    <span className="text-[15px] font-mono font-bold flex-1 text-center" style={{ color: "var(--t-text)" }}>
                      {fmt(level.entry, level.asset)}
                    </span>
                    <span className="text-[10px] font-mono text-right" style={{ color: "var(--t-muted)" }}>
                      at {level.marketStructure?.premiumDiscount ?? "—"}
                    </span>
                  </div>
                  {level.entryZoneLabel && (
                    <p className="text-[9px] mt-1 pl-10 leading-relaxed" style={{ color: "var(--t-muted)", opacity: 0.7 }}>
                      {level.entryZoneLabel}
                    </p>
                  )}
                </div>

                {/* SL with zone label */}
                <div>
                  <LevelLine label="SL" price={level.stopLoss} entry={level.entry} asset={level.asset} lotSize={lotSize} direction="risk" />
                  {level.slZoneLabel && (
                    <p className="text-[9px] pb-1.5 pl-10 leading-relaxed" style={{ color: "#FF4D4F", opacity: 0.55 }}>
                      {level.slZoneLabel}
                    </p>
                  )}
                </div>

                {/* TP1 with zone label — null = no liquidity target identified */}
                <div>
                  {level.takeProfit1 != null
                    ? <LevelLine label="TP1" price={level.takeProfit1} entry={level.entry} asset={level.asset} lotSize={lotSize} direction="reward" />
                    : (
                      <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--t-border-sub)" }}>
                        <span className="text-[10px] font-semibold uppercase tracking-wider w-8" style={{ color: "#00C89660" }}>TP1</span>
                        <span className="text-[11px] flex-1 text-center italic" style={{ color: "var(--t-muted)" }}>
                          No liquidity target identified
                        </span>
                      </div>
                    )
                  }
                  {level.tp1ZoneLabel && level.takeProfit1 != null && (
                    <p className="text-[9px] pb-1.5 pl-10 leading-relaxed" style={{ color: "#00C896", opacity: 0.55 }}>
                      {level.tp1ZoneLabel}
                    </p>
                  )}
                </div>

                {/* TP2 with zone label */}
                <div>
                  {level.takeProfit2 != null
                    ? <LevelLine label="TP2" price={level.takeProfit2} entry={level.entry} asset={level.asset} lotSize={lotSize} direction="reward2" />
                    : (
                      <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--t-border-sub)" }}>
                        <span className="text-[10px] font-semibold uppercase tracking-wider w-8" style={{ color: "#00C89640" }}>TP2</span>
                        <span className="text-[11px] flex-1 text-center italic" style={{ color: "var(--t-muted)", opacity: 0.5 }}>
                          —
                        </span>
                      </div>
                    )
                  }
                  {level.tp2ZoneLabel && level.takeProfit2 != null && (
                    <p className="text-[9px] pb-0.5 pl-10 leading-relaxed" style={{ color: "#00C89670", opacity: 0.55 }}>
                      {level.tp2ZoneLabel}
                    </p>
                  )}
                </div>

                {level.takeProfit3 != null && tp3Dollar > 0 && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider w-8" style={{ color: "#00C89650" }}>TP3</span>
                    <span className="text-[13px] font-mono font-bold flex-1 text-center" style={{ color: "var(--t-text)", opacity: 0.5 }}>
                      {fmt(level.takeProfit3, level.asset)}
                    </span>
                    <span className="text-[10px] font-mono font-semibold" style={{ color: "#00C89650" }}>
                      {tp3Str}
                    </span>
                  </div>
                )}
              </div>

              {/* ── R:R GRADIENT LINE ─────────────────────────────── */}
              <RRLine
                entry={level.entry}
                sl={level.stopLoss}
                tp1={level.takeProfit1}
                tp2={level.takeProfit2}
                asset={level.asset}
                lotSize={lotSize}
              />
            </>
          )}

          {/* ── KEY LEVELS INLINE ─────────────────────────────────── */}
          <div className="flex items-center gap-5 py-2 px-3 rounded-lg flex-wrap"
            style={{ background: "var(--t-bg)", border: "1px solid var(--t-border-sub)" }}>
            <div>
              <span className="text-[8px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>S</span>
              <span className="text-[11px] font-mono font-semibold ml-1.5" style={{ color: "#00C896" }}>
                {fmt(level.support, level.asset)}
              </span>
            </div>
            <div style={{ width: 1, height: 12, background: "var(--t-border-sub)" }} />
            <div>
              <span className="text-[8px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>P</span>
              <span className="text-[11px] font-mono font-semibold ml-1.5" style={{ color: "var(--t-muted)" }}>
                {fmt(level.pivot, level.asset)}
              </span>
            </div>
            <div style={{ width: 1, height: 12, background: "var(--t-border-sub)" }} />
            <div>
              <span className="text-[8px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>R</span>
              <span className="text-[11px] font-mono font-semibold ml-1.5" style={{ color: "#FF4D4F" }}>
                {fmt(level.resistance, level.asset)}
              </span>
            </div>
            {level.fvg && !level.fvg.filled && (
              <>
                <div style={{ width: 1, height: 12, background: "var(--t-border-sub)" }} />
                <div>
                  <span className="text-[8px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>FVG</span>
                  <span className="text-[11px] font-mono font-semibold ml-1.5"
                    style={{ color: level.fvg.direction === "bullish" ? "#00C896" : "#FF4D4F" }}>
                    {fmt(level.fvg.midpoint, level.asset)}
                  </span>
                </div>
              </>
            )}
            {level.marketStructure?.premiumDiscount !== "equilibrium" && (
              <>
                <div style={{ width: 1, height: 12, background: "var(--t-border-sub)" }} />
                <span className="text-[8px] font-semibold uppercase tracking-wider"
                  style={{ color: level.marketStructure.premiumDiscount === "discount" ? "#00C896" : "#FF4D4F" }}>
                  {level.marketStructure.premiumDiscount}
                </span>
              </>
            )}
          </div>

          {/* ── PRICE POSITION BAR ──────────────────────────────── */}
          <RangeDot
            price={level.price}
            support={level.support}
            resistance={level.resistance}
            pivot={level.pivot}
            asset={level.asset}
          />

          {/* ── CONFLUENCES ──────────────────────────────────────── */}
          {level.confluences && level.confluences.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "var(--t-muted)" }}>
                Confluences <span style={{ color: ltfColor }}>({level.confluenceCount})</span>
              </p>
              <div className="space-y-1">
                {level.confluences.slice(0, 4).map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: ltfColor }} />
                    <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AI NARRATIVE ─────────────────────────────────────── */}
          {aiAnalysis && (
            <div className="rounded-lg px-3 py-3 space-y-2"
              style={{ background: "var(--t-card)", border: "1px solid var(--t-border-sub)" }}>
              <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>
                AI Analysis
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-muted)" }}>
                {aiAnalysis.narrative}
              </p>
              {aiAnalysis.setupNarrative && (
                <p className="text-[10px] leading-relaxed italic border-t pt-2"
                  style={{ color: "#F59E0B", opacity: 0.85, borderColor: "var(--t-border-sub)" }}>
                  {aiAnalysis.setupNarrative}
                </p>
              )}
              <div className="grid grid-cols-1 gap-1 border-t pt-2" style={{ borderColor: "var(--t-border-sub)" }}>
                <div className="flex items-start gap-1.5">
                  <span className="text-[8px] uppercase tracking-wider shrink-0 pt-0.5" style={{ color: "#F59E0B" }}>Wait</span>
                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{aiAnalysis.waitFor}</p>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-[8px] uppercase tracking-wider shrink-0 pt-0.5" style={{ color: "#00C896" }}>Confirms</span>
                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{aiAnalysis.confirms}</p>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-[8px] uppercase tracking-wider shrink-0 pt-0.5" style={{ color: "#FF4D4F" }}>Invalidates</span>
                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-muted)" }}>{aiAnalysis.invalidates}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── SESSION + SETUP ───────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg px-3 py-2" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border-sub)" }}>
              <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "var(--t-muted)" }}>Session</p>
              <p className="text-[10px] font-semibold" style={{ color: "var(--t-text)" }}>{level.sessionContext}</p>
            </div>
            <div className="rounded-lg px-3 py-2" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border-sub)" }}>
              <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "var(--t-muted)" }}>Setup Quality</p>
              <p className="text-[10px] font-bold" style={{ color: sq.color }}>
                {unrealistic ? "UNREALISTIC SL" : sq.label}
              </p>
            </div>
          </div>

          {/* ── CONTEXT MESSAGE ──────────────────────────────────── */}
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-[10px] shrink-0" style={{ color: "var(--t-muted)" }}>⚠</span>
            <p className="text-[10px] italic leading-relaxed" style={{ color: "var(--t-muted)" }}>
              {level.sessionNote || level.note}
            </p>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface KeyLevelsCardProps {
  levels: KeyLevel[];
  compact?: boolean;
  aiAnalysisMap?: Record<string, AssetAIAnalysis>;
}

export function KeyLevelsCard({ levels, compact = false, aiAnalysisMap = {} }: KeyLevelsCardProps) {
  const { settings } = useSettings();
  const [lotSize, setLotSize] = useState(0.01);
  const [showLotInput, setShowLotInput] = useState(false);
  const [strictMode, setStrictMode] = useState(false);
  const [calcMode, setCalcMode] = useState<"preset" | "account">("preset");
  const [calcBalance, setCalcBalance] = useState(() => settings.accountBalance ?? 10000);
  const [calcRisk, setCalcRisk] = useState(() => settings.riskPerTrade ?? 1);
  const [calcSlPts, setCalcSlPts] = useState<number>(20);

  if (levels.length === 0) return null;

  const allLevels = levels.slice(0, compact ? 4 : 8);
  // Strict mode: only show TRADE READY and WATCHLIST (hide NO TRADE)
  const display = strictMode
    ? allLevels.filter(l => l.tradeStatus === "TRADE READY")
    : allLevels;

  const readyCount    = allLevels.filter(l => l.tradeStatus === "TRADE READY").length;
  const watchCount    = allLevels.filter(l => l.tradeStatus === "WATCHLIST").length;
  const counterCount  = allLevels.filter(l => l.alignment?.type === "counter-trend").length;

  const LOT_PRESETS = [0.01, 0.05, 0.10, 0.25, 0.50, 1.00];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--t-bg)", border: "1px solid var(--t-border-sub)" }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-3" style={{ borderBottom: "1px solid var(--t-border-sub)" }}>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 shrink-0" style={{ color: "#00C896" }} />
          <span className="text-[13px] font-bold tracking-wide" style={{ color: "var(--t-text)" }}>Key Levels</span>
          <span className="text-[10px] hidden sm:inline" style={{ color: "var(--t-muted)" }}>HTF Bias · LTF Setup · Entry · SL · TP</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status summary pills */}
          {readyCount > 0 && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded"
              style={{ background: "#00C89612", border: "1px solid #00C89630" }}>
              <CheckCircle2 className="h-2.5 w-2.5" style={{ color: "#00C896" }} />
              <span className="text-[9px] font-bold" style={{ color: "#00C896" }}>{readyCount}</span>
            </div>
          )}
          {watchCount > 0 && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded"
              style={{ background: "#F59E0B10", border: "1px solid #F59E0B30" }}>
              <Clock className="h-2.5 w-2.5" style={{ color: "#F59E0B" }} />
              <span className="text-[9px] font-bold" style={{ color: "#F59E0B" }}>{watchCount}</span>
            </div>
          )}

          {/* Strict mode — show TRADE READY only */}
          <button
            onClick={() => setStrictMode(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors"
            title={strictMode ? "Showing TRADE READY only" : "Showing all assets"}
            style={{
              border: `1px solid ${strictMode ? "#00C89640" : "var(--t-border-sub)"}`,
              background: strictMode ? "#00C89610" : "transparent",
            }}
          >
            <Filter className="h-3 w-3" style={{ color: strictMode ? "#00C896" : "var(--t-muted)" }} />
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: strictMode ? "#00C896" : "var(--t-muted)" }}>
              {strictMode ? "Ready Only" : "All"}
            </span>
          </button>

          <button
            onClick={() => setShowLotInput(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ border: "1px solid var(--t-border-sub)" }}
          >
            <Settings2 className="h-3 w-3" style={{ color: "var(--t-muted)" }} />
            <span className="text-[10px] font-mono font-semibold" style={{ color: "var(--t-text)" }}>
              {lotSize.toFixed(2)} lot
            </span>
          </button>
        </div>
      </div>

      {/* Strict mode info bar */}
      {strictMode && (
        <div className="px-4 sm:px-5 py-2 flex items-center gap-2" style={{ background: "#00C89608", borderBottom: "1px solid #00C89620" }}>
          <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: "#00C896" }} />
          <p className="text-[10px]" style={{ color: "#00C896" }}>
            Showing {readyCount} TRADE READY asset{readyCount !== 1 ? "s" : ""} only.
            {watchCount > 0 && ` ${watchCount} on WATCHLIST — toggle off to view.`}
          </p>
        </div>
      )}

      {/* ── Lot Size Panel ────────────────────────────────────── */}
      {showLotInput && (() => {
        // Account-based calc: riskAmount / (slPts × pipValuePerLot)
        // Gold/BTC: pipValuePerLot = 1 per point per lot (100 oz × $1 = $100/pt/lot → but standard is $1/pt per 0.01 lot → $100/pt/lot)
        // Forex: $10/pip per 1.0 lot = $0.10/pip per 0.01 lot
        const riskAmt = calcBalance * (calcRisk / 100);
        const pipValPerLot = 100; // Gold: $100/point/lot (1 lot = 100 oz)
        const calcLots = calcSlPts > 0 ? riskAmt / (calcSlPts * pipValPerLot) : 0;
        const calcLotsDisplay = calcLots < 0.001 ? "< 0.001" : calcLots.toFixed(calcLots >= 1 ? 2 : calcLots >= 0.1 ? 3 : 3);

        return (
          <div style={{ borderBottom: "1px solid var(--t-border-sub)", background: "var(--t-card-2)" }}>
            {/* Mode toggle */}
            <div className="flex items-center gap-1 px-3 sm:px-5 pt-3 pb-2">
              {(["preset", "account"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setCalcMode(m)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold transition-all"
                  style={{
                    background: calcMode === m ? "#00C89615" : "transparent",
                    border: `1px solid ${calcMode === m ? "#00C89640" : "var(--t-border-sub)"}`,
                    color: calcMode === m ? "#00C896" : "var(--t-muted)",
                  }}
                >
                  {m === "account" && <Calculator className="h-3 w-3" />}
                  {m === "preset" ? "Preset" : "Account"}
                </button>
              ))}
            </div>

            {calcMode === "preset" ? (
              /* ── Preset mode ── */
              <div className="px-3 sm:px-5 pb-3 flex items-center gap-2 flex-wrap">
                {LOT_PRESETS.map(l => (
                  <button
                    key={l}
                    onClick={() => setLotSize(l)}
                    className="px-2.5 py-1 rounded text-[10px] font-mono font-semibold transition-all"
                    style={{
                      background: lotSize === l ? "#00C89615" : "var(--t-card)",
                      border: `1px solid ${lotSize === l ? "#00C89640" : "var(--t-border-sub)"}`,
                      color: lotSize === l ? "#00C896" : "var(--t-muted)",
                    }}
                  >
                    {l.toFixed(2)}
                  </button>
                ))}
                <input
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.01}
                  value={lotSize}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v > 0) setLotSize(parseFloat(v.toFixed(2)));
                  }}
                  className="w-20 rounded px-2 py-1 text-[10px] font-mono outline-none"
                  style={{ background: "var(--t-card)", border: "1px solid var(--t-border-sub)", color: "var(--t-text)" }}
                />
                <span className="text-[9px]" style={{ color: "var(--t-muted)" }}>
                  Pip value (forex): <span style={{ color: "var(--t-text)" }}>${(lotSize / 0.01 * 0.10).toFixed(2)}/pip</span>
                  <span className="ml-2" style={{ color: "#8B949E60" }}>· Gold: $1/pt</span>
                </span>
              </div>
            ) : (
              /* ── Account-based mode ── */
              <div className="px-3 sm:px-5 pb-3 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Balance */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>Balance</span>
                    <span className="text-[9px]" style={{ color: "var(--t-muted)" }}>$</span>
                    <input
                      type="number"
                      min={100}
                      step={100}
                      value={calcBalance}
                      onChange={e => setCalcBalance(Math.max(100, Number(e.target.value)))}
                      className="w-24 rounded px-2 py-1 text-[10px] font-mono text-right outline-none"
                      style={{ background: "var(--t-card)", border: "1px solid var(--t-border-sub)", color: "var(--t-text)" }}
                    />
                  </div>
                  {/* Risk % */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>Risk</span>
                    {[0.5, 1, 1.5, 2].map(r => (
                      <button
                        key={r}
                        onClick={() => setCalcRisk(r)}
                        className="px-2 py-1 rounded text-[10px] font-mono font-semibold transition-all"
                        style={{
                          background: calcRisk === r ? "#F59E0B15" : "var(--t-card)",
                          border: `1px solid ${calcRisk === r ? "#F59E0B40" : "var(--t-border-sub)"}`,
                          color: calcRisk === r ? "#F59E0B" : "var(--t-muted)",
                        }}
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                  {/* SL distance */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--t-muted)" }}>SL pts</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={calcSlPts}
                      onChange={e => setCalcSlPts(Math.max(1, Number(e.target.value)))}
                      className="w-16 rounded px-2 py-1 text-[10px] font-mono text-right outline-none"
                      style={{ background: "var(--t-card)", border: "1px solid var(--t-border-sub)", color: "var(--t-text)" }}
                    />
                  </div>
                </div>

                {/* Result */}
                <div className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "#00C89610", border: "1px solid #00C89625" }}>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: "#00C89680" }}>Recommended Lot Size</div>
                    <div className="text-xl font-black font-mono" style={{ color: "#00C896" }}>{calcLotsDisplay}</div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="text-[9px]" style={{ color: "var(--t-muted)" }}>Risk amount</div>
                    <div className="text-sm font-mono font-bold" style={{ color: "var(--t-text)" }}>${riskAmt.toFixed(0)}</div>
                    <div className="text-[9px]" style={{ color: "var(--t-muted)" }}>SL distance</div>
                    <div className="text-[10px] font-mono" style={{ color: "var(--t-muted)" }}>{calcSlPts} pts</div>
                  </div>
                  <button
                    onClick={() => { setLotSize(parseFloat(calcLots.toFixed(3))); setCalcMode("preset"); }}
                    className="ml-3 px-3 py-1.5 rounded text-[10px] font-bold transition-all"
                    style={{ background: "#00C896", color: "#000", opacity: calcLots > 0 ? 1 : 0.4 }}
                    disabled={calcLots <= 0}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Asset Rows ───────────────────────────────────────── */}
      <div className="p-3 space-y-2">
        {display.map((level, i) => (
          <AssetRow key={level.asset} level={level} defaultOpen={i === 0} lotSize={lotSize} aiAnalysis={aiAnalysisMap[level.asset]} />
        ))}
      </div>
    </div>
  );
}
