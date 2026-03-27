"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Bias } from "@/types";

interface BiasCardProps {
  asset: string;
  bias: Bias;
  confidence: number;
  compact?: boolean;
}

export function BiasCard({ asset, bias, confidence, compact = false }: BiasCardProps) {
  const biasConfig = {
    bullish: { icon: TrendingUp, label: "BULLISH", color: "text-positive", progressColor: "bg-emerald-500", glow: "glow-green" },
    bearish: { icon: TrendingDown, label: "BEARISH", color: "text-negative", progressColor: "bg-red-500", glow: "glow-red" },
    neutral: { icon: Minus, label: "NEUTRAL", color: "text-neutral-accent", progressColor: "bg-amber-500", glow: "" },
  };

  const config = biasConfig[bias];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn("flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3", config.glow)}>
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", config.color)} />
          <span className="text-xs font-medium text-[hsl(var(--foreground))]">{asset}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={bias}>{config.label}</Badge>
          <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">{confidence}%</span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("gradient-card", config.glow)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[hsl(var(--primary))]" />
            {asset}
          </CardTitle>
          <Badge variant={bias}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <Icon className={cn("h-8 w-8", config.color)} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Conviction</span>
              <span className={cn("text-lg font-bold font-mono", config.color)}>{confidence}%</span>
            </div>
            <Progress value={confidence} indicatorClassName={config.progressColor} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
