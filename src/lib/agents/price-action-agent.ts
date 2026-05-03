/**
 * Agent 2 — Price Action Agent (LLM-Powered)
 *
 * Analyzes pure price action:
 * - Market structure (swing highs / swing lows)
 * - Trend continuation vs pullback
 * - Breakout vs failed breakout
 * - Candle rejection / momentum candles
 * - Support & resistance interaction
 * - Consolidation vs expansion phase
 * - Retest quality and close strength
 *
 * Uses Claude for deep structural analysis when API key available.
 * Falls back to rule-based logic for reliability.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  MarketSnapshot, SMCAgentOutput, SMCKeyLevels,
  DirectionalBias, SetupType, PriceZone,
} from "./schemas";

// ─────────────────────────────────────────────────────────────────────────────
// LLM Prompt
// ─────────────────────────────────────────────────────────────────────────────

const PA_SYSTEM_PROMPT = `You are an elite Price Action analyst. You read markets through raw price — candles, structure, range behavior, and momentum. You do not rely on indicators or institutional-flow narratives.

Your job: analyze the provided market data and identify the highest-probability price action setup.

FRAMEWORK:
- Market structure: identify whether price is making higher highs / higher lows (bullish) or lower highs / lower lows (bearish)
- Structure break (BOS): a decisive close beyond the most recent swing high (bullish BOS) or swing low (bearish BOS)
- Reversal shift (legacy CHoCH field): a structural shift — previous trend broken, new swing forming in the opposite direction
- Support/Resistance retest (legacy OB field): a key price level where price previously reversed with strong conviction — expect reaction on retest
- Imbalance/Gap (legacy FVG field): a price area skipped over by a strong momentum candle — acts as a magnet for price to return and fill
- Stop run / failed break (legacy Sweep field): price temporarily breaches a key level before snapping back with force
- Consolidation: price ranging between two levels — expect breakout in direction of higher timeframe bias
- Expansion: strong directional move with large-bodied candles and increasing momentum

CANDLE ANALYSIS:
- Rejection candles (pin bars, hammers, shooting stars): long wicks signal failed move, expect reversal
- Engulfing candles: full body absorption of prior candle — strong directional signal
- Inside bars: consolidation within prior candle range — expect breakout
- Close strength: where price closes within the candle range matters — close near high is bullish, near low is bearish

ENTRY LOGIC:
- Trend continuation: enter on pullback to support/resistance or imbalance fill, in direction of structure
- Reversal: enter on structure break + retest confirmation
- Breakout: enter on decisive close beyond consolidation range with momentum confirmation

CRITICAL OUTPUT RULES:
- Respond with ONLY valid JSON, no markdown, no code blocks
- All price levels must be precise numbers based on the actual data provided
- Return null for levels you cannot identify with confidence
- Do not invent setups that don't exist in the data
- setupType mapping: "BOS" = breakout continuation, "CHoCH" = trend-shift reversal, "OB" = support/resistance retest, "FVG" = gap fill, "Sweep" = stop-run reversal, "None" = no clear setup
- premiumDiscount mapping: "PREMIUM" = upper range, "EQUILIBRIUM" = midpoint, "DISCOUNT" = lower range

Return exactly this JSON structure:
{
  "bias": "bullish" | "bearish" | "neutral",
  "confidence": 0-100,
  "setupType": "OB" | "FVG" | "BOS" | "CHoCH" | "Sweep" | "None",
  "setupPresent": true | false,
  "bosDetected": true | false,
  "chochDetected": true | false,
  "liquiditySweepDetected": true | false,
  "premiumDiscount": "PREMIUM" | "EQUILIBRIUM" | "DISCOUNT",
  "keyLevels": {
    "orderBlockHigh": <key resistance level or null>,
    "orderBlockLow": <key support level or null>,
    "fvgHigh": <imbalance top or null>,
    "fvgLow": <imbalance bottom or null>,
    "fvgMid": <imbalance midpoint or null>,
    "liquidityTarget": <next target level or null>,
    "sweepLevel": <swept level or null>,
    "premiumZoneTop": <upper range boundary or null>,
    "discountZoneBottom": <lower range boundary or null>
  },
  "reasons": ["reason1", "reason2", "reason3"],
  "invalidationLevel": <price or null>
}`;

async function runLLMAnalysis(
  client: Anthropic,
  snapshot: MarketSnapshot
): Promise<SMCAgentOutput> {
  const start = Date.now();
  const { price, structure, indicators } = snapshot;

  const eq = structure.equilibrium;
  const premiumTop = eq + (price.high - eq) * 0.5;
  const discountBottom = eq - (eq - price.low) * 0.5;

  // Candle body analysis
  const body = Math.abs(price.current - price.open);
  const range = price.high - price.low;
  const upperWick = price.high - Math.max(price.current, price.open);
  const lowerWick = Math.min(price.current, price.open) - price.low;
  const closePosition = range > 0 ? ((price.current - price.low) / range * 100).toFixed(0) : "50";
  const bodyRatio = range > 0 ? (body / range * 100).toFixed(0) : "0";

  const userMessage = `
Analyze ${snapshot.symbolDisplay} (${snapshot.symbol}) for Price Action setup.

PRICE ACTION (${snapshot.timeframe}):
- Current: ${price.current} | Open: ${price.open} | High: ${price.high} | Low: ${price.low} | Prev Close: ${price.prevClose}
- Change: ${price.changePercent > 0 ? "+" : ""}${price.changePercent.toFixed(2)}% (${price.change > 0 ? "+" : ""}${price.change.toFixed(4)})
- Day range: ${price.dayRange.toFixed(4)} | Close position in range: ${closePosition}%
- Candle body ratio: ${bodyRatio}% | Upper wick: ${upperWick.toFixed(4)} | Lower wick: ${lowerWick.toFixed(4)}

MARKET STRUCTURE:
- 52-week range: ${structure.low52w} – ${structure.high52w}
- 52w position: ${structure.pos52w}% (${structure.zone})
- Equilibrium / midpoint: ${eq.toFixed(4)}
- Price in discount zone: ${structure.inDiscount} | Price in premium zone: ${structure.inPremium}
- HTF conviction: ${structure.htfBias.toUpperCase()} at ${structure.htfConfidence}%
- Structure context: ${structure.smcContext}

MOMENTUM:
- RSI(14): ${indicators.rsi.toFixed(1)} (${indicators.rsi > 70 ? "overbought" : indicators.rsi < 30 ? "oversold" : "neutral"})
- MACD histogram: ${indicators.macdHist > 0 ? "positive (bullish momentum)" : "negative (bearish momentum)"}
- Session: ${indicators.session}

KEY ZONE ESTIMATES:
- Premium zone top: ${premiumTop.toFixed(4)}
- Discount zone bottom: ${discountBottom.toFixed(4)}

IDENTIFY the most actionable price action setup. Consider structure, momentum, candle patterns, and key levels. Return JSON only.`.trim();

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 900,
    system: PA_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    agentId: "smc",
    bias: parsed.bias as DirectionalBias,
    confidence: parsed.confidence,
    setupType: parsed.setupType as SetupType,
    setupPresent: parsed.setupPresent,
    keyLevels: parsed.keyLevels as SMCKeyLevels,
    premiumDiscount: parsed.premiumDiscount as PriceZone,
    liquiditySweepDetected: parsed.liquiditySweepDetected,
    bosDetected: parsed.bosDetected,
    chochDetected: parsed.chochDetected,
    reasons: parsed.reasons,
    invalidationLevel: parsed.invalidationLevel,
    processingTime: Date.now() - start,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule-Based Fallback
// ─────────────────────────────────────────────────────────────────────────────

function runRuleBasedPA(snapshot: MarketSnapshot): SMCAgentOutput {
  const start = Date.now();
  const { price, structure, indicators } = snapshot;

  const {
    htfBias, htfConfidence, zone, smcContext,
    inDiscount, inPremium, equilibrium, pos52w,
  } = structure;
  const { changePercent, current, high, low, open, prevClose } = price;

  // ── Candle analysis ───────────────────────────────────────────────────────
  const candleRange = high - low;
  const candleBody  = Math.abs(current - open);
  const upperWick   = high - Math.max(current, open);
  const lowerWick   = Math.min(current, open) - low;
  const closeStrong = current > prevClose;                          // closed up
  const closeInUpperHalf = candleRange > 0 && (current - low) / candleRange > 0.5;
  const rejectionCandle = candleRange > 0 && candleBody / candleRange < 0.35;  // long wick relative to body
  const engulfing = candleBody > Math.abs(prevClose - open) * 1.1 && candleRange > 0;

  // ── Structure break detection ─────────────────────────────────────────────
  const bosUp   = smcContext.includes("BOS to upside") || (changePercent > 0.8 && closeInUpperHalf);
  const bosDown = smcContext.includes("BOS to downside") || (changePercent < -0.8 && !closeInUpperHalf);
  const bosDetected = bosUp || bosDown;

  // ── Reversal (CHoCH) detection ────────────────────────────────────────────
  const chochDetected = smcContext.includes("CHoCH") || (
    rejectionCandle && (
      (inPremium && lowerWick > upperWick * 1.5)  ||  // bearish rejection at top
      (inDiscount && upperWick < lowerWick * 1.5)     // bullish rejection at bottom… wait, invert
    )
  );

  // Fix: bullish rejection = long lower wick in discount; bearish = long upper wick in premium
  const bullishRejection = inDiscount && lowerWick > upperWick * 1.5 && lowerWick > candleBody;
  const bearishRejection = inPremium  && upperWick > lowerWick * 1.5 && upperWick > candleBody;
  const reversalSignal = bullishRejection || bearishRejection || chochDetected;

  // ── Sweep detection: large wick grabbing liquidity then reversing ─────────
  const sweepRatio = candleRange > 0 ? (candleRange - candleBody) / candleRange : 0;
  const liquiditySweepDetected = sweepRatio > 0.4 && Math.abs(changePercent) > 0.5;

  // ── Setup type priority ───────────────────────────────────────────────────
  // Sweep > BOS > CHoCH > S/R zone (OB) > Imbalance (FVG) > None
  let setupType: SetupType = "None";
  if (liquiditySweepDetected) setupType = "Sweep";
  else if (bosDetected) setupType = "BOS";
  else if (reversalSignal) setupType = "CHoCH";
  else if (htfConfidence > 55 && (inDiscount || inPremium)) setupType = "OB";
  else if (Math.abs(current - prevClose) > price.dayRange * 0.3) setupType = "FVG";

  const setupPresent = setupType !== "None";

  // ── Key levels ────────────────────────────────────────────────────────────
  // Support / resistance zone (mapped to legacy orderBlock fields)
  const srRange = current * 0.003;
  const obHigh  = bosUp || (htfBias === "bullish" && inDiscount)
    ? parseFloat((current + srRange * 0.5).toFixed(4))
    : null;
  const obLow   = bosUp || (htfBias === "bullish" && inDiscount)
    ? parseFloat((current - srRange * 0.5).toFixed(4))
    : null;

  // Imbalance / gap levels (mapped to legacy FVG fields)
  const gapSize = current - prevClose;
  const fvgHigh = gapSize < 0 ? parseFloat(Math.max(current, prevClose).toFixed(4)) : null;
  const fvgLow  = gapSize > 0 ? parseFloat(Math.min(current, prevClose).toFixed(4)) : null;
  const fvgMid  = (fvgHigh !== null && fvgLow !== null)
    ? parseFloat(((fvgHigh + fvgLow) / 2).toFixed(4))
    : null;

  // Next target level (equal highs/lows or session extremes)
  const liquidityTarget = htfBias === "bullish"
    ? parseFloat((high * 1.004).toFixed(4))
    : parseFloat((low * 0.996).toFixed(4));

  const sweepLevel = liquiditySweepDetected
    ? htfBias === "bullish"
      ? parseFloat(low.toFixed(4))
      : parseFloat(high.toFixed(4))
    : null;

  const premiumZoneTop     = parseFloat((equilibrium + (high - equilibrium) * 0.6).toFixed(4));
  const discountZoneBottom = parseFloat((equilibrium - (equilibrium - low) * 0.6).toFixed(4));

  // ── Bias determination ────────────────────────────────────────────────────
  let bias: DirectionalBias = htfBias;

  // Override towards reversal if strong rejection signal
  if (bullishRejection && htfBias !== "bearish") bias = "bullish";
  if (bearishRejection && htfBias !== "bullish") bias = "bearish";

  // ── Confidence ────────────────────────────────────────────────────────────
  let confidence = htfConfidence;
  if (setupPresent && bosDetected)   confidence = Math.min(95, confidence + 10);
  if (reversalSignal && engulfing)   confidence = Math.min(90, confidence + 8);
  if (liquiditySweepDetected)        confidence = Math.min(88, confidence + 6);

  // ── Reasons ───────────────────────────────────────────────────────────────
  const reasons: string[] = [];

  if (bosUp)
    reasons.push(`Bullish structure break — price closed above prior swing high ${prevClose.toFixed(4)}, continuation bias in effect`);
  if (bosDown)
    reasons.push(`Bearish structure break — price closed below prior swing low ${prevClose.toFixed(4)}, breakdown bias in effect`);
  if (bullishRejection)
    reasons.push(`Bullish rejection candle — long lower wick at discount zone (${current.toFixed(4)}), sellers failed to hold lows`);
  if (bearishRejection)
    reasons.push(`Bearish rejection candle — long upper wick at premium zone (${current.toFixed(4)}), buyers failed to hold highs`);
  if (liquiditySweepDetected)
    reasons.push(`Stop run detected — extended wick ran ${htfBias === "bullish" ? `${low.toFixed(4)} (lows)` : `${high.toFixed(4)} (highs)`} before snapping back, reversal risk elevated`);
  if (engulfing && closeStrong)
    reasons.push(`Bullish engulfing candle — full absorption of prior range, strong close near ${high.toFixed(4)}`);
  if (engulfing && !closeStrong)
    reasons.push(`Bearish engulfing candle — full absorption of prior range, strong close near ${low.toFixed(4)}`);
  if (inDiscount && htfBias === "bullish")
    reasons.push(`Price is trading in the lower half of the range (${current.toFixed(4)} below midpoint ${equilibrium.toFixed(4)}) — pullback buyers still have room to defend structure`);
  if (inPremium && htfBias === "bearish")
    reasons.push(`Price is trading in the upper half of the range (${current.toFixed(4)} above midpoint ${equilibrium.toFixed(4)}) — rally sellers still have room to defend resistance`);
  if (pos52w > 85)
    reasons.push(`Price near 52-week high (${pos52w}% of range) — key resistance area, watch for distribution or breakout`);
  if (pos52w < 15)
    reasons.push(`Price near 52-week low (${pos52w}% of range) — key support area, watch for accumulation or breakdown`);

  if (reasons.length === 0) {
    reasons.push(`HTF ${htfBias} bias at ${htfConfidence}% — no confirmed structure break, monitor for entry trigger`);
    reasons.push(`Price is in the ${zone === "PREMIUM" ? "upper range" : zone === "DISCOUNT" ? "lower range" : "mid-range"} — ${zone === "PREMIUM" ? "watch for resistance reactions" : zone === "DISCOUNT" ? "watch for support reactions" : "directional edge remains mixed"}`);
    reasons.push(`No strong candle signal — wait for rejection candle or breakout close to confirm direction`);
  }

  // ── Invalidation level ────────────────────────────────────────────────────
  const step = current > 1000 ? 5 : current > 100 ? 1 : 0.0005;
  const invalidationLevel = bias === "bullish"
    ? parseFloat((Math.floor(low * 0.998 / step) * step).toFixed(4))
    : bias === "bearish"
    ? parseFloat((Math.ceil(high * 1.002 / step) * step).toFixed(4))
    : null;

  return {
    agentId: "smc",
    bias,
    confidence: Math.round(confidence),
    setupType,
    setupPresent,
    keyLevels: {
      orderBlockHigh: obHigh,
      orderBlockLow: obLow,
      fvgHigh,
      fvgLow,
      fvgMid,
      liquidityTarget,
      sweepLevel,
      premiumZoneTop,
      discountZoneBottom,
    },
    premiumDiscount: zone,
    liquiditySweepDetected,
    bosDetected,
    chochDetected: reversalSignal,
    reasons: reasons.slice(0, 5),
    invalidationLevel,
    processingTime: Date.now() - start,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Agent Function
// ─────────────────────────────────────────────────────────────────────────────

export async function runPriceActionAgent(
  snapshot: MarketSnapshot,
  anthropicApiKey?: string
): Promise<SMCAgentOutput> {
  const start = Date.now();

  if (anthropicApiKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicApiKey });
      return await runLLMAnalysis(client, snapshot);
    } catch (err) {
      console.warn("Price Action Agent LLM fallback:", err);
    }
  }

  try {
    return runRuleBasedPA(snapshot);
  } catch (err) {
    return {
      agentId: "smc",
      bias: "neutral",
      confidence: 30,
      setupType: "None",
      setupPresent: false,
      keyLevels: {
        orderBlockHigh: null, orderBlockLow: null,
        fvgHigh: null, fvgLow: null, fvgMid: null,
        liquidityTarget: null, sweepLevel: null,
        premiumZoneTop: null, discountZoneBottom: null,
      },
      premiumDiscount: snapshot.structure.zone,
      liquiditySweepDetected: false,
      bosDetected: false,
      chochDetected: false,
      reasons: ["Price action analysis failed — defaulting to neutral"],
      invalidationLevel: null,
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
