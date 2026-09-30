"use client";

import React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradexTrend } from "@/hooks/useTradexTrend";
import { MTF_TFS, type StatColor, type Tf, type Trend, type WinRate } from "@/lib/tradexTrend";
import { TF_LABEL } from "@/lib/tradexTrend/tf";

const TEAL = "#1de9b6";
const PINK = "#ec407a";
const AMBER = "#f6b93b";
const MUTE = "#71717a";
const WHITE = "#e8e9ee";

const COLOR: Record<StatColor, string> = { green: TEAL, red: PINK, amber: AMBER, gray: MUTE };

const pct = (v: number) => `${Math.round(v * 100)}%`;
const px = (v: number) => v.toFixed(2);
const arrow = (t: Trend) => (t > 0 ? "▲" : t < 0 ? "▼" : "-");
const trendColor = (t: Trend) => (t > 0 ? TEAL : t < 0 ? PINK : MUTE);
const wr = (w: WinRate) => (w.n > 0 ? `${pct(w.winPct ?? 0)} (n=${w.n})` : "-");

function Row({ k, children, color }: { k: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
      <span className="shrink-0 text-[10px] text-zinc-500">{k}</span>
      <span className="text-right font-mono text-[10.5px] tabular-nums" style={{ color: color ?? WHITE }}>
        {children}
      </span>
    </div>
  );
}

/** "n" tooltip: CSS-only so it works inside the grid's drag surface. */
function NHint() {
  const text = "n = number of trades behind the number. Small n means the win% is mostly luck.";
  return (
    <span className="group relative ml-1 inline-flex align-middle" tabIndex={0} aria-label={text} title={text}>
      <Info className="h-2.5 w-2.5 text-zinc-500" />
      <span className="pointer-events-none absolute bottom-full right-0 z-30 mb-1 hidden w-44 rounded border border-white/10 bg-[#0b0b0d] p-1.5 text-[9px] leading-snug text-zinc-300 shadow-xl group-hover:block group-focus:block">
        {text}
      </span>
    </span>
  );
}

