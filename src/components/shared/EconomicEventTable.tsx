"use client";

import React, { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, Radio, TrendingUp, TrendingDown, Minus, Target, Shield, ChevronRight, Timer, Eye, Zap, Loader2 } from "lucide-react";
import type { EconomicEvent } from "@/types";
import type { SpeechRecap as SpeechRecapData } from "@/lib/calendar/speech";
import { DetailModal } from "./DetailModal";
import { getSymbolLabel, getSymbolShort, getEventImpactForSymbol } from "@/lib/assetImpact";

// ── AI After-Release Analysis ─────────────────────────────────────────────────
interface AIEventAnalysis {
  outcome: string;
  marketReaction: string;
  goldImpact: "bullish" | "bearish" | "neutral";
  goldAnalysis: string;
  usdImpact: "bullish" | "bearish" | "neutral";
  usdAnalysis: string;
  traderFocus: string[];
  timeframe: string;
}

const analysisCache = new Map<string, AIEventAnalysis>();

/** Values the upstream feeds use to mean "no print yet" */
const NO_ACTUAL = new Set(["", "-", "—", "–", "n/a", "na", "pending...", "pending", "updating...", "tbd"]);

function toNum(raw?: string | null): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (NO_ACTUAL.has(s.toLowerCase())) return null;
  // strips %, K/M/B/T suffixes, thousands separators and any leading currency symbol
  const n = parseFloat(s.replace(/,/g, "").replace(/[^\d.+-]/g, ""));
  return isNaN(n) ? null : n;
}

/** Indicators where a HIGHER print means a WEAKER economy (so the beat/miss logic flips) */
const INVERTED_RE   = /jobless claims|initial claims|continuing claims|unemployment claims|unemployment rate|misery|delinquen/i;
/** Central-bank rate decisions — no "beat/miss", it's hawkish vs dovish */
const RATE_DECISION_RE = /federal funds rate|interest rate decision|fed interest rate|rate decision|bank rate|refi rate|deposit facility rate|cash rate|fomc.*rate/i;

/** Events that publish words, not a figure: there is never an "actual" to wait for */
const SPEECH_RE = /speaks|speech|testif|testimony|press conference|statement|minutes|remarks|hearing|interview/i;

/**
 * Speeches and statements. The data-release template ("the print has not
 * reached our feed", "hot or soft") made no sense for them: nothing will ever
 * print. What moves markets is what was said, so the read is about that.
 */
function buildSpeechAnalysis(ev: EconomicEvent): AIEventAnalysis {
  const t = ev.event.toLowerCase();
  const trump = t.includes("trump") || t.includes("president");
  const fed = /powell|fed |fomc|chair|governor|waller|williams|jefferson|bowman|barr|cook|kugler|miran|goolsbee|logan|daly|hammack|musalem|schmid|kashkari|bostic|barkin|harker|collins/.test(t);

  if (trump) {
    return {
      outcome: `${ev.event} has no published figure. What moved markets is what was said, and how Gold and the dollar reacted.`,
      marketReaction: "Gold responds to three themes in his remarks: tariffs and trade, the Fed and interest rates, and geopolitics. New tariffs, trade threats or conflict have tended to lift Gold as a safe haven. Pressure on the Fed to cut has tended to weaken the dollar and support Gold. Deals, truces and de-escalation have tended to take the haven premium out of Gold.",
      goldImpact: "neutral",
      goldAnalysis: "How Gold moved in the first hour after the remarks is the market's verdict. The Trump Monitor has the posts and headlines from around that time.",
      usdImpact: "neutral",
      usdAnalysis: "Open pressure on the Fed has tended to weigh on the dollar; tariff escalation has had a mixed effect on it.",
      traderFocus: [
        "Tariffs or trade threats: safe-haven demand for Gold",
        "Calls for lower rates or criticism of the Fed: a weaker dollar",
        "Deals, truces or de-escalation: Gold loses its haven premium",
      ],
      timeframe: "Headline-driven moves from remarks often fade within the session unless policy action follows.",
    };
  }
  if (fed) {
    return {
      outcome: `${ev.event} has no published figure. The tone is the event.`,
      marketReaction: "Hawkish language (inflation not yet beaten, rates higher for longer) has tended to weigh on Gold and lift the dollar. Dovish language (progress on inflation, a cooling labour market, cuts getting closer) has tended to lift Gold and weaken the dollar.",
      goldImpact: "neutral",
      goldAnalysis: "How Gold moved in the first hour shows how the market read the tone. A sustained move usually means the message changed rate expectations; a spike that fades usually means it did not.",
      usdImpact: "neutral",
      usdAnalysis: "The dollar moves opposite to Gold on Fed tone: hawkish lifts it, dovish weighs on it.",
      traderFocus: [
        "'More progress needed' and similar phrases lean hawkish",
        "'Gaining confidence' or concern about jobs leans dovish",
        "Any hint about the timing of the next move matters more than the rest",
      ],
      timeframe: "A change in tone can reprice rate expectations for days; a repeat of the known view usually fades within hours.",
    };
  }
  return {
    outcome: `${ev.event} has no published figure. The content and the market's reaction are the read.`,
    marketReaction: "For speeches and statements, the direction comes from whether the message changes expectations for rates, growth or risk. How Gold moved in the first hour is the market's verdict.",
    goldImpact: "neutral",
    goldAnalysis: "A sustained move after the event suggests the message was new to the market; a quick fade suggests it was already priced.",
    usdImpact: "neutral",
    usdAnalysis: "Check whether the dollar moved opposite to Gold; if it did, the move was about rates or the dollar rather than risk.",
    traderFocus: [
      "Whether the message changed rate or growth expectations",
      "Whether the first move held past the first hour",
    ],
    timeframe: "Moves from speeches usually settle within the session.",
  };
}

