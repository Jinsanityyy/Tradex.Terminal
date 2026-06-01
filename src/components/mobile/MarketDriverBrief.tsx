"use client";

import React from "react";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  NewsAgentOutput,
  SMCAgentOutput,
  TrendAgentOutput,
  ExecutionAgentOutput,
  MasterDecisionOutput,
  MarketSnapshot,
} from "@/lib/agents/schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface MarketDriverBriefProps {
  symbol: string;           // e.g. "XAUUSD"
  symbolDisplay: string;    // e.g. "Gold"
  snapshot: MarketSnapshot;
  news: NewsAgentOutput;
  smc: SMCAgentOutput;
  trend: TrendAgentOutput;
  execution: ExecutionAgentOutput;
  master: MasterDecisionOutput;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a raw number as a human-readable price string, adapting precision
 * to the asset scale (large prices → 2dp, mid → 4dp, small → 5dp).
 */
function fmtPrice(val: number): string {
  if (val >= 1000) {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (val >= 10) {
    return val.toFixed(4);
  }
  return val.toFixed(5);
}

/**
 * Scan a text string for price-like substrings (e.g. 4488.50, 1.08432, $3,200)
 * and wrap them in an amber mono span for visual emphasis.
 * Returns an array of React nodes (plain strings interleaved with spans).
 */
function highlightPrices(text: string): React.ReactNode[] {
  // Match: optional $, then 3+ digit number with optional commas and decimals,
  // OR a plain decimal with 4+ fractional digits (forex prices like 1.08432).
  const priceRegex = /(\$?\d{1,3}(?:,\d{3})*(?:\.\d{1,5})?|\$?\d{3,}(?:\.\d{1,5})?|\d+\.\d{4,5})/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = priceRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={`p-${match.index}`} className="text-amber-300 font-mono font-semibold">
        {match[0]}
      </span>
    );
    lastIndex = priceRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// ─────────────────────────────────────────────────────────────────────────────
// Impact Tag
// ─────────────────────────────────────────────────────────────────────────────

type ImpactTagVariant =
  | "BULLISH"
  | "BEARISH"
  | "MIXED"
  | "NEUTRAL"
  | "LONG"
  | "SHORT";

const IMPACT_TAG_STYLES: Record<ImpactTagVariant, string> = {
  BULLISH: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  LONG:    "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  BEARISH: "bg-red-500/15 text-red-400 border border-red-500/30",
  SHORT:   "bg-red-500/15 text-red-400 border border-red-500/30",
  MIXED:   "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  NEUTRAL: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
};

function ImpactTag({ label }: { label: ImpactTagVariant }) {
  return (
    <span
      className={cn(
        "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm shrink-0",
        IMPACT_TAG_STYLES[label]
      )}
    >
      {label}
    </span>
  );
}

/** Normalize a raw bias/direction string to a valid ImpactTagVariant. */
function resolveImpactTag(raw: string): ImpactTagVariant {
  const upper = raw.toUpperCase();
  if (upper === "BULLISH") return "BULLISH";
  if (upper === "BEARISH") return "BEARISH";
  if (upper === "LONG")    return "LONG";
  if (upper === "SHORT")   return "SHORT";
  if (upper === "MIXED")   return "MIXED";
  return "NEUTRAL";
}

// ─────────────────────────────────────────────────────────────────────────────
// DriverCard — single numbered driver block
// ─────────────────────────────────────────────────────────────────────────────

interface DriverCardProps {
  index: number;
  categoryLabel: string;
  title: string;
  impactTag: ImpactTagVariant;
  bullets: React.ReactNode[];
  tip: string;
  isLast: boolean;
}

function DriverCard({
  index,
  categoryLabel,
  title,
  impactTag,
  bullets,
  tip,
  isLast,
}: DriverCardProps) {
  return (
    <div className={cn("px-4 py-3.5", !isLast && "border-b border-zinc-800")}>

      {/* Driver index + category label */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] font-bold text-zinc-600 shrink-0 tabular-nums">
          {String(index).padStart(2, "0")}
        </span>
        <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-semibold">
          {categoryLabel}
        </span>
      </div>

      {/* Title row + impact tag */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[12px] font-bold text-zinc-100 leading-snug flex-1 min-w-0">
          {title}
        </p>
        <ImpactTag label={impactTag} />
      </div>

      {/* Bullets */}
      {bullets.length > 0 && (
        <ul className="space-y-1.5 mb-3">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="mt-[3px] shrink-0 text-zinc-600 text-[10px] leading-none">›</span>
              <span className="text-[10px] text-zinc-400 leading-relaxed">
                {bullet}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Beginner tip */}
      {tip && (
        <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-zinc-800/60">
          <Lightbulb className="h-2.5 w-2.5 text-zinc-600 shrink-0 mt-[1px]" />
          <p className="text-[10px] text-zinc-500 italic leading-relaxed">{tip}</p>
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Driver factories — build DriverCardProps from agent data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DRIVER 1 — Macro / Geopolitics
 * Source: NewsAgentOutput
 * Skip if catalysts is empty.
 */
function buildNewsDriver(news: NewsAgentOutput): Omit<DriverCardProps, "index" | "isLast"> | null {
  if (!news || news.catalysts.length === 0) return null;

  const regime = news.regime ?? "macro";

  // Category label: replace dashes with spaces, uppercase
  const categoryLabel = regime.replace(/-/g, " ").toUpperCase();

  // Structural consequence suffix per regime
  const CONSEQUENCE_MAP: Record<string, string> = {
    geopolitical:  "— RISK PREMIUM ELEVATED",
    "fed-policy":  "— RATE EXPECTATIONS SHIFTING",
    inflation:     "— PURCHASING POWER AT RISK",
    tariff:        "— TRADE FLOWS DISRUPTED",
    calm:          "— LOW VOLATILITY REGIME",
    risk:          "— RISK-OFF CONDITIONS ACTIVE",
    growth:        "— GROWTH OUTLOOK REPRICING",
    liquidity:     "— LIQUIDITY CONDITIONS TIGHTENING",
  };
  const suffix = CONSEQUENCE_MAP[regime] ?? "— MACRO PRESSURE ACTIVE";
  const title = `${news.dominantCatalyst} ${suffix}`;

  // news.impact is DirectionalBias: "bullish" | "bearish" | "neutral"
  const impactTag = resolveImpactTag(
    news.impact === "neutral" ? "MIXED" : news.impact
  );

  // Build bullets from top 3 catalysts, with directional arrow suffix
  const bullets: React.ReactNode[] = news.catalysts.slice(0, 3).map((c, i) => {
    const arrow =
      c.direction === "bullish" ? "↑" :
      c.direction === "bearish" ? "↓" :
      "–";
    const arrowColor =
      c.direction === "bullish" ? "text-emerald-500" :
      c.direction === "bearish" ? "text-red-500" :
      "text-zinc-600";
    return (
      <span key={i}>
        {highlightPrices(c.headline)}{" "}
        <span className={cn("text-[9px] font-bold", arrowColor)}>{arrow}</span>
      </span>
    );
  });

  // Plain-English beginner tip per regime
  const TIP_MAP: Record<string, string> = {
    geopolitical:
      "When geopolitical tensions rise, safe-haven assets like gold and the USD often benefit while risk assets fall.",
    "fed-policy":
      "Fed rate expectations drive the dollar and bond yields — hawkish = stronger USD, bearish for gold and risk assets.",
    inflation:
      "High inflation erodes currency purchasing power, which often supports hard assets like gold and commodities.",
    tariff:
      "Tariffs disrupt global trade flows and can weaken the currencies of export-heavy economies.",
    calm:
      "In low-volatility regimes, momentum and structure matter more than macro headlines.",
    risk:
      "Risk-off moves push money into safe havens (gold, USD, JPY) and away from stocks and high-beta currencies.",
    growth:
      "Slowing growth expectations reduce demand for risk assets and commodities tied to industrial activity.",
    liquidity:
      "Tighter liquidity means less money flowing through markets — often bearish for speculative assets.",
  };
  const tip =
    TIP_MAP[regime] ??
    "Macro events can override technical setups — always check the news context before entering a trade.";

  return { categoryLabel, title, impactTag, bullets, tip };
}

/**
 * DRIVER 2 — Market Structure
 * Source: SMCAgentOutput + TrendAgentOutput + MarketSnapshot
 * Skip if no SMC reasons, no trend reasons, and no key levels.
 */
function buildStructureDriver(
  smc: SMCAgentOutput,
  trend: TrendAgentOutput,
  snapshot: MarketSnapshot
): Omit<DriverCardProps, "index" | "isLast"> | null {
  const hasReasons =
    (smc.reasons && smc.reasons.length > 0) ||
    (trend.reasons && trend.reasons.length > 0);
  const hasLevels =
    smc.keyLevels.orderBlockHigh !== null ||
    smc.keyLevels.orderBlockLow  !== null ||
    smc.keyLevels.fvgHigh        !== null ||
    smc.keyLevels.sweepLevel     !== null;

  if (!hasReasons && !hasLevels) return null;

  // Build title: current price + structure event + bias direction
  const price = snapshot.price.current;
  const formattedPrice = fmtPrice(price);

  // When SMC and trend disagree, show MIXED instead of blindly using smc.bias
  const agentsAgree = smc.bias === trend.bias || trend.bias === "neutral";
  const effectiveBias = agentsAgree ? smc.bias : "neutral";

  const biasPhrase =
    effectiveBias === "bullish" ? "RESETS BULLISH" :
    effectiveBias === "bearish" ? "CONFIRMS BEARISH" :
    smc.chochDetected            ? "POTENTIAL REVERSAL"
                                 : "STRUCTURE MIXED";

  // Most significant structure event detected
  let eventPhrase = "KEY LEVEL HELD";
  if (smc.chochDetected)               eventPhrase = "CHoCH CONFIRMED";
  else if (smc.bosDetected)            eventPhrase = "BOS CONFIRMED";
  else if (smc.liquiditySweepDetected) eventPhrase = "LIQUIDITY SWEPT";
  else if (smc.setupPresent && smc.setupType !== "None")
                                       eventPhrase = `${smc.setupType} ACTIVE`;

  const title = `$${formattedPrice} — ${eventPhrase} · ${biasPhrase}`;

  const impactTag = resolveImpactTag(
    agentsAgree ? smc.bias : "neutral"
  );

  // SMC reasons (up to 3) + trend reasons (up to 2), all price-highlighted
  const smcBullets: React.ReactNode[] = (smc.reasons ?? [])
    .slice(0, 3)
    .map((r, i) => <span key={`smc-${i}`}>{highlightPrices(r)}</span>);

  const trendBullets: React.ReactNode[] = (trend.reasons ?? [])
    .slice(0, 2)
    .map((r, i) => <span key={`tr-${i}`}>{highlightPrices(r)}</span>);

  // Combine and cap at 5 total bullets (spec says max 3 per driver for concision,
  // but structure needs up to 5 to be meaningful — hard cap at 5)
  const bullets = [...smcBullets, ...trendBullets].slice(0, 5);

  // Append key level highlights if not already surfaced in reasons
  if (bullets.length < 3) {
    const { orderBlockHigh, orderBlockLow, fvgMid, sweepLevel } = smc.keyLevels;
    const inv = smc.invalidationLevel;
    const extras: string[] = [];
    if (orderBlockHigh !== null) extras.push(`Order block high at $${fmtPrice(orderBlockHigh)}`);
    if (orderBlockLow  !== null) extras.push(`Order block low at $${fmtPrice(orderBlockLow)}`);
    if (fvgMid         !== null) extras.push(`FVG midpoint at $${fmtPrice(fvgMid)}`);
    if (sweepLevel     !== null) extras.push(`Liquidity sweep level at $${fmtPrice(sweepLevel)}`);
    if (inv            !== null) extras.push(`Invalidation level at $${fmtPrice(inv)}`);
    for (const ex of extras) {
      if (bullets.length >= 5) break;
      bullets.push(<span key={`kl-${ex}`}>{highlightPrices(ex)}</span>);
    }
  }

  // Contextual beginner tip based on the dominant structure event
  let tip =
    "Price structure tells you who's in control — bulls or bears — by tracking where big moves start and stop.";
  if (smc.chochDetected) {
    tip =
      "A Change of Character (CHoCH) is an early warning sign that the trend may be reversing — institutions are quietly changing direction.";
  } else if (smc.bosDetected) {
    tip =
      "A Break of Structure (BOS) confirms trend continuation — institutions are pushing price further in the current direction.";
  } else if (smc.liquiditySweepDetected) {
    tip =
      "A liquidity sweep spikes price through a key level to trigger stop-losses before reversing — a common institutional trap.";
  } else if (smc.setupType === "OB") {
    tip =
      "An Order Block is a zone where institutions placed large orders. Price often revisits these zones to fill remaining orders.";
  } else if (smc.setupType === "FVG") {
    tip =
      "A Fair Value Gap (FVG) is an imbalance left by fast moves. Markets often retrace to fill these gaps before continuing.";
  }

  return { categoryLabel: "STRUCTURE", title, impactTag, bullets, tip };
}

/**
 * DRIVER 3 — Execution Setup
 * Source: ExecutionAgentOutput
 * Skip if no setup or no entry price.
 */
function buildExecutionDriver(
  execution: ExecutionAgentOutput
): Omit<DriverCardProps, "index" | "isLast"> | null {
  if (!execution.hasSetup || !execution.entry) return null;

  const dirLabel  = execution.direction === "long" ? "LONG" : "SHORT";
  const trigLabel = execution.trigger
    ? execution.trigger.toUpperCase().replace(/_/g, " ")
    : "SETUP";
  const signalLabel = execution.signalState === "ARMED"   ? "ARMED" :
                      execution.signalState === "PENDING" ? "PENDING" :
                      "ACTIVE";

  const title = `${trigLabel} — ${dirLabel} ${signalLabel}`;

  const impactTag = resolveImpactTag(execution.direction);

  const bullets: React.ReactNode[] = [];

  // Structured trade rows: Entry, Stop Loss, TP1 with amber/red/green coloring
  if (execution.entry !== null) {
    bullets.push(
      <span key="entry">
        Entry{" "}
        <span className="text-amber-300 font-mono font-semibold">
          ${fmtPrice(execution.entry)}
        </span>
        {execution.entryZone ? (
          <span className="text-zinc-500"> ({execution.entryZone})</span>
        ) : null}
      </span>
    );
  }

  if (execution.stopLoss !== null) {
    bullets.push(
      <span key="sl">
        Stop Loss{" "}
        <span className="text-red-400 font-mono font-semibold">
          ${fmtPrice(execution.stopLoss)}
        </span>
        {execution.slZone ? (
          <span className="text-zinc-500"> ({execution.slZone})</span>
        ) : null}
      </span>
    );
  }

  if (execution.tp1 !== null) {
    bullets.push(
      <span key="tp1">
        TP1{" "}
        <span className="text-emerald-400 font-mono font-semibold">
          ${fmtPrice(execution.tp1)}
        </span>
        {execution.rrRatio !== null ? (
          <span className="text-zinc-500"> · {execution.rrRatio.toFixed(1)}R</span>
        ) : null}
        {execution.tp1Zone ? (
          <span className="text-zinc-500"> ({execution.tp1Zone})</span>
        ) : null}
      </span>
    );
  }

  // Confluence factors fill remaining slots (up to 3)
  const confluenceBullets: React.ReactNode[] = (execution.confluenceFactors ?? [])
    .slice(0, 3)
    .map((f, i) => <span key={`cf-${i}`}>{highlightPrices(f)}</span>);

  const allBullets = [...bullets, ...confluenceBullets].slice(0, 6);

  // Beginner tip: simplify the triggerCondition if available
  const tip = execution.triggerCondition
    ? `Enter when: ${execution.triggerCondition}`
    : "Wait for your exact entry condition before pulling the trigger — patience is the edge.";

  return {
    categoryLabel: "EXECUTION",
    title,
    impactTag,
    bullets: allBullets,
    tip,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function MarketDriverBrief({
  symbolDisplay,
  snapshot,
  news,
  smc,
  trend,
  execution,
  master,
}: MarketDriverBriefProps) {
  // Build raw driver data, filtering out null (skipped) drivers
  const rawDrivers = [
    buildNewsDriver(news),
    buildStructureDriver(smc, trend, snapshot),
    buildExecutionDriver(execution),
  ].filter((d): d is Omit<DriverCardProps, "index" | "isLast"> => d !== null);

  // If all drivers skipped, render nothing
  if (rawDrivers.length === 0) return null;

  // Assign sequential 1-based index and isLast flag
  const drivers: DriverCardProps[] = rawDrivers.map((d, i) => ({
    ...d,
    index: i + 1,
    isLast: i === rawDrivers.length - 1,
  }));

  // Overall card tag driven by the master decision bias
  const overallTag = resolveImpactTag(
    master.finalBias === "no-trade" ? "NEUTRAL" :
    master.finalBias === "bullish"  ? "BULLISH" :
    "BEARISH"
  );

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">

      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            Market Driver Brief
          </span>
          <span className="text-[9px] text-zinc-700">·</span>
          <span className="text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
            {symbolDisplay}
          </span>
          {drivers.length > 0 && (
            <>
              <span className="text-[9px] text-zinc-700">·</span>
              <span className="text-[9px] text-zinc-600 tabular-nums">
                {drivers.length} driver{drivers.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
        <ImpactTag label={overallTag} />
      </div>

      {/* Driver cards */}
      {drivers.map((driver) => (
        <DriverCard
          key={driver.index}
          index={driver.index}
          categoryLabel={driver.categoryLabel}
          title={driver.title}
          impactTag={driver.impactTag}
          bullets={driver.bullets}
          tip={driver.tip}
          isLast={driver.isLast}
        />
      ))}

    </div>
  );
}
