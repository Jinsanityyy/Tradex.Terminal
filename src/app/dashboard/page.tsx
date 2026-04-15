"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalystFeed } from "@/components/shared/CatalystFeed";
import { AssetSnapshotGrid } from "@/components/shared/AssetSnapshotGrid";
import { SessionSummaryCard } from "@/components/shared/SessionSummaryCard";
import { TradeContextBox } from "@/components/shared/TradeContextBox";
import { EconomicEventTable } from "@/components/shared/EconomicEventTable";
import { TrumpImpactPreview } from "@/components/shared/TrumpFeedPanel";
import { SentimentBadge, RegimeBadge } from "@/components/shared/RegimeBadge";
import { BrainTerminal } from "@/components/brain/BrainTerminal";
import {
  useQuotes, useEconomicCalendar, useTrumpPosts,
  useMarketBias, useCatalysts, useSessions,
  useMarketAnalysis,
} from "@/hooks/useMarketData";
import { cn } from "@/lib/utils";
import {
  BarChart3, Zap, CalendarDays, ArrowRight,
  Maximize2, Minimize2, RefreshCw, Wifi, WifiOff, Sparkles, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { TradingViewChart } from "@/components/shared/TradingViewChart";

export default function DashboardPage() {
  const { quotes } = useQuotes();
  const { events } = useEconomicCalendar();
  const { posts: trumpPosts } = useTrumpPosts();
  const { biasData } = useMarketBias();
  const { catalysts } = useCatalysts();
  const { sessions } = useSessions();
  const {
    tradeContext, sentiment,
    generatedAt, isLive: isAnalysisLive,
    generateFresh, narrative,
  } = useMarketAnalysis();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const upcomingEvents  = events.filter(e => e.status === "upcoming" || e.status === "live");
  const completedEvents = events.filter(e => e.status === "completed");
  // Show upcoming first; if nothing upcoming yet, fall back to most-recent completed
  const calendarPreview = upcomingEvents.length > 0 ? upcomingEvents.slice(0, 5) : completedEvents.slice(0, 5);
  const goldBias = biasData.length > 0 ? biasData[0] : null;
  const activeSessions = sessions.filter(s => s.status === "active" || s.status === "closed");

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Generate fresh analysis — triggers both market analysis + multi-agent brain
  const handleGenerateAnalysis = useCallback(async () => {
    setIsGenerating(true);
    try {
      // Run market analysis + multi-agent brain in parallel
      await Promise.allSettled([
        generateFresh(),
        fetch("/api/agents/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: "XAUUSD", timeframe: "H1", forceRefresh: true }),
        }),
        fetch("/api/agents/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: "EURUSD", timeframe: "H1", forceRefresh: true }),
        }),
      ]);
    } catch (e) {
      console.error("Failed to generate analysis:", e);
    } finally {
      setIsGenerating(false);
    }
  }, [generateFresh]);

  // Format "generated at" time
  const genTime = generatedAt
    ? new Date(generatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    : null;

  return (
    <div className="w-full space-y-5">

      {/* ── COMMAND CENTER HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Command Center</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Real-time market intelligence overview</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          <div className="flex items-center gap-1 mr-1">
            {isAnalysisLive ? (
              <><Wifi className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-emerald-500 font-medium">LIVE</span></>
            ) : (
              <><WifiOff className="h-3 w-3 text-amber-500" /><span className="text-[10px] text-amber-500 font-medium">CACHED</span></>
            )}
          </div>

          {/* Sentiment + Regime from live analysis */}
          <SentimentBadge sentiment={sentiment} />
          <RegimeBadge regime={narrative.regime} />

          {/* Generate Analysis button */}
          <button
            onClick={handleGenerateAnalysis}
            disabled={isGenerating}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-all",
              isGenerating
                ? "border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/5 text-[hsl(var(--primary))]/50 cursor-wait"
                : "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/20"
            )}
          >
            {isGenerating ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {isGenerating ? "Generating..." : "Generate Analysis"}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="rounded-md border border-[hsl(var(--border))] p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition-all"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Generated at timestamp */}
      {genTime && (
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] -mt-3">
          Analysis generated at {genTime}
        </p>
      )}

      {/* Gold Chart — full width */}
      <Card className="overflow-hidden border-[hsl(var(--border))]">
        <CardHeader className="pb-0 px-4 pt-3 flex flex-row items-center justify-between border-b border-[hsl(var(--border))]/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[hsl(var(--primary))]" />
            <span className="text-sm font-semibold text-[hsl(var(--foreground))]">XAU/USD</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Gold Spot · 1H · New York</span>
          </div>
          <div className="flex items-center gap-3">
            {goldBias && (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded ${
                goldBias.bias === "bullish" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                goldBias.bias === "bearish" ? "bg-red-500/15 text-red-400 border border-red-500/20" :
                "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20"
              }`}>
                {goldBias.bias?.toUpperCase()} · {goldBias.confidence}% CONVICTION
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TradingViewChart symbol="OANDA:XAUUSD" height={900} />
        </CardContent>
      </Card>

      {/* Multi-Agent Brain — below chart */}
      <BrainTerminal />

      {/* Catalysts + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span>Top Catalysts</span>
              </div>
              <Link href="/dashboard/catalysts" className="text-[10px] text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CatalystFeed catalysts={catalysts} limit={4} compact />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-400" />
                <span>{upcomingEvents.length > 0 ? "Upcoming Events" : "Recent Events"}</span>
              </div>
              <Link href="/dashboard/economic-calendar" className="text-[10px] text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
                Calendar <ArrowRight className="h-3 w-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EconomicEventTable events={calendarPreview} compact />
          </CardContent>
        </Card>
      </div>

      {/* Cross-Asset Snapshot */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" />
              <span>Cross-Asset Snapshot</span>
            </div>
            <Link href="/dashboard/asset-matrix" className="text-[10px] text-[hsl(var(--primary))] hover:underline flex items-center gap-1">
              Full Matrix <ArrowRight className="h-3 w-3" />
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssetSnapshotGrid assets={quotes} />
        </CardContent>
      </Card>

      {/* Sessions + Trump + AI Trade Context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-1 space-y-3">
          <TrumpImpactPreview posts={trumpPosts} />
          <TradeContextBox context={tradeContext} />
        </div>
        <div className="lg:col-span-2 space-y-3">
          {activeSessions.map((s) => (
            <SessionSummaryCard key={s.session} session={s} compact />
          ))}
          {sessions.filter(s => s.status === "upcoming").map((s) => (
            <SessionSummaryCard key={s.session} session={s} compact />
          ))}
        </div>
      </div>

    </div>
  );
}