/** Deterministic fallback analysis when AI is unavailable */
function buildFallbackAnalysis(ev: EconomicEvent): AIEventAnalysis {
  const actNum = toNum(ev.actual);
  const fcNum  = toNum(ev.forecast);
  const prNum  = toNum(ev.previous);

  const title    = ev.event;
  const t        = title.toLowerCase();
  const isRate   = RATE_DECISION_RE.test(t);
  const inverted = INVERTED_RE.test(t);
  const isJobs   = t.includes("payroll") || t.includes("employment") || t.includes("nfp");
  const isCPI    = t.includes("cpi") || t.includes("inflation") || t.includes("pce") || t.includes("ppi");

  const fc = ev.forecast && !NO_ACTUAL.has(String(ev.forecast).trim().toLowerCase()) ? ev.forecast : null;
  const pr = ev.previous && !NO_ACTUAL.has(String(ev.previous).trim().toLowerCase()) ? ev.previous : null;

  // ── No published actual ─────────────────────────────────────────────────────
  // This is NOT an in-line print. We simply do not know the result yet, so the
  // analysis has to be framed around price action rather than a fake surprise.
  if (actNum === null) {
    const expectation = isRate && fcNum !== null && prNum !== null
      ? fcNum > prNum
        ? `Consensus looked for a hike to ${fc} from ${pr}.`
        : fcNum < prNum
        ? `Consensus looked for a cut to ${fc} from ${pr}.`
        : `Consensus looked for a hold at ${fc}.`
      : fc && pr
      ? `Consensus was ${fc} against a prior ${pr}.`
      : fc
      ? `Consensus was ${fc}.`
      : "";

    return {
      outcome: `${title} has passed its scheduled release time, but the confirmed print has not reached our data feed yet. ${expectation}`.trim(),
      marketReaction: isRate
        ? "Read the decision off the tape rather than the headline number: the rate itself is usually pre-priced, so the move comes from the statement language and the projected path. Gold selling off with DXY bid means the market heard hawkish; Gold rallying with DXY offered means dovish."
        : "Until the number lands, let price do the talking. Compare Gold and DXY against where they traded 15 minutes before the release — that spread is the market's own verdict on whether the print came in hot or soft.",
      goldImpact: "neutral",
      goldAnalysis: "No confirmed print yet, so there is no data-driven read on Gold. Until it publishes, a clean 15-minute close in one direction is the best sign of how the market took it.",
      usdImpact: "neutral",
      usdAnalysis: "DXY direction is unconfirmed without the actual. First spikes on releases often retrace before the real move shows.",
      traderFocus: [
        "Actual not published yet — an unconfirmed surprise is not a signal",
        `Compare Gold and DXY now vs 15 minutes before ${title} — the spread is the real signal`,
        isRate
          ? "Statement language and the dot plot matter more than the rate itself"
          : "Refresh shortly; the print usually reaches the feed within a few hours",
      ],
      timeframe: "Bias pending. Reassess the moment the actual prints or a direction confirms on the 15-minute chart.",
    };
  }

  // ── Actual published — compute the surprise ─────────────────────────────────
  // Measured against the forecast. Archived releases (FRED) carry no forecast,
  // so they are read against the previous print instead: for a rate that is
  // the hike / cut / hold itself, for data it is the change on the prior month.
  const vsPrior = fcNum === null && prNum !== null;
  const ref   = fcNum ?? prNum;
  const above = ref !== null && actNum > ref;
  const below = ref !== null && actNum < ref;
  const diffN = ref !== null ? Math.abs(actNum - ref) : 0;
  // Keep the print's own unit on the gap ("141K", "0.2%"), so it reads as data.
  const unit  = String(ev.actual ?? "").replace(/[-\d.,\s+]/g, "");
  const diff  = isRate && vsPrior
    ? `${Math.round(diffN * 100)}bp`
    : `${diffN >= 10 ? diffN.toFixed(0) : diffN.toFixed(Math.abs(actNum) < 10 ? 2 : 1)}${unit}`;

  // "hot" = the print argues for tighter policy (higher rates) = bearish Gold.
  // For inverted indicators a higher number means weaker data, so the sign flips.
  const hot  = inverted ? below : above;
  const cold = inverted ? above : below;

  const goldImpact: "bullish" | "bearish" | "neutral" = hot ? "bearish" : cold ? "bullish" : "neutral";
  const usdImpact:  "bullish" | "bearish" | "neutral" = hot ? "bullish" : cold ? "bearish" : "neutral";

  const verdict = vsPrior
    ? isRate
      ? above ? `a ${diff} hike from ${pr}` : below ? `a ${diff} cut from ${pr}` : `held at ${ev.actual}`
      : above ? `up ${diff} on the prior ${pr}` : below ? `down ${diff} on the prior ${pr}` : `unchanged from the prior`
    : fcNum === null
    ? `printed ${ev.actual}`
    : above
    ? `${isRate ? "came in above the expected path by" : "beat by"} ${diff}`
    : below
    ? `${isRate ? "came in below the expected path by" : "missed by"} ${diff}`
    : "landed exactly in line with expectations";

  const outcome = `${title}: actual ${ev.actual}${fc ? ` vs forecast ${fc}` : ""}${pr ? ` (prior ${pr})` : ""} — ${verdict}`;

  const label = isRate && vsPrior ? (hot ? "Rate hike" : "Rate cut")
    : vsPrior ? (hot ? (isCPI ? "Hotter inflation than last month" : isJobs ? "Stronger jobs than last month" : "Stronger than the prior print")
                     : (isCPI ? "Cooler inflation than last month" : isJobs ? "Weaker jobs than last month" : "Weaker than the prior print"))
    : isRate ? (hot ? "Hawkish surprise" : "Dovish surprise")
    : isJobs ? (hot ? "Strong jobs beat" : "Weak jobs miss")
    : isCPI  ? (hot ? "Hot inflation print" : "Soft inflation print")
    : inverted ? (hot ? "Labour market held up better than expected" : "Labour market weaker than expected")
    : (hot ? "Strong data" : "Weak data");

  return {
    outcome,
    marketReaction: hot
      ? `${label} of ${diff} — Gold faces immediate selling pressure as rate-cut expectations get pushed back. USD should strengthen across the majors.`
      : cold
      ? `${label} of ${diff} — Gold should find buying support as rate-cut bets accelerate. USD selling expected.`
      : isRate && vsPrior
      ? `The Fed held at ${ev.actual}. With the rate unchanged, the move came from the statement and the projected path: hawkish language pressures Gold, dovish language lifts it.`
      : vsPrior
      ? `${title} was unchanged from the prior print, so the release on its own gave the market little to reprice.`
      : `${title} landed on forecast. With no surprise to reprice, expect a muted reaction and a fast fade of any spike.`,
    goldImpact,
    goldAnalysis: hot
      ? `${label} = the Fed has no urgency to cut = bearish Gold near-term. Rallies into resistance have tended to fade after prints like this.`
      : cold
      ? `${label} = rate-cut bets rise = bullish Gold. Dips toward the nearest support have tended to find buyers faster than the first spike holds.`
      : "On-forecast print — Gold likely consolidates inside its pre-release range. Wait for the next high-impact catalyst.",
    usdImpact,
    usdAnalysis: hot
      ? "USD bid — DXY tends to press resistance, with USDJPY and USDCHF typically firmer."
      : cold
      ? "USD offered — DXY faces selling pressure, with EURUSD and GBPUSD typically firmer."
      : "No repricing to trade — DXY likely range-bound. Monitor the next Fed speaker for direction.",
    traderFocus: hot
      ? ["Gold into resistance — a rejection there would confirm the bearish read", "DXY holding its breakout confirms the USD strength theme", "Rate-cut timeline pushed further out — the hawkish theme extends"]
      : cold
      ? ["Gold-positive — the first 15-minute spike often retraces before the move extends", "DXY rolling over — EURUSD and GBPUSD firming", "Watch for Gold to break above its pre-release high"]
      : ["On-forecast print — direction likely waits for a confirmed breakout", "No directional edge from this release", "The next major catalyst will set the trend"],
    timeframe: hot
      ? "1-3 sessions of USD strength and Gold weakness. Monitor the next CPI/jobs print for reversal signals."
      : cold
      ? "1-3 sessions of Gold strength have been typical — rate-cut repricing takes time."
      : "Range-bound for 1-2 sessions. Await the next catalyst.",
  };
}

