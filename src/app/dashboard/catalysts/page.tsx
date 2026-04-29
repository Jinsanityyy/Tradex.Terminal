"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CatalystFeed } from "@/components/shared/CatalystFeed";
import { NewsFeed } from "@/components/shared/NewsFeed";
import { LiveNewsTicker } from "@/components/shared/LiveNewsTicker";
import { EconomicEventTable } from "@/components/shared/EconomicEventTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEconomicCalendar, useCatalysts, useNews } from "@/hooks/useMarketData";
import { Zap, Radio, CheckCircle2, Clock, CalendarDays, Wifi, WifiOff, Newspaper, Tv, RotateCcw, ExternalLink } from "lucide-react";

const LIVE_CHANNELS = [
  { id: "bloomberg",    name: "Bloomberg TV",  embedUrl: "https://www.youtube.com/embed/iEpJwprxDdk?autoplay=1",      watchUrl: "https://www.youtube.com/watch?v=iEpJwprxDdk" },
  { id: "cnbc",         name: "CNBC",          embedUrl: "https://www.youtube.com/embed/kbeYeyt8IW0?autoplay=1",      watchUrl: "https://www.youtube.com/watch?v=kbeYeyt8IW0" },
  { id: "reuters",      name: "Reuters",       embedUrl: "https://www.youtube.com/embed/INDhdbMGeKU?autoplay=1",      watchUrl: "https://www.youtube.com/@Reuters/live" },
  { id: "aljazeera",    name: "Al Jazeera",    embedUrl: "https://www.youtube.com/embed/gCNeDWCI0vo?autoplay=1",      watchUrl: "https://www.youtube.com/watch?v=gCNeDWCI0vo" },
  { id: "yahoofinance", name: "Yahoo Finance", embedUrl: "https://www.youtube.com/embed/KQp-e_XQnDE?autoplay=1",      watchUrl: "https://www.youtube.com/watch?v=KQp-e_XQnDE" },
];

export default function CatalystsPage() {
  const { events: economicEvents } = useEconomicCalendar();
  const { catalysts, isLive: isCatalystsLive } = useCatalysts();
  const { news, isLive: isNewsLive } = useNews(60_000);
  const [activeChannel, setActiveChannel] = useState(LIVE_CHANNELS[0]);
  const [streamKey, setStreamKey] = useState(0);

  const liveCatalysts = catalysts.filter(c => c.status === "live");
  const completedCatalysts = catalysts.filter(c => c.status === "completed");
  const upcomingEvents = economicEvents.filter(e => e.status === "upcoming");
  const completedEvents = economicEvents.filter(e => e.status === "completed");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Catalysts</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Live and recent market-moving drivers</p>
        </div>
        <div className="flex items-center gap-1">
          {isCatalystsLive ? (
            <><Wifi className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-emerald-500 font-medium">LIVE FEED</span></>
          ) : (
            <><WifiOff className="h-3 w-3 text-amber-500" /><span className="text-[10px] text-amber-500 font-medium">CACHED</span></>
          )}
        </div>
      </div>

      {/* Live scrolling news ticker — always visible */}
      <LiveNewsTicker items={news} isLive={isNewsLive} />

      <Tabs defaultValue="news">
        <TabsList>
          <TabsTrigger value="news" className="gap-1.5">
            <Tv className="h-3 w-3" />
            Live TV
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
          </TabsTrigger>
          <TabsTrigger value="all">Catalysts</TabsTrigger>
          <TabsTrigger value="completed" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1">
            <Clock className="h-3 w-3" /> Upcoming
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-amber-400 pulse-live" />
                  <span>Live / Developing</span>
                  <Badge variant="medium" className="ml-auto">{liveCatalysts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CatalystFeed catalysts={liveCatalysts} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Recent Completed</span>
                  <Badge variant="default" className="ml-auto">{completedCatalysts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CatalystFeed catalysts={completedCatalysts} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="completed">
          <CatalystFeed catalysts={completedCatalysts} />
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-400" />
                <span>Next High-Impact Events</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EconomicEventTable events={upcomingEvents} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Compact video panel */}
            <div className="rounded-xl border border-white/8 overflow-hidden bg-black flex flex-col">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/6 bg-[#0a0b0e] shrink-0">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Live TV</span>
                <div className="flex gap-1 ml-2 flex-1 flex-wrap">
                  {LIVE_CHANNELS.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => { setActiveChannel(ch); setStreamKey(k => k + 1); }}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-semibold transition-all border ${
                        activeChannel.id === ch.id
                          ? "bg-red-500/15 border-red-500/30 text-red-300"
                          : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-white/10"
                      }`}
                    >
                      {ch.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setStreamKey(k => k + 1)}
                  title="Reload stream"
                  className="ml-auto text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  key={`${activeChannel.id}-${streamKey}`}
                  src={activeChannel.embedUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={activeChannel.name}
                />
                {/* Fallback: always-visible "Watch on YouTube" button */}
                <a
                  href={activeChannel.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-100 opacity-70"
                  style={{ background: "rgba(0,0,0,0.75)", color: "#fff", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  <ExternalLink className="h-3 w-3" />
                  Watch on YouTube
                </a>
              </div>
            </div>

            {/* Live headlines beside the video */}
            <Card className="overflow-hidden flex flex-col">
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Newspaper className="h-3.5 w-3.5" />
                  <span>Live Headlines</span>
                  <div className="ml-auto flex items-center gap-1">
                    {isNewsLive
                      ? <><Wifi className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-emerald-500">60s</span></>
                      : <WifiOff className="h-3 w-3 text-amber-500" />
                    }
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto" style={{ maxHeight: "420px" }}>
                <NewsFeed items={news} compact />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Completed Events with Full Results — only show when events exist */}
      {completedEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[hsl(var(--primary))]" />
              <span>Completed Events — Full Results & Impact</span>
              <Badge variant="default" className="ml-auto">{completedEvents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EconomicEventTable events={completedEvents} showInterpretation />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
