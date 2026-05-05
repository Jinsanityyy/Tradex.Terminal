"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn, timeAgo } from "@/lib/utils";
import { UserCircle, AlertTriangle, ArrowRight, Flame, ChevronRight, TrendingUp, TrendingDown, Minus, Target, Shield, ExternalLink } from "lucide-react";
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

      {/* View original post link */}
      {post.postUrl && (
        <a
          href={post.postUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          View on {post.source}
        </a>
      )}
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
                  {post.postUrl ? (
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded hover:underline",
                        post.source === "Truth Social"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                          : "text-[hsl(var(--muted-foreground))]"
                      )}
                    >
                      {post.source === "Truth Social" ? "✦ " : ""}{post.source}
                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                    </a>
                  ) : (
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                      post.source === "Truth Social"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                        : "text-[hsl(var(--muted-foreground))]"
                    )}>{post.source}</span>
                  )}
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

// ── Theme-specific narrative + bullets for Trump Impact Overview ──────────────
const TRUMP_ANALYSIS: Record<string, { summary: string; bullets: string[] }> = {
  Iran: {
    summary: "Trump's Iran-related communications are driving heightened geopolitical risk premium across markets. Tensions around nuclear talks, Hormuz Strait access, and sanctions create dual safe-haven demand — investors rotate to both Gold and the Dollar as risk assets sell off. Oil repricing adds secondary inflation implications that amplify the safe-haven bid.",
    bullets: [
      "Watch oil prices (USOIL/BRENT) — Hormuz risk premium signals Gold support; oil reversal = immediate Gold fade",
      "Gold and USD rising together = peak risk-off signal — both can hold simultaneously during geopolitical fear",
      "EM currencies (MXN, TRY) under pressure — capital rotating out of risk assets into safe havens",
      "US equities (SPX) likely pressured lower — risk-off rotation into Gold and Treasuries",
      "Monitor diplomatic headlines: de-escalation = Gold selloff. Deal breakdown = Gold spike",
    ],
  },
  Tariffs: {
    summary: "Trump's tariff commentary is reshaping global trade flow expectations and creating significant market uncertainty. Escalation increases U.S. import costs (inflationary), dampens global growth (deflationary medium-term), and triggers retaliatory responses — all of which historically flow into Gold as a safe haven. The Dollar faces cross-currents: safe-haven inflows compete with growth damage from trade disruption.",
    bullets: [
      "Watch for retaliation from affected countries — escalation = Gold spikes, USD directionally mixed",
      "Supply chain disruption = inflationary pressure = Gold bid via inflation hedge demand",
      "Risk-off equities = Gold bid as capital rotates to safe haven assets",
      "Watch USDCNH — Yuan weakness signals trade war escalation, typically lifts Gold",
      "CAD, AUD weakening on trade fears = broad USD strength but Gold holds the safe-haven bid",
    ],
  },
  China: {
    summary: "US-China tensions — across trade, technology sanctions, or Taiwan — create broad risk-off sentiment in global markets. Gold benefits from safe-haven demand and the potential for dollar weakness if China retaliates via Treasury selling. The interconnected US-China relationship means escalation ripples simultaneously across equities, commodities, and currencies.",
    bullets: [
      "Watch USDCNH: Chinese Yuan weakening = escalation confirmed = Gold typically rallies",
      "Tech sector (semiconductors) hit hardest by export controls — Nasdaq weakness = risk-off = Gold bid",
      "China Treasury sales = USD weakness = Gold bullish from currency debasement angle",
      "Taiwan-related tensions = highest-impact geopolitical risk for Gold — monitor closely",
      "Gold + JPY rising together = peak safe-haven flow — both are classic fear hedges",
    ],
  },
  Fed: {
    summary: "Trump's commentary on Federal Reserve independence directly moves markets. Pressure on the Fed to cut rates or criticism of Powell undermines confidence in the Dollar by raising monetary policy credibility concerns. This is bearish for USD and bullish for Gold, which benefits from real yield compression and currency debasement fears. Markets treat central bank independence as a pillar of USD's reserve status.",
    bullets: [
      "Trump criticizing Powell = USD weakness signal = buy Gold on the headline",
      "Threats to restructure the Fed = Dollar debasement fear = aggressive Gold bid",
      "Watch DXY: falling on Fed pressure headlines = confirms Gold bull signal",
      "Rate cut demands = market pricing Fed dovishness ahead of schedule = Gold bullish",
      "Treasury yields falling = lower real yields = less opportunity cost of holding Gold = bullish",
    ],
  },
  Russia: {
    summary: "Russia-related developments — war escalation, sanctions, or peace talks — drive significant Gold volatility. European risk assets bear the brunt of Russia-Ukraine tension as energy security and conflict fears weigh on EUR and EU equities. Gold benefits from European safe-haven flows while the Dollar strengthens against EUR as capital seeks non-European refuge.",
    bullets: [
      "Watch EURUSD: EUR weakness on Russia escalation = USD strength = Gold bid in EUR terms",
      "Energy disruption (gas, oil exports) = European inflation = ECB dilemma = EUR weaker",
      "Peace talks breakthrough = risk-on = Gold selloff; don't hold longs through negotiation headlines",
      "Gold + EUR inverse relationship in Russia scenarios — Gold holds while EUR drops",
      "Sanctions affecting global commodities = broader safe-haven flows into Gold",
    ],
  },
  Geopolitics: {
    summary: "Broader geopolitical signals from Trump — on NATO, Middle East alliances, or global security commitments — create risk-off flows that benefit Gold. When markets perceive increased global instability from U.S. foreign policy shifts, they hedge via Gold as the primary cross-border safe haven. USD also benefits as a reserve currency, creating simultaneous Gold and USD strength.",
    bullets: [
      "NATO commitment uncertainty = EUR/GBP weakness = USD and Gold both bid",
      "Middle East policy shifts = energy risk premium = oil and Gold rally together",
      "Gold and USD rising simultaneously = extreme fear signal — both can co-exist in peak risk-off",
      "Watch VIX: spike above 25 = Gold typically rallies $20+ within the session",
      "USDJPY falling (yen strengthening) = peak risk-off — buy Gold on yen strength signals",
    ],
  },
  Economy: {
    summary: "Trump's economic commentary shapes market views on the U.S. growth trajectory. Statements suggesting fiscal deterioration (large deficits, spending increases) are long-term USD-negative and Gold-positive via dollar debasement concerns. Conversely, pro-growth signals (deregulation, business confidence) are risk-on and may briefly pressure Gold as equities rally.",
    bullets: [
      "Fiscal deficit expansion = USD long-term negative = Gold benefits as store of value",
      "Deregulation/tax cut signals = risk-on = equity rally = brief Gold headwind",
      "Watch 10-year Treasury yield: rising = higher real yields = Gold headwind; falling = Gold bid",
      "Recession concern dominant: safe-haven premium builds = sustained Gold bullish setup",
      "Monitor consumer confidence data following economic commentary for directional confirmation",
    ],
  },
  Oil: {
    summary: "Oil-related Trump commentary — strategic petroleum reserve actions, OPEC pressure, or energy policy shifts — affects Gold indirectly through inflation expectations. Higher oil feeds into CPI, complicating the Fed's rate-cutting timeline and creating a hawkish undertone that weighs on Gold. Lower oil prices reduce inflation pressure and are Gold-positive via rate-cut expectations.",
    bullets: [
      "Oil spike = higher CPI expectations = hawkish Fed bias = Gold headwind via real yields",
      "Oil drop = easing inflation pressure = rate-cut bets build = Gold bullish signal",
      "Petro-currencies (CAD, NOK) move first — CAD vs USD direction confirms the oil market read",
      "SPR release = bearish oil = deflationary = watch Gold reaction in following sessions",
      "OPEC+ context: Trump pushing for production increase = bearish oil = inflation relief = Fed dovish lean",
    ],
  },
  Government: {
    summary: "Federal budget battles, debt ceiling negotiations, and government shutdown risks create fiscal uncertainty that temporarily supports Gold against USD instability. Debt ceiling standoffs historically compress USD confidence and lift Gold as markets price default risk. However, these situations typically resolve — Gold rallies on government dysfunction are often fade opportunities.",
    bullets: [
      "Debt ceiling deadline approaching: Gold rallies as default risk premium is priced in",
      "Deal/resolution announced: Gold selloff — remove the fear premium, risk-on returns",
      "Watch US credit default swap (CDS) spreads: rising = market pricing default risk = Gold bid",
      "Rating agency warnings (Moody's/Fitch threats) = immediate USD selloff = Gold spike",
      "Shutdown affecting data releases = FOMC may delay decisions = uncertainty = neutral to Gold bullish",
    ],
  },
};
const TRUMP_DEFAULT_ANALYSIS = {
  summary: "Trump's latest communication is creating directional market uncertainty. Monitor the prevailing risk sentiment — if equities are selling off and safe havens (Gold, JPY, Treasuries) are bid simultaneously, the market interpretation is risk-off and Gold should be held. If equities hold and only Gold moves, the signal may be commodity-specific and less sustained.",
  bullets: [
    "Watch risk sentiment: equities + Gold direction tells you whether it's broad risk-off or a specific move",
    "Watch DXY for USD confirmation of Gold's direction",
    "Gold spike >$15 in 30 minutes: a significant catalyst is being priced — trade in that direction",
    "Tariff/trade/Iran keywords = buy Gold. Growth/deregulation keywords = fade Gold spike",
    "Wait for the 15-min retest after the initial move — that's the cleaner, more sustained entry",
  ],
};

