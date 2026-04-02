"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Target, ShieldAlert, Trophy, TrendingUp, TrendingDown,
  Minus, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import type { KeyLevel } from "@/app/api/market/keylevels/route";

interface KeyLevelsCardProps {
  levels: KeyLevel[];
  compact?: boolean;
}

function formatPrice(price: number, asset: string): string {
  if (asset.includes("JPY")) return price.toFixed(2);
  if (asset.includes("USD") && !asset.includes("XAU") && !asset.includes("BTC")) return price.toFixed(4);
  if (asset === "BTCUSD") return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (asset === "XAUUSD") return `$${price.toFixed(0)}`;
  return price.toFixed(2);
}

function formatDist(a: number, b: number, asset: string): string {
  const diff = Math.abs(a - b);
  if (asset === "BTCUSD") return `$${diff.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (asset === "XAUUSD") return `$${diff.toFixed(0)}`;
  if (asset.includes("JPY")) return `${diff.toFixed(2)}`;
  // Forex: convert to pips (4th decimal = 1 pip)
  const pips = Math.round(diff * 10000);
  return `${pips}p`;
}

function pct(a: number, b: number): string {
  return ((Math.abs(a - b) / b) * 100).toFixed(2) + "%";
}

function rrQuality(rr: string): { label: string; color: string } {
  const n = parseFloat(rr.replace("1:", ""));
  if (n >= 2.5) return { label: "Excellent", color: "text-emerald-400" };
  if (n >= 2.0) return { label: "Strong", color: "text-green-400" };
  if (n >= 1.5) return { label: "Good", color: "text-lime-400" };
  if (n >= 1.0) return { label: "Marginal", color: "text-amber-400" };
  return { label: "Poor", color: "text-red-400" };
}

function RRBar({ entry, sl, tp1, tp2 }: { entry: number; sl: number; tp1: number; tp2: number }) {
  const risk = Math.abs(entry - sl);
  const reward1 = Math.abs(tp1 - entry);
  const reward2 = Math.abs(tp2 - entry);
  const total = risk + reward2;
  const slW = Math.round((risk / total) * 100);
  const tp1W = Math.round((reward1 / total) * 100);
  const tp2W = 100 - slW - tp1W;

  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden gap-0.5">
      <div
        className="rounded-l-full bg-red-500/70"
        style={{ width: `${slW}%` }}
        title={`SL zone`}
      />
      <div
        className="bg-emerald-500/60"
        style={{ width: `${Math.max(tp1W, 2)}%` }}
        title={`TP1 zone`}
      />
      <div
        className="rounded-r-full bg-emerald-400/40"
        style={{ width: `${Math.max(tp2W, 2)}%` }}
        title={`TP2 zone`}
      />
    </div>
  );
}

function PriceRangeBar({ price, support, resistance }: { price: number; support: number; resistance: number }) {
  const range = resistance - support;
  if (range <= 0) return null;
  const pos = Math.max(0, Math.min(100, ((price - support) / range) * 100));
  const zoneLabel =
    pos < 25 ? "Near Support" :
    pos > 75 ? "Near Resistance" :
    "Mid Range";
  const zoneColor =
    pos < 25 ? "text-emerald-400" :
    pos > 75 ? "text-red-400" :
    "text-amber-400";

  return (
    <div className="mt-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Price Position in Range</span>
        <span className={cn("text-[9px] font-semibold uppercase tracking-wider", zoneColor)}>{zoneLabel}</span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-[hsl(var(--muted))]">
        {/* Support → Resistance gradient bar */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/30 via-amber-500/20 to-red-500/30" />
        {/* Current price dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-[hsl(var(--background))] bg-white shadow-md"
          style={{ left: `calc(${pos}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] font-mono text-emerald-400">{formatPrice(support, "")}</span>
        <span className="text-[9px] font-mono text-amber-400 text-center">P</span>
        <span className="text-[9px] font-mono text-red-400">{formatPrice(resistance, "")}</span>
      </div>
    </div>
  );
}

