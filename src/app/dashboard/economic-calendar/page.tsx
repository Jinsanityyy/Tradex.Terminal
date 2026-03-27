"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EconomicEventTable } from "@/components/shared/EconomicEventTable";
import { useEconomicCalendar } from "@/hooks/useMarketData";
import { CalendarDays, AlertCircle, Clock, Target, Wifi, WifiOff, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

export default function EconomicCalendarPage() {
  const { events, isLive, isLoading } = useEconomicCalendar();

  const completed = events.filter(e => e.status === "completed");
  const upcoming = events.filter(e => e.status === "upcoming" || e.status === "live");
  const live = events.filter(e => e.status === "live");

  // Count bias signals
  const goldBullish = events.filter(e => e.goldImpact === "bullish").length;
  const goldBearish = events.filter(e => e.goldImpact === "bearish").length;
  const overallGoldBias = goldBullish > goldBearish ? "bullish" : goldBearish > goldBullish ? "bearish" : "neutral";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Economic Calendar</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            High-impact USD events only — auto-analyzed for Gold & USD impact
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isLive ? "bullish" : "outline"} className="gap-1">
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : isLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isLive ? "LIVE" : "LOADING"}
          </Badge>
        </div>
      </div>

      {/* Gold Bias Summary from Events */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Card className="gradient-card">
          <CardContent className="p-3 flex items-center gap-3">
            <Target className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Calendar Gold Bias</p>
              <p className={`text-sm font-bold ${overallGoldBias === "bullish" ? "text-emerald-400" : overallGoldBias === "bearish" ? "text-red-400" : "text-zinc-400"}`}>
                {overallGoldBias.toUpperCase()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="gradient-card">
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Bullish Signals</p>
              <p className="text-sm font-bold text-emerald-400">{goldBullish} events</p>
            </div>
          </CardContent>
        </Card>
        <Card className="gradient-card">
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Bearish Signals</p>
              <p className="text-sm font-bold text-red-400">{goldBearish} events</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Events Alert */}
      {live.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 pulse-live" />
              <span className="text-amber-400">LIVE — Event In Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EconomicEventTable events={live} />
          </CardContent>
        </Card>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <span>Upcoming</span>
              <Badge variant="default" className="ml-auto">{upcoming.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EconomicEventTable events={upcoming} />
          </CardContent>
        </Card>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-500" />
              <span>Completed</span>
              <Badge variant="default" className="ml-auto">{completed.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EconomicEventTable events={completed} />
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {events.length === 0 && !isLoading && (
        <Card className="gradient-card">
          <CardContent className="p-8 text-center">
            <CalendarDays className="h-8 w-8 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1">No high-impact USD events this week</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Calendar refreshes automatically. Only high-impact USD events are shown.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