export function TradexTrendWidget({ symbol = "XAUUSD", chartTf }: { symbol?: string; chartTf: Tf }) {
  const { snapshot, loading, error } = useTradexTrend(symbol, chartTf);

  if (!snapshot || !snapshot.latest) {
    return (
      <div className="flex h-full items-center justify-center p-3 text-[10px] text-zinc-500">
        {error ?? (loading ? "Loading candles…" : "Not enough closed candles yet.")}
      </div>
    );
  }

  const { latest: L, stats: S, params } = snapshot;
  const T = L.trade;
  const bull = L.bullish;
  const open = T?.outcome === "OPEN";
  const sideColor = T ? (T.side === "BUY" ? TEAL : PINK) : MUTE;
  const tradeText = !T
    ? "None"
    : open
      ? `${T.side === "BUY" ? "LONG" : "SHORT"} ${T.lots.toFixed(2)} lot ($${Math.round(T.riskUsd)})`
      : T.outcome === "WIN" ? "TP1 reached" : T.outcome === "LOSS" ? "SL hit" : "Closed (flipped)";
  const ci = S.ci95;

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-black p-3 text-zinc-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold tracking-[0.14em] text-zinc-300">TRADEX TREND</span>
          <span className="rounded border border-amber-400/30 px-1 text-[8px] font-medium uppercase tracking-wider text-amber-300/90">
            Experimental
          </span>
          <span className="text-[9px] text-zinc-600">{TF_LABEL[snapshot.chartTf]}</span>
        </div>
        <span
          className="rounded px-2 py-0.5 text-[9px] font-bold tracking-wide text-black"
          style={{ background: bull ? TEAL : PINK }}
        >
          {bull ? "BULLISH" : "BEARISH"}
        </span>
      </div>

      <div className="mt-2 divide-y divide-white/[0.04]">
        <Row k="Market" color={L.market === "Trending" ? TEAL : L.market === "Ranging" ? AMBER : MUTE}>
          {L.market ?? "-"}{L.adx !== null ? ` (ADX ${Math.round(L.adx)})` : ""}
        </Row>
        <Row k="Volatility" color={L.volRatio !== null && L.volRatio > 1.5 ? AMBER : WHITE}>
          {L.atr !== null ? `ATR ${L.atr.toFixed(2)}` : "-"}{L.volRatio !== null ? ` (${L.volRatio.toFixed(1)}x avg)` : ""}
        </Row>
        <Row k="Session (UTC)">{L.session}</Row>
        <Row k="MTF bias" color={L.mtfBias === "Bullish" ? TEAL : L.mtfBias === "Bearish" ? PINK : MUTE}>
          {L.mtfBias}{" "}
          {MTF_TFS.map((tf) => (
            <span key={tf} className="ml-1" style={{ color: trendColor(L.mtf[tf]) }}>
              {TF_LABEL[tf]}{arrow(L.mtf[tf])}
            </span>
          ))}
        </Row>
        <Row k="Last signal" color={L.lastSignal ? (L.lastSignal.side === "BUY" ? TEAL : PINK) : MUTE}>
          {L.lastSignal
            ? `${L.lastSignal.side === "BUY" ? "Buy" : "Sell"}${L.lastSignal.smart ? " +Smart" : ""}  ${L.lastSignal.barsAgo} bars ago`
            : "None"}
        </Row>
        <Row k="Trade" color={open ? sideColor : MUTE}>{tradeText}</Row>
        <Row k="Entry / SL / TP1">{T ? `${px(T.entry)} / ${px(T.sl)} / ${px(T.tp1)}` : "-"}</Row>
        <Row k="TP1 / SL first">
          {S.n > 0 ? `${S.wins} / ${S.losses} (${pct(S.winPct ?? 0)}, n=${S.n})` : "-"}
          <NHint />
        </Row>
        <Row k="95% range of win%" color={!ci ? MUTE : ci.lo > 0.5 ? TEAL : ci.hi < 0.5 ? PINK : AMBER}>
          {ci ? `${pct(ci.lo)} to ${pct(ci.hi)}` : "-"}
          {ci?.coinFlip ? (
            <span className="ml-1.5 rounded bg-amber-400/15 px-1 text-[8.5px] font-semibold uppercase text-amber-300">
              coin flip
            </span>
          ) : null}
        </Row>
        <Row k="Edge / trade after cost" color={S.edgeR === null ? MUTE : S.edgeR > 0 ? TEAL : PINK}>
          {S.edgeR !== null
            ? `${S.edgeR.toFixed(2)}R${S.n < 30 ? " (few trades)" : ""}`
            : "-"}
        </Row>
      </div>

      <div className="mt-3">
        <div className="grid grid-cols-[1fr_44px_1fr_1fr] gap-x-2 border-b border-white/[0.06] pb-1 text-[9px] uppercase tracking-wider text-zinc-500">
          <span>Setup quality</span>
          <span className="text-center">Now</span>
          <span className="text-center">Win% with<NHint /></span>
          <span className="text-center">Win% without</span>
        </div>
        {S.factors.map((f) => (
          <div key={f.name} className="grid grid-cols-[1fr_44px_1fr_1fr] items-baseline gap-x-2 py-[3px] font-mono text-[10px] tabular-nums">
            <span className="truncate font-sans text-zinc-400">{f.name}</span>
            <span className="text-center" style={{ color: f.presentNow === null ? MUTE : f.presentNow ? TEAL : PINK }}>
              {f.presentNow === null ? "-" : f.presentNow ? "Yes" : "No"}
            </span>
            <span className="text-center" style={{ color: COLOR[f.color] }}>{wr(f.with)}</span>
            <span className="text-center text-zinc-300">{wr(f.without)}</span>
          </div>
        ))}
        <Row k="Score at last signal" color={!T ? MUTE : T.grade === "A" ? TEAL : T.grade === "B" ? AMBER : PINK}>
          {T ? `${T.score}/5  ${T.grade}` : "-"}
        </Row>
        <div className="grid grid-cols-3 gap-2 pt-0.5 font-mono text-[10px] tabular-nums">
          {(["A", "B", "C"] as const).map((g) => (
            <span key={g} className="text-center" style={{ color: COLOR[S.grades[g].color] }}>
              {g} {wr(S.grades[g])}
            </span>
          ))}
        </div>
      </div>

      <p className={cn("mt-3 text-[9px] leading-snug text-zinc-600")}>
        Colors need n &gt;= 20. Small samples lie. Experimental study of a rule on closed candles
        (SL first on ties, cost {params.costR}R). Not a profit signal, not financial advice.
      </p>
    </div>
  );
}
