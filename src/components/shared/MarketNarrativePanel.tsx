"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BrainCircuit, Sparkles } from "lucide-react";
import type { MarketNarrative } from "@/types";

interface MarketNarrativePanelProps {
  narrative: MarketNarrative;
}

export function MarketNarrativePanel({ narrative }: MarketNarrativePanelProps) {
  return (
    <Card className="gradient-card border-[hsl(var(--primary))]/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-[hsl(var(--primary))]" />
            <span>Market Narrative</span>
          </div>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            AI Generated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
          {narrative.summary}
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Theme</span>
            <span className="text-xs font-semibold text-[hsl(var(--foreground))]">{narrative.dominantTheme}</span>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {narrative.regime.replace(/-/g, " ")}
          </Badge>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Geo Risk Score</span>
            <Progress value={narrative.conviction} className="flex-1 h-1.5" />
            <span className="text-xs font-mono font-semibold text-[hsl(var(--primary))]">{narrative.conviction}%</span>
          </div>
          <p className="text-[9px] text-[hsl(var(--muted-foreground))]/60 mt-0.5 italic">
            Geopolitical impact on this regime  -  not the same as asset bias conviction
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
