/**
 * Agent 2 — Structure & Fibonacci Agent
 *
 * Pure Price Action + Fibonacci retracement + RSI + MACD + Moving Averages.
 * NO SMC, NO ICT, NO Order Blocks, NO Fair Value Gaps, NO Liquidity Sweeps.
 *
 * Logic:
 * 1. Detect market structure from candles: HH+HL (bullish) | LH+LL (bearish)
 * 2. Find latest impulse move (swing high → low for bearish, low → high for bullish)
 * 3. Compute Fibonacci retracement levels: 0.5, 0.618, 0.705
 * 4. SHORT: bearish structure + price in 0.5–0.705 fib zone + RSI <55 + rejection/momentum candle
 * 5. LONG: BOS to upside ONLY + HL formed + fib zone + RSI >45 + bullish candle + MA supportive
 * 6. NO TRADE if no fib confluence
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  MarketSnapshot, SMCAgentOutput, SMCKeyLevels,
  DirectionalBias, SetupType, PriceZone,
} from "./schemas";
import { fetchYahooCandles, type CandleBar } from "./candles";

// ─────────────────────────────────────────────────────────────────────────────
// LLM Prompt
// ─────────────────────────────────────────────────────────────────────────────

const STRUCTURE_FIB_SYSTEM_PROMPT = `You are a trading analyst using Price Action, Fibonacci retracement, RSI, MACD, and Moving Averages.

STRICTLY FORBIDDEN: SMC, ICT, Order Blocks, Fair Value Gaps, Liquidity sweeps, Wyckoff phases.

ALLOWED TOOLS:
1. Market structure: Higher Highs (HH) + Higher Lows (HL) = BULLISH; Lower Highs (LH) + Lower Lows (LL) = BEARISH
2. Break of Structure (BOS): close beyond last swing high/low — structural shift
3. Fibonacci retracement on the last impulse move: ONLY zones 0.5, 0.618, 0.705 are valid entries
4. Support & Resistance: key swing highs and lows
5. Candle behavior: rejection wicks, momentum closes, engulfing candles
6. RSI: above 50 = bullish momentum, below 50 = bearish momentum; divergence = weakness
7. MACD histogram: positive = bullish momentum, negative = bearish; crossover = direction shift
8. Moving Averages: EMA 20/50/200. Price > EMA20 > EMA50 = bullish stack; Price < EMA20 < EMA50 = bearish stack

SHORT SETUP (trend continuation):
- Bearish structure (LH + LL) confirmed
- Price retraced to 0.5–0.705 fib zone of last bearish impulse
- RSI below 55 (not overbought) — preferably 40–55
- MACD histogram negative or crossing down
- MA bearish (price below EMA20)
- Bearish rejection candle OR bearish momentum candle
- Setup: "FibShort"

LONG SETUP (reversal — STRICT):
- Price BROKE above last lower high (BOS to upside)
- Higher low formed after BOS
- Price retraced to 0.5–0.705 fib zone of post-BOS bullish impulse
- RSI above 45 and rising
- MACD histogram positive or crossing up
- MA supportive (price above EMA20 or EMA20 turning up)
- Bullish rejection candle OR bullish momentum
- Setup: "FibLong"

BOS only (no fib):
- Setup: "BOS_Continuation"

NO TRADE rules:
- No fib zone confluence → "None"
- Bearish structure + no BOS → no long ever
- RSI extreme (>75 for short entry, <25 for long entry from reversal) = low quality

Return ONLY valid JSON:
{
  "bias": "bullish" | "bearish" | "neutral",
  "confidence": 0-100,
  "setupType": "FibShort" | "FibLong" | "BOS_Continuation" | "BOS" | "CHoCH" | "None",
  "setupPresent": true | false,
  "bosDetected": true | false,
  "chochDetected": true | false,
  "liquiditySweepDetected": true | false,
  "premiumDiscount": "PREMIUM" | "EQUILIBRIUM" | "DISCOUNT",
  "keyLevels": {
    "orderBlockHigh": <resistance / last swing high or null>,
    "orderBlockLow": <support / last swing low or null>,
    "fvgHigh": <fib 70.5% level or null>,
    "fvgLow": <fib 50% level or null>,
    "fvgMid": <fib 61.8% level or null>,
    "liquidityTarget": <TP target: previous swing low (short) or high (long) or null>,
    "sweepLevel": <BOS breakout level or null>,
    "premiumZoneTop": <impulse high or null>,
    "discountZoneBottom": <impulse low or null>
  },
  "reasons": ["reason1", "reason2", "reason3"],
  "invalidationLevel": <price or null>
}`;

async function runLLMAnalysis(
  client: Anthropic,
  snapshot: MarketSnapshot,
  maData: { ma20: number | null; ma50: number | null; ma200: number | null; maStack: string }
): Promise<SMCAgentOutput> {
  const start = Date.now();
  const { price, structure, indicators } = snapshot;

  const body       = Math.abs(price.current - price.open);
  const range      = price.high - price.low;
  const upperWick  = price.high - Math.max(price.current, price.open);
  const lowerWick  = Math.min(price.current, price.open) - price.low;
  const closePos   = range > 0 ? ((price.current - price.low) / range * 100).toFixed(0) : "50";
  const bodyRatio  = range > 0 ? (body / range * 100).toFixed(0) : "0";

  const userMessage = `
Analyze ${snapshot.symbolDisplay} (${snapshot.symbol}) — Fibonacci + Price Action setup.

PRICE ACTION (${snapshot.timeframe}):
- Current: ${price.current} | Open: ${price.open} | High: ${price.high} | Low: ${price.low} | Prev Close: ${price.prevClose}
- Change: ${price.changePercent > 0 ? "+" : ""}${price.changePercent.toFixed(2)}%
- Candle: body ${bodyRatio}%, close at ${closePos}% of range | Upper wick: ${upperWick.toFixed(4)} | Lower wick: ${lowerWick.toFixed(4)}

MARKET STRUCTURE:
- 52-week: ${structure.low52w} – ${structure.high52w} | Position: ${structure.pos52w}% (${structure.zone})
- HTF conviction: ${structure.htfBias.toUpperCase()} @ ${structure.htfConfidence}%
- Structure context: ${structure.smcContext}

INDICATORS:
- RSI(14): ${indicators.rsi.toFixed(1)} (${indicators.rsi > 70 ? "overbought" : indicators.rsi < 30 ? "oversold" : indicators.rsi > 50 ? "bullish momentum" : "bearish momentum"})
- MACD histogram: ${indicators.macdHist > 0 ? "+" : ""}${indicators.macdHist.toFixed(4)} (${indicators.macdHist > 0 ? "bullish" : "bearish"})
- EMA20: ${maData.ma20 !== null ? maData.ma20.toFixed(4) : "N/A"} | EMA50: ${maData.ma50 !== null ? maData.ma50.toFixed(4) : "N/A"} | EMA200: ${maData.ma200 !== null ? maData.ma200.toFixed(4) : "N/A"}
- MA Stack: ${maData.maStack.toUpperCase()} (${maData.maStack === "bullish" ? "price > EMA20 > EMA50" : maData.maStack === "bearish" ? "price < EMA20 < EMA50" : "mixed"})
- Session: ${indicators.session}

TASK:
1. Identify market structure (HH+HL or LH+LL) from the data above
2. Find the last impulse move and compute fib levels (50%, 61.8%, 70.5%)
3. Check if current price is in the 0.5–0.705 fib entry zone
4. SHORT: bearish structure + fib zone + RSI + MACD bearish
5. LONG: ONLY if BOS to upside confirmed
Return JSON only.`.trim();

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 900,
    system: STRUCTURE_FIB_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw     = msg.content[0].type === "text" ? msg.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed  = JSON.parse(cleaned);

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
// Swing Detection
// ─────────────────────────────────────────────────────────────────────────────

interface SwingPoint { price: number; index: number; }

function detectSwings(candles: CandleBar[], strength = 3): { highs: SwingPoint[]; lows: SwingPoint[] } {
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[]  = [];
  for (let i = strength; i < candles.length - strength; i++) {
    let isHigh = true;
    let isLow  = true;
    for (let j = i - strength; j <= i + strength; j++) {
      if (j === i) continue;
      if (candles[j].h >= candles[i].h) isHigh = false;
      if (candles[j].l <= candles[i].l) isLow  = false;
    }
    if (isHigh) highs.push({ price: candles[i].h, index: i });
    if (isLow)  lows.push({ price: candles[i].l, index: i });
  }
  return { highs, lows };
}

interface StructureResult {
  direction: "bullish" | "bearish" | "neutral";
  highs: SwingPoint[];
  lows: SwingPoint[];
  bosDetected: boolean;
  bosLevel: number | null;
  chochDetected: boolean;
}

function analyzeStructure(candles: CandleBar[], currentPrice: number): StructureResult {
  const { highs, lows } = detectSwings(candles);

  if (highs.length < 2 || lows.length < 2) {
    return { direction: "neutral", highs, lows, bosDetected: false, bosLevel: null, chochDetected: false };
  }

  const rH = highs.slice(-3);
  const rL = lows.slice(-3);
  const isHH = rH[rH.length - 1].price > rH[rH.length - 2].price;
  const isHL = rL[rL.length - 1].price > rL[rL.length - 2].price;
  const isLH = rH[rH.length - 1].price < rH[rH.length - 2].price;
  const isLL = rL[rL.length - 1].price < rL[rL.length - 2].price;

  let direction: "bullish" | "bearish" | "neutral" = "neutral";
  if (isHH && isHL) direction = "bullish";
  else if (isLH && isLL) direction = "bearish";

  // BOS: price breaks last swing high/low
  const lastH = highs[highs.length - 1].price;
  const lastL = lows[lows.length - 1].price;
  let bosDetected   = false;
  let bosLevel: number | null = null;
  let chochDetected = false;

  if (direction === "bearish" && currentPrice > lastH) {
    bosDetected   = true;
    bosLevel      = lastH;
    chochDetected = true; // bearish structure broken — potential reversal
  } else if (direction === "bullish" && currentPrice < lastL) {
    bosDetected   = true;
    bosLevel      = lastL;
    chochDetected = true;
  }

  return { direction, highs, lows, bosDetected, bosLevel, chochDetected };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fibonacci
// ─────────────────────────────────────────────────────────────────────────────

interface FibResult {
  impulseHigh: number;
  impulseLow: number;
  fib50: number;
  fib618: number;
  fib705: number;
  inZone: boolean; // price is between fib50 and fib705
}

function computeFib(
  impulseHigh: number,
  impulseLow: number,
  currentPrice: number,
  direction: "bullish" | "bearish"
): FibResult {
  const r = impulseHigh - impulseLow;
  if (r <= 0) return { impulseHigh, impulseLow, fib50: impulseHigh, fib618: impulseHigh, fib705: impulseHigh, inZone: false };

  let fib50: number, fib618: number, fib705: number, inZone: boolean;

  if (direction === "bearish") {
    // Bearish impulse: high → low. Retracement goes UP from the low.
    fib50  = impulseLow + 0.5   * r;
    fib618 = impulseLow + 0.618 * r;
    fib705 = impulseLow + 0.705 * r;
    inZone = currentPrice >= fib50 && currentPrice <= fib705;
  } else {
    // Bullish impulse: low → high. Retracement goes DOWN from the high.
    fib50  = impulseHigh - 0.5   * r;
    fib618 = impulseHigh - 0.618 * r;
    fib705 = impulseHigh - 0.705 * r;
    inZone = currentPrice <= fib50 && currentPrice >= fib705;
  }

  return { impulseHigh, impulseLow, fib50, fib618, fib705, inZone };
}

function findLatestImpulse(
  highs: SwingPoint[],
  lows: SwingPoint[],
  direction: "bullish" | "bearish"
): { impulseHigh: number; impulseLow: number } | null {
  if (direction === "bearish" && highs.length > 0 && lows.length > 0) {
    const lastH   = highs[highs.length - 1];
    const laterLs = lows.filter(l => l.index > lastH.index);
    const lastL   = laterLs.length > 0 ? laterLs[laterLs.length - 1] : lows[lows.length - 1];
    if (lastL.price < lastH.price) return { impulseHigh: lastH.price, impulseLow: lastL.price };
  }
  if (direction === "bullish" && highs.length > 0 && lows.length > 0) {
    const lastL   = lows[lows.length - 1];
    const laterHs = highs.filter(h => h.index > lastL.index);
    const lastH   = laterHs.length > 0 ? laterHs[laterHs.length - 1] : highs[highs.length - 1];
    if (lastH.price > lastL.price) return { impulseHigh: lastH.price, impulseLow: lastL.price };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule-Based Core
// ─────────────────────────────────────────────────────────────────────────────

async function runRuleBasedStructureFib(snapshot: MarketSnapshot): Promise<SMCAgentOutput> {
  const start = Date.now();
  const { price, structure, indicators } = snapshot;
  const { current, high, low, open, prevClose } = price;

  // ── Fetch candles ─────────────────────────────────────────────────────────
  let candles: CandleBar[] = [];
  try {
    const fetched = await fetchYahooCandles(snapshot.symbol, snapshot.timeframe);
    if (fetched && fetched.length >= 10) candles = fetched;
  } catch { /* fall through to snapshot-only fallback */ }

  // ── Structure analysis ────────────────────────────────────────────────────
  let structResult: StructureResult;
  if (candles.length >= 10) {
    structResult = analyzeStructure(candles, current);
  } else {
    // Snapshot-based approximation when no candles
    const htfDir = structure.htfBias === "neutral" ? "bearish" : structure.htfBias;
    structResult = {
      direction: htfDir as "bullish" | "bearish",
      highs: [{ price: high, index: 0 }],
      lows:  [{ price: low,  index: 1 }],
      bosDetected:   structure.smcContext.includes("BOS to upside"),
      bosLevel:      structure.smcContext.includes("BOS to upside") ? high : null,
      chochDetected: structure.smcContext.includes("CHoCH"),
    };
  }

  const { direction, highs, lows, bosDetected, bosLevel, chochDetected } = structResult;

  // ── Fibonacci ─────────────────────────────────────────────────────────────
  // After BOS in bearish structure, compute bullish fib for reversal entry
  const fibDirection = (bosDetected && chochDetected && direction === "bearish") ? "bullish" : direction;
  const effectiveDir = fibDirection === "neutral" ? "bearish" : fibDirection;
  const impulse      = findLatestImpulse(highs, lows, effectiveDir);

  let fib: FibResult | null = null;
  if (impulse) {
    fib = computeFib(impulse.impulseHigh, impulse.impulseLow, current, effectiveDir);
  } else if (candles.length === 0) {
    // Fallback: use day's H/L as rough impulse proxy
    fib = computeFib(high, low, current, effectiveDir);
  }

  const inFibZone = fib?.inZone ?? false;

  // ── Candle behavior ───────────────────────────────────────────────────────
  const candleRange = high - low;
  const candleBody  = Math.abs(current - open);
  const upperWick   = high - Math.max(current, open);
  const lowerWick   = Math.min(current, open) - low;
  const closeRatio  = candleRange > 0 ? (current - low) / candleRange : 0.5;
  const bodyRatio   = candleRange > 0 ? candleBody / candleRange : 0;

  const bearishRejection = upperWick > candleBody * 1.5 && closeRatio < 0.45;
  const bullishRejection = lowerWick > candleBody * 1.5 && closeRatio > 0.55;
  const bearishMomentum  = bodyRatio > 0.55 && current < open && closeRatio < 0.4;
  const bullishMomentum  = bodyRatio > 0.55 && current > open && closeRatio > 0.6;

  // ── RSI + MACD context ────────────────────────────────────────────────────
  const { rsi, macdHist } = indicators;
  const rsiOverbought  = rsi > 70;
  const rsiOversold    = rsi < 30;
  const rsiBearish     = rsi < 50;
  const rsiBullish     = rsi > 50;
  const macdBearish    = macdHist < 0;
  const macdBullish    = macdHist > 0;

  // ── MA context ────────────────────────────────────────────────────────────
  const maaBearish = structure.htfBias === "bearish" && structure.inPremium;
  const maaBullish = structure.htfBias === "bullish" && structure.inDiscount;

  // ── STRICT HIERARCHY: Structure → Fib → RSI/MACD ────────────────────────
  //
  // 1. STRUCTURE determines direction. Cannot be overridden.
  //    Bearish (LH+LL) → only SHORT or NO TRADE
  //    Bullish (HH+HL) → only LONG or NO TRADE
  //    Bearish + BOS to upside → only LONG (post-reversal)
  //
  // 2. FIBONACCI is the mandatory entry filter.
  //    Not in 0.5–0.705 zone → NO TRADE (structure can be right, still no trade)
  //
  // 3. RSI + MACD modify CONFIDENCE only. Cannot flip direction.
  //    Aligned with structure → boost confidence
  //    Counter-trend → reduce confidence (but does NOT generate opposite signal)

  let setupType: SetupType = "None";
  let bias: DirectionalBias = "neutral";

  if (direction === "bearish" && !bosDetected) {
    // ── BEARISH STRUCTURE → SHORT ONLY ────────────────────────────────────
    bias = "bearish";
    if (inFibZone) {
      if (bearishRejection || bearishMomentum) {
        setupType = "FibShort"; // candle confirmation in zone
      } else {
        setupType = "FibShort"; // in zone, ARMED — awaiting candle trigger
      }
    }
    // Not in zone → NO TRADE (but bias stays bearish as structural context)
    if (!inFibZone) setupType = "None";

  } else if (bosDetected && chochDetected) {
    // ── BOS CONFIRMED → LONG ONLY (reversal after bearish structure break) ──
    bias = "bullish";
    if (inFibZone) {
      setupType = "FibLong";
    } else {
      setupType = "BOS_Continuation"; // BOS fired, waiting for fib pullback
    }

  } else if (direction === "bullish" && !bosDetected) {
    // ── BULLISH STRUCTURE → LONG ONLY ─────────────────────────────────────
    bias = "bullish";
    if (inFibZone) {
      if (bullishRejection || bullishMomentum) {
        setupType = "FibLong";
      } else {
        setupType = "FibLong"; // in zone, ARMED
      }
    }
    if (!inFibZone) setupType = "None";
  }

  // ── RSI/MACD: confidence modifiers only (DO NOT change direction) ─────────
  // These are applied to confidence score below — never to bias or setupType.

  // No fib or no structure → no trade
  if (setupType === "None") bias = "neutral";

  // ── Key levels ────────────────────────────────────────────────────────────
  const round = (v: number): number => {
    if (v > 1000) return Math.round(v * 10) / 10;
    if (v > 10)   return Math.round(v * 100) / 100;
    return Math.round(v * 100000) / 100000;
  };

  const lastH    = highs.length > 0 ? highs[highs.length - 1].price : null;
  const lastL    = lows.length  > 0 ? lows[lows.length - 1].price   : null;
  const prevL    = lows.length  > 1 ? lows[lows.length - 2].price   : null;
  const prevH    = highs.length > 1 ? highs[highs.length - 2].price : null;
  const tpTarget = bias === "bearish"
    ? (prevL ?? (lastL ? round(lastL * 0.995) : null))
    : (prevH ?? (lastH ? round(lastH * 1.005) : null));

  const keyLevels: SMCKeyLevels = {
    orderBlockHigh:      lastH ? round(lastH) : null,         // resistance / SL ref for short
    orderBlockLow:       lastL ? round(lastL) : null,          // support
    fvgHigh:             fib   ? round(fib.fib705)  : null,   // fib 70.5%
    fvgLow:              fib   ? round(fib.fib50)   : null,   // fib 50%
    fvgMid:              fib   ? round(fib.fib618)  : null,   // fib 61.8% (ideal entry)
    liquidityTarget:     tpTarget !== undefined ? tpTarget : null, // TP target
    sweepLevel:          bosLevel ? round(bosLevel) : null,    // BOS level
    premiumZoneTop:      fib   ? round(fib.impulseHigh) : null,
    discountZoneBottom:  fib   ? round(fib.impulseLow)  : null,
  };

  // ── Confidence: structure + fib = base; RSI/MACD = modifiers only ────────
  let confidence = 25;

  // Structure (primary) — direction must be clear
  if (direction !== "neutral") confidence += 20;

  // Fibonacci (entry filter) — in zone is mandatory for full confidence
  if (inFibZone) confidence += 25;
  if (fib) {
    // Golden zone (0.618–0.705): optimal risk/reward area
    const inGolden = effectiveDir === "bearish"
      ? (current >= fib.fib618 && current <= fib.fib705)
      : (current >= fib.fib705 && current <= fib.fib618);
    if (inGolden) confidence += 10;
  }

  // Candle confirmation (price action)
  if (bearishRejection || bullishRejection) confidence += 12;
  if (bearishMomentum  || bullishMomentum)  confidence += 8;
  if (bosDetected)   confidence += 8;

  // RSI modifier (confirmation only — cannot exceed ±10 total contribution)
  // Aligned = +, counter-trend = -
  if (bias === "bearish") {
    if (rsiBearish)     confidence += 5;      // confirms direction
    if (rsiOverbought)  confidence -= 8;      // overbought SHORT entry = caution but don't block
    if (rsiBullish && !rsiOverbought) confidence -= 5; // RSI bullish but structure bearish = reduce
  }
  if (bias === "bullish") {
    if (rsiBullish)     confidence += 5;
    if (rsiOversold)    confidence -= 8;
    if (rsiBearish && !rsiOversold) confidence -= 5;
  }

  // MACD modifier (confirmation only — ±5 max)
  if (bias === "bearish" && macdBearish) confidence += 5;
  if (bias === "bearish" && macdBullish) confidence -= 5;
  if (bias === "bullish" && macdBullish) confidence += 5;
  if (bias === "bullish" && macdBearish) confidence -= 5;

  if (setupType === "None") confidence = Math.min(30, confidence);
  confidence = Math.min(93, Math.max(20, confidence));

  // ── Zone classification ───────────────────────────────────────────────────
  let zone: PriceZone = structure.zone;
  if (fib) {
    if (effectiveDir === "bearish") {
      zone = current > fib.fib705 ? "PREMIUM" : current >= fib.fib50 ? "EQUILIBRIUM" : "DISCOUNT";
    } else {
      zone = current < fib.fib705 ? "DISCOUNT" : current <= fib.fib50 ? "EQUILIBRIUM" : "PREMIUM";
    }
  }

  // ── Reasons (hierarchy: structure → fib → candle → indicators) ──────────
  const reasons: string[] = [];

  // 1. Structure (primary decision)
  if (direction === "bearish" && !bosDetected) {
    reasons.push(`[STRUCTURE] Bearish: Lower Highs + Lower Lows confirmed → ONLY SHORT signals valid`);
  } else if (direction === "bullish" && !bosDetected) {
    reasons.push(`[STRUCTURE] Bullish: Higher Highs + Higher Lows confirmed → ONLY LONG signals valid`);
  } else if (bosDetected && chochDetected) {
    reasons.push(`[BOS] Break of Structure at ${round(bosLevel!)} — bearish structure invalidated, reversal underway`);
  } else {
    reasons.push(`[STRUCTURE] Neutral — no clear HH/HL or LH/LL pattern yet. No trade.`);
  }

  // 2. Fibonacci (entry filter)
  if (fib) {
    if (inFibZone) {
      reasons.push(`[FIB ZONE ✓] Price at ${round(current)} — INSIDE entry zone | 50%: ${round(fib.fib50)} | 61.8%: ${round(fib.fib618)} | 70.5%: ${round(fib.fib705)}`);
    } else {
      reasons.push(`[FIB ZONE ✗] No entry — price outside 0.5–0.705 zone | 50%: ${round(fib.fib50)} | 61.8%: ${round(fib.fib618)} | 70.5%: ${round(fib.fib705)}`);
    }
  } else {
    reasons.push(`[FIB] No impulse move identified — awaiting clear swing high/low for fib calculation`);
  }

  // 3. Candle confirmation
  if (bearishRejection) reasons.push(`[CANDLE] Bearish rejection — upper wick at ${round(current)} signals seller dominance`);
  if (bullishRejection) reasons.push(`[CANDLE] Bullish rejection — lower wick at ${round(current)} signals buyer defense`);
  if (bearishMomentum)  reasons.push(`[CANDLE] Bearish momentum — strong close near low, sellers in control`);
  if (bullishMomentum)  reasons.push(`[CANDLE] Bullish momentum — strong close near high, buyers in control`);

  // 4. RSI/MACD (confirmation — note if counter-trend)
  const rsiStatus = rsi > 70 ? "overbought (caution — reduces confidence on shorts)" : rsi < 30 ? "oversold (caution — reduces confidence on longs)" : rsi > 50 ? "bullish momentum" : "bearish momentum";
  const macdStatus = macdBullish ? "bullish momentum" : "bearish momentum";
  const counterTrend = (bias === "bearish" && (rsiBullish || macdBullish)) || (bias === "bullish" && (rsiBearish || macdBearish));
  reasons.push(`[INDICATORS] RSI ${rsi.toFixed(1)} (${rsiStatus}) | MACD ${macdHist > 0 ? "+" : ""}${macdHist.toFixed(4)} (${macdStatus})${counterTrend ? " — COUNTER-TREND: confidence reduced" : " — aligned with structure"}`);

  if (setupType === "None" && direction !== "neutral") {
    reasons.push(`[NO TRADE] Structure is ${direction} but price is NOT in the 0.5–0.705 fib zone. Waiting for retracement.`);
  } else if (setupType === "None") {
    reasons.push(`[NO TRADE] No clear structure. Stand aside until HH+HL or LH+LL forms.`);
  }

  // ── Invalidation ─────────────────────────────────────────────────────────
  const step = current > 1000 ? 5 : current > 100 ? 1 : 0.0005;
  const invalidationLevel =
    setupType === "FibShort"
      ? (lastH ? round(Math.ceil(lastH * 1.002 / step) * step) : null)
      : setupType === "FibLong"
        ? (lastL ? round(Math.floor(lastL * 0.998 / step) * step) : null)
        : null;

  return {
    agentId: "smc",
    bias,
    confidence: Math.round(confidence),
    setupType,
    setupPresent: setupType !== "None",
    keyLevels,
    premiumDiscount: zone,
    liquiditySweepDetected: inFibZone, // repurposed: true = price is in fib entry zone
    bosDetected,
    chochDetected,
    reasons: reasons.slice(0, 5),
    invalidationLevel,
    processingTime: Date.now() - start,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

export async function runSMCAgent(
  snapshot: MarketSnapshot,
  anthropicApiKey?: string
): Promise<SMCAgentOutput> {
  const start = Date.now();

  if (anthropicApiKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicApiKey });
      // Fetch MA data to enrich the LLM prompt
      const { getMAFromCandles } = await import("./candles");
      const maData = await getMAFromCandles(snapshot.symbol, snapshot.timeframe, snapshot.price.current);
      return await runLLMAnalysis(client, snapshot, maData);
    } catch (err) {
      console.warn("[smc-agent] LLM fallback:", err);
    }
  }

  try {
    return await runRuleBasedStructureFib(snapshot);
  } catch (err) {
    return {
      agentId: "smc",
      bias: "neutral",
      confidence: 25,
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
      reasons: ["Structure + Fibonacci analysis failed — defaulting to neutral"],
      invalidationLevel: null,
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