function useAfterReleaseAnalysis(ev: EconomicEvent) {
  const [analysis, setAnalysis] = useState<AIEventAnalysis | null>(null);
  const [loading, setLoading]   = useState(false);
  const fetchedRef = useRef(false);

  const hasActual = toNum(ev.actual) !== null;
  const cacheKey  = `${ev.event}-${ev.actual ?? "pending"}-${ev.date}`;

  useEffect(() => {
    if (ev.status !== "completed" || fetchedRef.current) return;
    if (SPEECH_RE.test(ev.event)) {
      fetchedRef.current = true;
      setAnalysis(buildSpeechAnalysis(ev));
      return;
    }
    if (analysisCache.has(cacheKey)) {
      setAnalysis(analysisCache.get(cacheKey)!);
      return;
    }
    fetchedRef.current = true;
    setLoading(true);

    const summary = hasActual
      ? `Actual: ${ev.actual} | Forecast: ${ev.forecast} | Previous: ${ev.previous} | Result: ${(() => {
          const a = toNum(ev.actual), f = toNum(ev.forecast);
          const pv = toNum(ev.previous);
          if (a !== null && f === null && pv !== null) {
            return `no consensus forecast on record; versus the PREVIOUS print the actual is ${a > pv ? "HIGHER" : a < pv ? "LOWER" : "UNCHANGED"}. Read the surprise against the previous value (for a rate decision this is a hike, cut or hold), do not call it in line with forecast`;
          }
          if (a === null || f === null) return `actual ${ev.actual}, forecast ${ev.forecast}`;
          return a > f ? "ABOVE forecast" : a < f ? "BELOW forecast" : "IN LINE with forecast";
        })()}`
      : `Forecast: ${ev.forecast} | Previous: ${ev.previous} | ACTUAL NOT PUBLISHED YET — the release time has passed but no confirmed figure is available. Do NOT invent, guess or assume a result, and do NOT describe the print as in-line, a beat or a miss. Frame the analysis around what to watch in price action instead.`;

    const url = `/api/market/post-event?title=${encodeURIComponent(ev.event)}&summary=${encodeURIComponent(summary)}&markets=XAUUSD,DXY,USDJPY,EURUSD`;

    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then((data: AIEventAnalysis | null) => {
        if (data && data.outcome) {
          analysisCache.set(cacheKey, data);
          setAnalysis(data);
        } else {
          // AI unavailable — use deterministic fallback
          const fallback = buildFallbackAnalysis(ev);
          analysisCache.set(cacheKey, fallback);
          setAnalysis(fallback);
        }
      })
      .catch(() => {
        // Network error — use deterministic fallback
        const fallback = buildFallbackAnalysis(ev);
        analysisCache.set(cacheKey, fallback);
        setAnalysis(fallback);
      })
      .finally(() => setLoading(false));
  }, [cacheKey, ev.status, ev.actual, ev.forecast, ev.previous, ev.event, hasActual, ev]);

  return { analysis, loading, hasActual };
}

// ── Countdown Timer ───────────────────────────────────────────────────────────
function useCountdown(utcTimestamp?: number) {
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    if (!utcTimestamp) return;
    const tick = () => setDiff(utcTimestamp - Date.now());
    tick();
    const ms = (utcTimestamp - Date.now()) < 5 * 60_000 ? 1000 : 30_000;
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [utcTimestamp]);

  return diff;
}

function Countdown({ utcTimestamp, compact }: { utcTimestamp?: number; compact?: boolean }) {
  const diff = useCountdown(utcTimestamp);
  if (diff === null || diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const label = hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  const urgent = diff < 30 * 60_000;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
      urgent ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
    )}>
      <Timer className="h-2.5 w-2.5 shrink-0" />
      {label}
    </span>
  );
}

interface EconomicEventTableProps {
  events: EconomicEvent[];
  showInterpretation?: boolean;
  compact?: boolean;
  symbol?: string;
}

// ── Price-only highlighter ────────────────────────────────────────────────────
const PRICE_RE = /(\$[\d,]+(?:\.\d+)?[KMBTk]?|\b\d+\.?\d*%)/g;

function PriceHighlight({ text }: { text: string }) {
  const parts: { text: string; isPrice: boolean }[] = [];
  let last = 0, m: RegExpExecArray | null;
  PRICE_RE.lastIndex = 0;
  while ((m = PRICE_RE.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), isPrice: false });
    parts.push({ text: m[0], isPrice: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), isPrice: false });
  return (
    <>
      {parts.map((p, i) =>
        p.isPrice
          ? <span key={i} className="font-semibold" style={{ color: "var(--t-accent)" }}>{p.text}</span>
          : <span key={i}>{p.text}</span>
      )}
    </>
  );
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
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide", colors[impact])}>
      <Icon className="h-2.5 w-2.5" />
      {label} {impact.toUpperCase()}
    </span>
  );
}

