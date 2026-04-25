"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn, timeAgo } from "@/lib/utils";
import { UserCircle, AlertTriangle, ArrowRight, Flame, ChevronRight, TrendingUp, TrendingDown, Minus, Target, Shield } from "lucide-react";
import type { TrumpPost } from "@/types";
import { DetailModal } from "./DetailModal";

interface TrumpFeedPanelProps {
  posts: TrumpPost[];
  limit?: number;
  compact?: boolean;
}

function ImpactBadge({ impact, label }: { impact?: "bullish" | "bearish" | "neutral"; label: string }) {
  if (!impact) return null;
  const Icon = impact === "bullish" ? TrendingUp : impact === "bearish" ? TrendingDown : Minus;
  const colors = {
    bullish: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    bearish: "bg-red-500/15 text-red-400 border-red-500/30",
    neutral: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", colors[impact])}>
      <Icon className="h-2.5 w-2.5" />
      {label} {impact.toUpperCase()}
    </span>
  );
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

      {/* Gold + USD directional impact */}
      {(post.goldImpact || post.usdImpact) && (
        <>
          <div className="flex gap-2 flex-wrap">
            <ImpactBadge impact={post.goldImpact} label="GOLD" />
            <ImpactBadge impact={post.usdImpact} label="USD" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {post.goldReasoning && (
              <div className="rounded-lg bg-[hsl(var(--secondary))] p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3 w-3 text-amber-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Gold Context</span>
                </div>
                <p className="text-[11px] text-[hsl(var(--foreground))] leading-relaxed">{post.goldReasoning}</p>
              </div>
            )}
            {post.usdReasoning && (
              <div className="rounded-lg bg-[hsl(var(--secondary))] p-3 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-blue-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">USD Context</span>
                </div>
                <p className="text-[11px] text-[hsl(var(--foreground))] leading-relaxed">{post.usdReasoning}</p>
              </div>
            )}
          </div>
        </>
      )}

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

              {/* Gold + USD inline badges */}
              {(post.goldImpact || post.usdImpact) && (
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <ImpactBadge impact={post.goldImpact} label="GOLD" />
                  <ImpactBadge impact={post.usdImpact} label="USD" />
                </div>
              )}

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
  const topPost = [...posts].sort((a, b) => b.impactScore - a.impactScore)[0];

  // Derive gold/USD direction — from per-post AI data if available, else from dominant theme
  const goldCounts = { bullish: 0, bearish: 0, neutral: 0 };
  const usdCounts  = { bullish: 0, bearish: 0, neutral: 0 };
  posts.forEach(p => {
    if (p.goldImpact) goldCounts[p.goldImpact]++;
    if (p.usdImpact)  usdCounts[p.usdImpact]++;
  });
  const hasPerPostData = posts.some(p => p.goldImpact);

  // Theme-based directional map (fallback when per-post AI data unavailable)
  const THEME_GOLD: Record<string, "bullish" | "bearish" | "neutral"> = {
    Iran: "bullish", Geopolitics: "bullish", Russia: "bullish", China: "bullish",
    Tariffs: "bullish", Oil: "neutral",
    Fed: "neutral", Crypto: "neutral", Economy: "neutral", Government: "neutral",
  };
  const THEME_USD: Record<string, "bullish" | "bearish" | "neutral"> = {
    Iran: "bullish", Geopolitics: "bullish", Russia: "bullish",
    China: "neutral", Tariffs: "neutral", Oil: "neutral",
    Fed: "bearish", Crypto: "neutral", Economy: "neutral", Government: "neutral",
  };
  const THEME_GOLD_REASON: Record<string, string> = {
    Iran: "Iran geopolitical tensions drive safe-haven gold demand — Hormuz Strait disruption risk adds oil supply premium that indirectly supports gold prices.",
    Geopolitics: "Geopolitical escalation triggers risk-off flows into gold as the primary safe-haven asset across global markets.",
    Russia: "Russia-Ukraine conflict risk drives European safe-haven flows, with gold benefiting from both geopolitical premium and EUR weakness.",
    China: "US-China tensions create broad risk-off sentiment, supporting gold as a hedge against global trade disruption and equity volatility.",
    Tariffs: "Trade war escalation drives safe-haven flows into gold as global growth fears and equity sell-offs intensify.",
    Fed: "Fed policy commentary creates rate outlook uncertainty — gold moves inversely with rate-cut expectations and real yield direction.",
    Oil: "Energy catalyst indirectly affects gold via inflation transmission — watch for CPI repricing in coming sessions.",
    Economy: "Economic uncertainty supports gold's safe-haven role — weak growth data is typically bullish for gold via rate-cut expectations.",
  };
  const THEME_USD_REASON: Record<string, string> = {
    Iran: "Iran geopolitical risk drives parallel USD safe-haven demand alongside gold as investors exit regional and EM risk assets.",
    Geopolitics: "Global risk events support USD safe-haven demand as the world's primary reserve currency attracts capital flight.",
    Russia: "Russia-related escalation pressures EUR and supports USD as European energy security risks weigh on euro-area outlook.",
    China: "US-China tensions create mixed USD signals — safe-haven demand competes with growth damage from trade disruptions on the US economy.",
    Tariffs: "Tariff escalation leaves USD directionless — safe-haven inflows offset by US growth damage and retaliatory risk to exports.",
    Fed: "Presidential pressure on Fed independence signals potential rate cuts ahead, eroding USD's yield advantage vs. major peers.",
    Oil: "Energy policy impacts petro-currencies (CAD, NOK) more directly; USD effect depends on net inflation and growth implications.",
    Economy: "Weak economic data accelerates Fed cut pricing, reducing USD yield advantage and triggering broad dollar selling pressure.",
  };

  const dominantGold: "bullish" | "bearish" | "neutral" = hasPerPostData
    ? (Object.entries(goldCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral") as "bullish" | "bearish" | "neutral"
    : (THEME_GOLD[topTheme] ?? "neutral");
  const dominantUSD: "bullish" | "bearish" | "neutral" = hasPerPostData
    ? (Object.entries(usdCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral") as "bullish" | "bearish" | "neutral"
    : (THEME_USD[topTheme] ?? "neutral");

  const goldReason = topPost?.goldReasoning ?? THEME_GOLD_REASON[topTheme] ?? "Monitor gold reaction at key levels for directional confirmation.";
  const usdReason  = topPost?.usdReasoning  ?? THEME_USD_REASON[topTheme]  ?? "Watch DXY at structural levels to confirm USD directional bias.";

  const goldColors = { bullish: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", bearish: "text-red-400 border-red-500/30 bg-red-500/10", neutral: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10" };
  const GoldIcon = dominantGold === "bullish" ? TrendingUp : dominantGold === "bearish" ? TrendingDown : Minus;
  const USDIcon  = dominantUSD  === "bullish" ? TrendingUp : dominantUSD  === "bearish" ? TrendingDown : Minus;

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

      {/* Gold + USD aggregate impact */}
      <div className="grid grid-cols-2 gap-2">
        <div className={cn("rounded-lg border p-3 space-y-1.5", goldColors[dominantGold])}>
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Gold — {dominantGold.toUpperCase()}</span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-80">{goldReason}</p>
        </div>
        <div className={cn("rounded-lg border p-3 space-y-1.5", goldColors[dominantUSD])}>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">USD — {dominantUSD.toUpperCase()}</span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-80">{usdReason}</p>
        </div>
      </div>

      {/* Watch For — from top-impact post */}
      {topPost && (
        <div className="rounded-lg border border-[hsl(var(--primary))]/15 bg-[hsl(var(--primary))]/5 p-3 space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--primary))]/60">Watch For</p>
          <p className="text-[12px] text-zinc-200 leading-relaxed">{topPost.potentialReaction}</p>
        </div>
      )}

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
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-zinc-600">{timeAgo(post.timestamp)}</span>
              <Badge variant="outline" className="text-[10px]">{post.policyCategory}</Badge>
              {post.goldImpact && (
                <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded border",
                  post.goldImpact === "bullish" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  post.goldImpact === "bearish" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                  "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                )}>GOLD {post.goldImpact.toUpperCase()}</span>
              )}
              {post.usdImpact && (
                <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded border",
                  post.usdImpact === "bullish" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  post.usdImpact === "bearish" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                  "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                )}>USD {post.usdImpact.toUpperCase()}</span>
              )}
            </div>
            {post.goldReasoning && (
              <p className="mt-2 text-[10px] text-zinc-500 leading-relaxed border-t border-white/5 pt-2">{post.goldReasoning}</p>
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
