/**
 * Agent 1 - Trend Agent (Claude-powered with rule-based fallback)
 *
 * Determines trend bias using:
 * - Market structure (BOS/CHoCH from conviction engine)
 * - Momentum (RSI + MACD proxy + % change)
 * - MA alignment (simulated from 52w position + daily momentum)
 * - Timeframe confluence
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  MarketSnapshot,
  TrendAgentOutput,
  TimeframeBias,
  DirectionalBias,
  MarketPhase,
} from "./schemas";
import { getTimeframeBiasFromCandles } from "./candles";

const TREND_SYSTEM = `You are the Trend Analysis Agent in a professional multi-agent trading terminal. Your job is to determine the dominant trend direction and market phase.

Analyze price action, momentum, and structure across all timeframes. Think like a seasoned technician who reads markets through price behavior, not just indicators.

FRAMEWORK:
- H4/H1 bias comes from HTF conviction and structural highs/lows
- RSI above 50 = bullish momentum, below 50 = bearish
- MACD histogram positive = expanding bullish momentum
- MA alignment: price in upper 52w range + RSI > 50 + positive MACD = bullish MA stack
- Market phases: Accumulation (discount, building longs) -> Expansion (trending hard) -> Distribution (premium, topping) -> Pullback (correcting in trend)

Return ONLY valid JSON - no markdown, no code blocks:
{
  "bias": "bullish" | "bearish" | "neutral",
  "confidence": 0-100,
  "timeframeBias": { "M5": "bullish|bearish|neutral", "M15": "bullish|bearish|neutral", "H1": "bullish|bearish|neutral", "H4": "bullish|bearish|neutral", "aligned": true|false },
  "maAlignment": true|false,
  "momentumDirection": "expanding" | "contracting" | "flat",
  "marketPhase": "Accumulation" | "Manipulation" | "Expansion" | "Distribution" | "Pullback" | "Range",
  "reasons": ["reason1", "reason2", "reason3", "reason4"],
  "invalidationLevel": number | null
}`;

async function runLLMTrend(client: Anthropic, snapshot: MarketSnapshot): Promise<TrendAgentOutput> {
  const start = Date.now();
  const { price, structure, indicators } = snapshot;

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
- In discount: ${structure.inDiscount} | In premium: ${structure.inPremium}

MOMENTUM:
- RSI(14): ${indicators.rsi.toFixed(1)}
- MACD histogram: ${indicators.macdHist > 0 ? "+" : ""}${indicators.macdHist.toFixed(4)} (${indicators.macdHist > 0 ? "bullish" : "bearish"} momentum)
- ATR proxy: ${indicators.atrProxy.toFixed(2)}% daily move
- Session: ${indicators.session} (hour ${indicators.sessionHour} UTC)

Determine the trend, market phase, and provide your institutional-grade reasoning.`.trim();

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: TREND_SYSTEM,
    messages: [{ role: "user", content: msg }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned);

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

// Candle-backed timeframe bias is preferred. This remains as a safe fallback only.
function deriveFallbackTimeframeBias(snapshot: MarketSnapshot): TimeframeBias {
  const { htfBias, htfConfidence } = snapshot.structure;
  const { changePercent, positionInDay } = snapshot.price;
  const { rsi } = snapshot.indicators;

  const H4: DirectionalBias = htfBias;

  const H1: DirectionalBias =
    htfConfidence >= 60
      ? htfBias
      : changePercent > 0.15
        ? "bullish"
        : changePercent < -0.15
          ? "bearish"
          : "neutral";

  const M15: DirectionalBias =
    changePercent > 0.3 && rsi > 52
      ? "bullish"
      : changePercent < -0.3 && rsi < 48
        ? "bearish"
        : "neutral";

  const M5: DirectionalBias =
    positionInDay > 65 && changePercent > 0
      ? "bullish"
      : positionInDay < 35 && changePercent < 0
        ? "bearish"
        : "neutral";

  const votes = [H4, H1, M15, M5];
  const bullCount = votes.filter((vote) => vote === "bullish").length;
  const bearCount = votes.filter((vote) => vote === "bearish").length;
  const aligned = bullCount >= 3 || bearCount >= 3;

  return { M5, M15, H1, H4, aligned };
}

async function resolveTimeframeBias(snapshot: MarketSnapshot): Promise<TimeframeBias> {
  try {
    return await getTimeframeBiasFromCandles(
      snapshot.symbol,
      snapshot.structure.htfBias,
      snapshot.price.current
    );
  } catch (error) {
    console.warn("[trend-agent] candle-backed timeframe bias failed:", error);
    return deriveFallbackTimeframeBias(snapshot);
  }
}

function deriveMomentumDirection(
  rsi: number,
  pctChange: number,
  macdHist: number
): "expanding" | "contracting" | "flat" {
  const rsiAbove50 = rsi > 50;
  const moveStrong = Math.abs(pctChange) > 0.5;
  const macdPositive = macdHist > 0;

  if (moveStrong && ((rsiAbove50 && macdPositive) || (!rsiAbove50 && !macdPositive))) {
    return "expanding";
  }

  if (Math.abs(pctChange) < 0.2 && Math.abs(rsi - 50) < 10) {
    return "flat";
  }

  return "contracting";
}

function derivePhase(snapshot: MarketSnapshot): MarketPhase {
  const { zone, htfBias } = snapshot.structure;
  const { rsi, atrProxy } = snapshot.indicators;
  const { changePercent } = snapshot.price;

  if (atrProxy > 1.2 && Math.abs(changePercent) > 0.8) return "Expansion";
  if (rsi > 68 && zone === "PREMIUM" && htfBias === "bullish") return "Distribution";
  if (rsi < 32 && zone === "DISCOUNT" && htfBias === "bearish") return "Accumulation";
  if (Math.abs(changePercent) < 0.15 && atrProxy < 0.3) return "Range";
  if (zone === "DISCOUNT" && htfBias === "bullish") return "Accumulation";
  if (zone === "PREMIUM" && htfBias === "bearish") return "Distribution";
  if (htfBias !== "neutral" && zone !== "EQUILIBRIUM") return "Pullback";
  return "Range";
}

function deriveMaAlignment(snapshot: MarketSnapshot): boolean {
  const { pos52w, htfBias } = snapshot.structure;
  const { rsi, macdHist } = snapshot.indicators;

  if (htfBias === "bullish" && pos52w > 50 && rsi > 50 && macdHist > 0) return true;
  if (htfBias === "bearish" && pos52w < 50 && rsi < 50 && macdHist < 0) return true;
  return false;
}

function buildReasons(
  snapshot: MarketSnapshot,
  timeframeBias: TimeframeBias,
  phase: MarketPhase,
  momentum: "expanding" | "contracting" | "flat"
): string[] {
  const { htfBias, htfConfidence, smcContext, zone, pos52w } = snapshot.structure;
  const { rsi, session } = snapshot.indicators;
  const reasons: string[] = [];

  reasons.push(`HTF bias ${htfBias.toUpperCase()} at ${htfConfidence}% conviction - ${smcContext.split(" | ")[0]}`);

  if (timeframeBias.aligned) {
    const dominant = timeframeBias.H4 === "bullish" ? "bullish" : "bearish";
    reasons.push(`Multi-timeframe confluence: M5/M15/H1/H4 all ${dominant} - strong trend alignment`);
  } else {
    const bullTFs = [timeframeBias.H4, timeframeBias.H1, timeframeBias.M15, timeframeBias.M5]
      .filter((bias) => bias === "bullish").length;
    reasons.push(`Mixed TF alignment: ${bullTFs}/4 timeframes bullish - partial confluence only`);
  }

  reasons.push(`${phase} phase detected - ${
    phase === "Expansion"
      ? "institutional order flow in progress, momentum trades valid"
      : phase === "Accumulation"
        ? "smart money building positions at discount, reversal potential building"
        : phase === "Distribution"
          ? "smart money distributing at premium, counter-move risk elevated"
          : phase === "Pullback"
            ? "corrective move within trend, pullback entries aligning"
            : "consolidation range, avoid breakout trades, fade extremes"
  }`);

  reasons.push(`RSI ${rsi.toFixed(0)} - ${
    rsi > 70
      ? "overbought extreme, distribution phase, stop-run risk above highs"
      : rsi > 60
        ? "above midline, bullish momentum confirmed with room to expand"
        : rsi > 50
          ? "marginally above midline, trend present but weak"
          : rsi > 40
            ? "below midline, bearish lean"
            : rsi > 30
              ? "approaching oversold, bearish momentum dominant"
              : "oversold extreme, potential reversal zone, stop-run below lows"
  }`);

  reasons.push(`Price at ${pos52w}% of 52-week range (${zone} zone) during ${session} session - ${
    zone === "PREMIUM"
      ? "sell pressure zone"
      : zone === "DISCOUNT"
        ? "buy pressure zone"
        : "equilibrium, no directional edge"
  }`);

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
      console.warn("Trend Agent LLM fallback:", err);
    }
  }

  try {
    const { htfBias, htfConfidence } = snapshot.structure;
    const { rsi, macdHist } = snapshot.indicators;
    const { changePercent, current } = snapshot.price;

    const timeframeBias = await resolveTimeframeBias(snapshot);
    const momentum = deriveMomentumDirection(rsi, changePercent, macdHist);
    const phase = derivePhase(snapshot);
    const maAlignment = deriveMaAlignment(snapshot);

    let biasScore = 0;

    biasScore += htfBias === "bullish" ? htfConfidence : htfBias === "bearish" ? -htfConfidence : 0;

    if (timeframeBias.aligned) {
      biasScore += timeframeBias.H4 === "bullish" ? 15 : -15;
    }

    if (momentum === "expanding") {
      biasScore += biasScore > 0 ? 10 : -10;
    } else if (momentum === "contracting") {
      biasScore *= 0.8;
    }

    if (maAlignment) biasScore *= 1.15;

    const bias: DirectionalBias =
      biasScore > 10 ? "bullish" : biasScore < -10 ? "bearish" : "neutral";

    const confidence = Math.min(95, Math.max(20, Math.abs(biasScore)));
    const reasons = buildReasons(snapshot, timeframeBias, phase, momentum);

    const step = current > 1000 ? 10 : current > 100 ? 1 : 0.001;
    const invalidationLevel =
      bias === "bullish"
        ? parseFloat((Math.floor((current * 0.985) / step) * step).toFixed(4))
        : bias === "bearish"
          ? parseFloat((Math.ceil((current * 1.015) / step) * step).toFixed(4))
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
      reasons: ["Trend analysis failed - defaulting to neutral"],
      invalidationLevel: null,
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