function DataInline({ text }: { text: string }) {
  const parts = text.split(/([\$±]?[\d,]+\.?\d*[KkMmBb%]?(?:\s*[KkMmBb%])?)/g);
  return (
    <>
      {parts.map((part, i) =>
        /[\d]/.test(part)
          ? <span key={i} className="font-data tabular-nums text-zinc-200">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// ── Detail modal body (unchanged) ─────────────────────────────────────────────
// ── When a release happened, and what came before it ─────────────────────────

const RATE_TITLE_RE = /federal funds rate|interest rate|rate decision|bank rate|cash rate/i;

function daysAgo(date: string): string {
  const d = Math.round((Date.now() - Date.parse(`${date}T12:00:00Z`)) / 86_400_000);
  if (d <= 0) return d === 0 ? "today" : `in ${-d} day${d === -1 ? "" : "s"}`;
  if (d === 1) return "yesterday";
  if (d < 45) return `${d} days ago`;
  const m = Math.round(d / 30.4);
  return m < 18 ? `${m} months ago` : `${(d / 365).toFixed(1)} years ago`;
}

/**
 * "Wed, Sep 16, 2026 · 7 days ago" for a dated release. Archived monthly data
 * from FRED is dated by the month it measures, not the day it was published,
 * so it reads "Aug 2026 report" rather than pretending to a release date.
 */
export function releaseLabel(ev: Pick<EconomicEvent, "date" | "source" | "event">): string | null {
  if (!ev.date) return null;
  const d = new Date(`${ev.date}T12:00:00Z`);
  // Weekly claims are stored on their release day, so they get a real date.
  if (ev.source === "fred" && !RATE_TITLE_RE.test(ev.event) && !/claims/i.test(ev.event)) {
    // FRED dates monthly data by the month it covers; it is published the
    // following month (NFP on the first Friday, CPI mid-month).
    const month = (x: Date) => x.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 15));
    return `${month(d)} data · released ${month(next)}`;
  }
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })} · ${daysAgo(ev.date)}`;
}

/**
 * The last releases of the same event, newest first, so a trader can see the
 * trend going into the next print: direction, streaks and the recent average.
 */
function ReleaseHistory({ ev }: { ev: EconomicEvent }) {
  const [rows, setRows] = useState<EconomicEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Never leave the popup spinning: give up after 8s and show nothing.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    fetch(`/api/market/calendar/history?q=${encodeURIComponent(ev.event)}&exact=1&limit=12`, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : { data: [] }))
      .then(j => {
        if (cancelled) return;
        const list = ((j.data ?? []) as EconomicEvent[])
          .filter(r => toNum(r.actual) !== null)
          .filter(r => r.date !== ev.date || ev.status !== "completed" || r.actual !== ev.actual)
          .slice(0, 8);
        setRows(list);
      })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); ctrl.abort(); };
  }, [ev.event, ev.date, ev.status, ev.actual]);

  if (rows === null) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading past releases…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
        No past releases of {ev.event} on record yet. They are added as they happen.
      </p>
    );
  }

  const isRate = RATE_TITLE_RE.test(ev.event);
  // The table lists the releases BEFORE this one, but the summary has to
  // include it: a 4.00% hike sat above "Now at 3.75%" because rows[0] was the
  // previous meeting, not the decision the popup is about.
  const current = ev.status === "completed" && toNum(ev.actual) !== null ? toNum(ev.actual) : null;
  const nums = [...(current !== null ? [current] : []), ...rows.map(r => toNum(r.actual)!)];
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const unit = String(rows[0].actual ?? "").replace(/[-\d.,\s+]/g, "");
  const fmt = (n: number) =>
    `${Math.abs(n) >= 100 || unit === "K" ? n.toFixed(0) : n.toFixed(2).replace(/\.?0+$/, "")}${unit}`;

  // Change of each release against the one before it (rows are newest first).
  const change = (i: number) => (i + 1 < nums.length ? nums[i] - nums[i + 1] : null);
  let summary: string;
  if (isRate) {
    const moves = nums.map((_, i) => change(i)).filter((c): c is number => c !== null);
    const hikes = moves.filter(c => c > 0).length, cuts = moves.filter(c => c < 0).length;
    summary = `Last ${moves.length} decisions: ${cuts} cut${cuts === 1 ? "" : "s"}, ${hikes} hike${hikes === 1 ? "" : "s"}, ${moves.length - hikes - cuts} hold${moves.length - hikes - cuts === 1 ? "" : "s"}. Now at ${current !== null ? ev.actual : rows[0].actual}.`;
  } else {
    let streak = 0;
    const dir = Math.sign(change(0) ?? 0);
    for (let i = 0; dir !== 0 && change(i) !== null && Math.sign(change(i)!) === dir; i++) streak++;
    summary = `Average of the last ${nums.length}: ${fmt(avg)}.` +
      (streak >= 2 ? ` ${dir > 0 ? "Rising" : "Falling"} ${streak} releases in a row.` : "");
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Release history</p>
      <p className="text-[11px] text-zinc-300">{summary}</p>
      <div className="overflow-hidden rounded-lg border border-white/8">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-white/[0.03] text-[9px] uppercase tracking-wider text-zinc-500">
              <th className="px-2.5 py-1.5 text-left font-semibold">Released</th>
              <th className="px-2.5 py-1.5 text-right font-semibold">Actual</th>
              <th className="px-2.5 py-1.5 text-right font-semibold">Forecast</th>
              <th className="px-2.5 py-1.5 text-right font-semibold">{isRate ? "Move" : "Change"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const c = change(i + (current !== null ? 1 : 0));
              const fc = toNum(r.forecast);
              return (
                <tr key={`${r.date}-${i}`} className="border-t border-white/5">
                  <td className="px-2.5 py-1.5 text-zinc-400">
                    {(() => { const l = releaseLabel(r); return !l ? r.date : l.includes("released") ? l : l.split(" · ")[0]; })()}
                  </td>
                  <td className="px-2.5 py-1.5 text-right font-mono text-zinc-100">{r.actual}</td>
                  <td className="px-2.5 py-1.5 text-right font-mono text-zinc-500">{fc !== null ? r.forecast : "—"}</td>
                  <td className={cn("px-2.5 py-1.5 text-right font-mono",
                    c === null || c === 0 ? "text-zinc-500" : c > 0 ? "text-emerald-400" : "text-red-400")}>
                    {c === null ? "—"
                      : isRate ? (c === 0 ? "hold" : `${c > 0 ? "+" : ""}${Math.round(c * 100)}bp`)
                      : `${c > 0 ? "+" : ""}${fmt(c)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.some(r => r.source === "fred") && (
        <p className="text-[9px] text-zinc-500">Older releases come from FRED: the latest revised figure, without the consensus forecast. New releases are recorded as first printed, with their forecast.</p>
      )}
    </div>
  );
}

