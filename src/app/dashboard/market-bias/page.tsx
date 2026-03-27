"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BiasCard } from "@/components/shared/BiasCard";
import { SupportInvalidationCard } from "@/components/shared/SupportInvalidationCard";
import { ConvictionMeter } from "@/components/shared/ConvictionMeter";
import { useMarketBias } from "@/hooks/useMarketData";
import { cn, formatNumber } from "@/lib/utils";
import { Target, Link2, MapPin, TrendingUp, Activity, Wifi, WifiOff } from "lucide-react";

export default function MarketBiasPage() {
  const [selected, setSelected] = useState(0);
  const { biasData, isLive, isLoading } = useMarketBias();
  const current = biasData.length > 0 ? biasData[selected] : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Market Bias</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Directional interpretation and conviction for tracked assets</p>
        </div>
        <div className="flex items-center gap-1">
          {isLive ? (
            <><Wifi className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-emerald-500 font-medium">LIVE ANALYSIS</span></>
          ) : (
            <><WifiOff className="h-3 w-3 text-amber-500" /><span className="text-[10px] text-amber-500 font-medium">CACHED</span></>
          )}
        </div>
      </div>

      {/* Asset Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {biasData.map((b, i) => (
          <button
            key={b.asset}
            onClick={() => setSelected(i)}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs font-medium transition-all",
              i === selected
                ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
            )}
          >
            {b.asset}
          </button>
        ))}
      </div>

      {/* Main 3-Panel Layout: Bias | Support | Invalidation */}
      {!current ? (
        <Card className="gradient-card p-8 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{isLoading ? "Loading bias analysis..." : "Awaiting market data..."}</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* A. BIAS */}
            <Card className="gradient-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[hsl(var(--primary))]" />
                  Current Bias
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center py-2">
                  <ConvictionMeter value={current.confidence} label="Confidence" size="lg" />
                </div>
                <div className="text-center">
                  <Badge variant={current.bias} className="text-sm px-4 py-1">{current.bias.toUpperCase()}</Badge>
                </div>
                <div className="text-center">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">{current.asset}</span>
                </div>

                {/* Key Levels */}
                <div className="rounded-md bg-[hsl(var(--secondary))] p-3 space-y-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Key Levels</span>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">Support</span>
                      <span className="text-sm font-mono font-bold text-emerald-400">{formatNumber(current.keyLevels.support)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">Resistance</span>
                      <span className="text-sm font-mono font-bold text-red-400">{formatNumber(current.keyLevels.resistance)}</span>
                    </div>
                  </div>
                </div>

                {/* Session Behavior */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] block mb-1">Session Behavior</span>
                  <p className="text-[11px] text-[hsl(var(--foreground))]">{current.sessionBehavior}</p>
                </div>
              </CardContent>
            </Card>

            {/* B. SUPPORT */}
            <SupportInvalidationCard type="support" items={current.supportingFactors} />

            {/* C. INVALIDATION */}
            <SupportInvalidationCard type="invalidation" items={current.invalidationFactors} />
          </div>

          {/* Secondary Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[hsl(var(--accent))]" />
                  Macro Drivers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {current.macroDrivers.map((d) => (
                    <Badge key={d} variant="outline">{d}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-purple-400" />
                  Correlated Assets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {current.correlatedAssets.map((a) => (
                    <span key={a} className="text-xs font-mono px-2 py-1 rounded-md bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]">
                      {a}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
