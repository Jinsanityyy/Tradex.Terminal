"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle, Clock } from "lucide-react";
import { useInstitutionalData } from "@/hooks/useMarketData";
import type { InstitutionalData } from "@/app/api/market/institutional/route";

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SignalBadge({ signal }: { signal: "bullish" | "bearish" | "neutral" }) {
  const Icon = signal === "bullish" ? TrendingUp : signal === "bearish" ? TrendingDown : Minus;
  const cls =
    signal === "bullish" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
    signal === "bearish" ? "bg-red-500/15 text-red-400 border-red-500/30" :
    "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase", cls)}>
      <Icon className="h-2.5 w-2.5" />
      {signal}
    </span>
  );
}

function MMBar({ longPct, shortPct }: { longPct: number; shortPct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] text-zinc-500">
        <span>MM Long {longPct}%</span>
        <span>MM Short {shortPct}%</span>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="bg-emerald-500/70 transition-all" style={{ width: `${longPct}%` }} />
        <div className="bg-red-500/70 transition-all"   style={{ width: `${shortPct}%` }} />
      </div>
    </div>
  );
}

function ConfluenceDots({ score }: { score: number }) {
  const dots = Array.from({ length: 6 }, (_, i) => {
    const filled = score >= 0 ? i >= 3 && (i - 3) < score : i < 3 && (3 - i) <= Math.abs(score);
    return (
      <span key={i} className={cn(
        "inline-block h-2 w-2 rounded-full",
        filled ? (score > 0 ? "bg-emerald-400" : "bg-red-400") : "bg-zinc-700"
      )} />
    );
  });
  return <div className="flex items-center gap-1">{dots}</div>;
}

function Row({ label, hint, children, signal }: {
  label: string; hint: string; children: React.ReactNode; signal?: "bullish" | "bearish" | "neutral";
}) {
  return (
    <div className="space-y-1.5 rounded-lg bg-white/[0.03] border border-white/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
          <p className="text-[9px] text-zinc-700 mt-0.5 leading-relaxed">{hint}</p>
        </div>
        {signal && <SignalBadge signal={signal} />}
      </div>
      {children}
    </div>
  );
}

// Bias implication lines per source
function cftcBiasNote(s: NonNullable<InstitutionalData["sentiment"]>): string {
  if (s.extreme) {
    const dir = s.longPct > s.shortPct ? "long" : "short";
    return `Bias implication → hedge funds heavily ${dir}, price usually follows institutional flow.`;
  }
  return "No extreme reading — CFTC adds no strong directional bias right now.";
}

function volBiasNote(oi: NonNullable<InstitutionalData["oi"]>): string {
  if (oi.signal === "bullish") return "Bias implication → confirmed buying pressure. Supports going LONG.";
  if (oi.signal === "bearish") return "Bias implication → confirmed selling pressure. Supports going SHORT.";
  if (oi.label.includes("covering")) return "Bias implication → weak move up (short covering). Do not chase longs.";
  return "Bias implication → sellers running out of steam. Watch for reversal, not shorts.";
}

function optionsBiasNote(o: NonNullable<InstitutionalData["options"]>): string {
  if (o.signal === "bullish") return `Bias implication → call buyers dominating (P/C ${o.putCallRatio.toFixed(2)}). Smart money positioning for upside — aligns with LONG bias.`;
  if (o.signal === "bearish") return `Bias implication → put heavy (P/C ${o.putCallRatio.toFixed(2)}). Institutions hedging or speculating downside — aligns with SHORT bias.`;
  return `Bias implication → balanced options flow (P/C ${o.putCallRatio.toFixed(2)}). No strong directional signal from options.`;
}

