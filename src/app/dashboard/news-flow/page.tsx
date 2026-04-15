"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewsFeed } from "@/components/shared/NewsFeed";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNews } from "@/hooks/useMarketData";
import { cn } from "@/lib/utils";
import { Newspaper, Filter, Sparkles, Rss, Wifi, WifiOff } from "lucide-react";

const categories = ["all", "central-banks", "economy", "tariffs", "geopolitics", "inflation", "crypto", "commodities"];

export default function NewsFlowPage() {
  const [category, setCategory] = useState("all");
  const { news: newsItems, isLive } = useNews(60_000);

  const filtered = category === "all"
    ? newsItems
    : newsItems.filter(n => n.category === category);

  const highSignal = newsItems.filter(n => n.impactScore >= 7);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--foreground))]">News Flow</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Macro news and headline tracker</p>
        </div>
        <div className="flex items-center gap-1">
          {isLive ? (
            <><Wifi className="h-3 w-3 text-emerald-500" /><span className="text-[10px] text-emerald-500 font-medium">LIVE FEED</span></>
          ) : (
            <><WifiOff className="h-3 w-3 text-amber-500" /><span className="text-[10px] text-amber-500 font-medium">CACHED</span></>
          )}
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-all",
              category === cat
                ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
            )}
          >
            {cat.replace("-", " ")}
          </button>
        ))}
      </div>

      <Tabs defaultValue="smart">
        <TabsList>
          <TabsTrigger value="smart" className="gap-1">
            <Sparkles className="h-3 w-3" /> Smart Summary
          </TabsTrigger>
          <TabsTrigger value="raw" className="gap-1">
            <Rss className="h-3 w-3" /> Raw Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smart">
          <div className="space-y-3">
            {/* High Signal */}
            <Card className="border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-400">High Signal Headlines</span>
                  <Badge variant="medium" className="ml-auto">{highSignal.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <NewsFeed items={highSignal} />
              </CardContent>
            </Card>

            {/* By Category Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {["central-banks", "tariffs", "geopolitics", "economy"].map((cat) => {
                const catItems = newsItems.filter(n => n.category === cat);
                if (catItems.length === 0) return null;
                return (
                  <Card key={cat}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <Newspaper className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="capitalize">{cat.replace("-", " ")}</span>
                        <Badge variant="outline" className="ml-auto">{catItems.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <NewsFeed items={catItems} compact />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="raw">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-14 gap-3">
              <div className="h-12 w-12 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center">
                <Newspaper className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">No posts matching this filter.</p>
            </div>
          ) : (
            <NewsFeed items={filtered} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
