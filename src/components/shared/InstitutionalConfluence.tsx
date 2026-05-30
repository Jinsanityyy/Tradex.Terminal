"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle } from "lucide-react";
import { useInstitutionalData } from "@/hooks/useMarketData";
import type { InstitutionalData } from "@/app/api/market/institutional/route";

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

function SentimentBar({ longPct, shortPct }: { longPct: number; shortPct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] text-zinc-500">
        <span>Retail Long {longPct}%</span>
        <span>Short {shortPct}%</span>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="bg-emerald-500/70 transition-all" style={{ width: `${longPct}%` }} />
        <div className="bg-red-500/70 transition-all" style={{ width: `${shortPct}%` }} />
      </div>
    </div>
  );
}

function ConfluenceDots({ score }: { score: number }) {
  // -3 to +3 mapped to 6 dots
  const dots = Array.from({ length: 6 }, (_, i) => {
    const val = i - 2.5; // -2.5 to +2.5 per dot
    const filled = score >= 0 ? i >= 3 && (i - 3) < score : i < 3 && (3 - i) <= Math.abs(score);
    const isBull = score > 0;
    return (
      <span key={i} className={cn(
        "inline-block h-2 w-2 rounded-full",
        filled
          ? isBull ? "bg-emerald-400" : "bg-red-400"
          : "bg-zinc-700"
      )} />
    );
  });
  return <div className="flex items-center gap-1">{dots}</div>;
}

function Row({ label, children, signal }: { label: string; children: React.ReactNode; signal?: "bullish" | "bearish" | "neutral" }) {
  return (
    <div className="space-y-1.5 rounded-lg bg-white/[0.03] border border-white/5 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
        {signal && <SignalBadge signal={signal} />}
      </div>
      {children}
    </div>
  );
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
          <p className="text-[10px] text-zinc-500">Dukascopy · GC Volume · CBOE Options</p>
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
            {/* Retail Sentiment */}
            {data?.sentiment ? (
              <Row label="Retail Sentiment (Dukascopy)" signal={data.sentiment.signal}>
                <SentimentBar longPct={data.sentiment.longPct} shortPct={data.sentiment.shortPct} />
                <p className="text-[10px] text-zinc-400 mt-1">
                  {data.sentiment.extreme
                    ? `⚠️ Extreme — ${data.sentiment.shortPct > data.sentiment.longPct ? "crowd heavily short" : "crowd heavily long"}, contrarian ${data.sentiment.signal}`
                    : "No extreme reading — low contrarian value"}
                </p>
              </Row>
            ) : (
              <Row label="Retail Sentiment (Dukascopy)">
                <p className="text-[10px] text-zinc-600 italic">Unavailable</p>
              </Row>
            )}

            {/* GC Futures Volume (Yahoo Finance) */}
            {data?.oi ? (
              <Row label="GC Futures Volume" signal={data.oi.signal}>
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
              </Row>
            ) : (
              <Row label="GC Futures Volume">
                <p className="text-[10px] text-zinc-600 italic">Unavailable</p>
              </Row>
            )}

            {/* CBOE Options */}
            {data?.options ? (
              <Row label="CBOE Options Flow (GLD)" signal={data.options.signal}>
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
              </Row>
            ) : (
              <Row label="CBOE Options Flow (GLD)">
                <p className="text-[10px] text-zinc-600 italic">Unavailable</p>
              </Row>
            )}
          </>
        )}
      </div>

      <div className="px-4 pb-3">
        <p className="text-[9px] text-zinc-700">
          Dukascopy: retail contrarian · GC Vol: buyers vs sellers · CBOE: smart money options
        </p>
      </div>
    </div>
  );
}
