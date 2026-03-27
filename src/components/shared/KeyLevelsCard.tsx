"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Target, ArrowDownToLine, ArrowUpToLine, ShieldAlert, Trophy } from "lucide-react";
import type { KeyLevel } from "@/app/api/market/keylevels/route";

interface KeyLevelsCardProps {
  levels: KeyLevel[];
  compact?: boolean;
}

function formatPrice(price: number, asset: string): string {
  if (asset.includes("JPY")) return price.toFixed(2);
  if (asset.includes("USD") && !asset.includes("XAU") && !asset.includes("BTC")) return price.toFixed(4);
  if (asset === "BTCUSD") return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (asset === "XAUUSD") return `$${price.toFixed(0)}`;
  return price.toFixed(2);
}

export function KeyLevelsCard({ levels, compact = false }: KeyLevelsCardProps) {
  if (levels.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4 text-amber-400" />
          <span>Key Levels — Entry / SL / TP</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {levels.slice(0, compact ? 4 : 8).map((level) => (
            <div
              key={level.asset}
              className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/50 p-3"
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[hsl(var(--foreground))]">{level.asset}</span>
                  <Badge variant={level.bias}>{level.bias}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[hsl(var(--foreground))]">
                    {formatPrice(level.price, level.asset)}
                  </span>
                  <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                    R:R {level.riskReward}
                  </span>
                </div>
              </div>

              {/* Levels grid */}
              <div className="grid grid-cols-4 gap-2">
                {/* Entry */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Target className="h-3 w-3 text-blue-400" />
                    <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Entry</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400">
                    {formatPrice(level.entry, level.asset)}
                  </span>
                </div>

                {/* Stop Loss */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <ShieldAlert className="h-3 w-3 text-red-400" />
                    <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">SL</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-red-400">
                    {formatPrice(level.stopLoss, level.asset)}
                  </span>
                </div>

                {/* TP1 */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Trophy className="h-3 w-3 text-emerald-400" />
                    <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">TP1</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {formatPrice(level.takeProfit1, level.asset)}
                  </span>
                </div>

                {/* TP2 */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Trophy className="h-3 w-3 text-emerald-600" />
                    <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">TP2</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    {formatPrice(level.takeProfit2, level.asset)}
                  </span>
                </div>
              </div>

              {/* Support / Resistance / Pivot */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[hsl(var(--border))]/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <ArrowDownToLine className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">S: </span>
                    <span className="text-[10px] font-mono text-emerald-400">{formatPrice(level.support, level.asset)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">P: </span>
                    <span className="text-[10px] font-mono text-amber-400">{formatPrice(level.pivot, level.asset)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ArrowUpToLine className="h-3 w-3 text-red-400" />
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">R: </span>
                    <span className="text-[10px] font-mono text-red-400">{formatPrice(level.resistance, level.asset)}</span>
                  </div>
                </div>
              </div>

              {/* Note */}
              {!compact && (
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1.5 italic">
                  {level.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
