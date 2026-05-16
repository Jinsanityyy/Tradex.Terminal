"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EconomicEventTable } from "@/components/shared/EconomicEventTable";
import { useEconomicCalendar } from "@/hooks/useMarketData";
import { useSettings } from "@/contexts/SettingsContext";
import { getSymbolLabel, getEventImpactForSymbol } from "@/lib/assetImpact";
import { CalendarDays, AlertCircle, Clock, Target, Wifi, WifiOff, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EconomicCalendarPage() {
  const { events, isLive, isLoading } = useEconomicCalendar();
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";
  const assetLabel = getSymbolLabel(selectedSymbol);
  const [selectedDate, setSelectedDate] = useState<string>("all");

  // Get unique dates from events
  const availableDates = useMemo(() => {
    const dates = [...new Set(events.map(e => e.date))].sort();
    return dates;
  }, [events]);

  // Filter by selected date
  const filteredEvents = useMemo(() => {
    if (selectedDate === "all") return events;
    return events.filter(e => e.date === selectedDate);
  }, [events, selectedDate]);

  const completed = filteredEvents.filter(e => e.status === "completed");
  const upcoming = filteredEvents.filter(e => e.status === "upcoming" || e.status === "live");
  const live = filteredEvents.filter(e => e.status === "live");

  // Count bias signals for selected asset
  const assetBiasMap = useMemo(() => {
    let bullish = 0;
    let bearish = 0;
    for (const e of filteredEvents) {
      const impact = getEventImpactForSymbol(e, selectedSymbol).impact;
      if (impact === "bullish") bullish++;
      else if (impact === "bearish") bearish++;
    }
    return { bullish, bearish };
  }, [filteredEvents, selectedSymbol]);
  const overallGoldBias = assetBiasMap.bullish > assetBiasMap.bearish ? "bullish" : assetBiasMap.bearish > assetBiasMap.bullish ? "bearish" : "neutral";

  function formatDateLabel(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (dateStr === today.toISOString().split("T")[0]) return "Today";
    if (dateStr === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
    if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Economic Calendar</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            High-impact events — auto-analyzed for {assetLabel} & USD impact
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isLive ? "bullish" : "outline"} className="gap-1">
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : isLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isLive ? "LIVE" : "LOADING"}
          </Badge>
        </div>
      </div>

      {/* Date filter tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => setSelectedDate("all")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all border",
            selectedDate === "all"
              ? "bg-[hsl(var(--primary))]/15 border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))]"
              : "border-white/8 text-zinc-500 hover:text-zinc-300"
          )}
        >
          All ({events.length})
        </button>
        {availableDates.map(date => {
          if (!date) return null;
          const count = events.filter(e => e.date === date).length;
          const hasUpcoming = events.filter(e => e.date === date && (e.status === "upcoming" || e.status === "live")).length > 0;
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date as string)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all border",
                selectedDate === date
                  ? "bg-[hsl(var(--primary))]/15 border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))]"
                  : "border-white/8 text-zinc-500 hover:text-zinc-300"
              )}
            >
              {formatDateLabel(date as string)}
              {hasUpcoming && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />}
              <span className="ml-1 text-zinc-700">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Asset Bias Summary from Events */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Card className="gradient-card">
          <CardContent className="p-3 flex items-center gap-3">
            <Target className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Calendar {assetLabel} Bias</p>
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
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Bullish for {assetLabel}</p>
              <p className="text-sm font-bold text-emerald-400">{assetBiasMap.bullish} events</p>
            </div>
          </CardContent>
        </Card>
        <Card className="gradient-card">
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Bearish for {assetLabel}</p>
              <p className="text-sm font-bold text-red-400">{assetBiasMap.bearish} events</p>
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
              <span className="text-amber-400">LIVE  -  Event In Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EconomicEventTable events={live} symbol={selectedSymbol} />
          </CardContent>
        </Card>
      )}

      {/* Upcoming */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span>Upcoming</span>
            <Badge variant="default" className="ml-auto">{upcoming.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length > 0 ? (
            <EconomicEventTable events={upcoming} symbol={selectedSymbol} />
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <Clock className="h-5 w-5 text-zinc-700" />
              <p className="text-xs text-zinc-500">No upcoming events scheduled</p>
              <p className="text-[10px] text-zinc-600">Next week&apos;s calendar is usually published Sunday night  -  check back then.</p>
            </div>
          )}
        </CardContent>
      </Card>

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
            <EconomicEventTable events={completed} symbol={selectedSymbol} />
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