export function InstitutionalConfluence() {
  const { institutional: data, institutionalLoading } = useInstitutionalData();

  if (institutionalLoading) {
    return (
      <div className="space-y-2 rounded-xl border border-white/5 bg-[hsl(var(--card))] p-4">
        <p className="text-[9px] uppercase tracking-widest text-zinc-600">Institutional Confluence</p>
        <div className="flex items-center justify-center py-6">
          <RefreshCw className="h-4 w-4 animate-spin text-zinc-600" />
        </div>
      </div>
    );
  }

  const allNull = !data || (!data.sentiment && !data.oi && !data.options);

  return (
    <div className="rounded-xl border border-white/5 bg-[hsl(var(--card))] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-0.5">Institutional Confluence</p>
          <p className="text-[10px] text-zinc-500">CFTC Managed Money · GC Volume · CBOE Options</p>
          {data?.ts && (
            <p className="flex items-center gap-1 text-[9px] text-zinc-700 mt-0.5">
              <Clock className="h-2.5 w-2.5" />
              Updated {timeAgo(data.ts)}
            </p>
          )}
        </div>
        {data && !allNull && (
          <div className="flex flex-col items-end gap-1">
            <SignalBadge signal={data.confluence} />
            <ConfluenceDots score={data.score} />
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        {allNull ? (
          <div className="flex items-center gap-2 py-4 justify-center">
            <AlertTriangle className="h-4 w-4 text-zinc-600" />
            <p className="text-[11px] text-zinc-600">Data unavailable — sources offline</p>
          </div>
        ) : (
          <>
            {/* CFTC Managed Money */}
            {data?.sentiment ? (
              <Row
                label="Managed Money (CFTC)"
                hint="Weekly COT report — shows how hedge funds are positioned. Heavy one-sided positioning (70%+) signals strong institutional conviction."
                signal={data.sentiment.signal}
              >
                <MMBar longPct={data.sentiment.longPct} shortPct={data.sentiment.shortPct} />
                <p className="text-[10px] text-zinc-400 mt-1.5">
                  {data.sentiment.extreme
                    ? `⚠️ Extreme — hedge funds ${data.sentiment.longPct > data.sentiment.shortPct ? `${data.sentiment.longPct}% net long` : `${data.sentiment.shortPct}% net short`}`
                    : "No extreme positioning from managed money"}
                </p>
                <p className="text-[9px] text-zinc-600 mt-0.5 italic">{cftcBiasNote(data.sentiment)}</p>
              </Row>
            ) : (
              <Row label="Managed Money (CFTC)" hint="Weekly CFTC report — hedge fund net positioning on COMEX gold.">
                <p className="text-[10px] text-zinc-600 italic">Unavailable</p>
              </Row>
            )}

            {/* GC Futures Volume */}
            {data?.oi ? (
              <Row
                label="GC Futures Volume"
                hint="Gold futures daily volume from Yahoo Finance. Volume confirms whether a price move is real or just short covering."
                signal={data.oi.signal}
              >
                <p className="text-[11px] text-zinc-200">{data.oi.label}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[9px] text-zinc-500">
                    Vol: <span className="text-zinc-300 font-mono">{data.oi.openInterest.toLocaleString()}</span>
                  </span>
                  <span className={cn("text-[9px] font-mono font-bold",
                    data.oi.oiChange > 0 ? "text-emerald-400" : data.oi.oiChange < 0 ? "text-red-400" : "text-zinc-500")}>
                    {data.oi.oiChange > 0 ? "+" : ""}{data.oi.oiChange.toLocaleString()} vs prev
                  </span>
                </div>
                <p className="text-[9px] text-zinc-600 mt-1.5 italic">{volBiasNote(data.oi)}</p>
              </Row>
            ) : (
              <Row label="GC Futures Volume" hint="Gold futures volume — confirms if price moves have real participation behind them.">
                <p className="text-[10px] text-zinc-600 italic">Unavailable</p>
              </Row>
            )}

            {/* CBOE Options */}
            {data?.options ? (
              <Row
                label="CBOE Options Flow (GLD)"
                hint="GLD ETF options activity. P/C < 0.7 = calls dominating (bullish). P/C > 1.3 = puts heavy (bearish). Unusual volume = smart money positioning."
                signal={data.options.signal}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[8px] text-zinc-600">P/C Ratio</p>
                    <p className={cn("text-sm font-bold font-mono",
                      data.options.putCallRatio < 0.7 ? "text-emerald-400" :
                      data.options.putCallRatio > 1.3 ? "text-red-400" : "text-zinc-300")}>
                      {data.options.putCallRatio.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] text-zinc-600">Call Vol</p>
                    <p className="text-sm font-bold font-mono text-emerald-400">{data.options.callVolume.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-zinc-600">Put Vol</p>
                    <p className="text-sm font-bold font-mono text-red-400">{data.options.putVolume.toLocaleString()}</p>
                  </div>
                  {(data.options.unusualCalls > 0 || data.options.unusualPuts > 0) && (
                    <div>
                      <p className="text-[8px] text-zinc-600">Unusual</p>
                      <p className="text-[11px] font-bold text-amber-400">
                        {data.options.unusualCalls}C / {data.options.unusualPuts}P
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-zinc-600 mt-1.5 italic">{optionsBiasNote(data.options)}</p>
              </Row>
            ) : (
              <Row label="CBOE Options Flow (GLD)" hint="GLD ETF put/call ratio — tracks whether options traders are positioned bullish or bearish on gold.">
                <p className="text-[10px] text-zinc-600 italic">Unavailable</p>
              </Row>
            )}
          </>
        )}
      </div>

      <div className="px-4 pb-3">
        <p className="text-[9px] text-zinc-700">
          CFTC weekly · GC volume 15-min delay · CBOE 15-min delay
        </p>
      </div>
    </div>
  );
}
