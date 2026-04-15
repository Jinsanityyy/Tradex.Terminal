"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrumpFeedPanel } from "@/components/shared/TrumpFeedPanel";
import { ConvictionMeter } from "@/components/shared/ConvictionMeter";
import { useTrumpPosts } from "@/hooks/useMarketData";
import { cn } from "@/lib/utils";
import { UserCircle, Filter, Hash, TrendingUp, Wifi, WifiOff } from "lucide-react";

const filterTags = ["all", "tariffs", "china", "fed", "crypto", "oil", "trade-policy", "geopolitics"];

export default function TrumpMonitorPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const { posts: trumpPosts, isLive } = useTrumpPosts(60_000);

  const filtered = activeFilter === "all"
    ? trumpPosts
    : trumpPosts.filter(p => p.tags.includes(activeFilter) || p.policyCategory.toLowerCase() === activeFilter);

  const avgImpact = trumpPosts.length > 0 ? Math.round(trumpPosts.reduce((s, p) => s + p.impactScore, 0) / trumpPosts.length) : 0;

  // Theme detection
  const themes = trumpPosts.reduce((acc, p) => {
    acc[p.policyCategory] = (acc[p.policyCategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedThemes = Object.entries(themes).sort((a, b) => b[1] - a[1]);

  // Tag clusters
  const tagCounts = trumpPosts.reduce((acc, p) => {
    p.tags.forEach(t => { acc[t] = (acc[t] || 0) + 1; });
    return acc;
  }, {} as Record<string, number>);
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Sentiment breakdown
  const sentiments = trumpPosts.reduce((acc, p) => {
    acc[p.sentimentClassification] = (acc[p.sentimentClassification] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-amber-400" />
            Trump Monitor
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Market-moving posts, policy signals, and impact analysis</p>
        </div>
        <div className="flex items-center gap-1">
          {isLive ? (
            <><Wifi className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-emerald-500 font-medium">LIVE FEED</span></>
          ) : (
            <><WifiOff className="h-3 w-3 text-amber-500" /><span className="text-[10px] text-amber-500 font-medium">CACHED</span></>
          )}
        </div>
      </div>

      {/* Impact Score + Theme + Sentiment Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="gradient-card flex flex-col items-center justify-center p-4">
          <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Trump Impact Score</span>
          <ConvictionMeter value={avgImpact * 10} label="AVG" size="md" />
          <span className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{avgImpact}/10 average</span>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              Current Themes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedThemes.map(([theme, count]) => (
              <div key={theme} className="flex items-center justify-between">
                <span className="text-xs text-[hsl(var(--foreground))]">{theme}</span>
                <div className="flex items-center gap-2">
                  <Progress value={(count / trumpPosts.length) * 100} className="w-20 h-1.5" indicatorClassName="bg-amber-500" />
                  <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">{count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-purple-400" />
              Mention Clusters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {topTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => setActiveFilter(tag)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[10px] font-mono transition-all",
                    activeFilter === tag
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                      : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                  )}
                >
                  #{tag} <span className="text-[hsl(var(--muted-foreground))]">({count})</span>
                </button>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Sentiment</span>
              <div className="flex items-center gap-3">
                {Object.entries(sentiments).map(([s, c]) => (
                  <div key={s} className="flex items-center gap-1">
                    <Badge variant={s as "bullish" | "bearish" | "neutral"}>{s}</Badge>
                    <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
        {filterTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveFilter(tag)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-all",
              activeFilter === tag
                ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Feed */}
      <TrumpFeedPanel posts={filtered} />
    </div>
  );
}