// Compact Trump impact preview card for the dashboard
function TrumpImpactModal({ posts, avgImpact, topTheme, recentPosts }: {
  posts: TrumpPost[];
  avgImpact: number;
  topTheme: string;
  recentPosts: TrumpPost[];
}) {
  const topPost = [...posts].sort((a, b) => b.impactScore - a.impactScore)[0];

  const goldCounts = { bullish: 0, bearish: 0, neutral: 0 };
  const usdCounts  = { bullish: 0, bearish: 0, neutral: 0 };
  posts.forEach(p => {
    if (p.goldImpact) goldCounts[p.goldImpact]++;
    if (p.usdImpact)  usdCounts[p.usdImpact]++;
  });
  const hasPerPostData = posts.some(p => p.goldImpact);

  const THEME_GOLD: Record<string, "bullish" | "bearish" | "neutral"> = {
    Iran: "bullish", Geopolitics: "bullish", Russia: "bullish", China: "bullish",
    Tariffs: "bullish", Oil: "neutral", Fed: "neutral", Crypto: "neutral", Economy: "neutral", Government: "neutral",
  };
  const THEME_USD: Record<string, "bullish" | "bearish" | "neutral"> = {
    Iran: "bullish", Geopolitics: "bullish", Russia: "bullish",
    China: "neutral", Tariffs: "neutral", Oil: "neutral", Fed: "bearish", Crypto: "neutral", Economy: "neutral", Government: "neutral",
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
  const rawUSD: "bullish" | "bearish" | "neutral" = hasPerPostData
    ? (Object.entries(usdCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral") as "bullish" | "bearish" | "neutral"
    : (THEME_USD[topTheme] ?? "neutral");
  // Gold and USD can't both be bullish — they move inversely. If conflict, USD defaults to neutral.
  const dominantUSD: "bullish" | "bearish" | "neutral" =
    dominantGold === "bullish" && rawUSD === "bullish" ? "neutral" : rawUSD;

  const goldReason = topPost?.goldReasoning ?? THEME_GOLD_REASON[topTheme] ?? "Monitor gold reaction at key levels for directional confirmation.";
  const usdReason  = topPost?.usdReasoning  ?? THEME_USD_REASON[topTheme]  ?? "Watch DXY at structural levels to confirm USD directional bias.";
  const analysis   = TRUMP_ANALYSIS[topTheme] ?? TRUMP_DEFAULT_ANALYSIS;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[hsl(var(--secondary))] p-3">
          <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-0.5">Average Impact</p>
          <p className="text-lg font-bold font-mono text-zinc-100">{avgImpact}/10</p>
        </div>
        <div className="rounded-lg bg-[hsl(var(--secondary))] p-3">
          <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-0.5">Dominant Theme</p>
          <p className="text-sm font-semibold text-zinc-100">{topTheme}</p>
        </div>
      </div>

      {/* ── TRUMP MARKET IMPACT ANALYSIS (uniform format) ─────────────────── */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] overflow-hidden">
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-amber-500/15">
          <UserCircle className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Trump Market Impact</span>
          <span className="ml-auto text-[9px] text-amber-400/50 uppercase tracking-wider">{topTheme}</span>
        </div>
        <div className="px-3.5 py-3">
          <p className="text-[12px] text-zinc-200 leading-relaxed">{analysis.summary}</p>
        </div>
        <div className="px-3.5 pb-3.5 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70">Key Factors To Watch</p>
          <ul className="space-y-1.5">
            {analysis.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <ChevronRight className="h-3 w-3 text-amber-400/60 mt-0.5 shrink-0" />
                <span className="text-[11px] text-zinc-400 leading-snug">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Gold + USD badges */}
      <div className="flex gap-2 flex-wrap">
        <ImpactBadge impact={dominantGold} label="GOLD" />
        <ImpactBadge impact={dominantUSD} label="USD" />
      </div>

      {/* Gold context */}
      <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Gold Context</span>
        </div>
        <p className="text-[11.5px] text-zinc-300 leading-relaxed">{goldReason}</p>
      </div>

      {/* USD context */}
      <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">USD Context</span>
        </div>
        <p className="text-[11.5px] text-zinc-300 leading-relaxed">{usdReason}</p>
      </div>

      {/* Headlines */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Latest Headlines</p>
          <Link href="/dashboard/trump-monitor" className="text-[10px] text-zinc-500 hover:text-zinc-200">Open full monitor →</Link>
        </div>
        {recentPosts.map((post) => (
          <div key={post.id} className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] leading-relaxed text-zinc-300 line-clamp-2">&ldquo;{post.content}&rdquo;</p>
              <span className="shrink-0 text-[10px] font-mono text-zinc-500">{post.impactScore}/10</span>
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
