"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crosshair, AlertCircle, Brain, TrendingUp } from "lucide-react";
import type { TradeContext } from "@/types";

interface TradeContextBoxProps {
  context: TradeContext;
}

export function TradeContextBox({ context }: TradeContextBoxProps) {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Crosshair className="h-4 w-4 text-[hsl(var(--accent))]" />
          <span>AI Trade Context</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Brain className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Condition</span>
          </div>
          <p className="text-xs text-[hsl(var(--foreground))]">{context.condition}</p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3 w-3 text-[hsl(var(--primary))]" />
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Directional Lean</span>
          </div>
          <p className="text-xs text-[hsl(var(--primary))]">{context.directionalLean}</p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertCircle className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Caution Factors</span>
          </div>
          <ul className="space-y-1">
            {context.cautionFactors.map((f, i) => (
              <li key={i} className="text-[11px] text-[hsl(var(--muted-foreground))] pl-2 border-l border-amber-500/30">
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md bg-[hsl(var(--secondary))] p-2.5">
          <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] block mb-1">Ideal Mindset</span>
          <p className="text-[11px] text-[hsl(var(--foreground))] italic leading-relaxed">{context.idealMindset}</p>
        </div>
      </CardContent>
    </Card>
  );
}
