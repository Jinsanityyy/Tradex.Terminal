/**
 * Agent 1 - Trend Agent
 *
 * Determines trend bias using pure price action + technical indicators:
 * - Market structure: HH+HL (bullish) | LH+LL (bearish)
 * - Break of Structure (BOS) for phase detection
 * - RSI for momentum confirmation
 * - MACD histogram for momentum direction
 * - EMA 20/50/200 stack for trend alignment
 * - Multi-timeframe confluence from candle data
 */

import Anthropic from "@anthropic-ai/sdk";
import { anthropicCreate } from "./circuit-breaker";
import type {
  MarketSnapshot,
  TrendAgentOutput,
  TimeframeBias,
  DirectionalBias,
  MarketPhase,
} from "./schemas";
import { getTimeframeBiasFromCandles, getMAFromCandles } from "./candles";

function deriveFallbackTimeframeBias(snapshot: MarketSnapshot): TimeframeBias {
  const { htfBias, htfConfidence } = snapshot.structure;
  const { changePercent, positionInDay } = snapshot.price;
  const { rsi, macdHist } = snapshot.indicators;

  const H4: DirectionalBias = htfBias;

  const H1: DirectionalBias =
    htfConfidence >= 60 ? htfBias
    : changePercent > 0.15 && rsi > 50 ? "bullish"
    : changePercent < -0.15 && rsi < 50 ? "bearish"
    : "neutral";

  const M15: DirectionalBias =
    changePercent > 0.3 && rsi > 52 && macdHist > 0 ? "bullish"
    : changePercent < -0.3 && rsi < 48 && macdHist < 0 ? "bearish"
    : "neutral";

  const M5: DirectionalBias =
    positionInDay > 65 && changePercent > 0 ? "bullish"
    : positionInDay < 35 && changePercent < 0 ? "bearish"
    : "neutral";

  const votes = [H4, H1, M15, M5];
  const bullCount = votes.filter(v => v === "bullish").length;
  const bearCount = votes.filter(v => v === "bearish").length;

  return { M5, M15, H1, H4, aligned: bullCount >= 3 || bearCount >= 3 };
}

async function resolveTimeframeBias(snapshot: MarketSnapshot): Promise<TimeframeBias> {
  try {
    return await getTimeframeBiasFromCandles(
      snapshot.symbol,
      snapshot.structure.htfBias,
      snapshot.structure.htfConfidence,
      snapshot.price.current
    );
  } catch {
    return deriveFallbackTimeframeBias(snapshot);
  }
}

function deriveMomentumDirection(
  rsi: number,
  pctChange: number,
  macdHist: number,
  maStack: string,
  atrProxy: number
): "expanding" | "contracting" | "flat" {
  // Scale thresholds relative to instrument volatility so a 0.5% move is "strong"
  // for low-vol forex but noise for high-vol crypto or gold during news events.
  // strongMoveThreshold = 50% of the instrument's typical daily ATR, floored at 0.2%.
  const strongMoveThreshold = Math.max(0.2, atrProxy * 0.5);
  const flatThreshold       = Math.max(0.05, atrProxy * 0.1);

  const strongMove  = Math.abs(pctChange) > strongMoveThreshold;
  const macdAligned = (pctChange > 0 && macdHist > 0) || (pctChange < 0 && macdHist < 0);
  const maAligned   = (pctChange > 0 && maStack === "bullish") || (pctChange < 0 && maStack === "bearish");

  if (strongMove && macdAligned && maAligned) return "expanding";
  if (Math.abs(pctChange) < flatThreshold && Math.abs(macdHist) < 0.001) return "flat";
  return "contracting";
}

