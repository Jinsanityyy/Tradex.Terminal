"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CatalystFeed } from "@/components/shared/CatalystFeed";
import { EconomicEventTable } from "@/components/shared/EconomicEventTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEconomicCalendar, useCatalysts } from "@/hooks/useMarketData";
import { Zap, Radio, CheckCircle2, Clock, CalendarDays, Wifi, WifiOff } from "lucide-react";

export default function CatalystsPage() {
  const { events: economicEvents } = useEconomicCalendar();
  const { catalysts, isLive: isCatalystsLive } = useCatalysts();
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

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="live" className="gap-1">
            <Radio className="h-3 w-3" /> Live
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> Completed
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-1">
            <Clock className="h-3 w-3" /> Upcoming
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Live / Developing */}
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

            {/* Recent Completed */}
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

        <TabsContent value="live">
          <CatalystFeed catalysts={liveCatalysts} />
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
