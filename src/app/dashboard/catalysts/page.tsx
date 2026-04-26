"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CatalystFeed } from "@/components/shared/CatalystFeed";
import { NewsFeed } from "@/components/shared/NewsFeed";
import { LiveNewsTicker } from "@/components/shared/LiveNewsTicker";
import { EconomicEventTable } from "@/components/shared/EconomicEventTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEconomicCalendar, useCatalysts, useNews } from "@/hooks/useMarketData";
import { Zap, Radio, CheckCircle2, Clock, CalendarDays, Wifi, WifiOff, Newspaper, Tv } from "lucide-react";

const LIVE_CHANNELS = [
  { id: "bloomberg", name: "Bloomberg TV", embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCIALMKvObZNtJ6AmdCLP7Lg&autoplay=1" },
  { id: "cnbc",      name: "CNBC",         embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCrp_UI8XtuYfpiqluWLD7Lw&autoplay=1" },
  { id: "reuters",   name: "Reuters",      embedUrl: "https://www.youtube.com/embed/live_stream?channel=UChqUTb7kYRX8-EiaN3XFrSQ&autoplay=1" },
  { id: "aljazeera", name: "Al Jazeera",   embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJdse18g&autoplay=1" },
];

export default function CatalystsPage() {
  const { events: economicEvents } = useEconomicCalendar();
  const { catalysts, isLive: isCatalystsLive } = useCatalysts();
  const { news, isLive: isNewsLive } = useNews(60_000);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeChannel, setActiveChannel] = useState(LIVE_CHANNELS[0]);

  useEffect(() => {
    if (isNewsLive) setLastUpdated(new Date());
  }, [news, isNewsLive]);

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
            <div className="rounded-xl border border-white/8 overflow-hidden bg-black">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/6 bg-[#0a0b0e]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Live TV</span>
                <div className="flex gap-1 ml-2">
                  {LIVE_CHANNELS.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChannel(ch)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                        activeChannel.id === ch.id ? "bg-white/15 text-white" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {ch.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  key={activeChannel.id}
                  src={activeChannel.embedUrl}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={activeChannel.name}
                />
              </div>
            </div>

            {/* Live headlines beside the video */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
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
              <CardContent className="max-h-[360px] overflow-y-auto">
                <NewsFeed items={news} compact />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Completed Events with Full Results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[hsl(var(--primary))]" />
            <span>Completed Events — Full Results & Impact</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EconomicEventTable events={completedEvents} showInterpretation />
        </CardContent>
      </Card>
    </div>
  );
}