function derivePhase(snapshot: MarketSnapshot, maStack: string): MarketPhase {
  const { zone, htfBias } = snapshot.structure;
  const { rsi, atrProxy } = snapshot.indicators;
  const { changePercent } = snapshot.price;

  if (atrProxy > 1.2 && Math.abs(changePercent) > 0.8 && maStack !== "neutral") return "Expansion";
  if ((rsi > 52 && htfBias === "bearish") || (rsi < 48 && htfBias === "bullish")) return "Reversal";
  if (atrProxy > 0.8 && Math.abs(changePercent) > 0.6) return "Breakout";
  if (htfBias !== "neutral" && rsi >= 40 && rsi <= 60) return "Pullback";
  if (Math.abs(changePercent) < 0.15 && atrProxy < 0.3) return "Range";

  return htfBias !== "neutral" ? "Pullback" : "Range";
}

function deriveMaAlignment(snapshot: MarketSnapshot, maStack: string): boolean {
  const { htfBias } = snapshot.structure;
  const { rsi, macdHist } = snapshot.indicators;

  if (htfBias === "bullish" && rsi > 50 && macdHist > 0 && maStack === "bullish") return true;
  if (htfBias === "bearish" && rsi < 50 && macdHist < 0 && maStack === "bearish") return true;
  return false;
}

function buildReasons(
  snapshot: MarketSnapshot,
  timeframeBias: TimeframeBias,
  phase: MarketPhase,
  maStack: string,
  maData: { ma20: number | null; ma50: number | null }
): string[] {
  const { htfBias, htfConfidence, smcContext, zone, pos52w } = snapshot.structure;
  const { rsi, macdHist, session } = snapshot.indicators;
  const reasons: string[] = [];

  reasons.push(`HTF ${htfBias.toUpperCase()} @ ${htfConfidence}% - ${smcContext.split(" | ")[0]}`);

  if (timeframeBias.aligned) {
    const dom = timeframeBias.H4 === "bullish" ? "bullish" : "bearish";
    reasons.push(`Multi-TF confluence: M5/M15/H1/H4 all ${dom} - strong trend alignment`);
  } else {
    const votes = [timeframeBias.H4, timeframeBias.H1, timeframeBias.M15, timeframeBias.M5];
    const bullTFs = votes.filter(b => b === "bullish").length;
    const bearTFs = votes.filter(b => b === "bearish").length;
    const neutralTFs = votes.length - bullTFs - bearTFs;

    if (bullTFs === 0 && bearTFs === 0) {
      reasons.push("No TF directional alignment: 4/4 neutral - no multi-timeframe trend edge");
    } else {
      reasons.push(`Mixed TF alignment: ${bullTFs} bullish / ${bearTFs} bearish / ${neutralTFs} neutral - partial confluence`);
    }
  }

  const maMsg = maStack !== "neutral"
    ? `MA stack ${maStack.toUpperCase()} - ${maData.ma20 !== null ? `EMA20 ${maData.ma20.toFixed(2)}` : ""}${maData.ma50 !== null ? `, EMA50 ${maData.ma50.toFixed(2)}` : ""}`
    : "MA stack neutral (mixed EMA alignment) - no directional MA edge";
  reasons.push(maMsg);

  reasons.push(`RSI ${rsi.toFixed(0)}: ${
    rsi > 70 ? "overbought - reversal risk, avoid new longs"
    : rsi > 60 ? "strong bullish momentum"
    : rsi > 50 ? "above midline, bullish lean"
    : rsi > 40 ? "below midline, bearish lean"
    : rsi > 30 ? "bearish momentum building"
    : "oversold - reversal risk, avoid new shorts"
  } | MACD ${macdHist > 0 ? "+" : ""}${macdHist.toFixed(4)}: ${macdHist > 0 ? "bullish" : "bearish"} momentum`);

  reasons.push(`${phase} phase - price at ${pos52w}% of 52w range (${zone}) | ${session} session`);

  return reasons;
}

