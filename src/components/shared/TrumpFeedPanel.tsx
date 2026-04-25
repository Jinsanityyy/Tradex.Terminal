"use client";

import React, { useState } from "react";
import Link from "next/link";
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

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-center rounded-xl border border-white/6 bg-[hsl(var(--secondary))]/30">
        <UserCircle className="h-6 w-6 text-[hsl(var(--muted-foreground))]/30" />
        <p className="text-xs text-[hsl(var(--muted-foreground))]">No posts matching this filter</p>
        <p className="text-[10px] text-[hsl(var(--muted-foreground))]/50">Try selecting a different category or <span className="text-amber-400">ALL</span></p>
      </div>
    );
  }

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
function TrumpImpactModal({ posts, avgImpact, topTheme, recentPosts }: {
  posts: TrumpPost[];
  avgImpact: number;
  topTheme: string;
  recentPosts: TrumpPost[];
}) {
  const [analysis, setAnalysis] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Detect speeches
  const speeches = posts.filter(p =>
    p.content.toLowerCase().includes("speak") ||
    p.content.toLowerCase().includes("speech") ||
    p.content.toLowerCase().includes("said") ||
    p.content.toLowerCase().includes("remarks") ||
    p.policyCategory.toLowerCase().includes("speech")
  );

  React.useEffect(() => {
    if (posts.length === 0) return;
    setLoading(true);
    fetch("/api/ai/trump-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posts, avgImpact, topTheme })
    })
    .then(r => r.json())
    .then(data => setAnalysis(JSON.stringify(data)))
    .catch(() => setAnalysis(null))
    .finally(() => setLoading(false));
  }, [posts.length]);

  const parsed = analysis ? JSON.parse(analysis) : null;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Average Impact</p>
          <p className="mt-1 text-lg font-bold font-mono text-[hsl(var(--foreground))]">{avgImpact}/10</p>
        </div>
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Dominant Theme</p>
          <p className="mt-1 text-sm font-semibold text-[hsl(var(--foreground))]">{topTheme}</p>
        </div>
      </div>

      {/* AI Analysis */}
      {loading ? (
        <div className="rounded-lg border border-white/5 bg-[hsl(var(--secondary))] p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">AI analyzing market impact…</span>
          </div>
          {[80,60,70].map((w,i) => <div key={i} className={`h-3 bg-white/5 rounded animate-pulse`} style={{width:`${w}%`}} />)}
        </div>
      ) : parsed ? (
        <div className="space-y-3">
          {/* Why this score */}
          <div className="rounded-lg border border-white/5 bg-[hsl(var(--secondary))] p-3 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Why {avgImpact}/10</p>
            <p className="text-[12px] text-zinc-300 leading-relaxed">{parsed.whyScore}</p>
          </div>

          {/* Market effect */}
          <div className="rounded-lg border border-white/5 bg-[hsl(var(--secondary))] p-3 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Market Effect — Gold & USD</p>
            <p className="text-[12px] text-zinc-300 leading-relaxed">{parsed.marketEffect}</p>
          </div>

          {/* Watch for */}
          <div className="rounded-lg border border-[hsl(var(--primary))]/15 bg-[hsl(var(--primary))]/5 p-3 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--primary))]/60">Watch For</p>
            <p className="text-[12px] text-zinc-200 leading-relaxed">{parsed.watchFor}</p>
          </div>

          {/* Speech summary if applicable */}
          {parsed.speechSummary && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500/60">Speech Summary</p>
              <p className="text-[12px] text-zinc-200 leading-relaxed">{parsed.speechSummary}</p>
            </div>
          )}
        </div>
      ) : null}

      {/* Headlines */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Latest Headlines</p>
          <Link href="/dashboard/trump-monitor" className="text-[10px] text-zinc-500 hover:text-zinc-200">Open full monitor →</Link>
        </div>
        {recentPosts.map((post) => (
          <div key={post.id} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] leading-relaxed text-[hsl(var(--foreground))] line-clamp-2">&ldquo;{post.content}&rdquo;</p>
              <span className="shrink-0 text-[10px] font-mono text-zinc-400">{post.impactScore}/10</span>
            </div>
            <div className="mt-1.5 flex items-start gap-2">
              <span className="text-[10px] text-zinc-600">{timeAgo(post.timestamp)}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">{post.policyCategory}</Badge>
            </div>
            {post.whyItMatters && (
              <p className="mt-2 text-[10px] text-zinc-600 leading-relaxed border-t border-white/5 pt-2">{post.whyItMatters}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrumpImpactPreview({ posts }: { posts: TrumpPost[] }) {
  const [open, setOpen] = useState(false);
  const latestHigh = posts.filter(p => p.impactScore >= 7).slice(0, 1)[0];
  const avgImpact = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + p.impactScore, 0) / posts.length) : 0;
  const recentPosts = posts.slice(0, 3);

  const themes = posts.reduce((acc, p) => {
    acc[p.policyCategory] = (acc[p.policyCategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topTheme = Object.entries(themes).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  return (
    <>
      <Card
        className="cursor-pointer transition-colors hover:bg-white/[0.03]"
        onClick={() => setOpen(true)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              <span>Trump Impact Monitor</span>
            </div>
            <Link
              href="/dashboard/trump-monitor"
              onClick={(event) => event.stopPropagation()}
              className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              Open
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Avg Impact</span>
            <div className="flex items-center gap-2">
              <Progress value={avgImpact * 10} className="h-1.5 w-16" />
              <span className="text-xs font-mono font-bold text-[hsl(var(--foreground))]">{avgImpact}/10</span>
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

          <p className="text-[10px] text-[hsl(var(--muted-foreground))]/70">Click for overview →</p>
        </CardContent>
      </Card>

      <DetailModal open={open} onClose={() => setOpen(false)} title="Trump Impact Overview">
        <TrumpImpactModal posts={posts} avgImpact={avgImpact} topTheme={topTheme} recentPosts={recentPosts} />
      </DetailModal>
    </>
  );
}
