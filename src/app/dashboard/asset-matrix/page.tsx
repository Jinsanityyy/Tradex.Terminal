"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssetSnapshotGrid } from "@/components/shared/AssetSnapshotGrid";
import { useQuotes } from "@/hooks/useMarketData";
import { cn, formatNumber, formatPercent } from "@/lib/utils";
import { Grid3X3, TrendingUp, TrendingDown, Minus, Activity, Link2 } from "lucide-react";

const correlationMatrix = [
  { pair: "Gold ↔ DXY", correlation: -0.82, note: "Strong inverse  -  USD weakness drives gold higher" },
  { pair: "Gold ↔ US10Y", correlation: -0.65, note: "Inverse via real yields  -  rising yields pressure gold" },
  { pair: "SPX ↔ NDX", correlation: 0.95, note: "Highly correlated  -  tech leadership drives both" },
  { pair: "SPX ↔ VIX", correlation: -0.88, note: "Strong inverse  -  fear gauge rises as equities fall" },
  { pair: "DXY ↔ EURUSD", correlation: -0.97, note: "Near-perfect inverse  -  EUR is largest DXY component" },
  { pair: "BTC ↔ NDX", correlation: 0.62, note: "Moderate positive  -  risk appetite correlation" },
  { pair: "Oil ↔ USDCAD", correlation: -0.58, note: "Moderate inverse  -  CAD is petrocurrency" },
  { pair: "Gold ↔ BTC", correlation: 0.25, note: "Weak positive  -  both hedge narratives but different drivers" },
];

const macroRegimeNotes = [
  { label: "Risk Sentiment", value: "Risk-Off Lean", color: "text-red-400" },
  { label: "Rate Regime", value: "Dovish Pivot Phase", color: "text-emerald-400" },
  { label: "Inflation", value: "Disinflation Trend", color: "text-blue-400" },
  { label: "USD Regime", value: "Weakening Bias", color: "text-amber-400" },
  { label: "Volatility", value: "Elevated (VIX > 20)", color: "text-purple-400" },
];

export default function AssetMatrixPage() {
  const { quotes: assetSnapshots } = useQuotes();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Asset Matrix</h1>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">Cross-market relationships, correlations, and macro regime</p>
      </div>

      {/* Macro Regime Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {macroRegimeNotes.map((note) => (
          <Card key={note.label} className="gradient-card">
            <CardContent className="p-3">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] block mb-1">{note.label}</span>
              <span className={cn("text-xs font-semibold", note.color)}>{note.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Asset Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-[hsl(var(--primary))]" />
            <span>All Tracked Assets</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssetSnapshotGrid assets={assetSnapshots} />
        </CardContent>
      </Card>

      {/* Asset Detail Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[hsl(var(--accent))]" />
            <span>Asset Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  <th className="py-2 px-2 text-left text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Asset</th>
                  <th className="py-2 px-2 text-right text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Price</th>
                  <th className="py-2 px-2 text-right text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Change</th>
                  <th className="py-2 px-2 text-center text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Bias</th>
                  <th className="py-2 px-2 text-center text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Momentum</th>
                  <th className="py-2 px-2 text-center text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Class</th>
                </tr>
              </thead>
              <tbody>
                {assetSnapshots.map((asset) => {
                  const TrendIcon = asset.changePercent > 0 ? TrendingUp : asset.changePercent < 0 ? TrendingDown : Minus;
                  return (
                    <tr key={asset.symbol} className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/50 transition-colors">
                      <td className="py-2.5 px-2">
                        <div>
                          <span className="font-semibold text-[hsl(var(--foreground))]">{asset.symbol}</span>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))] ml-1.5">{asset.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-[hsl(var(--foreground))]">
                        {asset.symbol.includes("USD") && asset.price < 10 ? asset.price.toFixed(4) : formatNumber(asset.price, asset.price > 1000 ? 0 : 2)}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TrendIcon className={cn("h-3 w-3", asset.changePercent >= 0 ? "text-positive" : "text-negative")} />
                          <span className={cn("font-mono", asset.changePercent >= 0 ? "text-positive" : "text-negative")}>
                            {formatPercent(asset.changePercent)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant={asset.bias}>{asset.bias}</Badge>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <Badge variant={
                          asset.momentum === "strong" ? "bullish" :
                          asset.momentum === "moderate" ? "neutral" : "outline"
                        }>
                          {asset.momentum}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] uppercase">{asset.class}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Correlation Matrix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-purple-400" />
            <span>Correlation Matrix</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {correlationMatrix.map((c) => (
              <div key={c.pair} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[hsl(var(--foreground))]">{c.pair}</span>
                  <span className={cn(
                    "text-sm font-mono font-bold",
                    c.correlation > 0.5 ? "text-positive" :
                    c.correlation < -0.5 ? "text-negative" : "text-neutral-accent"
                  )}>
                    {c.correlation > 0 ? "+" : ""}{c.correlation.toFixed(2)}
                  </span>
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">{c.note}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