function buildAndybioticReason(snapshot: MarketSnapshot): string {
  const andy = snapshot.indicators.andybiotic;
  if (!andy) return "Andybiotic Max%: insufficient M5 candle history";

  const stDir   = andy.superTrendDir === -1 ? "BULL" : "BEAR";
  const fresh   = andy.superTrendDir === -1
    ? (andy.barsSinceBull <= 2 ? `fresh crossover (${andy.barsSinceBull} bars ago)` : `${andy.barsSinceBull} bars since last BUY`)
    : (andy.barsSinceBear <= 2 ? `fresh crossover (${andy.barsSinceBear} bars ago)` : `${andy.barsSinceBear} bars since last SELL`);
  const signal  = andy.isSmartBuy ? "✦ SMART BUY" : andy.isSmartSell ? "✦ SMART SELL" : andy.isBull ? "BUY crossover" : andy.isBear ? "SELL crossover" : "no fresh signal";
  const emaTag  = andy.ema200 != null ? (snapshot.price.current > andy.ema200 ? "above EMA200 ✓" : "below EMA200 ✓") : "";
  const adxTag  = andy.isSideways
    ? `ADX ${andy.adx?.toFixed(1) ?? "N/A"} — RANGING (signals suppressed)`
    : `ADX ${andy.adx?.toFixed(1) ?? "N/A"} trending`;

  return `Andybiotic Max% (5m): SuperTrend ${stDir} @ ${andy.superTrend.toFixed(2)} | ${signal} | ${fresh} | ${emaTag} | ${adxTag}`;
}

function resolveFinalBias(
  htfBias: DirectionalBias,
  timeframeBias: TimeframeBias,
  maStack: "bullish" | "bearish" | "neutral",
  biasScore: number
): DirectionalBias {
  const preliminaryBias: DirectionalBias =
    biasScore > 10 ? "bullish" : biasScore < -10 ? "bearish" : "neutral";

  if (preliminaryBias === "neutral") return "neutral";

  const timeframeVotes = [timeframeBias.H4, timeframeBias.H1, timeframeBias.M15, timeframeBias.M5];
  const bullSignals =
    (htfBias === "bullish" ? 1 : 0) +
    timeframeVotes.filter(v => v === "bullish").length +
    (maStack === "bullish" ? 1 : 0);
  const bearSignals =
    (htfBias === "bearish" ? 1 : 0) +
    timeframeVotes.filter(v => v === "bearish").length +
    (maStack === "bearish" ? 1 : 0);

  if (bullSignals === 0 && bearSignals === 0) return "neutral";
  if (preliminaryBias === "bullish" && bullSignals === 0) return "neutral";
  if (preliminaryBias === "bearish" && bearSignals === 0) return "neutral";
  if (preliminaryBias === "bullish" && bearSignals > bullSignals && !timeframeBias.aligned) return "neutral";
  if (preliminaryBias === "bearish" && bullSignals > bearSignals && !timeframeBias.aligned) return "neutral";

  return preliminaryBias;
}

