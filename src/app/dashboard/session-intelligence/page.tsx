"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SessionSummaryCard } from "@/components/shared/SessionSummaryCard";
import { useSessions } from "@/hooks/useMarketData";
import { Clock, ArrowRight, Globe, MapPin, Loader2 } from "lucide-react";

export default function SessionIntelligencePage() {
  const { sessions, isLive, isLoading } = useSessions(60_000);

  const activeSession = sessions.find(s => s.status === "active");
  const closedSessions = sessions.filter(s => s.status === "closed");
  const upcomingSessions = sessions.filter(s => s.status === "upcoming");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">Session Intelligence</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Session handoffs, key levels and market behavior</p>
        </div>
        <Badge variant={isLive ? "bullish" : "outline"} className="gap-1">
          {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          <div className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
          {isLive ? "LIVE" : "LOADING"}
        </Badge>
      </div>

      {/* Session Handoff Flow */}
      <Card className="border-[hsl(var(--primary))]/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[hsl(var(--primary))]" />
            Session Handoff Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            {sessions.map((s, i) => (
              <React.Fragment key={s.session}>
                <div className={`rounded-md border px-3 py-2 ${
                  s.status === "active"
                    ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                }`}>
                  <span className={`text-xs font-semibold ${
                    s.status === "active" ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]"
                  }`}>
                    {s.session === "new-york" ? "New York" : s.session.charAt(0).toUpperCase() + s.session.slice(1)}
                  </span>
                  <span className={`text-[10px] block ${
                    s.status === "active" ? "text-[hsl(var(--primary))]/70" : "text-[hsl(var(--muted-foreground))]"
                  }`}>
                    {s.status}
                  </span>
                </div>
                {i < sessions.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Session */}
      {activeSession && (
        <div>
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--primary))] pulse-live" />
            Active Session
          </h2>
          <SessionSummaryCard session={activeSession} />
        </div>
      )}

      {/* Closed Sessions */}
      {closedSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">Completed Sessions</h2>
          <div className="space-y-3">
            {closedSessions.map((s) => (
              <SessionSummaryCard key={s.session} session={s} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">Upcoming Sessions</h2>
          <div className="space-y-3">
            {upcomingSessions.map((s) => (
              <SessionSummaryCard key={s.session} session={s} />
            ))}
          </div>
        </div>
      )}

      {/* Key Levels Aggregate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-amber-400" />
            Key Levels Across Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sessions.flatMap(s =>
              s.keyLevels.map((level, i) => (
                <div key={`${s.session}-${i}`} className="rounded-md bg-[hsl(var(--secondary))] p-2.5 flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-[hsl(var(--muted-foreground))] shrink-0">
                    {s.session === "new-york" ? "NY" : s.session.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="text-xs text-[hsl(var(--foreground))]">{level}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
