"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EconomicEventTable } from "@/components/shared/EconomicEventTable";
import { CatalystFeed } from "@/components/shared/CatalystFeed";
import { TrumpFeedPanel } from "@/components/shared/TrumpFeedPanel";
import { NewsFeed } from "@/components/shared/NewsFeed";
import {
  useNews, useCatalysts, useEconomicCalendar, useTrumpPosts,
} from "@/hooks/useMarketData";
import { cn } from "@/lib/utils";
import {
  CalendarDays, Zap, UserCircle, Newspaper,
  Radio, Wifi, WifiOff, ArrowRight,
} from "lucide-react";
import Link from "next/link";

// ── Stat pill ──────────────────────────────────────────────────────────────────
function StatPill({
  icon: Icon,
  label,
  count,
  accentClass,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  accentClass: string;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px]",
      accentClass,
    )}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="font-semibold tabular-nums">{count}</span>
      <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
    </div>
  );
}

// ── Section header used inside the "All" tab ──────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  count,
  href,
  iconClass,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  href: string;
  iconClass: string;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", iconClass)} />
        <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{title}</span>
        {count !== undefined && (
          <Badge variant="outline" className="text-[9px]">{count}</Badge>
        )}
      </div>
      <Link
        href={href}
        className="flex items-center gap-1 text-[10px] text-[hsl(var(--primary))] hover:underline"
      >
        View All <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

export default function MarketIntelligencePage() {
  const { events, isLive: eventsLive } = useEconomicCalendar();
  const { catalysts, isLive: catalystsLive } = useCatalysts();
  const { posts: trumpPosts, isLive: trumpLive } = useTrumpPosts(60_000);
  const { news, isLive: newsLive } = useNews(60_000);

  const isLive = eventsLive || catalystsLive || trumpLive || newsLive;

  // Derived counts for stat pills
  const liveEvents      = events.filter(e => e.status === "live");
  const upcomingEvents  = events.filter(e => e.status === "upcoming");
  const liveCatalysts   = catalysts.filter(c => c.status === "live");
  const highSignalNews  = news.filter(n => n.impactScore >= 7);

  // Preview slices for the "All" tab
  const calendarPreview = [
    ...liveEvents,
    ...upcomingEvents,
    ...events.filter(e => e.status === "completed"),
  ].slice(0, 4);

  return (
    <div className="space-y-5">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Market Intelligence</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Unified feed  -  events, catalysts, Trump posts &amp; news
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {liveEvents.length > 0 && (
            <span className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-400">
              <Radio className="h-3 w-3 animate-pulse" />
              {liveEvents.length} LIVE EVENT{liveEvents.length > 1 ? "S" : ""}
            </span>
          )}
          {isLive ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
              <Wifi className="h-3 w-3" /> LIVE
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
              <WifiOff className="h-3 w-3" /> CACHED
            </span>
          )}
        </div>
      </div>

      {/* ── Stat pills ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <StatPill
          icon={CalendarDays}
          label={upcomingEvents.length > 0 ? "upcoming events" : "events today"}
          count={upcomingEvents.length || events.length}
          accentClass="border-blue-500/25 bg-blue-500/[0.06] text-blue-400"
        />
        <StatPill
          icon={Zap}
          label="live catalysts"
          count={liveCatalysts.length || catalysts.length}
          accentClass="border-amber-500/25 bg-amber-500/[0.06] text-amber-400"
        />
        <StatPill
          icon={UserCircle}
          label="trump posts"
          count={trumpPosts.length}
          accentClass="border-orange-500/25 bg-orange-500/[0.06] text-orange-400"
        />
        <StatPill
          icon={Newspaper}
          label="high-signal headlines"
          count={highSignalNews.length}
          accentClass="border-[hsl(var(--primary))]/25 bg-[hsl(var(--primary))]/[0.06] text-[hsl(var(--primary))]"
        />
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="events" className="gap-1">
            <CalendarDays className="h-3 w-3" /> Events
          </TabsTrigger>
          <TabsTrigger value="catalysts" className="gap-1">
            <Zap className="h-3 w-3" /> Catalysts
          </TabsTrigger>
          <TabsTrigger value="trump" className="gap-1">
            <UserCircle className="h-3 w-3" /> Trump
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-1">
            <Newspaper className="h-3 w-3" /> News
          </TabsTrigger>
        </TabsList>

        {/* ── ALL tab: 2-col grid preview ─────────────────────────────────── */}
        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Economic Events */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <SectionHeader
                  icon={CalendarDays}
                  title="Economic Events"
                  count={events.length}
                  href="/dashboard/economic-calendar"
                  iconClass="text-blue-400"
                />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <EconomicEventTable events={calendarPreview} compact />
              </CardContent>
            </Card>

            {/* Catalysts */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <SectionHeader
                  icon={Zap}
                  title="Market Catalysts"
                  count={catalysts.length}
                  href="/dashboard/catalysts"
                  iconClass="text-amber-400"
                />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <CatalystFeed catalysts={catalysts} limit={4} compact />
              </CardContent>
            </Card>

            {/* Trump Monitor */}
            <Card className="border-orange-500/10">
              <CardHeader className="pb-2 pt-3 px-4">
                <SectionHeader
                  icon={UserCircle}
                  title="Trump Monitor"
                  count={trumpPosts.length}
                  href="/dashboard/trump-monitor"
                  iconClass="text-orange-400"
                />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <TrumpFeedPanel posts={trumpPosts} limit={3} compact />
              </CardContent>
            </Card>

            {/* News Flow */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <SectionHeader
                  icon={Newspaper}
                  title="High-Signal News"
                  count={highSignalNews.length}
                  href="/dashboard/news-flow"
                  iconClass="text-[hsl(var(--primary))]"
                />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <NewsFeed items={highSignalNews} limit={4} compact />
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* ── EVENTS tab: full calendar ─────────────────────────────────────── */}
        <TabsContent value="events" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-blue-400" />
                Economic Calendar
                <Badge variant="outline" className="ml-auto">{events.length} events</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EconomicEventTable events={events} showInterpretation />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CATALYSTS tab: full feed ──────────────────────────────────────── */}
        <TabsContent value="catalysts" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-amber-400" />
                Market Catalysts
                {liveCatalysts.length > 0 && (
                  <span className="flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
                    <Radio className="h-2.5 w-2.5 animate-pulse" />
                    {liveCatalysts.length} LIVE
                  </span>
                )}
                <Badge variant="outline" className="ml-auto">{catalysts.length} total</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CatalystFeed catalysts={catalysts} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TRUMP tab: full feed ──────────────────────────────────────────── */}
        <TabsContent value="trump" className="mt-4">
          <Card className="border-orange-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <UserCircle className="h-4 w-4 text-orange-400" />
                Trump Policy Monitor
                <Badge variant="outline" className="ml-auto">{trumpPosts.length} posts</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrumpFeedPanel posts={trumpPosts} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NEWS tab: full feed ───────────────────────────────────────────── */}
        <TabsContent value="news" className="mt-4">
          {/* High signal section */}
          {highSignalNews.length > 0 && (
            <Card className="mb-4 border-amber-500/15">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-amber-400" />
                  High-Signal Headlines
                  <Badge variant="medium" className="ml-auto">{highSignalNews.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <NewsFeed items={highSignalNews} />
              </CardContent>
            </Card>
          )}

          {/* Full feed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Newspaper className="h-4 w-4 text-[hsl(var(--primary))]" />
                All Headlines
                <Badge variant="outline" className="ml-auto">{news.length} articles</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NewsFeed items={news} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
