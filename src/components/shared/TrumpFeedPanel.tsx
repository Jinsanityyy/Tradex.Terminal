"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn, timeAgo } from "@/lib/utils";
import { UserCircle, AlertTriangle, ArrowRight, Flame } from "lucide-react";
import type { TrumpPost } from "@/types";

interface TrumpFeedPanelProps {
  posts: TrumpPost[];
  limit?: number;
  compact?: boolean;
}

export function TrumpFeedPanel({ posts, limit, compact = false }: TrumpFeedPanelProps) {
  const items = limit ? posts.slice(0, limit) : posts;

  return (
    <div className="space-y-2">
      {items.map((post) => (
        <Card key={post.id} className={cn(
          "transition-all hover:border-amber-500/30",
          post.impactScore >= 8 && "border-amber-500/20 bg-amber-500/[0.02]"
        )}>
          <CardContent className="p-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{post.source}</span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{timeAgo(post.timestamp)}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant={post.sentimentClassification}>{post.sentimentClassification}</Badge>
                <div className="flex items-center gap-0.5">
                  <Flame className={cn("h-3 w-3", post.impactScore >= 7 ? "text-amber-400" : "text-[hsl(var(--muted-foreground))]")} />
                  <span className="text-[10px] font-mono font-semibold text-[hsl(var(--foreground))]">{post.impactScore}/10</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed mb-2 font-medium">
              &ldquo;{post.content}&rdquo;
            </p>

            {!compact && (
              <>
                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <Badge variant="outline" className="text-[10px]">{post.policyCategory}</Badge>
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Why it matters */}
                <div className="space-y-1.5 mb-2">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-amber-400" />
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-amber-400 block">Why This Matters</span>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">{post.whyItMatters}</p>
                    </div>
                  </div>
                </div>

                {/* Reaction + Assets */}
                <div className="flex items-start gap-1.5 mb-2">
                  <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-[hsl(var(--muted-foreground))]" />
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{post.potentialReaction}</p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Affected:</span>
                  {post.affectedAssets.slice(0, 5).map((a) => (
                    <span key={a} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]">
                      {a}
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Compact Trump impact preview card for the dashboard
export function TrumpImpactPreview({ posts }: { posts: TrumpPost[] }) {
  const latestHigh = posts.filter(p => p.impactScore >= 7).slice(0, 1)[0];
  const avgImpact = Math.round(posts.reduce((s, p) => s + p.impactScore, 0) / posts.length);

  const themes = posts.reduce((acc, p) => {
    acc[p.policyCategory] = (acc[p.policyCategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topTheme = Object.entries(themes).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  return (
    <Card className="border-amber-500/20 bg-amber-500/[0.02]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-amber-400" />
          <span>Trump Impact Monitor</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Avg Impact</span>
          <div className="flex items-center gap-2">
            <Progress value={avgImpact * 10} className="w-16 h-1.5" indicatorClassName="bg-amber-500" />
            <span className="text-xs font-mono font-bold text-amber-400">{avgImpact}/10</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Top Theme</span>
          <Badge variant="outline" className="text-[10px]">{topTheme}</Badge>
        </div>
        {latestHigh && (
          <div className="rounded-md bg-[hsl(var(--secondary))] p-2">
            <p className="text-[11px] text-[hsl(var(--foreground))] leading-relaxed line-clamp-2">
              &ldquo;{latestHigh.content.slice(0, 120)}...&rdquo;
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
