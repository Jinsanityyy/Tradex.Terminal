/**
 * Agent 2 — Price Action Agent (Jade Cap Intraday Liquidity & Volatility Model)
 *
 * Jade Cap rules: Daily Bias → Session Levels → Liquidity Sweep (JadeCap NY Kill Zone 13:30–15:30 UTC)
 * → FVG Detection → Entry/SL/TP.  Reported 68.2% WR on XAUUSD M15, 16-month backtest.
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

const JADE_CAP_SYSTEM = `You are an elite intraday analyst implementing the Jade Cap Intraday Liquidity & Volatility Model (68.2% WR, XAUUSD M15, 16-month backtest).

JADE CAP RULES:

STEP 1 — DAILY BIAS
- HTF structure bullish (prev day close > open) → bias = "bullish"
- HTF structure bearish (prev day close < open) → bias = "bearish"

STEP 2 — SESSION LEVELS
- Asian High/Low: 00:00–08:00 UTC range
- London High/Low: 08:00–13:00 UTC range
- PDH/PDL: previous day high/low

STEP 3 — LIQUIDITY SWEEP (JadeCap NY Kill Zone: 13:30–15:30 UTC ONLY)
- Corresponds to 9:30–11:30 AM EST — JadeCap's exact kill zone
- Price wicks past a session level by $2+ (XAUUSD) but closes BACK INSIDE = sweep
- liquiditySweepDetected = true; swept level → keyLevels.sweepLevel
- Confidence: 50 base + modifier per sweep level:
  London Low  → +15  (76% WR — best setup)
  PDH         → +10  (71.4% WR)
  Asian High  → +10  (70% WR)
  Asian Low   → +5   (60% WR)
  London High → +0   (43% WR — flag only, do NOT recommend trading)

STEP 4 — FVG DETECTION (scan 8 candles after sweep)
- Bullish FVG: candle[i-1].high < candle[i+1].low
- Bearish FVG: candle[i-1].low > candle[i+1].high
- Record fvgHigh, fvgLow, fvgMid; setupType = "FVG"; setupPresent = true

STEP 5 — LEVELS
- Entry: FVG midpoint
- Stop Loss: sweep extreme + $1 buffer → invalidationLevel  (JadeCap: SL just beyond wick)
- Take Profit: 2.0R → keyLevels.liquidityTarget  (JadeCap minimum)

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
- No sweep outside JadeCap NY Kill Zone (13:30–15:30 UTC): setupPresent = false, setupType = "None"
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
  const sessionMinute = new Date().getUTCMinutes();
  // JadeCap NY Kill Zone: 9:30–11:30 AM EST = 13:30–15:30 UTC
  const inNYSession = (sessionHour > 13 || (sessionHour === 13 && sessionMinute >= 30))
                   && (sessionHour < 15  || (sessionHour === 15 && sessionMinute <  30));

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
Analyze ${snapshot.symbolDisplay} (${snapshot.symbol}) — Jade Cap Intraday Liquidity & Volatility Model.

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

Apply Jade Cap rules. Only flag a sweep if in NY session AND wick exceeds level. Return JSON only.`.trim();

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 900,
    system: JADE_CAP_SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw     = msg.content[0].type === "text" ? msg.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed  = JSON.parse(cleaned);

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
    invalidationLevel:     parsed.invalidationLevel,
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
    asianHigh:  asianC.length  > 1 ? Math.max(...asianC.map(c => c.h))  : null,
    asianLow:   asianC.length  > 1 ? Math.min(...asianC.map(c => c.l))  : null,
    londonHigh: londonC.length > 1 ? Math.max(...londonC.map(c => c.h)) : null,
    londonLow:  londonC.length > 1 ? Math.min(...londonC.map(c => c.l)) : null,
    pdh:        prevC.length   > 0 ? Math.max(...prevC.map(c => c.h))   : null,
    pdl:        prevC.length   > 0 ? Math.min(...prevC.map(c => c.l))   : null,
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

// Scan last 3 hours of NY candles for: sweep of session level → 3-candle FVG
// Returns the most recent complete pattern, or null.
function detectNYSweepAndFVG(
  candles: CandleSlim[],
  levels: ReturnType<typeof computeActualSessionLevels>,
  minSweep: number
): SweepFVGResult | null {
  const toHour = (ts: number) => new Date(ts * 1000).getUTCHours();
  const nyC = candles
    .filter(c => { const h = toHour(c.t); return h >= 13 && h < 18; })
    .slice(-12);

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
    for (const tgt of targets) {
      if (tgt.label === "London High") continue; // 43% WR — skip
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

      // Require wick ≥ 2 pts beyond body (noise filter)
      const bodyBot = Math.min(sc.o, sc.c);
      const bodyTop = Math.max(sc.o, sc.c);
      if (tgt.bias === "bullish" && sc.l > bodyBot - 2) continue;
      if (tgt.bias === "bearish" && sc.h < bodyTop + 2) continue;

      // Scan next 6 candles for 3-candle FVG (gap > $0.50 for gold)
      const post = nyC.slice(i + 1, i + 7);
      for (let j = 0; j + 2 < post.length; j++) {
        const c0 = post[j], c2 = post[j + 2];
        if (tgt.bias === "bullish" && c2.l - c0.h > 0.5) {
          return {
            sweepLevel: tgt.level, sweepLabel: tgt.label, sweepModifier: tgt.mod,
            sweepBias: tgt.bias, sweepExtreme: extreme,
            fvgHigh: parseFloat(c2.l.toFixed(4)),
            fvgLow:  parseFloat(c0.h.toFixed(4)),
            fvgMid:  parseFloat(((c0.h + c2.l) / 2).toFixed(4)),
          };
        }
        if (tgt.bias === "bearish" && c0.l - c2.h > 0.5) {
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
// Rule-Based Fallback — Jade Cap
// ─────────────────────────────────────────────────────────────────────────────

function runJadeCapRuleBased(snapshot: MarketSnapshot): SMCAgentOutput {
  const start = Date.now();
  const { price, structure, indicators } = snapshot;
  const { current, open, high, low, prevClose, dayRange } = price;
  const { sessionHour, session } = indicators;
  const { htfBias, htfConfidence, equilibrium, zone } = structure;

  // ── STEP 1: Daily bias ─────────────────────────────────────────────────────
  // Jade Cap: prev day close > open → bullish; use HTF bias as daily proxy
  const dailyBias: DirectionalBias = htfBias !== "neutral" ? htfBias
    : current > prevClose ? "bullish"
    : current < prevClose ? "bearish"
    : "neutral";

  // ── STEP 2: Session levels — real from candles, estimated fallback ────────
  const minSweep    = sweepMinDollar(snapshot.symbol, current);
  const sessionMinuteLogic = new Date().getUTCMinutes();
  // JadeCap NY Kill Zone: 9:30–11:30 AM EST = 13:30–15:30 UTC
  const inNYSession = (sessionHour > 13 || (sessionHour === 13 && sessionMinuteLogic >= 30))
                   && (sessionHour < 15  || (sessionHour === 15 && sessionMinuteLogic <  30));
  const upperWick   = high - Math.max(current, open);
  const lowerWick   = Math.min(current, open) - low;

  // Start with estimated levels (equilibrium ± day-range fractions)
  let asianHigh  = equilibrium + dayRange * 0.18;
  let asianLow   = equilibrium - dayRange * 0.18;
  let londonHigh = equilibrium + dayRange * 0.27;
  let londonLow  = equilibrium - dayRange * 0.27;
  let pdh        = prevClose + dayRange * 0.40;
  let pdl        = prevClose - dayRange * 0.40;

  // Override with actual session levels when candle history is available
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

  // ── STEP 3 & 4: Sweep + FVG detection ────────────────────────────────────
  // Priority: candle-history scan (3-candle FVG) → single-candle fallback (no FVG)
  let liquiditySweepDetected = false;
  let sweepLevel: number | null = null;
  let sweepLabel = "";
  let sweepModifier = 0;
  let sweepBias: DirectionalBias = dailyBias;
  let fvgHigh: number | null = null;
  let fvgLow:  number | null = null;
  let fvgMid:  number | null = null;

  // Path A: candle history available → detect real 3-candle FVG after sweep
  if (candles && candles.length >= 10) {
    const real = computeActualSessionLevels(candles);
    const found = detectNYSweepAndFVG(candles, real, minSweep);
    if (found) {
      liquiditySweepDetected = true;
      sweepLevel    = found.sweepLevel;
      sweepLabel    = found.sweepLabel;
      sweepModifier = found.sweepModifier;
      sweepBias     = found.sweepBias;
      fvgHigh       = found.fvgHigh;
      fvgLow        = found.fvgLow;
      fvgMid        = found.fvgMid;
    }
  }

  // Path B: no candles or no pattern found — single-candle sweep only (no FVG)
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
    // Note: Path B sweeps have no FVG — fvgHigh/fvgLow/fvgMid remain null
  }

  const fvgDetected = fvgHigh !== null && fvgLow !== null;

  // ── Setup classification ──────────────────────────────────────────────────
  // FVG is REQUIRED for a tradeable setup — non-FVG sweeps lose -17.5R / 13% WR
  const isLowConfidenceSweep = sweepLabel === "London High";
  const setupType: SetupType = fvgDetected ? "FVG" : liquiditySweepDetected ? "Sweep" : "None";
  const setupPresent = liquiditySweepDetected && fvgDetected && !isLowConfidenceSweep;

  // ── Bias ───────────────────────────────────────────────────────────────────
  const bias: DirectionalBias = liquiditySweepDetected ? sweepBias : dailyBias;

  // ── BOS / CHoCH (per Jade Cap field mapping) ───────────────────────────────
  const bosDetected   = liquiditySweepDetected && bias === dailyBias;
  const chochDetected = fvgDetected;

  // ── Confidence: 50 base + sweep modifier ─────────────────────────────────
  const confidence = liquiditySweepDetected ? Math.min(95, 50 + sweepModifier) : 40;

  // ── STEP 5: Levels ─────────────────────────────────────────────────────────
  // SL = sweep extreme + $1 buffer (sweepMinDollar * 0.5 → $1 for XAUUSD) — JadeCap: SL just beyond sweep wick
  const slBuffer   = minSweep * 0.5;

  let invalidationLevel: number | null = null;
  if (liquiditySweepDetected && !isLowConfidenceSweep) {
    invalidationLevel = sweepBias === "bullish"
      ? parseFloat((low  - slBuffer).toFixed(4))
      : parseFloat((high + slBuffer).toFixed(4));
  }

  // Align entryPrice with what execution-agent will actually use:
  // FVG setup → fvgMid | Sweep (no FVG) → sweepRef ± 0.1% | fallback → current
  const sweepEntry = sweepLevel !== null
    ? parseFloat((sweepBias === "bullish" ? sweepLevel * 1.001 : sweepLevel * 0.999).toFixed(4))
    : null;
  const entryPrice = fvgMid ?? sweepEntry ?? current;

  // TP = 2.0R from entry — JadeCap minimum (62.9% WR backtest)
  const riskDist = invalidationLevel !== null
    ? Math.abs(entryPrice - invalidationLevel)
    : dayRange * 0.25;
  const liquidityTarget = bias === "bullish"
    ? parseFloat((entryPrice + riskDist * 2.0).toFixed(4))
    : parseFloat((entryPrice - riskDist * 2.0).toFixed(4));

  // Premium/Discount zones — use PDH/PDL method (JadeCap) so zones are
  // always meaningful regardless of current candle size.
  // prevClose ± dayRange*0.40 approximates the previous day high/low.
  // If dayRange is suspiciously small (single candle), fall back to 0.4% of price.
  const effectiveRange     = dayRange > current * 0.002 ? dayRange : current * 0.004;
  const premiumZoneTop     = parseFloat((prevClose + effectiveRange * 0.40).toFixed(4));
  const discountZoneBottom = parseFloat((prevClose - effectiveRange * 0.40).toFixed(4));
  const premiumDiscount: PriceZone = zone;

  // ── Reasons ───────────────────────────────────────────────────────────────
  const reasons: string[] = [];

  if (liquiditySweepDetected && sweepLevel !== null) {
    reasons.push(
      `${sweepBias === "bullish" ? "Bullish" : "Bearish"} reversal structure confirmed at ${sweepLevel.toFixed(4)} — price action setup present`
    );
  } else {
    reasons.push(
      `No reversal pattern detected — ${inNYSession
        ? "active session window, monitoring for setup"
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
    reasons.push("Resistance zone tested — below minimum confidence threshold, no trade recommended");
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

  if (anthropicApiKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicApiKey });
      return await runLLMAnalysis(client, snapshot);
    } catch (err) {
      console.warn("Jade Cap Agent LLM fallback:", err);
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
