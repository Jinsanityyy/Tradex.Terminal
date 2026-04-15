"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { Zap, Clock, CheckCircle2, Radio, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Catalyst } from "@/types";
import { DetailModal } from "./DetailModal";

interface CatalystFeedProps {
  catalysts: Catalyst[];
  limit?: number;
  compact?: boolean;
}

function MarketTag({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
      {label}
    </span>
  );
}

function CatalystDetail({ cat }: { cat: Catalyst }) {
  return (
    <div className="space-y-4">
      {/* Status + time */}
      <div className="flex items-center gap-2">
        <Badge variant={cat.importance}>{cat.importance}</Badge>
        <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{timeAgo(cat.timestamp)}</span>
        <span className={cn(
          "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
          cat.status === "live" ? "bg-amber-500/15 text-amber-400" :
          cat.status === "completed" ? "bg-emerald-500/15 text-emerald-400" :
          "bg-blue-500/15 text-blue-400"
        )}>
          {cat.status}
        </span>
      </div>

      {/* Why high impact */}
      <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">Why High Impact</p>
        <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{cat.explanation}</p>
      </div>

      {/* Affected markets */}
      {cat.affectedMarkets?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Affected Markets</p>
          <div className="flex flex-wrap gap-1.5">
            {cat.affectedMarkets.map((m) => <MarketTag key={m} label={m} />)}
          </div>
        </div>
      )}

      {/* Market effect hint */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1">Market Effect</p>
        <p className="text-xs text-gray-300 leading-relaxed">
          {cat.importance === "high"
            ? "High-impact catalyst.expect increased volatility and potential trend acceleration across affected markets. Monitor price action closely near key levels."
            : cat.importance === "medium"
            ? "Medium-impact catalyst.may cause short-term volatility. Watch for confirmation before entering positions."
            : "Low-impact catalyst.limited directional effect expected. Use as secondary context only."}
        </p>
      </div>
    </div>
  );
}

export function CatalystFeed({ catalysts, limit, compact = false }: CatalystFeedProps) {
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
        {selected && <CatalystDetail cat={selected} />}
      </DetailModal>
    </>
  );
}
