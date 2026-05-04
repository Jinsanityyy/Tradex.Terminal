/**
 * Agent 1 — Trend Agent
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
import type {
  MarketSnapshot,
  TrendAgentOutput,
  TimeframeBias,
  DirectionalBias,
  MarketPhase,
} from "./schemas";
import { getTimeframeBiasFromCandles, getMAFromCandles } from "./candles";

const TREND_SYSTEM = `You are the Trend Analysis Agent. Determine the dominant trend using Price Action + RSI + MACD + Moving Averages.

FRAMEWORK:
- Market structure: Higher Highs (HH) + Higher Lows (HL) = BULLISH; Lower Highs (LH) + Lower Lows (LL) = BEARISH
- Break of Structure (BOS): decisive close beyond last swing high/low → structure shift
- RSI(14): above 50 = bullish momentum, below 50 = bearish; >70 overbought, <30 oversold
- MACD histogram: positive = expanding bullish momentum; negative = expanding bearish; divergence = weakening trend
- Moving Averages: price > EMA20 > EMA50 = bullish MA stack; price < EMA20 < EMA50 = bearish MA stack; EMA200 = long-term trend
- Trend phases:
  - Expansion: strong structure + RSI trending + MACD aligned + MA stacked
  - Pullback: corrective move, structure intact, RSI resetting toward 50
  - Range: no clear HH/HL or LH/LL, RSI oscillating around 50, flat MAs
  - Reversal: BOS in opposite direction + RSI crossing 50 + MACD crossing zero
  - Breakout: momentum spike out of range, RSI expansion, MACD diverging

BIAS RULES:
- H4/H1 bias: primary trend from structure + MA stack
- If MA stack aligned with structure → high confidence
- RSI divergence against trend = reduce confidence
- MACD histogram opposing structure = reduce confidence

Return ONLY valid JSON - no markdown, no code blocks:
{
  "bias": "bullish" | "bearish" | "neutral",
  "confidence": 0-100,
  "timeframeBias": { "M5": "bullish|bearish|neutral", "M15": "bullish|bearish|neutral", "H1": "bullish|bearish|neutral", "H4": "bullish|bearish|neutral", "aligned": true|false },
  "maAlignment": true|false,
  "momentumDirection": "expanding" | "contracting" | "flat",
  "marketPhase": "Expansion" | "Pullback" | "Range" | "Reversal" | "Breakout",
  "reasons": ["reason1", "reason2", "reason3", "reason4"],
  "invalidationLevel": number | null
}`;

async function runLLMTrend(client: Anthropic, snapshot: MarketSnapshot): Promise<TrendAgentOutput> {
  const start = Date.now();
  const { price, structure, indicators } = snapshot;

  // Fetch MA data to enrich the LLM prompt
  const maData = await getMAFromCandles(snapshot.symbol, snapshot.timeframe, price.current)
    .catch(() => ({ ma20: null, ma50: null, ma200: null, maStack: "neutral" as const }));

  const msg = `
Analyze trend for ${snapshot.symbolDisplay} (${snapshot.symbol}) on ${snapshot.timeframe}.

PRICE DATA:
- Current: ${price.current} | Open: ${price.open} | High: ${price.high} | Low: ${price.low}
- Change: ${price.changePercent > 0 ? "+" : ""}${price.changePercent.toFixed(2)}% today
- Position in today's range: ${price.positionInDay.toFixed(0)}%

MARKET STRUCTURE:
- 52-week range: ${structure.low52w} - ${structure.high52w}
- Position: ${structure.pos52w}% of range (${structure.zone})
- HTF Bias: ${structure.htfBias.toUpperCase()} at ${structure.htfConfidence}% conviction
- Structure context: ${structure.smcContext}

INDICATORS:
- RSI(14): ${indicators.rsi.toFixed(1)} (${indicators.rsi > 70 ? "overbought" : indicators.rsi < 30 ? "oversold" : indicators.rsi > 50 ? "bullish" : "bearish"})
- MACD histogram: ${indicators.macdHist > 0 ? "+" : ""}${indicators.macdHist.toFixed(4)} (${indicators.macdHist > 0 ? "bullish momentum" : "bearish momentum"})
- EMA20: ${maData.ma20 !== null ? maData.ma20.toFixed(4) : "N/A"} | EMA50: ${maData.ma50 !== null ? maData.ma50.toFixed(4) : "N/A"} | EMA200: ${maData.ma200 !== null ? maData.ma200.toFixed(4) : "N/A"}
- MA Stack: ${maData.maStack.toUpperCase()} (${maData.maStack === "bullish" ? "price > EMA20 > EMA50 — trend confirmed" : maData.maStack === "bearish" ? "price < EMA20 < EMA50 — trend confirmed" : "mixed — no clear stack"})
- Session: ${indicators.session} (hour ${indicators.sessionHour} UTC)

Determine trend bias, market phase, and give institutional-grade reasoning using structure + RSI + MACD + MA alignment.`.trim();

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: TREND_SYSTEM,
    messages: [{ role: "user", content: msg }],
  });

  const raw     = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed  = JSON.parse(cleaned);

  return {
    agentId: "trend",
    bias: parsed.bias as DirectionalBias,
    confidence: parsed.confidence,
    timeframeBias: parsed.timeframeBias as TimeframeBias,
    maAlignment: parsed.maAlignment,
    momentumDirection: parsed.momentumDirection,
    marketPhase: parsed.marketPhase as MarketPhase,
    reasons: parsed.reasons,
    invalidationLevel: parsed.invalidationLevel,
    processingTime: Date.now() - start,
  };
}

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

  const votes   = [H4, H1, M15, M5];
  const bullCount = votes.filter(v => v === "bullish").length;
  const bearCount = votes.filter(v => v === "bearish").length;

  return { M5, M15, H1, H4, aligned: bullCount >= 3 || bearCount >= 3 };
}

async function resolveTimeframeBias(snapshot: MarketSnapshot): Promise<TimeframeBias> {
  try {
    return await getTimeframeBiasFromCandles(
      snapshot.symbol,
      snapshot.structure.htfBias,
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
  maStack: string
): "expanding" | "contracting" | "flat" {
  const strongMove  = Math.abs(pctChange) > 0.5;
  const macdAligned = (pctChange > 0 && macdHist > 0) || (pctChange < 0 && macdHist < 0);
  const maAligned   = (pctChange > 0 && maStack === "bullish") || (pctChange < 0 && maStack === "bearish");

  if (strongMove && macdAligned && maAligned) return "expanding";
  if (Math.abs(pctChange) < 0.2 && Math.abs(macdHist) < 0.001) return "flat";
  return "contracting";
}

function derivePhase(snapshot: MarketSnapshot, maStack: string): MarketPhase {
  const { zone, htfBias } = snapshot.structure;
  const { rsi, atrProxy } = snapshot.indicators;
  const { changePercent }  = snapshot.price;

  // Expansion: strong trend, RSI extended, MA aligned
  if (atrProxy > 1.2 && Math.abs(changePercent) > 0.8 && maStack !== "neutral") return "Expansion";

  // Reversal: structure shift + RSI crossing midpoint
  if ((rsi > 52 && htfBias === "bearish") || (rsi < 48 && htfBias === "bullish")) return "Reversal";

  // Breakout: strong move with low prior volatility
  if (atrProxy > 0.8 && Math.abs(changePercent) > 0.6) return "Breakout";

  // Pullback: trending but RSI resetting to midzone
  if (htfBias !== "neutral" && rsi >= 40 && rsi <= 60) return "Pullback";

  // Range: flat price action
  if (Math.abs(changePercent) < 0.15 && atrProxy < 0.3) return "Range";

  return htfBias !== "neutral" ? "Pullback" : "Range";
}

function deriveMaAlignment(snapshot: MarketSnapshot, maStack: string): boolean {
  const { htfBias } = snapshot.structure;
  const { rsi, macdHist } = snapshot.indicators;
  // True when price structure, RSI, MACD, and MA stack all agree
  if (htfBias === "bullish" && rsi > 50 && macdHist > 0 && maStack === "bullish") return true;
  if (htfBias === "bearish" && rsi < 50 && macdHist < 0 && maStack === "bearish") return true;
  return false;
}

function buildReasons(
  snapshot: MarketSnapshot,
  timeframeBias: TimeframeBias,
  phase: MarketPhase,
  momentum: "expanding" | "contracting" | "flat",
  maStack: string,
  maData: { ma20: number | null; ma50: number | null }
): string[] {
  const { htfBias, htfConfidence, smcContext, zone, pos52w } = snapshot.structure;
  const { rsi, macdHist, session } = snapshot.indicators;
  const { current } = snapshot.price;
  const reasons: string[] = [];

  reasons.push(`HTF ${htfBias.toUpperCase()} @ ${htfConfidence}% — ${smcContext.split(" | ")[0]}`);

  if (timeframeBias.aligned) {
    const dom = timeframeBias.H4 === "bullish" ? "bullish" : "bearish";
    reasons.push(`Multi-TF confluence: M5/M15/H1/H4 all ${dom} — strong trend alignment`);
  } else {
    const bullTFs = [timeframeBias.H4, timeframeBias.H1, timeframeBias.M15, timeframeBias.M5]
      .filter(b => b === "bullish").length;
    reasons.push(`Mixed TF alignment: ${bullTFs}/4 bullish — partial confluence`);
  }

  const maMsg = maStack !== "neutral"
    ? `MA stack ${maStack.toUpperCase()} — ${maData.ma20 !== null ? `EMA20 ${maData.ma20.toFixed(2)}` : ""}${maData.ma50 !== null ? `, EMA50 ${maData.ma50.toFixed(2)}` : ""}`
    : `MA stack neutral (mixed EMA alignment) — no directional MA edge`;
  reasons.push(maMsg);

  reasons.push(`RSI ${rsi.toFixed(0)}: ${
    rsi > 70 ? "overbought — reversal risk, avoid new longs"
    : rsi > 60 ? "strong bullish momentum"
    : rsi > 50 ? "above midline, bullish lean"
    : rsi > 40 ? "below midline, bearish lean"
    : rsi > 30 ? "bearish momentum building"
    : "oversold — reversal risk, avoid new shorts"
  } | MACD ${macdHist > 0 ? "+" : ""}${macdHist.toFixed(4)}: ${macdHist > 0 ? "bullish" : "bearish"} momentum`);

  reasons.push(`${phase} phase — price at ${pos52w}% of 52w range (${zone}) | ${session} session`);

  return reasons;
}

export async function runTrendAgent(
  snapshot: MarketSnapshot,
  anthropicApiKey?: string
): Promise<TrendAgentOutput> {
  const start = Date.now();

  if (anthropicApiKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicApiKey });
      return await runLLMTrend(client, snapshot);
    } catch (err) {
      console.warn("[trend-agent] LLM fallback:", err);
    }
  }

  try {
    const { htfBias, htfConfidence } = snapshot.structure;
    const { rsi, macdHist, atrProxy } = snapshot.indicators;
    const { changePercent, current }  = snapshot.price;

    // Fetch MA data (may throw — caught below)
    const maData = await getMAFromCandles(snapshot.symbol, snapshot.timeframe, current)
      .catch(() => ({ ma20: null, ma50: null, ma200: null, maStack: "neutral" as const }));

    const timeframeBias = await resolveTimeframeBias(snapshot);
    const momentum      = deriveMomentumDirection(rsi, changePercent, macdHist, maData.maStack);
    const phase         = derivePhase(snapshot, maData.maStack);
    const maAlignment   = deriveMaAlignment(snapshot, maData.maStack);

    // Weighted bias score
    let biasScore = 0;
    biasScore += htfBias === "bullish" ? htfConfidence : htfBias === "bearish" ? -htfConfidence : 0;
    if (timeframeBias.aligned) biasScore += timeframeBias.H4 === "bullish" ? 15 : -15;
    if (rsi > 55)  biasScore += 8;
    if (rsi < 45)  biasScore -= 8;
    if (macdHist > 0) biasScore += 5;
    if (macdHist < 0) biasScore -= 5;
    if (maData.maStack === "bullish") biasScore += 10;
    if (maData.maStack === "bearish") biasScore -= 10;
    if (momentum === "expanding") biasScore += biasScore > 0 ? 8 : -8;
    if (momentum === "contracting") biasScore *= 0.85;

    const bias: DirectionalBias =
      biasScore > 10 ? "bullish" : biasScore < -10 ? "bearish" : "neutral";
    const confidence = Math.min(95, Math.max(20, Math.abs(biasScore)));
    const reasons    = buildReasons(snapshot, timeframeBias, phase, momentum, maData.maStack, maData);

    const step = current > 1000 ? 10 : current > 100 ? 1 : 0.001;
    const invalidationLevel =
      bias === "bullish"
        ? parseFloat((Math.floor(current * 0.985 / step) * step).toFixed(4))
        : bias === "bearish"
          ? parseFloat((Math.ceil(current * 1.015 / step) * step).toFixed(4))
          : null;

    return {
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
  } catch (err) {
    return {
      agentId: "trend",
      bias: "neutral",
      confidence: 30,
      timeframeBias: { M5: "neutral", M15: "neutral", H1: "neutral", H4: "neutral", aligned: false },
      maAlignment: false,
      momentumDirection: "flat",
      marketPhase: "Range",
      reasons: ["Trend analysis failed — defaulting to neutral"],
      invalidationLevel: null,
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