// ── Optional LLM narration ──────────────────────────────────────────────────────
// The deterministic computation is the SOURCE OF TRUTH for bias/confidence/phase.
// The LLM is used ONLY to rewrite the human-readable `reasons` so they stay
// perfectly consistent with the decided bias. Bias/confidence are never changed.
async function narrateTrendReasons(
  client: Anthropic,
  snapshot: MarketSnapshot,
  computed: TrendAgentOutput,
  maData: { ma20: number | null; ma50: number | null; ma200: number | null; maStack: string }
): Promise<string[] | null> {
  const { price, structure, indicators } = snapshot;
  const andy = indicators.andybiotic;
  const andyLine = andy
    ? `Andybiotic Max% (5m): SuperTrend ${andy.superTrendDir === -1 ? "BULL" : "BEAR"} @ ${andy.superTrend.toFixed(2)} | ${andy.isSmartBuy ? "SMART BUY" : andy.isSmartSell ? "SMART SELL" : andy.isBull ? "BUY crossover" : andy.isBear ? "SELL crossover" : "no fresh signal"} | ADX ${andy.adx?.toFixed(1) ?? "N/A"} ${andy.isSideways ? "(RANGING)" : "(trending)"} | Price ${andy.ema200 != null ? (price.current > andy.ema200 ? "ABOVE" : "BELOW") + " EMA200" : ""}`
    : "Andybiotic Max%: no data (insufficient M5 candle history)";

  const sys = `You are the Trend Analysis Agent for a trading terminal. The bias has been decided by Andybiotic Max% (5m SuperTrend). Your job: write exactly 4 bullet reasons justifying the ${computed.bias.toUpperCase()} bias using ONLY the data provided below.

STRICT RULES:
- NEVER mention PDH, PDL, PDH/PDL midpoint, JadeCap, daily open, or previous day levels
- ALWAYS start reason #1 with the Andybiotic Max% SuperTrend signal
- Use only the data fields given — do not invent or assume price levels
- Return ONLY a valid JSON array of 4 strings, nothing else`;

  const msg = `
DECIDED BIAS: ${computed.bias.toUpperCase()} @ ${computed.confidence}% | Phase: ${computed.marketPhase} | Momentum: ${computed.momentumDirection}
${snapshot.symbolDisplay} (${snapshot.symbol}) ${snapshot.timeframe}

DATA:
1. ${andyLine}
2. TF alignment: M5 ${computed.timeframeBias.M5} / M15 ${computed.timeframeBias.M15} / H1 ${computed.timeframeBias.H1} / H4 ${computed.timeframeBias.H4} (all aligned: ${computed.timeframeBias.aligned})
3. RSI(14) ${indicators.rsi.toFixed(1)} | MACD hist ${indicators.macdHist > 0 ? "+" : ""}${indicators.macdHist.toFixed(4)}
4. MA stack ${maData.maStack.toUpperCase()} | EMA20 ${maData.ma20?.toFixed(2) ?? "N/A"} | EMA50 ${maData.ma50?.toFixed(2) ?? "N/A"}
5. ATR ${indicators.atrProxy.toFixed(2)}% | Session: ${indicators.session} | Zone: ${structure.zone}

Return JSON array of 4 strings. Reason #1 MUST reference Andybiotic Max% SuperTrend.`.trim();

  const response = await anthropicCreate(client, {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: sys,
    messages: [{ role: "user", content: msg }],
  });
  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  if (Array.isArray(parsed) && parsed.every(s => typeof s === "string") && parsed.length > 0) {
    return parsed.slice(0, 5);
  }
  return null;
}

