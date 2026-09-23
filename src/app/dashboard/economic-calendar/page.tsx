"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EconomicEventTable } from "@/components/shared/EconomicEventTable";
import { useEconomicCalendar } from "@/hooks/useMarketData";
import { useSettings } from "@/contexts/SettingsContext";
import { getSymbolLabel, getEventImpactForSymbol } from "@/lib/assetImpact";
import { CalendarDays, AlertCircle, Clock, Target, Wifi, WifiOff, TrendingUp, TrendingDown, Loader2, Search, History, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EconomicEvent } from "@/types";

export default function EconomicCalendarPage() {
  const { events, isLive, isLoading } = useEconomicCalendar();
  const { settings } = useSettings();
  const selectedSymbol = settings.selectedSymbol ?? "XAUUSD";
  const assetLabel = getSymbolLabel(selectedSymbol);
  const [selectedDate, setSelectedDate] = useState<string>("all");

  // ── Archive search ──────────────────────────────────────────────────────────
  // The live feed only carries this week and next, so reviewing a past release
  // means querying the archive rather than filtering what is already on screen.
  const [query, setQuery]       = useState("");
  // ?q=FOMC (from the command bar) opens straight into an archive search.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q.slice(0, 60));
  }, []);
  const [history, setHistory]   = useState<EconomicEvent[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const term = q.trim();
    if (!term) { setHistory(null); setSearchErr(null); return; }
    setSearching(true);
    setSearchErr(null);
    try {
      const res = await fetch(`/api/market/calendar/history?q=${encodeURIComponent(term)}&limit=60`);
      if (!res.ok) throw new Error(res.status === 503 ? "Archive not available yet" : "Search failed");
      const json = await res.json();
      setHistory(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setSearchErr(e instanceof Error ? e.message : "Search failed");
      setHistory([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced so typing "fomc" fires one request, not four.
  useEffect(() => {
    const t = setTimeout(() => void runSearch(query), 350);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const isSearching = query.trim().length > 0;

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

      {/* Archive search  -  past releases and their outcomes */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search past releases — try FOMC, CPI, NFP, jobs"
            className="w-full rounded-lg border border-white/8 bg-white/[0.03] py-2 pl-9 pr-9 text-[12px] text-[hsl(var(--foreground))] placeholder:text-zinc-600 focus:border-[hsl(var(--primary))]/40 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isSearching && (
          <Card className="gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs">
                <History className="h-3.5 w-3.5 text-violet-400" />
                Archive
                {searching && <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />}
                {!searching && history && (
                  <span className="text-[10px] font-normal text-zinc-500">
                    {history.length} {history.length === 1 ? "release" : "releases"}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {searchErr ? (
                <p className="py-3 text-[11px] text-amber-400/80">{searchErr}</p>
              ) : !searching && history && history.length === 0 ? (
                <p className="py-3 text-[11px] text-zinc-500">
                  Nothing archived for “{query.trim()}” yet. The archive fills as events pass, and is seeded
                  from published data for major releases.
                </p>
              ) : history && history.length > 0 ? (
                <EconomicEventTable events={history} showInterpretation symbol={selectedSymbol} />
              ) : null}
            </CardContent>
          </Card>
        )}
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
