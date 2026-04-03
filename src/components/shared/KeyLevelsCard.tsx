"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, AlertTriangle, Zap } from "lucide-react";
import type { KeyLevel } from "@/app/api/market/keylevels/route";

// ── Format helpers ────────────────────────────────────────────────────────────

function fmt(price: number, asset: string): string {
  if (asset === "BTCUSD") return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (asset === "XAUUSD") return price.toFixed(0);
  if (asset.includes("JPY")) return price.toFixed(2);
  return price.toFixed(4);
}

function dist(a: number, b: number, asset: string): string {
  const d = Math.abs(a - b);
  if (asset === "BTCUSD") return `$${d.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (asset === "XAUUSD") return `$${d.toFixed(0)}`;
  if (asset.includes("JPY")) return `${d.toFixed(2)}`;
  return `${Math.round(d * 10000)}p`;
}

function setupLabel(q: string): { label: string; color: string; glow: boolean } {
  if (q === "A+") return { label: "A+", color: "#00C896", glow: true };
  if (q === "A")  return { label: "A",  color: "#00C896", glow: false };
  if (q === "B")  return { label: "B",  color: "#8B949E", glow: false };
  return          { label: "NO TRADE", color: "#FF4D4F", glow: false };
}

function rrLabel(rr: number): { label: string; color: string } {
  if (rr >= 3.0) return { label: "STRONG",   color: "#00C896" };
  if (rr >= 2.5) return { label: "GOOD",     color: "#00C896" };
  if (rr >= 2.0) return { label: "FAIR",     color: "#8B949E" };
  if (rr >= 1.5) return { label: "MARGINAL", color: "#8B949E" };
  return               { label: "POOR",      color: "#FF4D4F" };
}

// ── Gradient R:R Bar ──────────────────────────────────────────────────────────

function RRLine({
  entry, sl, tp1, tp2, asset
}: { entry: number; sl: number; tp1: number; tp2: number; asset: string }) {
  const risk    = Math.abs(entry - sl);
  const reward  = Math.abs(tp2 - entry);
  const total   = risk + reward;
  if (total === 0) return null;

  const slPct    = (risk / total) * 100;
  const entryPct = slPct;
  const tp1Pct   = ((Math.abs(tp1 - entry) / total) * 100) + entryPct;

  return (
    <div className="relative mt-3 mb-1">
      {/* Gradient bar */}
      <div
        className="h-[3px] w-full rounded-full"
        style={{
          background: `linear-gradient(to right, #FF4D4F 0%, #FF4D4F ${slPct}%, #1a1f26 ${slPct}%, #1a1f26 ${entryPct}%, #00C896 ${entryPct}%, #00C89640 100%)`,
        }}
      />

      {/* Entry marker */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-[2px] h-3 rounded-full bg-white"
        style={{ left: `${entryPct}%` }}
        title="Entry"
      />

      {/* TP1 tick */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-[2px] h-2 rounded-full"
        style={{ left: `${Math.min(tp1Pct, 98)}%`, background: "#00C896" }}
        title="TP1"
      />

      {/* Labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] font-mono" style={{ color: "#FF4D4F" }}>
          SL {dist(entry, sl, asset)}
        </span>
        <span className="text-[9px] font-mono" style={{ color: "#8B949E" }}>
          ENTRY
        </span>
        <span className="text-[9px] font-mono" style={{ color: "#00C896" }}>
          TP1 {dist(entry, tp1, asset)}
        </span>
        <span className="text-[9px] font-mono" style={{ color: "#00C89680" }}>
          TP2 {dist(entry, tp2, asset)}
        </span>
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
  const pos     = Math.max(2, Math.min(98, ((price - support) / range) * 100));
  const pivotPos = Math.max(2, Math.min(98, ((pivot - support) / range) * 100));
  const zone    = pos < 33 ? "NEAR SUPPORT" : pos > 67 ? "NEAR RESISTANCE" : "MID RANGE";
  const zoneCol = pos < 33 ? "#00C896" : pos > 67 ? "#FF4D4F" : "#8B949E";

  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[9px] uppercase tracking-widest" style={{ color: "#8B949E" }}>Price in Range</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: zoneCol }}>{zone}</span>
      </div>
      <div className="relative h-[3px] w-full rounded-full" style={{ background: "#1a1f26" }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "linear-gradient(to right, #00C89630, #8B949E20, #FF4D4F30)" }}
        />
        {/* Pivot tick */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-[2px] h-2"
          style={{ left: `${pivotPos}%`, background: "#8B949E60" }}
        />
        {/* Price dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border border-[#0B0F14]"
          style={{ left: `calc(${pos}% - 5px)`, background: "#fff" }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-mono" style={{ color: "#00C896" }}>S {fmt(support, asset)}</span>
        <span className="text-[9px] font-mono" style={{ color: "#8B949E" }}>P {fmt(pivot, asset)}</span>
        <span className="text-[9px] font-mono" style={{ color: "#FF4D4F" }}>R {fmt(resistance, asset)}</span>
      </div>
    </div>
  );
}

// ── Single asset row ──────────────────────────────────────────────────────────

function AssetRow({ level, defaultOpen }: { level: KeyLevel; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  const isBull = level.bias === "bullish";
  const isBear = level.bias === "bearish";
  const isNT   = level.setupQuality === "NO TRADE";

  const sq    = setupLabel(level.setupQuality);
  const rr    = rrLabel(level.rrRatio ?? 0);
  const biasColor = isBull ? "#00C896" : isBear ? "#FF4D4F" : "#8B949E";

  // Low quality dims the card
  const dimmed = isNT || level.rrRatio < 2.0;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: "#11161C",
        border: `1px solid ${sq.glow ? "#00C89620" : "#1e2530"}`,
        boxShadow: sq.glow ? "0 0 16px rgba(0,200,150,0.06)" : "none",
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      {/* ── TOP STRIP ──────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.015] transition-colors"
      >
        {/* Left: symbol + bias */}
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold tracking-wide" style={{ color: "#E6EDF3" }}>
            {level.asset}
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
            style={{
              color: biasColor,
              background: `${biasColor}12`,
              border: `1px solid ${biasColor}25`,
            }}
          >
            {level.bias}
          </span>
          {level.marketStructure?.bos && (
            <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ color: biasColor, background: `${biasColor}10`, border: `1px solid ${biasColor}20` }}>
              BOS
            </span>
          )}
        </div>

        {/* Right: price + R:R + quality */}
        <div className="flex items-center gap-4">
          <span className="text-[12px] font-mono font-semibold" style={{ color: "#E6EDF3" }}>
            {level.asset.includes("BTC") ? "$" : ""}{fmt(level.price, level.asset)}
          </span>
          <span className="text-[10px] font-mono font-bold hidden sm:block" style={{ color: rr.color }}>
            1:{level.rrRatio} <span style={{ color: "#8B949E", fontWeight: 400 }}>R:R</span>
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider hidden md:block"
            style={{ color: sq.color }}
          >
            {sq.label}
          </span>
          {open
            ? <ChevronUp className="h-3.5 w-3.5" style={{ color: "#8B949E" }} />
            : <ChevronDown className="h-3.5 w-3.5" style={{ color: "#8B949E" }} />
          }
        </div>
      </button>

      {/* ── EXPANDED DETAIL ────────────────────────────────────── */}
      {open && (
        <div
          className="px-4 pb-4 pt-1 space-y-4"
          style={{ borderTop: "1px solid #1e2530" }}
        >

          {/* NO TRADE banner */}
          {isNT && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "#FF4D4F10", border: "1px solid #FF4D4F20" }}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: "#FF4D4F" }} />
              <p className="text-[11px]" style={{ color: "#FF4D4F" }}>
                {level.note}
              </p>
            </div>
          )}

          {/* ── TRADE FLOW: Entry → SL → TP1 → TP2 ────────────── */}
          {!isNT && (
            <>
              <div>
                <p className="text-[9px] uppercase tracking-widest mb-2.5" style={{ color: "#8B949E" }}>
                  Trade Setup
                </p>

                {/* Flow row */}
                <div className="flex items-center gap-0">
                  {/* Entry */}
                  <div className="flex-1 text-center">
                    <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "#8B949E" }}>Entry</p>
                    <p className="text-[15px] font-mono font-bold" style={{ color: "#E6EDF3" }}>
                      {fmt(level.entry, level.asset)}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="text-[#1e2530] text-lg font-thin px-1">→</div>

                  {/* SL */}
                  <div className="flex-1 text-center">
                    <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "#FF4D4F90" }}>Stop Loss</p>
                    <p className="text-[15px] font-mono font-bold" style={{ color: "#FF4D4F" }}>
                      {fmt(level.stopLoss, level.asset)}
                    </p>
                  </div>

                  <div className="text-[#1e2530] text-lg font-thin px-1">→</div>

                  {/* TP1 */}
                  <div className="flex-1 text-center">
                    <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "#00C89690" }}>TP 1</p>
                    <p className="text-[15px] font-mono font-bold" style={{ color: "#00C896" }}>
                      {fmt(level.takeProfit1, level.asset)}
                    </p>
                  </div>

                  <div className="text-[#1e2530] text-lg font-thin px-1">→</div>

                  {/* TP2 */}
                  <div className="flex-1 text-center">
                    <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "#00C89660" }}>TP 2</p>
                    <p className="text-[15px] font-mono font-bold" style={{ color: "#00C89670" }}>
                      {fmt(level.takeProfit2, level.asset)}
                    </p>
                  </div>
                </div>

                {/* Risk/Reward under flow */}
                <div className="flex justify-between mt-2 px-1">
                  <span className="text-[9px] font-mono" style={{ color: "#8B949E" }}>
                    Risk: <span style={{ color: "#FF4D4F" }}>{dist(level.entry, level.stopLoss, level.asset)}</span>
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: "#8B949E" }}>
                    Reward: <span style={{ color: "#00C896" }}>{dist(level.entry, level.takeProfit1, level.asset)}</span>
                    <span style={{ color: "#8B949E" }}> / </span>
                    <span style={{ color: "#00C89680" }}>{dist(level.entry, level.takeProfit2, level.asset)}</span>
                  </span>
                </div>
              </div>

              {/* ── GRADIENT R:R LINE ─────────────────────────────── */}
              <RRLine
                entry={level.entry}
                sl={level.stopLoss}
                tp1={level.takeProfit1}
                tp2={level.takeProfit2}
                asset={level.asset}
              />
            </>
          )}

          {/* ── KEY LEVELS INLINE ─────────────────────────────────── */}
          <div
            className="flex items-center gap-5 py-2 px-3 rounded-lg"
            style={{ background: "#0B0F14", border: "1px solid #1e2530" }}
          >
            <div>
              <span className="text-[8px] uppercase tracking-widest" style={{ color: "#8B949E" }}>S</span>
              <span className="text-[11px] font-mono font-semibold ml-1.5" style={{ color: "#00C896" }}>
                {fmt(level.support, level.asset)}
              </span>
            </div>
            <div style={{ width: 1, height: 12, background: "#1e2530" }} />
            <div>
              <span className="text-[8px] uppercase tracking-widest" style={{ color: "#8B949E" }}>P</span>
              <span className="text-[11px] font-mono font-semibold ml-1.5" style={{ color: "#8B949E" }}>
                {fmt(level.pivot, level.asset)}
              </span>
            </div>
            <div style={{ width: 1, height: 12, background: "#1e2530" }} />
            <div>
              <span className="text-[8px] uppercase tracking-widest" style={{ color: "#8B949E" }}>R</span>
              <span className="text-[11px] font-mono font-semibold ml-1.5" style={{ color: "#FF4D4F" }}>
                {fmt(level.resistance, level.asset)}
              </span>
            </div>
            {level.fvg && !level.fvg.filled && (
              <>
                <div style={{ width: 1, height: 12, background: "#1e2530" }} />
                <div>
                  <span className="text-[8px] uppercase tracking-widest" style={{ color: "#8B949E" }}>FVG</span>
                  <span className="text-[11px] font-mono font-semibold ml-1.5"
                    style={{ color: level.fvg.direction === "bullish" ? "#00C896" : "#FF4D4F" }}>
                    {fmt(level.fvg.midpoint, level.asset)}
                  </span>
                </div>
              </>
            )}
            {level.marketStructure?.premiumDiscount !== "equilibrium" && (
              <>
                <div style={{ width: 1, height: 12, background: "#1e2530" }} />
                <span
                  className="text-[8px] font-semibold uppercase tracking-wider"
                  style={{
                    color: level.marketStructure.premiumDiscount === "discount" ? "#00C896" : "#FF4D4F"
                  }}
                >
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
              <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "#8B949E" }}>
                Confluences <span style={{ color: biasColor }}>({level.confluenceCount})</span>
              </p>
              <div className="space-y-1">
                {level.confluences.slice(0, 4).map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: biasColor }} />
                    <p className="text-[10px] leading-relaxed" style={{ color: "#8B949E" }}>{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SESSION + LIQUIDITY ───────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg px-3 py-2" style={{ background: "#0B0F14", border: "1px solid #1e2530" }}>
              <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "#8B949E" }}>Session</p>
              <p className="text-[10px] font-semibold" style={{ color: "#E6EDF3" }}>{level.sessionContext}</p>
            </div>
            <div className="rounded-lg px-3 py-2" style={{ background: "#0B0F14", border: "1px solid #1e2530" }}>
              <p className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "#8B949E" }}>Setup</p>
              <p className="text-[10px] font-bold" style={{ color: sq.color }}>{level.setupQuality}</p>
            </div>
          </div>

          {/* ── CONTEXT MESSAGE ──────────────────────────────────── */}
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-[10px] shrink-0" style={{ color: "#8B949E" }}>⚠</span>
            <p className="text-[10px] italic leading-relaxed" style={{ color: "#8B949E" }}>
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
}

export function KeyLevelsCard({ levels, compact = false }: KeyLevelsCardProps) {
  if (levels.length === 0) return null;

  const display = levels.slice(0, compact ? 4 : 8);
  const aPlus   = display.filter(l => l.setupQuality === "A+" || l.setupQuality === "A").length;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#0B0F14", border: "1px solid #1e2530" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid #1e2530" }}
      >
        <div className="flex items-center gap-2.5">
          <Zap className="h-4 w-4" style={{ color: "#00C896" }} />
          <span className="text-[13px] font-bold tracking-wide" style={{ color: "#E6EDF3" }}>Key Levels</span>
          <span className="text-[10px]" style={{ color: "#8B949E" }}>Entry · SL · TP · S/R · R:R</span>
        </div>
        {aPlus > 0 && (
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded"
            style={{ color: "#00C896", background: "#00C89612", border: "1px solid #00C89625" }}
          >
            {aPlus} quality setup{aPlus > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Rows */}
      <div className="p-3 space-y-2">
        {display.map((level, i) => (
          <AssetRow key={level.asset} level={level} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}
