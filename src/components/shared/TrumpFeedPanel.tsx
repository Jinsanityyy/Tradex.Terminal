"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn, timeAgo } from "@/lib/utils";
import { UserCircle, AlertTriangle, ArrowRight, Flame, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { TrumpPost } from "@/types";
import { DetailModal } from "./DetailModal";

interface TrumpFeedPanelProps {
  posts: TrumpPost[];
  limit?: number;
  compact?: boolean;
}

function TrumpPostDetail({ post }: { post: TrumpPost }) {
  const sentimentIcon = post.sentimentClassification === "bullish"
    ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
    : post.sentimentClassification === "bearish"
    ? <TrendingDown className="h-3.5 w-3.5 text-red-400" />
    : <Minus className="h-3.5 w-3.5 text-zinc-400" />;

  return (
    <div className="space-y-4">
      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <UserCircle className="h-4 w-4 text-amber-400" />
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">{post.source}</span>
        </div>
        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{timeAgo(post.timestamp)}</span>
        <Badge variant={post.sentimentClassification} className="ml-auto">{post.sentimentClassification}</Badge>
        <div className="flex items-center gap-1">
          <Flame className={cn("h-3.5 w-3.5", post.impactScore >= 7 ? "text-amber-400" : "text-[hsl(var(--muted-foreground))]")} />
          <span className="text-xs font-mono font-bold text-[hsl(var(--foreground))]">{post.impactScore}/10</span>
        </div>
      </div>

      {/* Impact bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Market Impact Score</span>
          <span className="text-[10px] font-mono font-bold text-amber-400">{post.impactScore}/10</span>
        </div>
        <Progress value={post.impactScore * 10} className="h-2" indicatorClassName="bg-amber-500" />
      </div>

      {/* Full quote */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
        <p className="text-sm text-[hsl(var(--foreground))] leading-relaxed font-medium">
          &ldquo;{post.content}&rdquo;
        </p>
      </div>

      {/* Policy category + tags */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline">{post.policyCategory}</Badge>
        {post.tags.map((tag) => (
          <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
            #{tag}
          </span>
        ))}
      </div>

      {/* Why it matters */}
      <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Why This Matters</span>
        </div>
        <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{post.whyItMatters}</p>
      </div>

      {/* Market reaction */}
      <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
        <div className="flex items-center gap-1.5">
          {sentimentIcon}
          <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">Expected Market Reaction</span>
        </div>
        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{post.potentialReaction}</p>
      </div>

      {/* Affected assets */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Affected Assets</p>
        <div className="flex flex-wrap gap-1.5">
          {post.affectedAssets.map((a) => (
            <span key={a} className="text-[10px] font-mono px-2 py-1 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]">
              {a}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TrumpFeedPanel({ posts, limit, compact = false }: TrumpFeedPanelProps) {
  const items = limit ? posts.slice(0, limit) : posts;
  const [selected, setSelected] = useState<TrumpPost | null>(null);

  return (
    <>
      <div className="space-y-2">
        {items.map((post) => (
          <Card key={post.id} onClick={() => setSelected(post)} className={cn(
            "transition-all hover:border-amber-500/30 cursor-pointer",
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

              {compact && (
                <p className="text-[10px] text-amber-400/70 mt-1">Click for full analysis →</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.source} — ${selected.policyCategory}` : undefined}
      >
        {selected && <TrumpPostDetail post={selected} />}
      </DetailModal>
    </>
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