// ── Measured market reaction ──────────────────────────────────────────────────
// The analyses used to tell the reader to "compare Gold now vs before the
// release". The app has the candles, so it does that itself: the move from the
// last close before the event to the end of the first hour after it.
const REACTION_SYMBOLS = new Set(["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "BTCUSD", "ETHUSD"]);

type Reaction = { symbol: string; before: number; after: number; high: number; low: number; minutes: number };

function useMarketReaction(ev: EconomicEvent, symbol: string): Reaction | null {
  const [reaction, setReaction] = useState<Reaction | null>(null);
  useEffect(() => {
    if (ev.status !== "completed" || !ev.utcTimestamp) return;
    const eventSec = ev.utcTimestamp / 1000;
    const ageH = (Date.now() / 1000 - eventSec) / 3600;
    // Finest bars whose 500-bar history still reaches the event.
    const [tf, barSec] = ageH < 38 ? ["M5", 300] as const : ageH < 120 ? ["M15", 900] as const : ageH < 480 ? ["H1", 3600] as const : [null, 0] as const;
    if (!tf) return;
    const sym = REACTION_SYMBOLS.has(symbol) ? symbol : "XAUUSD";
    let cancelled = false;
    fetch(`/api/market/candles?symbol=${sym}&timeframe=${tf}`)
      .then(r => (r.ok ? r.json() : null))
      .then((j: { candles?: { t: number; h: number; l: number; c: number }[] } | null) => {
        const bars = j?.candles ?? [];
        const prior = bars.filter(b => b.t + barSec <= eventSec);
        const after = bars.filter(b => b.t >= eventSec && b.t < eventSec + 3600);
        if (cancelled || prior.length === 0 || after.length === 0) return;
        const last = after[after.length - 1];
        setReaction({
          symbol: sym,
          before: prior[prior.length - 1].c,
          after: last.c,
          high: Math.max(...after.map(b => b.h)),
          low: Math.min(...after.map(b => b.l)),
          minutes: Math.min(60, Math.round((last.t + barSec - eventSec) / 60)),
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ev.status, ev.utcTimestamp, symbol]);
  return reaction;
}

/**
 * Pip size as retail platforms (MT5) quote it: gold $0.10, silver $0.01,
 * JPY pairs 0.01, other FX 0.0001. Crypto has no pip convention: dollars.
 */
function pipSize(symbol: string): number | null {
  if (symbol === "XAUUSD") return 0.1;
  if (symbol === "XAGUSD") return 0.01;
  if (symbol.endsWith("JPY")) return 0.01;
  if (/^[A-Z]{6}$/.test(symbol) && !symbol.startsWith("BTC") && !symbol.startsWith("ETH")) return 0.0001;
  return null;
}

function MarketReaction({ ev, symbol }: { ev: EconomicEvent; symbol: string }) {
  const r = useMarketReaction(ev, symbol);
  if (!r) return null;
  const dp = r.after > 100 ? 2 : 5;
  const diff = r.after - r.before;
  const pct = (diff / r.before) * 100;
  const up = diff > 0;
  const pip = pipSize(r.symbol);
  const sign = up ? "+" : diff < 0 ? "−" : "";
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3.5 py-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
        Market reaction · {getSymbolShort(r.symbol)} · {r.minutes < 60 ? `first ${r.minutes} min so far` : "first hour"}
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={cn("font-data text-base font-bold tabular-nums", diff === 0 ? "text-zinc-400" : up ? "text-emerald-400" : "text-red-400")}>
          {pip
            ? `${sign}${Math.round(Math.abs(diff) / pip)} pips`
            : `${sign}${Math.abs(diff).toFixed(dp)}`}
        </span>
        <span className="font-data text-[11px] tabular-nums text-[hsl(var(--muted-foreground))]">
          {sign}{Math.abs(pct).toFixed(2)}% · {r.before.toFixed(dp)} → {r.after.toFixed(dp)}
          {" · range "}{pip ? `${Math.round((r.high - r.low) / pip)} pips` : `${r.low.toFixed(dp)}–${r.high.toFixed(dp)}`}
        </span>
      </div>
    </div>
  );
}

// ── Where to watch (speeches) ─────────────────────────────────────────────────
// Official pages first: they carry the event itself. The White House YouTube
// "live" tab can land on its 24/7 highlights stream, so whitehouse.gov/live and
// the channel's streams list are used instead. Other speakers are found with a
// YouTube search filtered to live broadcasts (or, afterwards, to replays).
function watchLinks(ev: EconomicEvent): { label: string; url: string }[] {
  const t = ev.event.toLowerCase();
  const after = ev.status === "completed";
  const name = ev.event.replace(/\b(speaks|speech|testifies|testimony|remarks)\b/gi, "").replace(/\s+/g, " ").trim();
  const day = ev.utcTimestamp ? new Date(ev.utcTimestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const yt = (q: string, live: boolean) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}${live ? "&sp=EgJAAQ%253D%253D" : ""}`;
  const links: { label: string; url: string }[] = [];
  if (t.includes("trump") || t.includes("president")) {
    links.push({ label: "White House live", url: "https://www.whitehouse.gov/live/" });
    links.push({ label: "White House on YouTube", url: "https://www.youtube.com/@WhiteHouse/streams" });
  } else if (/fomc|powell|fed |federal reserve/.test(t)) {
    links.push({ label: "Fed live broadcast", url: "https://www.federalreserve.gov/live-broadcast.htm" });
    links.push({ label: "Fed on YouTube", url: "https://www.youtube.com/@federalreserve/streams" });
  }
  links.push(after
    ? { label: "Find the replay", url: yt(`${name} ${day}`, false) }
    : { label: "Search live on YouTube", url: yt(name, true) });
  return links;
}

function WatchLinks({ ev }: { ev: EconomicEvent }) {
  const after = ev.status === "completed";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        {after ? "Watch replay" : ev.status === "live" ? "Watch live now" : "Watch live"}
      </span>
      {watchLinks(ev).map(l => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 text-[11px] font-semibold text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)_/_0.5)]"
        >
          <Radio className="h-3 w-3 text-red-400" /> {l.label}
        </a>
      ))}
    </div>
  );
}

// ── What was said (speeches) ──────────────────────────────────────────────────
const TONE_STYLE: Record<string, string> = {
  hawkish: "text-red-400 border-red-500/30 bg-red-500/10",
  escalation: "text-red-400 border-red-500/30 bg-red-500/10",
  dovish: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  "de-escalation": "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  mixed: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  neutral: "text-zinc-400 border-zinc-500/30 bg-zinc-500/10",
};

function SpeechRecap({ ev }: { ev: EconomicEvent }) {
  const [data, setData] = useState<SpeechRecapData | null>(null);
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  useEffect(() => {
    if (!ev.utcTimestamp) { setState("error"); return; }
    let cancelled = false;
    fetch(`/api/market/calendar/speech?title=${encodeURIComponent(ev.event)}&ts=${ev.utcTimestamp}`)
      .then(r => (r.ok ? r.json() : null))
      .then((d: SpeechRecapData | null) => {
        if (cancelled) return;
        setData(d);
        setState(d ? "done" : "error");
      })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [ev.event, ev.utcTimestamp]);

  if (state === "error") return null;
  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.04] overflow-hidden">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-sky-500/15">
        <Radio className="h-3.5 w-3.5 text-sky-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">What was said</span>
        {data?.tone && (
          <span className={cn("ml-auto rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", TONE_STYLE[data.tone])}>
            {data.tone}
          </span>
        )}
      </div>
      <div className="px-3.5 py-3 space-y-3">
        {state === "loading" && (
          <div className="flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the coverage…
          </div>
        )}
        {data?.summary && <p className="text-[12px] text-zinc-200 leading-relaxed">{data.summary}</p>}
        {data && data.keyPoints.length > 0 && (
          <ul className="space-y-1.5">
            {data.keyPoints.map((k, i) => (
              <li key={i} className="flex items-start gap-2">
                <ChevronRight className="h-3 w-3 text-sky-400/70 mt-0.5 shrink-0" />
                <span className="text-[11px] text-zinc-300 leading-snug">{k}</span>
              </li>
            ))}
          </ul>
        )}
        {data?.marketTakeaway && (
          <p className="text-[11px] text-zinc-400 leading-snug"><span className="text-zinc-500">For Gold and USD: </span>{data.marketTakeaway}</p>
        )}
        {data?.note && !data.summary && <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{data.note}</p>}
        {data && data.sources.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Sources ({data.sources.length})
            </summary>
            <ul className="mt-2 space-y-1.5">
              {data.sources.map((src, i) => (
                <li key={i} className="text-[11px] leading-snug">
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-sky-300">{src.title}</a>
                  <span className="text-zinc-600"> · {src.source} · {new Date(src.publishedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

function EventDetail({ ev, symbol = "XAUUSD" }: { ev: EconomicEvent; symbol?: string }) {
  const isCompleted = ev.status === "completed";
  const { analysis: aiAnalysis, loading: aiLoading, hasActual } = useAfterReleaseAnalysis(ev);
  const assetImpact = getEventImpactForSymbol(ev, symbol);
  const assetLabel = getSymbolLabel(symbol);

  const tradeGlow =
    assetImpact.impact === "bullish" || ev.usdImpact === "bullish"
      ? "border-emerald-500/30 bg-emerald-500/[0.06] shadow-[0_0_18px_rgba(52,211,153,0.12)]"
      : assetImpact.impact === "bearish" || ev.usdImpact === "bearish"
      ? "border-red-500/30 bg-red-500/[0.06] shadow-[0_0_18px_rgba(239,68,68,0.12)]"
      : "border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5";

  const tradeTextColor =
    assetImpact.impact === "bullish" || ev.usdImpact === "bullish" ? "text-emerald-400" :
    assetImpact.impact === "bearish" || ev.usdImpact === "bearish" ? "text-red-400" :
    "text-[hsl(var(--primary))]";

  return (
    <div className="space-y-4">
      {/* Time + status */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-data text-[11px] tabular-nums text-[hsl(var(--muted-foreground))]">
          {releaseLabel(ev) ? `${releaseLabel(ev)} · ` : ""}{ev.time} PHT
        </span>
        <Badge variant={ev.impact === "high" ? "high" : "medium"} className="text-[9px]">
          {ev.impact === "high" ? "HIGH IMPACT" : "MEDIUM IMPACT"}
        </Badge>
        {isCompleted && (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
            <CheckCircle2 className="h-2.5 w-2.5" /> COMPLETED
          </span>
        )}
        {ev.status === "upcoming" && <Countdown utcTimestamp={ev.utcTimestamp} />}
      </div>

      {/* Forecast / Previous / Actual */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Forecast", value: ev.forecast,        color: "text-blue-400" },
          { label: "Previous", value: ev.previous,        color: "text-zinc-400" },
          { label: "Actual",   value: SPEECH_RE.test(ev.event) ? "No figure" : ev.actual || " — ", color: ev.actual && !SPEECH_RE.test(ev.event) ? "text-[hsl(var(--primary))]" : "text-zinc-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg bg-[hsl(var(--secondary))] p-3 text-center">
            <p className="text-[9px] uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-1.5">{label}</p>
            <p className={cn("font-data text-sm font-bold tabular-nums tracking-tight", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Minutes and written statements have nothing to watch. */}
      {SPEECH_RE.test(ev.event) && !/minutes|statement/i.test(ev.event) && <WatchLinks ev={ev} />}
      {isCompleted && SPEECH_RE.test(ev.event) && <SpeechRecap ev={ev} />}
      {isCompleted && <MarketReaction ev={ev} symbol={symbol} />}

      {/* COMPLETED — post-event analysis */}
      {/* The templated post-event note only when the actual-aware analysis
          below is unavailable: side by side they repeated each other, and the
          template read as if the print were known when it was still pending. */}
      {isCompleted && ev.postEventSummary && !(aiLoading || aiAnalysis) && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] overflow-hidden">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-emerald-500/15">
            <Eye className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Post-Event Analysis</span>
            <span className="ml-auto text-[9px] text-emerald-400/50 uppercase tracking-wider">Completed</span>
          </div>
          <div className="px-3.5 py-3">
            <p className="text-[12px] text-zinc-200 leading-relaxed">{ev.postEventSummary}</p>
          </div>
          {ev.postEventBullets && ev.postEventBullets.length > 0 && (
            <div className="px-3.5 pb-3.5 space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/70">Now Watch</p>
              <ul className="space-y-1.5">
                {ev.postEventBullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 text-emerald-400/60 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-zinc-400 leading-snug">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* COMPLETED — AI after-release analysis (triggers for all completed events) */}
      {isCompleted && (aiLoading || aiAnalysis) && (
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.04] overflow-hidden">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-violet-500/15">
            <Zap className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">After Release Analysis</span>
            <span className="ml-auto text-[9px] text-violet-400/50 uppercase tracking-wider">
              {hasActual ? `Actual: ${ev.actual}` : SPEECH_RE.test(ev.event) ? "Speech · no figure" : "Actual pending"}
            </span>
          </div>

          {aiLoading ? (
            <div className="flex items-center gap-2 px-3.5 py-4">
              <Loader2 className="h-3.5 w-3.5 text-violet-400 animate-spin shrink-0" />
              <span className="text-[11px] text-zinc-500">Generating market reaction analysis...</span>
            </div>
          ) : aiAnalysis ? (
            <div className="px-3.5 py-3 space-y-3">
              {/* Outcome */}
              <p className="text-[12px] text-zinc-100 font-medium leading-relaxed">{aiAnalysis.outcome}</p>

              {/* Market Reaction */}
              {aiAnalysis.marketReaction && (
                <p className="text-[11px] text-zinc-300 leading-relaxed">{aiAnalysis.marketReaction}</p>
              )}

              {/* Gold + USD impact */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Gold (XAU/USD)", impact: aiAnalysis.goldImpact, text: aiAnalysis.goldAnalysis },
                  { label: "USD (DXY)",      impact: aiAnalysis.usdImpact,  text: aiAnalysis.usdAnalysis  },
                ].map(({ label, impact, text }) => (
                  <div key={label} className={cn("rounded-lg p-2.5", impact === "bullish" ? "bg-emerald-500/10 border border-emerald-500/20" : impact === "bearish" ? "bg-red-500/10 border border-red-500/20" : "bg-white/5 border border-white/10")}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</span>
                      <span className={cn("text-[9px] font-bold uppercase", impact === "bullish" ? "text-emerald-400" : impact === "bearish" ? "text-red-400" : "text-zinc-400")}>{impact}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-snug">{text}</p>
                  </div>
                ))}
              </div>

              {/* Trader Focus */}
              {aiAnalysis.traderFocus?.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400/70 mb-1.5">Now Watch</p>
                  <ul className="space-y-1">
                    {aiAnalysis.traderFocus.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight className="h-3 w-3 text-violet-400/60 mt-0.5 shrink-0" />
                        <span className="text-[11px] text-zinc-400 leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timeframe */}
              {aiAnalysis.timeframe && (
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Outlook: </span>
                  <span className="text-[10px] text-zinc-400">{aiAnalysis.timeframe}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* UPCOMING / LIVE — pre-event analysis */}
      {!isCompleted && ev.preEventSummary && (
        <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.04] overflow-hidden">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-blue-500/15">
            <Eye className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Pre-Event Analysis</span>
            <span className="ml-auto text-[9px] text-blue-300/90 uppercase tracking-wider">
              {ev.status === "live" ? "Event Starting" : "Upcoming"}
            </span>
          </div>
          <div className="px-3.5 py-3">
            <p className="text-[12px] text-[hsl(var(--foreground))] leading-relaxed">{ev.preEventSummary}</p>
          </div>
          {ev.preEventBullets && ev.preEventBullets.length > 0 && (
            <div className="px-3.5 pb-3.5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">What To Watch</p>
              <ul className="space-y-1.5">
                {ev.preEventBullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 text-blue-400 mt-0.5 shrink-0" />
                    <span className="text-[12px] text-zinc-200 leading-snug">
                      <DataInline text={b} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Pre-event asset / USD context */}
      {!isCompleted && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Before the release this is a conditional read, not an outcome. */}
            <span className="text-[10px] uppercase tracking-wider text-zinc-400">Bias if the forecast is met</span>
            <ImpactBadge impact={assetImpact.impact} label={getSymbolShort(symbol)} />
            <ImpactBadge impact={ev.usdImpact} label="USD" />
          </div>
          {assetImpact.reasoning && (
            <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">{assetLabel} Analysis</span>
              </div>
              <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{assetImpact.reasoning}</p>
            </div>
          )}
          {ev.usdReasoning && (
            <div className="rounded-lg bg-[hsl(var(--secondary))] p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">USD Analysis</span>
              </div>
              <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{ev.usdReasoning}</p>
            </div>
          )}
          {ev.tradeImplication && (
            <div className={cn("rounded-lg border p-3.5 transition-all", tradeGlow)}>
              <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1.5", tradeTextColor)}>Trade Implication</p>
              <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">
                <DataInline text={ev.tradeImplication} />
              </p>
            </div>
          )}
        </>
      )}

      {/* Affected assets */}
      {!SPEECH_RE.test(ev.event) && <ReleaseHistory ev={ev} />}

      {ev.affectedAssets?.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Affected Assets</p>
          <div className="flex flex-wrap gap-1.5">
            {(ev.affectedAssets ?? []).map((a) => (
              <span key={a} className="font-data text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-zinc-300">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Preview card (callisto style) ─────────────────────────────────────────────
function EventCard({
  ev, index, symbol, onClick,
}: {
  ev: EconomicEvent;
  index: number;
  symbol: string;
  onClick: () => void;
}) {
  const StatusIcon = ev.status === "completed" ? CheckCircle2 : ev.status === "live" ? Radio : Clock;
  const rowImpact = getEventImpactForSymbol(ev, symbol);
  const assetShort = getSymbolShort(symbol);

  const accentColor =
    ev.status === "live" ? "var(--t-accent)" :
    ev.status === "completed" ? "var(--t-bullish)" :
    "color-mix(in srgb, var(--t-muted) 40%, transparent)";

  const statusColor =
    ev.status === "live" ? "var(--t-accent)" :
    ev.status === "completed" ? "var(--t-bullish)" :
    "var(--t-muted)";

  const statusLabel =
    ev.status === "live" ? "LIVE NOW" :
    ev.status === "completed" ? "COMPLETED" : "UPCOMING";

  const impactLabel = ev.impact === "high" ? "HIGH" : "MED";
  const impactColor = ev.impact === "high" ? "var(--t-bearish)" : "var(--t-accent)";

  const tradeSnippet = ev.tradeImplication
    ? ev.tradeImplication.split(".")[0] + "."
    : null;

  const assetChip = (impact: "bullish" | "bearish" | "neutral" | undefined, label: string) => {
    if (!impact) return null;
    return (
      <span key={label} className="text-[8.5px] font-bold px-1.5 py-0.5"
        style={{
          color: impact === "bullish" ? "var(--t-bullish)" : impact === "bearish" ? "var(--t-bearish)" : "var(--t-muted)",
          background: impact === "bullish" ? "color-mix(in srgb, var(--t-bullish) 12%, transparent)" : impact === "bearish" ? "color-mix(in srgb, var(--t-bearish) 12%, transparent)" : "color-mix(in srgb, var(--t-muted) 10%, transparent)",
          borderRadius: "var(--t-badge-radius)",
          border: `1px solid ${impact === "bullish" ? "color-mix(in srgb, var(--t-bullish) 25%, transparent)" : impact === "bearish" ? "color-mix(in srgb, var(--t-bearish) 25%, transparent)" : "var(--t-border)"}`,
        }}>
        {label} {impact.toUpperCase()}
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      className="cursor-pointer active:opacity-80 transition-opacity overflow-hidden"
      style={{
        borderRadius: "var(--t-card-radius)",
        border: "1px solid var(--t-border)",
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
        background: "var(--t-card)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2" style={{ borderBottom: "1px solid var(--t-border)" }}>
        <div className="flex items-center gap-2">
          <StatusIcon className="h-3 w-3" style={{ color: accentColor }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--t-muted)" }}>
            {ev.id.startsWith("hist-") && releaseLabel(ev)
              ? <>{releaseLabel(ev)} · USD DATA</>
              : <>EVENT #{index + 1} · USD DATA</>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: impactColor }}>● {impactLabel}</span>
          {ev.status === "upcoming" && <Countdown utcTimestamp={ev.utcTimestamp} compact />}
          <span className="text-[10px] font-mono" style={{ color: "var(--t-muted)" }}>{ev.time} PHT</span>
        </div>
      </div>

      <div className="px-3.5 pt-2.5 pb-3">
        {/* Event name + status badge */}
        <div className="flex items-start gap-2 mb-2.5">
          <h3 className="text-[12.5px] font-black uppercase leading-snug flex-1 min-w-0" style={{ color: "var(--t-text)" }}>
            {ev.event}
          </h3>
          <span
            className="inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0"
            style={{
              color: statusColor,
              background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
              borderColor: `color-mix(in srgb, ${statusColor} 30%, transparent)`,
              borderRadius: "var(--t-badge-radius)",
            }}
          >
            <StatusIcon className="h-2.5 w-2.5" />
            {statusLabel}
          </span>
        </div>

        {/* F / P / A data row */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            { label: "Forecast", value: ev.forecast, color: "#60a5fa" },
            { label: "Previous", value: ev.previous, color: "var(--t-muted)" },
            { label: "Actual",   value: ev.actual || "—", color: ev.actual ? "var(--t-accent)" : "var(--t-muted)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg p-2 text-center"
              style={{ background: "color-mix(in srgb, var(--t-text) 4%, transparent)", border: "1px solid var(--t-border)" }}>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--t-muted)" }}>{label}</p>
              <p className="font-mono text-[11px] font-bold tabular-nums" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Asset impact chips */}
        <div className="flex flex-wrap gap-1 mb-3">
          {(ev.affectedAssets ?? []).slice(0, 3).map(a => (
            <span key={a} className="text-[8.5px] font-mono px-1.5 py-0.5"
              style={{ color: "var(--t-muted)", background: "color-mix(in srgb, var(--t-text) 5%, transparent)", borderRadius: "var(--t-badge-radius)", border: "1px solid var(--t-border)" }}>
              {a}
            </span>
          ))}
          {assetChip(rowImpact.impact, assetShort)}
          {assetChip(ev.usdImpact, "USD")}
        </div>

        {/* Trade implication snippet */}
        {tradeSnippet && (
          <p className="text-[11px] leading-relaxed mb-3" style={{ color: "var(--t-muted)" }}>
            <PriceHighlight text={tradeSnippet} />
          </p>
        )}

        {/* Tap hint */}
        <p className="text-[10px] text-right" style={{ color: "var(--t-muted)", opacity: 0.8 }}>
          Tap for full analysis →
        </p>
      </div>
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function EconomicEventTable({ events, showInterpretation = false, compact = false, symbol = "XAUUSD" }: EconomicEventTableProps) {
  const [selected, setSelected] = useState<EconomicEvent | null>(null);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center"
        style={{ borderRadius: "var(--t-card-radius)", border: "1px solid var(--t-border)" }}>
        <Clock className="h-5 w-5" style={{ color: "var(--t-muted)" }} />
        <p className="text-xs" style={{ color: "var(--t-muted)" }}>No high-impact USD events found</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {events.map((ev, i) => (
          <EventCard
            key={ev.id}
            ev={ev}
            index={i}
            symbol={symbol}
            onClick={() => setSelected(ev)}
          />
        ))}
      </div>

      <DetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.event}
      >
        {selected && <EventDetail ev={selected} symbol={symbol} />}
      </DetailModal>
    </>
  );
}

/**
 * Archive search results as a dense, terminal-style table: one row per
 * release, newest first, with the move against the prior print and the
 * Gold read. A row opens the same full analysis as the cards.
 */
/** "-0.0%" is zero; older archive rows were rounded into a negative sign. */
const noNegZero = (v: string) => v.replace(/^-(0(?:\.0+)?)(?=\D*$)/, "$1");

export function ArchiveTable({ events: raw, symbol = "XAUUSD" }: { events: EconomicEvent[]; symbol?: string }) {
  const [selected, setSelected] = useState<EconomicEvent | null>(null);

  // Rows archived without a "previous" (older backfills) take it from the
  // release before them of the same event, so every print can be read.
  const events = React.useMemo(() => {
    const byEvent = new Map<string, EconomicEvent[]>();
    for (const e of raw) byEvent.set(e.event, [...(byEvent.get(e.event) ?? []), e]);
    for (const list of byEvent.values()) list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return raw.map(e => {
      if (toNum(e.previous) !== null) return e;
      const list = byEvent.get(e.event)!;
      const older = list[list.indexOf(e) + 1];
      return older && toNum(older.actual) !== null ? { ...e, previous: older.actual! } : e;
    });
  }, [raw]);

  const READ: Record<"bullish" | "bearish" | "neutral", string> = {
    bullish: "text-emerald-400",
    bearish: "text-red-400",
    neutral: "text-zinc-400",
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-white/8">
        <table className="w-full min-w-[720px] text-[12px]">
          <thead>
            <tr className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-zinc-400">
              <th className="px-3 py-2 text-left font-semibold">Released</th>
              <th className="px-3 py-2 text-left font-semibold">Event</th>
              <th className="px-3 py-2 text-right font-semibold">Actual</th>
              <th className="px-3 py-2 text-right font-semibold">Previous</th>
              <th className="px-3 py-2 text-right font-semibold">Forecast</th>
              <th className="px-3 py-2 text-right font-semibold">Change</th>
              <th className="px-3 py-2 text-right font-semibold">Gold</th>
              <th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {events.map(ev => {
              const a = toNum(ev.actual), p = toNum(ev.previous), f = toNum(ev.forecast);
              const isRate = RATE_TITLE_RE.test(ev.event);
              const unit = String(ev.actual ?? "").replace(/[-\d.,\s+]/g, "");
              const c = a !== null && p !== null ? a - p : null;
              const change = c === null ? "—"
                : isRate ? (c === 0 ? "hold" : `${c > 0 ? "+" : ""}${Math.round(c * 100)}bp`)
                : `${c > 0 ? "+" : ""}${Math.abs(c) >= 10 || unit === "K" ? c.toFixed(0) : c.toFixed(2).replace(/\.?0+$/, "")}${unit}`;
              const gold = a !== null ? buildFallbackAnalysis(ev).goldImpact : null;
              const label = releaseLabel(ev);
              return (
                <tr key={ev.id} onClick={() => setSelected(ev)}
                  className="cursor-pointer border-t border-white/5 transition-colors hover:bg-white/[0.04]">
                  <td className="whitespace-nowrap px-3 py-2">
                    <p className="text-zinc-200">{label?.split(" · ")[0] ?? ev.date}</p>
                    <p className="text-[10px] text-zinc-500">
                      {[label?.split(" · ")[1], ev.time && ev.time !== "--:--" ? `${ev.time} PHT` : null].filter(Boolean).join(" · ")}
                    </p>
                  </td>
                  <td className="px-3 py-2 font-semibold text-zinc-100">{ev.event}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-zinc-50">{ev.actual ? noNegZero(ev.actual) : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">{p !== null ? noNegZero(ev.previous) : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">{f !== null ? ev.forecast : "—"}</td>
                  <td className={cn("px-3 py-2 text-right font-mono",
                    c === null || c === 0 ? "text-zinc-400" : c > 0 ? "text-emerald-400" : "text-red-400")}>{change}</td>
                  <td className={cn("px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide", gold ? READ[gold] : "text-zinc-500")}>
                    {gold ?? "—"}
                  </td>
                  <td className="pr-3 text-zinc-500"><ChevronRight className="h-3.5 w-3.5" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {events.some(e => e.source === "fred") && (
        <p className="mt-2 text-[10px] text-zinc-500">
          Change is against the previous print. Older releases come from FRED, which shows the latest revised figure (not always the first print traders saw) and no consensus forecast; monthly data is labelled by the month it covers and the month it was released.
        </p>
      )}

      <DetailModal open={!!selected} onClose={() => setSelected(null)} title={selected?.event}>
        {selected && <EventDetail ev={selected} symbol={symbol} />}
      </DetailModal>
    </>
  );
}
