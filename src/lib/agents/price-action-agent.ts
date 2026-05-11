/**
 * Agent 2 — Price Action Agent (Intraday Liquidity & Volatility Model)
 *
 * Rules: Daily Bias → Session Levels → Liquidity Sweep (NY 13:00–18:00 UTC)
 * → FVG Detection → Entry/SL/TP.
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

const JADE_CAP_SYSTEM = `You are an elite intraday analyst implementing a session-based price action model.

ANALYSIS RULES:

STEP 1 — DAILY BIAS
- HTF structure bullish (prev day close > open) → bias = "bullish"
- HTF structure bearish (prev day close < open) → bias = "bearish"

STEP 2 — SESSION LEVELS
- Asian High/Low: 00:00–08:00 UTC range
- London High/Low: 08:00–13:00 UTC range
- PDH/PDL: previous day high/low

STEP 3 — LIQUIDITY SWEEP (NY session 13:00–18:00 UTC ONLY)
- Price wicks past a session level by $2+ (XAUUSD) but closes BACK INSIDE = sweep
- liquiditySweepDetected = true; swept level → keyLevels.sweepLevel
- Confidence: 50 base + modifier per sweep level:
  London Low  → +15  (best setup)
  PDH         → +10
  Asian High  → +10
  Asian Low   → +5
  London High → +0   (flag only, do NOT recommend trading)

STEP 4 — FVG DETECTION (scan 8 candles after sweep)
- Bullish FVG: candle[i-1].high < candle[i+1].low
- Bearish FVG: candle[i-1].low > candle[i+1].high
- Record fvgHigh, fvgLow, fvgMid; setupType = "FVG"; setupPresent = true

STEP 5 — LEVELS
- Entry: FVG midpoint
- Stop Loss: sweep extreme + $5 buffer → invalidationLevel
- Take Profit: 1.5R → keyLevels.liquidityTarget

FIELD MAPPING:
- bias             → daily bias (Step 1)
- confidence       → 50 base + sweep modifier (0 if no sweep)
- setupType        → "FVG" | "Sweep" | "None"
- setupPresent     → true only if liquidity sweep confirmed
- bosDetected      → true if sweep direction aligns with daily bias
- chochDetected    → true if FVG forms after the sweep
- liquiditySweepDetected → true when sweep confirmed in NY session
- premiumDiscount  → "PREMIUM" (upper 50% of day range), "DISCOUNT" (lower 50%), "EQUILIBRIUM"
- reasons          → swept level type, FVG zone, daily bias, session

CRITICAL OUTPUT RULES:
- Respond with ONLY valid JSON, no markdown, no code blocks
- No sweep outside NY session (13:00–18:00 UTC): setupPresent = false, setupType = "None"
- London High sweep: confidence = 50, flag in reasons, do NOT set setupPresent = true
- All price levels must be precise numbers or null

Return exactly this JSON:
{
  "bias": "bullish" | "bearish" | "neutral",
  "confidence": 0-100,
  "setupType": "FVG" | "Sweep" | "None",
  "setupPresent": true | false,
  "bosDetected": true | false,
  "chochDetected": true | false,
  "liquiditySweepDetected": true | false,
  "premiumDiscount": "PREMIUM" | "EQUILIBRIUM" | "DISCOUNT",
  "keyLevels": {
    "orderBlockHigh": null,
    "orderBlockLow": null,
    "fvgHigh": <FVG top or null>,
    "fvgLow": <FVG bottom or null>,
    "fvgMid": <FVG midpoint or null>,
    "liquidityTarget": <1.5R TP or null>,
    "sweepLevel": <swept session level or null>,
    "premiumZoneTop": <upper range boundary or null>,
    "discountZoneBottom": <lower range boundary or null>
  },
  "reasons": ["reason1", "reason2", "reason3"],
  "invalidationLevel": <SL = sweep extreme + $5 buffer, or null>
}`;

async function runLLMAnalysis(
  client: Anthropic,
  snapshot: MarketSnapshot
): Promise<SMCAgentOutput> {
  const start = Date.now();
  const { price, structure, indicators } = snapshot;
  const { current, open, high, low, prevClose, dayRange, positionInDay } = price;
  const { sessionHour, session } = indicators;
  const { htfBias, htfConfidence, equilibrium, zone, pos52w } = structure;

  const upperWick   = high - Math.max(current, open);
  const lowerWick   = Math.min(current, open) - low;
  const candleRange = high - low;
  const candleBody  = Math.abs(current - open);
  const bodyRatio   = candleRange > 0 ? ((candleBody / candleRange) * 100).toFixed(0) : "0";
  const closePos    = candleRange > 0 ? (((current - low) / candleRange) * 100).toFixed(0) : "50";
  const inNYSession = sessionHour >= 13 && sessionHour < 18;

  // Estimated session levels from day range
  const asianHigh  = parseFloat((equilibrium + dayRange * 0.18).toFixed(4));
  const asianLow   = parseFloat((equilibrium - dayRange * 0.18).toFixed(4));
  const londonHigh = parseFloat((equilibrium + dayRange * 0.27).toFixed(4));
  const londonLow  = parseFloat((equilibrium - dayRange * 0.27).toFixed(4));
  const pdh        = parseFloat((prevClose + dayRange * 0.40).toFixed(4));
  const pdl        = parseFloat((prevClose - dayRange * 0.40).toFixed(4));

  const wickHighTarget = high > londonHigh ? "PAST London High"
    : high > asianHigh ? "PAST Asian High"
    : high > pdh       ? "PAST PDH"
    : "within session range";
  const wickLowTarget = low < londonLow ? "PAST London Low"
    : low < asianLow ? "PAST Asian Low"
    : low < pdl      ? "PAST PDL"
    : "within session range";
  const closedBackInside =
    (high > londonHigh && current < londonHigh) || (low < londonLow && current > londonLow) ||
    (high > asianHigh  && current < asianHigh)  || (low < asianLow  && current > asianLow)  ||
    (high > pdh        && current < pdh)         || (low < pdl       && current > pdl);

  const userMessage = `
Analyze ${snapshot.symbolDisplay} (${snapshot.symbol}) — session-based price action model.

CURRENT CANDLE (${snapshot.timeframe}):
- Close: ${current} | Open: ${open} | High: ${high} | Low: ${low} | Prev Close: ${prevClose}
- Body ratio: ${bodyRatio}% | Upper wick: ${upperWick.toFixed(4)} | Lower wick: ${lowerWick.toFixed(4)}
- Close position in candle: ${closePos}% | Day range position: ${positionInDay.toFixed(0)}%

SESSION CONTEXT:
- Current session: ${session} | UTC hour: ${sessionHour}
- NY session sweep window (13:00–18:00 UTC): ${inNYSession ? "OPEN" : "CLOSED"}

DAILY BIAS (Step 1):
- HTF bias: ${htfBias.toUpperCase()} @ ${htfConfidence}% | Prev close: ${prevClose} | Day open: ${open}
- Day range: ${dayRange.toFixed(4)} | Equilibrium: ${equilibrium.toFixed(4)} | Zone: ${zone}
- 52-week position: ${pos52w.toFixed(1)}%

ESTIMATED SESSION LEVELS (Step 2):
- Asian High/Low: ${asianHigh} / ${asianLow}
- London High/Low: ${londonHigh} / ${londonLow}
- PDH/PDL (est.): ${pdh} / ${pdl}

WICK ANALYSIS (Step 3 — Sweep Detection):
- Upper wick extends: ${wickHighTarget}
- Lower wick extends: ${wickLowTarget}
- Price closed back inside swept level: ${closedBackInside ? "YES" : "NO"}

INDICATORS:
- RSI(14): ${indicators.rsi.toFixed(1)}
- MACD histogram: ${indicators.macdHist > 0 ? "positive" : "negative"}

Apply the analysis rules above. Only flag a sweep if in NY session AND wick exceeds level. Return JSON only.`.trim();

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 900,
    system: JADE_CAP_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw     = msg.content[0].type === "text" ? msg.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed  = JSON.parse(cleaned);

  // Validate invalidationLevel direction: SL must be on the correct side of entry.
  // LLM can return a wrong-sided value (e.g. low - buffer for a short signal).
  let validatedInvalidationLevel: number | null = parsed.invalidationLevel ?? null;
  if (validatedInvalidationLevel !== null) {
    const approxEntry: number = (parsed.keyLevels?.fvgMid as number | null) ?? current;
    if (parsed.bias === "bullish" && validatedInvalidationLevel >= approxEntry) {
      validatedInvalidationLevel = parseFloat((low * 0.998).toFixed(4));
    } else if (parsed.bias === "bearish" && validatedInvalidationLevel <= approxEntry) {
      validatedInvalidationLevel = parseFloat((high * 1.002).toFixed(4));
    }
  }

  return {
    agentId:               "smc",
    bias:                  parsed.bias as DirectionalBias,
    confidence:            parsed.confidence,
    setupType:             parsed.setupType as SetupType,
    setupPresent:          parsed.setupPresent,
    keyLevels:             parsed.keyLevels as SMCKeyLevels,
    premiumDiscount:       parsed.premiumDiscount as PriceZone,
    liquiditySweepDetected: parsed.liquiditySweepDetected,
    bosDetected:           parsed.bosDetected,
    chochDetected:         parsed.chochDetected,
    reasons:               parsed.reasons,
    invalidationLevel:     validatedInvalidationLevel,
    processingTime:        Date.now() - start,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// $2 for XAUUSD; scaled ~0.07% of price for other instruments
function sweepMinDollar(symbol: string, price: number): number {
  if (symbol === "XAUUSD") return 2;
  if (symbol === "XAGUSD" || symbol === "XPTUSD") return 0.5;
  if (price > 5_000) return price * 0.001;   // BTCUSD, indices
  if (price > 100)   return price * 0.002;
  return 0.0002;                              // forex
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule-Based Fallback
// ─────────────────────────────────────────────────────────────────────────────

function runJadeCapRuleBased(snapshot: MarketSnapshot): SMCAgentOutput {
  const start = Date.now();
  const { price, structure, indicators } = snapshot;
  const { current, open, high, low, prevClose, dayRange } = price;
  const { sessionHour, session } = indicators;
  const { htfBias, htfConfidence, equilibrium, zone } = structure;

  // ── STEP 1: Daily bias ─────────────────────────────────────────────────────
  // prev day close > open → bullish; use HTF bias as daily proxy
  const dailyBias: DirectionalBias = htfBias !== "neutral" ? htfBias
    : current > prevClose ? "bullish"
    : current < prevClose ? "bearish"
    : "neutral";

  // ── STEP 2: Session level estimates ───────────────────────────────────────
  // Approximate from equilibrium + daily range fractions
  const asianHigh  = equilibrium + dayRange * 0.18;
  const asianLow   = equilibrium - dayRange * 0.18;
  const londonHigh = equilibrium + dayRange * 0.27;
  const londonLow  = equilibrium - dayRange * 0.27;
  // PDH/PDL estimated from prev close ± 40% of day range
  const pdh = prevClose + dayRange * 0.40;
  const pdl = prevClose - dayRange * 0.40;

  // ── STEP 3: Liquidity sweep detection (NY session: 13:00–18:00 UTC) ───────
  const inNYSession = sessionHour >= 13 && sessionHour < 18;
  const minSweep    = sweepMinDollar(snapshot.symbol, current);
  const upperWick   = high - Math.max(current, open);
  const lowerWick   = Math.min(current, open) - low;

  // Sweep candidates — priority: London Low (+15) > PDH (+10) > Asian High (+10)
  //                              > Asian Low (+5) > London High (+0, flag only)
  let liquiditySweepDetected = false;
  let sweepLevel: number | null = null;
  let sweepLabel = "";
  let sweepModifier = 0;
  let sweepBias: DirectionalBias = dailyBias;

  if (inNYSession) {
    if (lowerWick >= minSweep && low < londonLow && current > londonLow) {
      liquiditySweepDetected = true;
      sweepLevel  = londonLow;
      sweepLabel  = "London Low";
      sweepModifier = 15;
      sweepBias   = "bullish";
    } else if (upperWick >= minSweep && high > pdh && current < pdh) {
      liquiditySweepDetected = true;
      sweepLevel  = pdh;
      sweepLabel  = "PDH";
      sweepModifier = 10;
      sweepBias   = "bearish";
    } else if (upperWick >= minSweep && high > asianHigh && current < asianHigh) {
      liquiditySweepDetected = true;
      sweepLevel  = asianHigh;
      sweepLabel  = "Asian High";
      sweepModifier = 10;
      sweepBias   = "bearish";
    } else if (lowerWick >= minSweep && low < asianLow && current > asianLow) {
      liquiditySweepDetected = true;
      sweepLevel  = asianLow;
      sweepLabel  = "Asian Low";
      sweepModifier = 5;
      sweepBias   = "bullish";
    } else if (upperWick >= minSweep && high > londonHigh && current < londonHigh) {
      // London High — flag only, do not trade
      liquiditySweepDetected = true;
      sweepLevel  = londonHigh;
      sweepLabel  = "London High";
      sweepModifier = 0;
      sweepBias   = "bearish";
    }
  }

  // Bias consistency: discard sweep when it contradicts the daily bias
  // Bullish signal requires sweep of a LOW + bullish daily bias
  // Bearish signal requires sweep of a HIGH + bearish daily bias
  let sweepAgainstBiasReason = "";
  if (liquiditySweepDetected && sweepBias !== dailyBias) {
    sweepAgainstBiasReason = "Sweep detected but against daily bias — no trade";
    liquiditySweepDetected = false;
    sweepLevel    = null;
    sweepLabel    = "";
    sweepModifier = 0;
  }

  // ── STEP 4: FVG detection (approximated from single candle body) ──────────
  // After a sweep, a meaningful body away from the wick extreme signals imbalance
  const candleRange  = high - low;
  const candleBody   = Math.abs(current - open);
  const bodyTop      = Math.max(current, open);
  const bodyBottom   = Math.min(current, open);

  let fvgHigh: number | null = null;
  let fvgLow:  number | null = null;
  let fvgMid:  number | null = null;

  if (liquiditySweepDetected && sweepLabel !== "London High" && candleBody >= candleRange * 0.25) {
    fvgLow  = parseFloat(bodyBottom.toFixed(4));
    fvgHigh = parseFloat(bodyTop.toFixed(4));
    fvgMid  = parseFloat(((fvgHigh + fvgLow) / 2).toFixed(4));
  }

  const fvgDetected = fvgHigh !== null && fvgLow !== null;

  // ── Setup classification ───────────────────────────────────────────────────
  // London High sweep: don't promote to a tradeable setup (setupPresent = false)
  const isLowConfidenceSweep = sweepLabel === "London High";
  const setupType: SetupType = fvgDetected ? "FVG" : liquiditySweepDetected ? "Sweep" : "None";
  const setupPresent = liquiditySweepDetected && !isLowConfidenceSweep;

  // ── Bias ───────────────────────────────────────────────────────────────────
  const bias: DirectionalBias = liquiditySweepDetected ? sweepBias : dailyBias;

  // ── BOS / CHoCH ───────────────────────────────────────────────────────────
  const bosDetected   = liquiditySweepDetected && bias === dailyBias;
  const chochDetected = fvgDetected;

  // ── Confidence: 50 base + sweep modifier ─────────────────────────────────
  const confidence = liquiditySweepDetected ? Math.min(95, 50 + sweepModifier) : 40;

  // ── STEP 5: Levels ─────────────────────────────────────────────────────────
  const entryPrice = fvgMid ?? current;
  // SL = sweep extreme + $5 buffer (sweepMinDollar * 2.5 → $5 for XAUUSD)
  const slBuffer   = minSweep * 2.5;

  let invalidationLevel: number | null = null;
  if (liquiditySweepDetected && !isLowConfidenceSweep) {
    invalidationLevel = sweepBias === "bullish"
      ? parseFloat((low  - slBuffer).toFixed(4))
      : parseFloat((high + slBuffer).toFixed(4));
  }

  // TP = exactly 1.5R; null when no valid SL exists (prevents inflated targets)
  const riskDist = invalidationLevel !== null
    ? Math.abs(entryPrice - invalidationLevel)
    : null;
  const liquidityTarget = riskDist !== null
    ? (bias === "bullish"
        ? parseFloat((entryPrice + riskDist * 1.5).toFixed(4))
        : parseFloat((entryPrice - riskDist * 1.5).toFixed(4)))
    : null;

  const premiumZoneTop     = parseFloat((equilibrium + (high - equilibrium) * 0.6).toFixed(4));
  const discountZoneBottom = parseFloat((equilibrium - (equilibrium - low)  * 0.6).toFixed(4));
  const premiumDiscount: PriceZone = zone;

  // ── Reasons ───────────────────────────────────────────────────────────────
  const reasons: string[] = [];

  if (sweepAgainstBiasReason) {
    reasons.push(sweepAgainstBiasReason);
  } else if (liquiditySweepDetected && sweepLevel !== null) {
    reasons.push(
      `${sweepLabel} liquidity sweep confirmed in NY session — wick past ${sweepLevel.toFixed(4)}, closed back inside`
    );
  } else {
    reasons.push(
      `No liquidity sweep — ${inNYSession
        ? "NY window open (13:00–18:00 UTC) but no wick past estimated session levels"
        : `outside NY sweep window (current: ${session}, hour ${sessionHour} UTC)`}`
    );
  }

  if (fvgDetected) {
    reasons.push(`FVG: ${fvgLow?.toFixed(4)}–${fvgHigh?.toFixed(4)} | entry at midpoint ${fvgMid?.toFixed(4)}`);
  }

  reasons.push(
    `Daily bias: ${dailyBias.toUpperCase()} (HTF ${htfConfidence}% conviction) — sweep direction ${liquiditySweepDetected && bias === dailyBias ? "ALIGNS ✓" : "does not align"} with daily bias`
  );
  reasons.push(
    `Session: ${session} | UTC hour: ${sessionHour} | NY sweep window: ${inNYSession ? "OPEN" : "CLOSED"}`
  );

  if (isLowConfidenceSweep) {
    reasons.push("London High sweep — below minimum confidence threshold, no trade recommended");
  } else if (invalidationLevel !== null && fvgMid !== null && liquidityTarget !== null) {
    reasons.push(
      `Plan: Entry ${fvgMid.toFixed(4)}, SL ${invalidationLevel.toFixed(4)}, TP ${liquidityTarget.toFixed(4)} (1.5R)`
    );
  }

  return {
    agentId: "smc",
    bias,
    confidence: Math.round(confidence),
    setupType,
    setupPresent,
    keyLevels: {
      orderBlockHigh:      null,
      orderBlockLow:       null,
      fvgHigh,
      fvgLow,
      fvgMid,
      liquidityTarget,
      sweepLevel:          sweepLevel !== null ? parseFloat(sweepLevel.toFixed(4)) : null,
      premiumZoneTop,
      discountZoneBottom,
    },
    premiumDiscount,
    liquiditySweepDetected,
    bosDetected,
    chochDetected,
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
      console.warn("Price action agent LLM fallback:", err);
    }
  }

  try {
    return runJadeCapRuleBased(snapshot);
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
