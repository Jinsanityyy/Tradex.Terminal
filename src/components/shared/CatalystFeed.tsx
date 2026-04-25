"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { Zap, Loader2, Clock, CheckCircle2, Radio } from "lucide-react";
import type { Catalyst } from "@/types";
import { DetailModal } from "./DetailModal";

interface CatalystFeedProps {
  catalysts: Catalyst[];
  limit?: number;
  compact?: boolean;
  newsAgent?: {
    impact: string;
    riskScore: number;
    regime: string;
    dominantCatalyst: string;
    reasons: string[];
    biasChangers: string[];
    catalysts: { headline: string; impact: string; direction: string }[];
  } | null;
}

function MarketTag({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
      {label}
    </span>
  );
}

function CatalystDetail({ cat, newsAgent }: { 
  cat: Catalyst; 
  newsAgent?: CatalystFeedProps["newsAgent"];
}) {
  const [analysis, setAnalysis] = React.useState<{
    whyItMatters: string;
    goldEffect: string;
    usdEffect: string;
    tradeBias: string;
    watchFor: string;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/ai/catalyst-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: cat.title,
        explanation: cat.explanation,
        importance: cat.importance,
        affectedMarkets: cat.affectedMarkets,
        // Pass news agent context so AI doesn't analyze blind
        newsContext: newsAgent ? {
          overallImpact: newsAgent.impact,
          regime: newsAgent.regime,
          riskScore: newsAgent.riskScore,
          dominantCatalyst: newsAgent.dominantCatalyst,
          reasons: newsAgent.reasons,
          biasChangers: newsAgent.biasChangers,
          // Find if this catalyst is in news agent's list
          agentDirection: newsAgent.catalysts?.find(c =>
            c.headline.toLowerCase().includes(cat.title.toLowerCase().slice(0, 20))
          )?.direction ?? null
        } : null
      })
    })
    .then(r => r.json())
    .then(data => setAnalysis(data))
    .catch(() => setAnalysis(null))
    .finally(() => setLoading(false));
  }, [cat.id]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={cat.importance}>{cat.importance}</Badge>
        <span className="text-[11px] text-zinc-500">{timeAgo(cat.timestamp)}</span>
        <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
          cat.status === "live" ? "bg-amber-500/15 text-amber-400" :
          cat.status === "completed" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400")}>
          {cat.status}
        </span>
      </div>

      {/* Affected markets */}
      {cat.affectedMarkets?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cat.affectedMarkets.map(m => <MarketTag key={m} label={m} />)}
        </div>
      )}

      {/* AI Analysis */}
      {loading ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-zinc-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="text-[10px] uppercase tracking-wider">Analyzing market impact…</span>
          </div>
          {[90, 70, 80, 60].map((w, i) => (
            <div key={i} className="rounded-lg bg-[hsl(var(--secondary))] p-3.5">
              <div className="h-2 bg-white/5 rounded animate-pulse mb-2" style={{ width: "40%" }} />
              <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      ) : analysis ? (
        <div className="space-y-3">
          {/* Why it matters */}
          <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Why It Matters</p>
            <p className="text-[12px] text-zinc-300 leading-relaxed">{analysis.whyItMatters}</p>
          </div>

          {/* Gold + USD effect side by side */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[hsl(var(--secondary))] p-3 space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Gold (XAUUSD)</p>
              <p className="text-[11px] text-zinc-300 leading-relaxed">{analysis.goldEffect}</p>
            </div>
            <div className="rounded-lg bg-[hsl(var(--secondary))] p-3 space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">USD</p>
              <p className="text-[11px] text-zinc-300 leading-relaxed">{analysis.usdEffect}</p>
            </div>
          </div>

          {/* Trade bias */}
          <div className="rounded-lg border border-[hsl(var(--primary))]/15 bg-[hsl(var(--primary))]/5 p-3.5 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--primary))]/60">Trade Bias</p>
            <p className="text-[12px] text-zinc-200 leading-relaxed">{analysis.tradeBias}</p>
          </div>

          {/* Watch for */}
          <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Watch For</p>
            <p className="text-[12px] text-zinc-400 leading-relaxed">{analysis.watchFor}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5">
          <p className="text-[11px] text-zinc-500">{cat.explanation}</p>
        </div>
      )}
    </div>
  );
}

export function CatalystFeed({ catalysts, limit, compact = false, newsAgent }: CatalystFeedProps) {
  const items = limit ? catalysts.slice(0, limit) : catalysts;
  const [selected, setSelected] = useState<Catalyst | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <Zap className="h-6 w-6 text-[hsl(var(--muted-foreground))]/30" />
        <p className="text-xs text-[hsl(var(--muted-foreground))]">No catalysts at the moment</p>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))]/60">Refreshes automatically every 3 minutes</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {items.map((cat) => (
          <div
            key={cat.id}
            onClick={() => setSelected(cat)}
            className={cn(
              "group rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 transition-colors hover:bg-[hsl(var(--secondary))] cursor-pointer",
              cat.status === "live" && "border-amber-500/30 bg-amber-500/[0.03]"
            )}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                {cat.status === "live" ? (
                  <Radio className="h-3.5 w-3.5 text-amber-400 pulse-live shrink-0" />
                ) : cat.status === "completed" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/60 shrink-0" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-blue-400/60 shrink-0" />
                )}
                <h4 className="text-xs font-semibold text-[hsl(var(--foreground))] leading-tight">{cat.title}</h4>
              </div>
              <Badge variant={cat.importance}>{cat.importance}</Badge>
            </div>

            {!compact && (
              <>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed mb-2 pl-5">
                  {cat.explanation}
                </p>
                <div className="flex items-center justify-between pl-5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {cat.affectedMarkets.slice(0, 4).map((m) => (
                      <MarketTag key={m} label={m} />
                    ))}
                  </div>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{timeAgo(cat.timestamp)}</span>
                </div>
              </>
            )}

            {compact && (
              <div className="flex items-center justify-between pl-5">
                <div className="flex items-center gap-1.5">
                  {cat.affectedMarkets.slice(0, 3).map((m) => (
                    <MarketTag key={m} label={m} />
                  ))}
                </div>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{timeAgo(cat.timestamp)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title}
      >
        {selected && <CatalystDetail cat={selected} newsAgent={newsAgent} />}
      </DetailModal>
    </>
  );
}