export async function runTrendAgent(
  snapshot: MarketSnapshot,
  anthropicApiKey?: string
): Promise<TrendAgentOutput> {
  const start = Date.now();
  // Track MA data so the optional narration step can reuse it without re-fetching.
  let maDataForNarration: { ma20: number | null; ma50: number | null; ma200: number | null; maStack: string } =
    { ma20: null, ma50: null, ma200: null, maStack: "neutral" };

  try {
    const { htfBias, htfConfidence } = snapshot.structure;
    const { rsi, macdHist } = snapshot.indicators;
    const { changePercent, current } = snapshot.price;

    const maData = await getMAFromCandles(snapshot.symbol, snapshot.timeframe, current)
      .catch(() => ({ ma20: null, ma50: null, ma200: null, maStack: "neutral" as const }));
    maDataForNarration = maData;

    const timeframeBias = await resolveTimeframeBias(snapshot);
    const momentum = deriveMomentumDirection(rsi, changePercent, macdHist, maData.maStack, snapshot.indicators.atrProxy);
    const phase = derivePhase(snapshot, maData.maStack);
    const maAlignment = deriveMaAlignment(snapshot, maData.maStack);

    let biasScore = 0;

    // ── PRIMARY: Andybiotic Max% (5m) ────────────────────────────────────────
    // SuperTrend direction is the main signal source.
    // ADX < 15 = ranging market → suppress score entirely.
    const andy = snapshot.indicators.andybiotic;
    if (andy && !andy.isSideways) {
      // SuperTrend direction — core signal: +30 / -30
      if (andy.superTrendDir === -1) biasScore += 30; // bullish: price above ST
      if (andy.superTrendDir ===  1) biasScore -= 30; // bearish: price below ST

      // Smart Buy / Smart Sell (bull/bear + EMA200 confirmed): +15 / -15
      if (andy.isSmartBuy)  biasScore += 15;
      if (andy.isSmartSell) biasScore -= 15;

      // Fresh crossover on this bar (≤ 2 bars ago): +10 / -10
      if (andy.isBull && andy.barsSinceBull <= 2) biasScore += 10;
      if (andy.isBear && andy.barsSinceBear <= 2) biasScore -= 10;

      // Price vs EMA200 filter: +8 / -8
      if (andy.ema200 != null) {
        if (snapshot.price.current > andy.ema200) biasScore += 8;
        else                                       biasScore -= 8;
      }
    } else if (andy?.isSideways) {
      // ADX < 15: ranging — no directional edge, zero score
      biasScore = 0;
    }

    // ── SECONDARY: Confluence confirmations ──────────────────────────────────
    // These only strengthen / weaken the Andybiotic primary signal.
    // They cannot override it — each is capped at ±10.
    if (rsi > 55) biasScore += 6;
    if (rsi < 45) biasScore -= 6;
    if (macdHist > 0) biasScore += 4;
    if (macdHist < 0) biasScore -= 4;
    if (maData.maStack === "bullish") biasScore += 8;
    if (maData.maStack === "bearish") biasScore -= 8;
    if (momentum === "expanding") biasScore += biasScore > 0 ? 6 : -6;
    if (momentum === "contracting") biasScore *= 0.85;

    const recentCandles = snapshot.recentCandles;
    const bias = resolveFinalBias(htfBias, timeframeBias, maData.maStack, biasScore);
    const confidence = Math.min(95, Math.max(20, Math.abs(biasScore)));
    const reasons = buildReasons(snapshot, timeframeBias, phase, maData.maStack, maData);

    // Andybiotic Max% reason — always first, it's the primary signal
    reasons.unshift(buildAndybioticReason(snapshot));

    // Invalidation level: prefer the most recent swing low/high from candle data.
    // For bullish bias → last significant swing low (recent candle low below PDL or yesterday's low).
    // For bearish bias → last significant swing high.
    // Falls back to a ±1.5% proxy only when no candle data is available.
    let invalidationLevel: number | null = null;
    if (bias !== "neutral") {
      if (recentCandles && recentCandles.length >= 3) {
        const lookback = recentCandles.slice(-20); // last 20 candles
        if (bias === "bullish") {
          const swingLow = Math.min(...lookback.map(c => c.l));
          invalidationLevel = parseFloat((swingLow * 0.999).toFixed(4));
        } else {
          const swingHigh = Math.max(...lookback.map(c => c.h));
          invalidationLevel = parseFloat((swingHigh * 1.001).toFixed(4));
        }
      } else {
        const step = current > 1000 ? 10 : current > 100 ? 1 : 0.001;
        invalidationLevel = bias === "bullish"
          ? parseFloat((Math.floor(current * 0.985 / step) * step).toFixed(4))
          : parseFloat((Math.ceil(current * 1.015 / step) * step).toFixed(4));
      }
    }

    const result: TrendAgentOutput = {
      agentId: "trend",
      bias,
      confidence: Math.round(confidence),
      timeframeBias,
      maAlignment,
      momentumDirection: momentum,
      marketPhase: phase,
      reasons,
      invalidationLevel,
      processingTime: Date.now() - start,
    };

    // Optional LLM narration — rewrites `reasons` only, never the decided bias.
    if (anthropicApiKey) {
      try {
        const client = new Anthropic({ apiKey: anthropicApiKey });
        const narrated = await narrateTrendReasons(client, snapshot, result, maDataForNarration);
        if (narrated) {
          result.reasons = narrated;
          result.processingTime = Date.now() - start;
        }
      } catch (err) {
        console.warn("[trend-agent] narration failed, using deterministic reasons:", err);
      }
    }

    return result;
  } catch (err) {
    return {
      agentId: "trend",
      bias: "neutral",
      confidence: 30,
      timeframeBias: { M5: "neutral", M15: "neutral", H1: "neutral", H4: "neutral", aligned: false },
      maAlignment: false,
      momentumDirection: "flat",
      marketPhase: "Range",
      reasons: ["Trend analysis failed - defaulting to neutral"],
      invalidationLevel: null,
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
