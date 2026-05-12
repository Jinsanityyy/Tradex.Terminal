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
import { anthropicCreate } from "./circuit-breaker";
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

STEP 3 — LIQUIDITY SWEEP (NY Kill Zone: 13:30–15:30 UTC ONLY)
- Corresponds to 9:30–11:30 AM EST
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
- Stop Loss: sweep extreme + $1 buffer → invalidationLevel
- Take Profit: 2.0R → keyLevels.liquidityTarget

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
- No sweep outside NY Kill Zone (13:30–15:30 UTC): setupPresent = false, setupType = "None"
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
    "liquidityTarget": <2.0R TP or null>,
    "sweepLevel": <swept session level or null>,
    "premiumZoneTop": <upper range boundary or null>,
    "discountZoneBottom": <lower range boundary or null>
  },
  "reasons": ["reason1", "reason2", "reason3"],
  "invalidationLevel": <SL = sweep extreme + $1 buffer, or null>
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
  const nowForKZ = new Date();
  const sessionMinute = nowForKZ.getUTCMinutes();
  const sessionHourKZ = nowForKZ.getUTCHours();
  // NY Kill Zone: 9:30–11:30 AM EST = 13:30–15:30 UTC
  const inNYSession = (sessionHourKZ > 13 || (sessionHourKZ === 13 && sessionMinute >= 30))
                   && (sessionHourKZ < 15  || (sessionHourKZ === 15 && sessionMinute <  30));

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
- NY session sweep window (13:30–15:30 UTC): ${inNYSession ? "OPEN" : "CLOSED"}

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

  const msg = await anthropicCreate(client, {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 900,
    system: JADE_CAP_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw     = msg.content[0].type === "text" ? msg.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed  = JSON.parse(cleaned);

  const isBullish = (parsed.bias as string) === "bullish";
  const entryRef  = (parsed.keyLevels?.fvgMid as number | null | undefined) ?? null;
  const slBuf     = sweepMinDollar(snapshot.symbol, snapshot.price.current) * 0.5;

  // Validate SL direction. LLM frequently returns the wrong side.
  // Priority: sweepLevel > fvgHigh/Low > forced minimum.
  let invalidationLevel: number | null = (parsed.invalidationLevel as number | null | undefined) ?? null;
  if (invalidationLevel !== null && entryRef !== null) {
    const wrongSide = isBullish ? invalidationLevel >= entryRef : invalidationLevel <= entryRef;
    if (wrongSide) {
      const sweepLvl = (parsed.keyLevels?.sweepLevel as number | null | undefined) ?? null;
      const fvgH     = (parsed.keyLevels?.fvgHigh   as number | null | undefined) ?? null;
      const fvgL     = (parsed.keyLevels?.fvgLow    as number | null | undefined) ?? null;
      if (isBullish) {
        const ref = (sweepLvl !== null && sweepLvl < entryRef) ? sweepLvl
                  : (fvgL    !== null && fvgL    < entryRef) ? fvgL
                  : entryRef - slBuf * 5;
        invalidationLevel = parseFloat((ref - slBuf).toFixed(4));
      } else {
        const ref = (sweepLvl !== null && sweepLvl > entryRef) ? sweepLvl
                  : (fvgH    !== null && fvgH    > entryRef) ? fvgH
                  : entryRef + slBuf * 5;
        invalidationLevel = parseFloat((ref + slBuf).toFixed(4));
      }
    }
  }

  // Recompute TP so it stays 2.0R from the corrected SL
  const keyLevels = parsed.keyLevels as SMCKeyLevels;
  if (invalidationLevel !== null && entryRef !== null) {
    const riskDist = Math.abs(entryRef - invalidationLevel);
    keyLevels.liquidityTarget = isBullish
      ? parseFloat((entryRef + riskDist * 2.0).toFixed(4))
      : parseFloat((entryRef - riskDist * 2.0).toFixed(4));
  }


  return {
    agentId:               "smc",
    bias:                  parsed.bias as DirectionalBias,
    confidence:            parsed.confidence,
    setupType:             parsed.setupType as SetupType,
    setupPresent:          parsed.setupPresent,
    keyLevels,
    premiumDiscount:       parsed.premiumDiscount as PriceZone,
    liquiditySweepDetected: parsed.liquiditySweepDetected,
    bosDetected:           parsed.bosDetected,
    chochDetected:         parsed.chochDetected,
    reasons:               parsed.reasons,
    invalidationLevel,
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

// Minimum FVG gap size per instrument class.
// Gold: $0.50 (noise floor); forex: 3 pips; crypto: ~0.05%; indices: ~0.10 pts
function fvgMinGap(symbol: string, price: number): number {
  if (symbol === "XAUUSD") return 0.5;
  if (symbol === "XAGUSD" || symbol === "XPTUSD") return 0.05;
  if (price > 5_000) return price * 0.0005;  // BTCUSD, indices — 0.05% of price
  if (price > 100)   return price * 0.001;   // Indices (US500 etc.) — 0.1%
  return 0.0003;                             // forex — ~3 pips
}

// ─────────────────────────────────────────────────────────────────────────────
// Candle-Based Session Level & FVG Detection
// Requires snapshot.recentCandles (populated by buildMarketSnapshot)
// ─────────────────────────────────────────────────────────────────────────────

type CandleSlim = { t: number; o: number; h: number; l: number; c: number };

function computeActualSessionLevels(candles: CandleSlim[]) {
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);
  const todayMs   = todayMidnight.getTime();
  const prevDayMs = todayMs - 86_400_000;
  const toHour    = (ts: number) => new Date(ts * 1000).getUTCHours();

  const asianC  = candles.filter(c => c.t * 1000 >= todayMs && toHour(c.t) < 8);
  const londonC = candles.filter(c => c.t * 1000 >= todayMs && toHour(c.t) >= 8 && toHour(c.t) < 13);
  const prevC   = candles.filter(c => c.t * 1000 >= prevDayMs && c.t * 1000 < todayMs);

  return {
    asianHigh:  asianC.length  >= 1 ? Math.max(...asianC.map(c => c.h))  : null,
    asianLow:   asianC.length  >= 1 ? Math.min(...asianC.map(c => c.l))  : null,
    londonHigh: londonC.length >= 1 ? Math.max(...londonC.map(c => c.h)) : null,
    londonLow:  londonC.length >= 1 ? Math.min(...londonC.map(c => c.l)) : null,
    pdh:        prevC.length   >= 1 ? Math.max(...prevC.map(c => c.h))   : null,
    pdl:        prevC.length   >= 1 ? Math.min(...prevC.map(c => c.l))   : null,
  };
}

interface SweepFVGResult {
  sweepLevel:    number;
  sweepLabel:    string;
  sweepModifier: number;
  sweepBias:     "bullish" | "bearish";
  sweepExtreme:  number;
  fvgHigh:       number;
  fvgLow:        number;
  fvgMid:        number;
}

// Returns true if a candle's period OVERLAPS any of the three kill zones:
//   Asian Kill Zone:  00:00–03:00 UTC = minutes 0–180   (8AM–11AM PHT)
//   London Kill Zone: 08:00–11:00 UTC = minutes 480–660 (4PM–7PM PHT)
//   NY Kill Zone:     13:30–15:30 UTC = minutes 810–930 (9:30PM–11:30PM PHT)
// Uses candle duration for overlap — critical for H1/H4 candles.
function inKillZone(ts: number, timeframe = "M5"): boolean {
  const d = new Date(ts * 1000);
  const candleStartMin = d.getUTCHours() * 60 + d.getUTCMinutes();

  const candleDuration =
    timeframe === "H4"  ? 240 :
    timeframe === "H1"  ? 60  :
    timeframe === "M15" ? 15  : 5;

  const candleEndMin = candleStartMin + candleDuration;
  const inAsianKZ  = candleStartMin < 180 && candleEndMin > 0;   // 00:00–03:00 UTC
  const inLondonKZ = candleStartMin < 660 && candleEndMin > 480; // 08:00–11:00 UTC
  const inNYKZ     = candleStartMin < 930 && candleEndMin > 810; // 13:30–15:30 UTC
  return inAsianKZ || inLondonKZ || inNYKZ;
}

// Scan NY session candles for: sweep of session level within the kill zone → 3-candle FVG.
// Only sweep candles whose timestamp falls inside 13:30–15:30 UTC are considered valid.
// Returns the most recent complete pattern, or null.
function detectNYSweepAndFVG(
  candles: CandleSlim[],
  levels: ReturnType<typeof computeActualSessionLevels>,
  minSweep: number,
  minFvgGap: number,
  timeframe = "M5"
): SweepFVGResult | null {
  const toHour = (ts: number) => new Date(ts * 1000).getUTCHours();
  // Scan 00:00–18:00 UTC to capture all three kill zones:
  //   Asian Kill Zone:  00:00–03:00 UTC
  //   London Kill Zone: 08:00–11:00 UTC (H4 at 08:00, H1 at 07:00 overlaps)
  //   NY Kill Zone:     13:30–15:30 UTC (H4 at 12:00, H1 at 13:00)
  // The inKillZone overlap check gates which candles are valid sweep candidates.
  const nyC = candles
    .filter(c => { const h = toHour(c.t); return h < 18; })
    .slice(-60);

  if (nyC.length < 3) return null;

  type SweepTarget = { level: number; bias: "bullish" | "bearish"; label: string; mod: number };
  const targets: SweepTarget[] = ([
    levels.londonLow  !== null ? { level: levels.londonLow,  bias: "bullish" as const, label: "London Low",  mod: 15 } : null,
    levels.pdh        !== null ? { level: levels.pdh,        bias: "bearish" as const, label: "PDH",         mod: 10 } : null,
    levels.asianHigh  !== null ? { level: levels.asianHigh,  bias: "bearish" as const, label: "Asian High",  mod: 10 } : null,
    levels.asianLow   !== null ? { level: levels.asianLow,   bias: "bullish" as const, label: "Asian Low",   mod: 5  } : null,
    levels.pdl        !== null ? { level: levels.pdl,        bias: "bullish" as const, label: "PDL",         mod: 10 } : null,
    levels.londonHigh !== null ? { level: levels.londonHigh, bias: "bearish" as const, label: "London High", mod: 0  } : null,
  ] as (SweepTarget | null)[]).filter((x): x is SweepTarget => x !== null);

  for (let i = 0; i < nyC.length - 2; i++) {
    const sc = nyC[i];

    // Sweep candle must overlap NY Kill Zone (13:30–15:30 UTC) or London Kill Zone (08:00–11:00 UTC)
    if (!inKillZone(sc.t, timeframe)) continue;

    for (const tgt of targets) {
      // London High: skip ONLY when no FVG confirmation will come — the full loop still
      // runs so that the FVG scan executes. Bias-alignment guard is in runJadeCapRuleBased.
      let swept = false;
      let extreme = 0;

      if (tgt.bias === "bullish") {
        swept   = sc.l < tgt.level - minSweep && sc.c > tgt.level;
        extreme = sc.l;
      } else {
        swept   = sc.h > tgt.level + minSweep && sc.c < tgt.level;
        extreme = sc.h;
      }
      if (!swept) continue;

      // Require wick extends meaningfully beyond the candle body (instrument-aware)
      const bodyBot = Math.min(sc.o, sc.c);
      const bodyTop = Math.max(sc.o, sc.c);
      if (tgt.bias === "bullish" && sc.l > bodyBot - minSweep) continue;
      if (tgt.bias === "bearish" && sc.h < bodyTop + minSweep) continue;

      // Scan next 6 candles for 3-candle FVG using instrument-aware gap threshold
      const post = nyC.slice(i + 1, i + 7);
      for (let j = 0; j + 2 < post.length; j++) {
        const c0 = post[j], c2 = post[j + 2];
        if (tgt.bias === "bullish" && c2.l - c0.h > minFvgGap) {
          return {
            sweepLevel: tgt.level, sweepLabel: tgt.label, sweepModifier: tgt.mod,
            sweepBias: tgt.bias, sweepExtreme: extreme,
            fvgHigh: parseFloat(c2.l.toFixed(4)),
            fvgLow:  parseFloat(c0.h.toFixed(4)),
            fvgMid:  parseFloat(((c0.h + c2.l) / 2).toFixed(4)),
          };
        }
        if (tgt.bias === "bearish" && c0.l - c2.h > minFvgGap) {
          return {
            sweepLevel: tgt.level, sweepLabel: tgt.label, sweepModifier: tgt.mod,
            sweepBias: tgt.bias, sweepExtreme: extreme,
            fvgHigh: parseFloat(c0.l.toFixed(4)),
            fvgLow:  parseFloat(c2.h.toFixed(4)),
            fvgMid:  parseFloat(((c0.l + c2.h) / 2).toFixed(4)),
          };
        }
      }
    }
  }
  return null;
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
  const timeframe = snapshot.timeframe ?? "M5";

  // ── STEP 1: Daily bias ─────────────────────────────────────────────────────
  const dailyBias: DirectionalBias = htfBias !== "neutral" ? htfBias
    : current > prevClose ? "bullish"
    : current < prevClose ? "bearish"
    : "neutral";

  // ── STEP 2: Session levels — real from candles, estimated fallback ────────
  const minSweep    = sweepMinDollar(snapshot.symbol, current);
  const nowForKZLogic = new Date();
  const sessionMinuteLogic = nowForKZLogic.getUTCMinutes();
  const sessionHourKZLogic = nowForKZLogic.getUTCHours();
  // NY Kill Zone: 9:30–11:30 AM EST = 13:30–15:30 UTC
  const inNYKZ = (sessionHourKZLogic > 13 || (sessionHourKZLogic === 13 && sessionMinuteLogic >= 30))
              && (sessionHourKZLogic < 15  || (sessionHourKZLogic === 15 && sessionMinuteLogic <  30));
  // London Kill Zone: 08:00–11:00 UTC
  const inLondonKZ = sessionHourKZLogic >= 8 && sessionHourKZLogic < 11;
  // Asian Kill Zone: 00:00–03:00 UTC (Tokyo open — 8AM–11AM PHT)
  const inAsianKZ = sessionHourKZLogic >= 0 && sessionHourKZLogic < 3;
  const inNYSession = inNYKZ || inLondonKZ || inAsianKZ;
  const upperWick   = high - Math.max(current, open);
  const lowerWick   = Math.min(current, open) - low;

  let asianHigh  = equilibrium + dayRange * 0.18;
  let asianLow   = equilibrium - dayRange * 0.18;
  let londonHigh = equilibrium + dayRange * 0.27;
  let londonLow  = equilibrium - dayRange * 0.27;
  let pdh        = prevClose + dayRange * 0.40;
  let pdl        = prevClose - dayRange * 0.40;

  const minFvgGapVal = fvgMinGap(snapshot.symbol, current);
  const candles = snapshot.recentCandles as CandleSlim[] | undefined;
  if (candles && candles.length >= 10) {
    const real = computeActualSessionLevels(candles);
    if (real.asianHigh  !== null) asianHigh  = real.asianHigh;
    if (real.asianLow   !== null) asianLow   = real.asianLow;
    if (real.londonHigh !== null) londonHigh = real.londonHigh;
    if (real.londonLow  !== null) londonLow  = real.londonLow;
    if (real.pdh        !== null) pdh        = real.pdh;
    if (real.pdl        !== null) pdl        = real.pdl;
  }

  let liquiditySweepDetected = false;
  let sweepLevel: number | null = null;
  let sweepLabel = "";
  let sweepModifier = 0;
  let sweepBias: DirectionalBias = dailyBias;

  let sweepExtreme: number | null = null;
  let fvgHigh: number | null = null;
  let fvgLow:  number | null = null;
  let fvgMid:  number | null = null;

  if (candles && candles.length >= 10) {
    const real = computeActualSessionLevels(candles);
    const found = detectNYSweepAndFVG(candles, real, minSweep, minFvgGapVal, timeframe);
    if (found) {
      liquiditySweepDetected = true;
      sweepLevel    = found.sweepLevel;
      sweepLabel    = found.sweepLabel;
      sweepModifier = found.sweepModifier;
      sweepBias     = found.sweepBias;
      sweepExtreme  = found.sweepExtreme;
      fvgHigh       = found.fvgHigh;
      fvgLow        = found.fvgLow;
      fvgMid        = found.fvgMid;
      // London High with FVG + aligned bias is a valid setup — upgrade confidence
      if (found.sweepLabel === "London High" && found.fvgHigh !== null && found.sweepBias === dailyBias) {
        sweepModifier = 8;
      }
    }
  }

  if (!liquiditySweepDetected && inNYSession) {
    if (lowerWick >= minSweep && low < londonLow && current > londonLow) {
      liquiditySweepDetected = true;
      sweepLevel = londonLow; sweepLabel = "London Low"; sweepModifier = 15; sweepBias = "bullish";
    } else if (upperWick >= minSweep && high > pdh && current < pdh) {
      liquiditySweepDetected = true;
      sweepLevel = pdh; sweepLabel = "PDH"; sweepModifier = 10; sweepBias = "bearish";
    } else if (upperWick >= minSweep && high > asianHigh && current < asianHigh) {
      liquiditySweepDetected = true;
      sweepLevel = asianHigh; sweepLabel = "Asian High"; sweepModifier = 10; sweepBias = "bearish";
    } else if (lowerWick >= minSweep && low < asianLow && current > asianLow) {
      liquiditySweepDetected = true;
      sweepLevel = asianLow; sweepLabel = "Asian Low"; sweepModifier = 5; sweepBias = "bullish";
    } else if (upperWick >= minSweep && high > londonHigh && current < londonHigh) {
      liquiditySweepDetected = true;
      sweepLevel = londonHigh; sweepLabel = "London High"; sweepModifier = 0; sweepBias = "bearish";
    }
  }

  const fvgDetected = fvgHigh !== null && fvgLow !== null;
  // London High is only low-confidence when there's no FVG OR the sweep is counter-trend.
  // A London High sweep with a confirmed FVG aligned with daily bias is a valid setup.
  const isLowConfidenceSweep = sweepLabel === "London High" &&
    !(fvgDetected && sweepBias === dailyBias);
  const setupType: SetupType = fvgDetected ? "FVG" : liquiditySweepDetected ? "Sweep" : "None";
  const setupPresent = liquiditySweepDetected && fvgDetected && !isLowConfidenceSweep;
  const bias: DirectionalBias = liquiditySweepDetected ? sweepBias : dailyBias;


  const bosDetected   = liquiditySweepDetected && bias === dailyBias;
  const chochDetected = fvgDetected;
  const confidence = liquiditySweepDetected ? Math.min(95, 50 + sweepModifier) : 40;

  const slBuffer   = minSweep * 0.5;

  let invalidationLevel: number | null = null;
  if (liquiditySweepDetected && !isLowConfidenceSweep) {
    // Use actual sweep wick extreme (sc.l for bullish, sc.h for bearish).
    // Falls back to current candle only when no candle history (Path B).
    const slRef = sweepExtreme !== null ? sweepExtreme
      : sweepBias === "bullish" ? low : high;
    invalidationLevel = sweepBias === "bullish"
      ? parseFloat((slRef - slBuffer).toFixed(4))
      : parseFloat((slRef + slBuffer).toFixed(4));
  }

  const sweepEntry = sweepLevel !== null
    ? parseFloat((sweepBias === "bullish" ? sweepLevel * 1.001 : sweepLevel * 0.999).toFixed(4))
    : null;
  const entryPrice = fvgMid ?? sweepEntry ?? current;

  const riskDist = invalidationLevel !== null
    ? Math.abs(entryPrice - invalidationLevel)
    : dayRange * 0.25;
  const liquidityTarget = bias === "bullish"
    ? parseFloat((entryPrice + riskDist * 2.0).toFixed(4))
    : parseFloat((entryPrice - riskDist * 2.0).toFixed(4));

  const effectiveRange     = dayRange > current * 0.002 ? dayRange : current * 0.004;
  const premiumZoneTop     = parseFloat((prevClose + effectiveRange * 0.40).toFixed(4));
  const discountZoneBottom = parseFloat((prevClose - effectiveRange * 0.40).toFixed(4));
  const premiumDiscount: PriceZone = zone;

  const reasons: string[] = [];

  if (liquiditySweepDetected && sweepLevel !== null) {
    reasons.push(
      `${sweepLabel} liquidity sweep confirmed in NY session — wick past ${sweepLevel.toFixed(4)}, closed back inside`
    );
  } else {
    reasons.push(
      `No reversal pattern detected — ${inNYKZ
        ? "NY Kill Zone active (13:30–15:30 UTC / 9:30–11:30 PM PHT), monitoring for sweep"
        : inLondonKZ
        ? "London Kill Zone active (08:00–11:00 UTC / 4:00–7:00 PM PHT), monitoring for sweep"
        : inAsianKZ
        ? "Asian Kill Zone active (00:00–03:00 UTC / 8:00–11:00 AM PHT), monitoring for PDH/PDL sweep"
        : `current session: ${session}`}`
    );
  }

  if (fvgDetected) {
    reasons.push(`Price action imbalance zone: ${fvgLow?.toFixed(4)}–${fvgHigh?.toFixed(4)} | entry at ${fvgMid?.toFixed(4)}`);
  }

  reasons.push(
    `Daily bias: ${dailyBias.toUpperCase()} (HTF ${htfConfidence}% conviction) — price action direction ${liquiditySweepDetected && bias === dailyBias ? "ALIGNS ✓" : "does not align"} with daily bias`
  );
  reasons.push(
    `Session: ${session} | Active trading window: ${inNYSession ? "OPEN" : "CLOSED"}`
  );

  if (isLowConfidenceSweep) {
    reasons.push("London High sweep — below minimum confidence threshold, no trade recommended");
  } else if (invalidationLevel !== null && fvgMid !== null) {
    reasons.push(
      `Plan: Entry ${fvgMid.toFixed(4)}, SL ${invalidationLevel.toFixed(4)}, TP ${liquidityTarget.toFixed(4)}`
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

  // Phase 1: Rule-based sweep detection using actual candle history.
  // The LLM only sees the current single candle and cannot detect sweeps
  // that occurred on previous candles — rule-based scan is authoritative here.
  let ruleResult: SMCAgentOutput | null = null;
  try {
    ruleResult = runJadeCapRuleBased(snapshot);
    // Confirmed sweep + FVG setup found — return immediately, no LLM needed
    if (ruleResult.liquiditySweepDetected && ruleResult.setupPresent) {
      return ruleResult;
    }
  } catch (err) {
    console.warn("Price action agent rule-based scan failed:", err);
  }

  // Phase 2: LLM for broader structural analysis when no candle sweep is confirmed
  if (anthropicApiKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicApiKey });
      return await runLLMAnalysis(client, snapshot);
    } catch (err) {
      console.warn("Price action agent LLM fallback:", err);
    }
  }

  // Phase 3: Return rule-based result or fresh fallback
  if (ruleResult) return ruleResult;
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
