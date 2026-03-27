"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, timeAgo } from "@/lib/utils";
import { BrainCircuit, Eye, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";
import type { AIBriefing } from "@/types";

interface AIBriefCardProps {
  briefing: AIBriefing;
  expanded?: boolean;
}

const briefTypeConfig: Record<string, { label: string; color: string }> = {
  "market-open": { label: "Market Open", color: "text-emerald-400" },
  "mid-session": { label: "Mid-Session", color: "text-blue-400" },
  "pre-ny": { label: "Pre-NY", color: "text-amber-400" },
  "end-of-day": { label: "End of Day", color: "text-purple-400" },
};

export function AIBriefCard({ briefing, expanded = false }: AIBriefCardProps) {
  const config = briefTypeConfig[briefing.type];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className={cn("h-4 w-4", config.color)} />
            <span>{briefing.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {config.label}
            </Badge>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{timeAgo(briefing.timestamp)}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">What Happened</h4>
          <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{briefing.whatHappened}</p>
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">Why It Matters</h4>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{briefing.whyItMatters}</p>
        </div>

        {expanded && (
          <>
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">What Changed</h4>
              <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{briefing.whatChanged}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400">Bias Support</span>
                </div>
                <ul className="space-y-1">
                  {briefing.biasSupport.map((s, i) => (
                    <li key={i} className="text-[11px] text-[hsl(var(--muted-foreground))]">• {s}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md bg-red-500/5 border border-red-500/20 p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-[10px] uppercase tracking-wider text-red-400">Bias Invalidation</span>
                </div>
                <ul className="space-y-1">
                  {briefing.biasInvalidation.map((s, i) => (
                    <li key={i} className="text-[11px] text-[hsl(var(--muted-foreground))]">• {s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Eye className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">What to Watch</span>
              </div>
              <ul className="space-y-1">
                {briefing.whatToWatch.map((w, i) => (
                  <li key={i} className="text-[11px] text-[hsl(var(--muted-foreground))] pl-2 border-l-2 border-[hsl(var(--accent))]/30">
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