function AssetRow({ level, defaultOpen }: { level: KeyLevel; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const quality = rrQuality(level.riskReward);
  const isBull = level.bias === "bullish";
  const isBear = level.bias === "bearish";

  const BiasIcon = isBull ? TrendingUp : isBear ? TrendingDown : Minus;
  const biasColor = isBull ? "text-emerald-400" : isBear ? "text-red-400" : "text-amber-400";
  const biasBg = isBull ? "bg-emerald-500/10 border-emerald-500/20" : isBear ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20";

  const entryToSL = formatDist(level.entry, level.stopLoss, level.asset);
  const entryToTP1 = formatDist(level.entry, level.takeProfit1, level.asset);
  const entryToTP2 = formatDist(level.entry, level.takeProfit2, level.asset);

  return (
    <div className={cn("rounded-xl border transition-all duration-200", biasBg)}>
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <BiasIcon className={cn("h-3.5 w-3.5 shrink-0", biasColor)} />
          <span className="text-xs font-bold text-[hsl(var(--foreground))] tracking-wide">{level.asset}</span>
          <span className={cn(
            "text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded border",
            isBull ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
            : isBear ? "text-red-400 border-red-500/30 bg-red-500/10"
            : "text-amber-400 border-amber-500/30 bg-amber-500/10"
          )}>
            {level.bias}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Current price */}
          <span className="text-xs font-mono font-semibold text-[hsl(var(--foreground))]">
            {formatPrice(level.price, level.asset)}
          </span>
          {/* R:R badge */}
          <span className={cn("text-[10px] font-mono font-bold hidden sm:block", quality.color)}>
            {level.riskReward} <span className="text-[9px] opacity-60">R:R</span>
          </span>
          {/* Quality */}
          <span className={cn("text-[9px] uppercase tracking-wider font-semibold hidden md:block", quality.color)}>
            {quality.label}
          </span>
          {open
            ? <ChevronUp className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            : <ChevronDown className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
          }
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-[hsl(var(--border))]/40 pt-2.5">

          {/* ── TRADE SETUP ─────────────────────────────── */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-1.5">Trade Setup</p>
            <div className="grid grid-cols-4 gap-2">
              {/* Entry */}
              <div className="rounded-lg bg-blue-500/8 border border-blue-500/15 p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="h-3 w-3 text-blue-400" />
                  <span className="text-[9px] uppercase tracking-wider text-blue-400/70">Entry</span>
                </div>
                <p className="text-[11px] font-mono font-bold text-blue-400">{formatPrice(level.entry, level.asset)}</p>
                <p className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5 font-mono">
                  {pct(level.entry, level.price)} away
                </p>
              </div>

              {/* Stop Loss */}
              <div className="rounded-lg bg-red-500/8 border border-red-500/15 p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ShieldAlert className="h-3 w-3 text-red-400" />
                  <span className="text-[9px] uppercase tracking-wider text-red-400/70">Stop Loss</span>
                </div>
                <p className="text-[11px] font-mono font-bold text-red-400">{formatPrice(level.stopLoss, level.asset)}</p>
                <p className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5 font-mono">
                  {entryToSL} risk
                </p>
              </div>

              {/* TP1 */}
              <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/15 p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="h-3 w-3 text-emerald-400" />
                  <span className="text-[9px] uppercase tracking-wider text-emerald-400/70">TP 1</span>
                </div>
                <p className="text-[11px] font-mono font-bold text-emerald-400">{formatPrice(level.takeProfit1, level.asset)}</p>
                <p className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5 font-mono">
                  {entryToTP1} reward
                </p>
              </div>

              {/* TP2 */}
              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-2 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="h-3 w-3 text-emerald-600" />
                  <span className="text-[9px] uppercase tracking-wider text-emerald-600/70">TP 2</span>
                </div>
                <p className="text-[11px] font-mono font-bold text-emerald-600">{formatPrice(level.takeProfit2, level.asset)}</p>
                <p className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5 font-mono">
                  {entryToTP2} reward
                </p>
              </div>
            </div>
          </div>

          {/* ── R:R VISUAL BAR ─────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Risk / Reward Ratio</p>
              <div className="flex items-center gap-2">
                <span className={cn("text-[10px] font-bold font-mono", quality.color)}>{level.riskReward}</span>
                <span className={cn("text-[9px] uppercase tracking-wider", quality.color)}>{quality.label}</span>
              </div>
            </div>
            <RRBar entry={level.entry} sl={level.stopLoss} tp1={level.takeProfit1} tp2={level.takeProfit2} />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-red-400/70 font-mono">SL ({entryToSL})</span>
              <span className="text-[9px] text-emerald-400/70 font-mono">TP1 ({entryToTP1})</span>
              <span className="text-[9px] text-emerald-600/70 font-mono">TP2 ({entryToTP2})</span>
            </div>
          </div>

          {/* ── KEY ZONES ──────────────────────────────── */}
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-1.5">Key Zones</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md bg-emerald-500/6 border border-emerald-500/12 p-2 text-center">
                <p className="text-[9px] uppercase tracking-wider text-emerald-400/60 mb-0.5">Support</p>
                <p className="text-[11px] font-mono font-bold text-emerald-400">{formatPrice(level.support, level.asset)}</p>
                <p className="text-[9px] text-[hsl(var(--muted-foreground))] font-mono mt-0.5">
                  {formatDist(level.price, level.support, level.asset)} below
                </p>
              </div>
              <div className="rounded-md bg-amber-500/6 border border-amber-500/12 p-2 text-center">
                <p className="text-[9px] uppercase tracking-wider text-amber-400/60 mb-0.5">Pivot</p>
                <p className="text-[11px] font-mono font-bold text-amber-400">{formatPrice(level.pivot, level.asset)}</p>
                <p className="text-[9px] text-[hsl(var(--muted-foreground))] font-mono mt-0.5">
                  {formatDist(level.price, level.pivot, level.asset)}{" "}
                  {level.price >= level.pivot ? "above" : "below"}
                </p>
              </div>
              <div className="rounded-md bg-red-500/6 border border-red-500/12 p-2 text-center">
                <p className="text-[9px] uppercase tracking-wider text-red-400/60 mb-0.5">Resistance</p>
                <p className="text-[11px] font-mono font-bold text-red-400">{formatPrice(level.resistance, level.asset)}</p>
                <p className="text-[9px] text-[hsl(var(--muted-foreground))] font-mono mt-0.5">
                  {formatDist(level.price, level.resistance, level.asset)} above
                </p>
              </div>
            </div>
          </div>

          {/* ── PRICE POSITION BAR ─────────────────────── */}
          <PriceRangeBar price={level.price} support={level.support} resistance={level.resistance} />

          {/* ── ANALYST NOTE ───────────────────────────── */}
          <div className="flex items-start gap-2 rounded-lg bg-[hsl(var(--muted))]/40 border border-[hsl(var(--border))]/40 px-3 py-2">
            <AlertCircle className="h-3 w-3 text-[hsl(var(--muted-foreground))] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed">
              {level.note}
            </p>
          </div>

        </div>
      )}
    </div>
  );
}

export function KeyLevelsCard({ levels, compact = false }: KeyLevelsCardProps) {
  if (levels.length === 0) return null;

  const displayLevels = levels.slice(0, compact ? 4 : 8);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Target className="h-4 w-4 text-amber-400" />
          <span>Key Levels</span>
          <span className="text-[10px] font-normal text-[hsl(var(--muted-foreground))] ml-1">
            Entry · SL · TP · S/R · R:R
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayLevels.map((level, i) => (
            <AssetRow key={level.asset} level={level} defaultOpen={i === 0} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
