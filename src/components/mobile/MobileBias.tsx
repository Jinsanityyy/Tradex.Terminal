"use client";

import React from "react";
import { useMarketBias, useMarketAnalysis, useKeyLevels, useSessions } from "@/hooks/useMarketData";
import { cn } from "@/lib/utils";

export function MobileBias() {
  const { biasData } = useMarketBias();
  const { narrative, sentiment, tradeContext } = useMarketAnalysis();
  const { levels } = useKeyLevels();
  const { sessions } = useSessions();

  return (
    <div className="px-4 py-4 space-y-5 pb-6">

      {/* Sentiment + Regime */}
      <section>
        <p className="text-[11px] font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider mb-3">Market Regime</p>
        <div className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Sentiment</span>
            <span className={cn(
              "text-[10px] font-bold px-2.5 py-1 rounded-full",
              sentiment === "risk-on" ? "bg-emerald-500/15 text-emerald-400" :
              sentiment === "risk-off" ? "bg-red-500/15 text-red-400" :
              "bg-amber-500/15 text-amber-400"
            )}>
              {sentiment?.toUpperCase().replace("-", " ")}
            </span>
          </div>
          {narrative.regime && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Regime</span>
              <span className="text-[10px] font-semibold text-amber-400">{narrative.regime}</span>
            </div>
          )}
          {narrative.conviction !== undefined && (
            <div>
              <div className="flex justify-between text-[9px] text-[hsl(var(--muted-foreground))] mb-1.5">
                <span>Conviction</span>
                <span>{narrative.conviction}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-[hsl(var(--primary))] transition-all"
                  style={{ width: `${narrative.conviction}%` }}
                />
              </div>
            </div>
          )}
          {narrative.summary && (
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-relaxed border-t border-white/5 pt-2 mt-2">
              {narrative.summary}
            </p>
          )}
        </div>
      </section>

      {/* Asset Bias Cards */}
      {biasData.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider mb-3">Asset Bias</p>
          <div className="grid grid-cols-2 gap-2">
            {biasData.map((b) => (
              <div key={b.asset} className="bg-[hsl(var(--card))] rounded-xl p-3.5 border border-white/5">
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-1.5">{b.asset}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-xs font-bold",
                    b.bias === "bullish" ? "text-emerald-400" :
                    b.bias === "bearish" ? "text-red-400" :
                    "text-zinc-400"
                  )}>
                    {b.bias?.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{b.confidence}%</span>
                </div>
                <div className="h-1 rounded-full bg-white/5">
                  <div
                    className={cn("h-full rounded-full", b.bias === "bullish" ? "bg-emerald-400" : b.bias === "bearish" ? "bg-red-400" : "bg-zinc-400")}
                    style={{ width: `${b.confidence}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Levels */}
      {levels.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider mb-3">Key Levels</p>
          <div className="space-y-2">
            {levels.slice(0, 6).map((lvl, i) => (
              <div key={i} className="bg-[hsl(var(--card))] rounded-xl px-4 py-3 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{lvl.type}</p>
                  <p className="text-xs font-medium text-[hsl(var(--foreground))]">{lvl.label}</p>
                </div>
                <span className={cn(
                  "text-sm font-bold font-mono",
                  lvl.type === "resistance" ? "text-red-400" :
                  lvl.type === "support" ? "text-emerald-400" :
                  "text-amber-400"
                )}>
                  {lvl.price?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trade Context */}
      {tradeContext?.summary && (
        <section>
          <p className="text-[11px] font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider mb-3">Trade Context</p>
          <div className="bg-[hsl(var(--card))] rounded-xl p-4 border border-white/5">
            <p className="text-xs text-[hsl(var(--foreground))]/80 leading-relaxed">{tradeContext.summary}</p>
            {tradeContext.bias && (
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                <span className="text-[9px] text-[hsl(var(--muted-foreground))] uppercase">Bias</span>
                <span className={cn(
                  "text-[10px] font-bold",
                  tradeContext.bias === "long" ? "text-emerald-400" :
                  tradeContext.bias === "short" ? "text-red-400" :
                  "text-zinc-400"
                )}>
                  {tradeContext.bias?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Sessions */}
      {sessions.filter(s => s.status === "active").length > 0 && (
        <section>
          <p className="text-[11px] font-semibold text-[hsl(var(--foreground))] uppercase tracking-wider mb-3">Active Sessions</p>
          {sessions.filter(s => s.status === "active").map((s, i) => (
            <div key={i} className="bg-[hsl(var(--card))] rounded-xl p-4 border border-emerald-500/20 mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[hsl(var(--foreground))]">{s.session}</span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-medium">ACTIVE</span>
              </div>
              {s.notes && <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{s.notes}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
