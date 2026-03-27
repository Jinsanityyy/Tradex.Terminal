"use client";

import React from "react";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { AssetSnapshot } from "@/types";

interface AssetSnapshotGridProps {
  assets: AssetSnapshot[];
  compact?: boolean;
}

function formatAssetPrice(symbol: string, price: number): string {
  if (symbol === "EURUSD" || symbol === "GBPUSD" || symbol === "USDJPY" || symbol === "AUDUSD") {
    return price.toFixed(4);
  }
  if (price > 10000) return formatNumber(price, 0);
  if (price > 100) return formatNumber(price, 2);
  return formatNumber(price, 3);
}

export function AssetSnapshotGrid({ assets, compact = false }: AssetSnapshotGridProps) {
  return (
    <div className={cn(
      "grid gap-2",
      compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
    )}>
      {assets.map((asset) => {
        const isPositive = asset.changePercent >= 0;
        const isNeutral = asset.changePercent === 0;
        const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

        return (
          <div
            key={asset.symbol}
            className="group rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 transition-all hover:bg-[hsl(var(--secondary))] hover:border-[hsl(var(--muted))]"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                {asset.symbol}
              </span>
              <TrendIcon className={cn(
                "h-3.5 w-3.5",
                isPositive ? "text-positive" : isNeutral ? "text-[hsl(var(--muted-foreground))]" : "text-negative"
              )} />
            </div>
            <div className="text-base font-bold font-mono text-[hsl(var(--foreground))]">
              {formatAssetPrice(asset.symbol, asset.price)}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn("text-xs font-mono", isPositive ? "text-positive" : "text-negative")}>
                {formatPercent(asset.changePercent)}
              </span>
              {!compact && (
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{asset.name}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
