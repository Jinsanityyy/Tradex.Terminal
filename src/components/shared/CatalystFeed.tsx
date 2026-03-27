"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { Zap, Clock, CheckCircle2, Radio } from "lucide-react";
import type { Catalyst } from "@/types";

interface CatalystFeedProps {
  catalysts: Catalyst[];
  limit?: number;
  compact?: boolean;
}

export function CatalystFeed({ catalysts, limit, compact = false }: CatalystFeedProps) {
  const items = limit ? catalysts.slice(0, limit) : catalysts;

  return (
    <div className="space-y-2">
      {items.map((cat) => (
        <div
          key={cat.id}
          className={cn(
            "group rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 transition-colors hover:bg-[hsl(var(--secondary))]",
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
                    <span key={m} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                      {m}
                    </span>
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
                  <span key={m} className="text-[10px] font-mono px-1 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                    {m}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{timeAgo(cat.timestamp)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
