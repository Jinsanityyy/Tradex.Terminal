import { NextResponse } from "next/server";
import { deriveConvictionBias } from "@/lib/api/conviction";

export const dynamic = "force-dynamic";

export interface OrderBlock {
  price: number;
  zone: [number, number]; // [low, high] of OB
  type: "bullish" | "bearish";
  valid: boolean;
}

export interface FVG {
  high: number;
  low: number;
  midpoint: number;
  direction: "bullish" | "bearish";
  filled: boolean;
}

export interface MarketStructure {
  trend: "bullish" | "bearish" | "ranging";
  bos: boolean;           // Break of Structure
  choch: boolean;         // Change of Character
  premiumDiscount: "premium" | "discount" | "equilibrium";
  equilibrium: number;    // 50% of daily range
}

export interface AlignmentContext {
  type: "continuation" | "counter-trend" | "reversal" | "ranging";
  phase: "pullback" | "continuation" | "reversal" | "accumulation" | "ranging";
  explanation: string;
  riskMultiplier: number;    // 1.0 = normal, 1.3 = elevated risk
  confidenceAdjustment: number; // applied to setupQuality scoring
}

export type TradeStatus = "TRADE READY" | "WATCHLIST" | "NO TRADE";

export interface KeyLevel {
  asset: string;
  price: number;
  bias: "bullish" | "bearish" | "neutral";    // LTF Setup direction (structure-based)
  htfBias: "bullish" | "bearish" | "neutral"; // HTF Bias (conviction-based, same engine as BiasCard)
  htfConfidence: number;                       // conviction score that produced htfBias
  smcContext: string;                          // SMC narrative from conviction engine (BOS/CHoCH/zone)
  pctChange: number;                           // 24h % change — passed through for AI panel
  high52w: number;
  low52w: number;
  alignment: AlignmentContext;
  tradeStatus: TradeStatus;
  tradeStatusReason: string;
  setupQuality: "A+" | "A" | "B" | "NO TRADE";
  marketStructure: MarketStructure;
  orderBlock: OrderBlock;
  fvg: FVG | null;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskReward: string;
  rrRatio: number;
  support: number;
  resistance: number;
  pivot: number;
  pdHigh: number;
  pdLow: number;
  liquidityTarget: string;
  confluences: string[];
  confluenceCount: number;
  sessionContext: "Asia" | "London" | "New York" | "Closed";
  sessionNote: string;
  note: string;
}

let cache: { data: KeyLevel[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 300_000; // 5 min

const ASSETS = [
  { symbol: "XAU/USD", display: "XAUUSD", step: 1,   pip: 1.0,   atr: 15 },
  { symbol: "EUR/USD", display: "EURUSD", step: 0.0001, pip: 0.0001, atr: 0.0060 },
  { symbol: "USD/JPY", display: "USDJPY", step: 0.01, pip: 0.01,  atr: 0.60 },
  { symbol: "BTC/USD", display: "BTCUSD", step: 10,   pip: 10,    atr: 800 },
  { symbol: "GBP/USD", display: "GBPUSD", step: 0.0001, pip: 0.0001, atr: 0.0080 },
  { symbol: "USD/CAD", display: "USDCAD", step: 0.0001, pip: 0.0001, atr: 0.0060 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function roundTo(value: number, step: number): number {
  const result = Math.round(value / step) * step;
  const decimals = step < 0.0001 ? 5 : step < 0.001 ? 4 : step < 0.01 ? 3 : step < 1 ? 2 : step < 10 ? 1 : 0;
  return parseFloat(result.toFixed(decimals));
}

function getSession(): "Asia" | "London" | "New York" | "Closed" {
  const hour = new Date().getUTCHours();
  if (hour >= 0  && hour < 8)  return "Asia";
  if (hour >= 8  && hour < 13) return "London";
  if (hour >= 13 && hour < 21) return "New York";
  return "Closed";
}

function getSessionNote(session: string, bias: string): string {
  const notes: Record<string, Record<string, string>> = {
    Asia: {
      bullish: "Asia session: accumulation phase. Watch for London to confirm bullish BOS above Asia high.",
      bearish: "Asia session: distribution phase. London often hunts Asia highs before continuing bearish.",
      neutral: "Asia session: consolidation likely. Mark Asia high/low — London will raid one side first.",
    },
    London: {
      bullish: "London open: highest probability session for bullish continuation. Momentum entry preferred.",
      bearish: "London open: aggressive selling expected. Short rallies that fail at previous structure.",
      neutral: "London session: wait for liquidity sweep of Asian range before taking a directional position.",
    },
    "New York": {
      bullish: "NY session: confirm London bullish structure holds. Continuation setups above London high.",
      bearish: "NY open: watch for London high raid before reversing. NY often reverses London direction.",
      neutral: "NY session: low conviction — wait for clear BOS before committing capital.",
    },
    Closed: {
      bullish: "Market transitioning between sessions. Wait for Asia open to confirm directional bias.",
      bearish: "Market closed. Prepare sell setups at key resistance for Asia/London open.",
      neutral: "Off-session. Mark key levels and wait for next session open before trading.",
    },
  };
  return notes[session]?.[bias] ?? "Monitor price action for session confirmation.";
}

// ── HTF Bias ──────────────────────────────────────────────────────────────────
// Derived from the shared conviction engine (same as /api/market/bias route).
// Rule: confidence >= 55 → directional; < 55 → neutral.
// Structure (BOS/OB/FVG) determines LTF setup readiness — NOT this bias.

// ── Alignment Context ─────────────────────────────────────────────────────────

function computeAlignment(
  htfBias: "bullish" | "bearish" | "neutral",
  ltfBias: "bullish" | "bearish" | "neutral",
  ms: MarketStructure
): AlignmentContext {

  // Ranging / no HTF context
  if (htfBias === "neutral" || ltfBias === "neutral") {
    return {
      type: "ranging",
      phase: "ranging",
      explanation: "No clear higher timeframe bias. Price is in consolidation — both longs and shorts carry equal risk. Wait for a structural break before committing.",
      riskMultiplier: 1.0,
      confidenceAdjustment: -5,
    };
  }

  // Matching direction — trend continuation
  if (htfBias === ltfBias) {
    // Check if CHoCH confirms a possible reversal in the same direction
    const isFreshReversal = ms.choch && !ms.bos;
    return {
      type: "continuation",
      phase: "continuation",
      explanation: isFreshReversal
        ? `LTF setup aligns with HTF ${htfBias} bias. CHoCH detected — early-stage continuation. BOS confirmation preferred before full size entry.`
        : `LTF setup aligns with HTF ${htfBias} trend. Trend continuation setup — highest probability configuration. Full size appropriate at OB/FVG entry.`,
      riskMultiplier: 1.0,
      confidenceAdjustment: 5,
    };
  }

  // Opposing direction — counter-trend
  const htfDir = htfBias === "bullish" ? "bullish (uptrend)" : "bearish (downtrend)";
  const ltfDir = ltfBias === "bullish" ? "bullish bounce" : "bearish pullback";

  // CHoCH in the LTF direction could mean actual reversal
  const isReversal = ms.choch && ms.bos;

  if (isReversal) {
    return {
      type: "reversal",
      phase: "reversal",
      explanation: `LTF ${ltfDir} is challenging the HTF ${htfDir}. Both BOS and CHoCH detected — this may be a genuine trend reversal, not just a pullback. Treat with elevated caution until HTF structure confirms the shift.`,
      riskMultiplier: 1.2,
      confidenceAdjustment: -10,
    };
  }

  return {
    type: "counter-trend",
    phase: ltfBias === "bearish" ? "pullback" : "accumulation",
    explanation: `LTF ${ltfDir} is a short-term retracement against the HTF ${htfDir}. This is a counter-trend trade — reduce position size (0.5× normal), use a tighter stop, and do not move SL to break-even prematurely. The HTF trend is your adversary.`,
    riskMultiplier: 1.3,
    confidenceAdjustment: -15,
  };
}

// ── SMC Market Structure ──────────────────────────────────────────────────────

function analyzeMarketStructure(
  price: number,
  open: number,
  high: number,
  low: number,
  prevClose: number,
  high52w: number,
  low52w: number,
  pctChange: number
): MarketStructure {
  const equilibrium = (high + low) / 2;
  const range52 = high52w - low52w;
  const pos52 = range52 > 0 ? (price - low52w) / range52 : 0.5;

  // BOS: price significantly broke previous close level
  const bos = Math.abs(pctChange) > 0.4;

  // CHoCH: signs of reversal — price moved opposite to 52w trend
  const was52wBullish = pos52 > 0.6;
  const was52wBearish = pos52 < 0.4;
  const choch = (was52wBullish && pctChange < -0.6) || (was52wBearish && pctChange > 0.6);

  // Trend from % change + 52w position
  let trend: "bullish" | "bearish" | "ranging";
  if (pctChange > 0.3 && pos52 > 0.45) trend = "bullish";
  else if (pctChange < -0.3 && pos52 < 0.55) trend = "bearish";
  else trend = "ranging";

  // Premium/Discount relative to today's range
  const premiumDiscount: "premium" | "discount" | "equilibrium" =
    price > equilibrium * 1.002 ? "premium" :
    price < equilibrium * 0.998 ? "discount" : "equilibrium";

  return { trend, bos, choch, premiumDiscount, equilibrium };
}

// ── Order Block Detection ─────────────────────────────────────────────────────

function detectOrderBlock(
  price: number,
  open: number,
  high: number,
  low: number,
  prevClose: number,
  bias: "bullish" | "bearish" | "neutral",
  step: number
): OrderBlock {
  if (bias === "bullish") {
    // Bullish OB: last bearish candle before rally = approx open area (if today gapped up or open < price)
    // OB zone = [open, open + spread] — where institutional buying occurred
    const obLow = roundTo(Math.min(open, prevClose), step);
    const obHigh = roundTo(Math.min(open, prevClose) + (price - Math.min(open, prevClose)) * 0.3, step);
    return {
      price: roundTo((obLow + obHigh) / 2, step),
      zone: [obLow, obHigh],
      type: "bullish",
      valid: price > obHigh, // price moved away from OB = valid
    };
  } else if (bias === "bearish") {
    // Bearish OB: last bullish candle before drop = approx near high area
    const obHigh = roundTo(Math.max(open, prevClose), step);
    const obLow = roundTo(Math.max(open, prevClose) - (Math.max(open, prevClose) - price) * 0.3, step);
    return {
      price: roundTo((obLow + obHigh) / 2, step),
      zone: [obLow, obHigh],
      type: "bearish",
      valid: price < obLow, // price moved away from OB = valid
    };
  } else {
    // Neutral: OB at equilibrium
    const eq = (high + low) / 2;
    const spread = (high - low) * 0.15;
    return {
      price: roundTo(eq, step),
      zone: [roundTo(eq - spread, step), roundTo(eq + spread, step)],
      type: "bullish",
      valid: false,
    };
  }
}

// ── Fair Value Gap Detection ──────────────────────────────────────────────────

function detectFVG(
  price: number,
  open: number,
  high: number,
  low: number,
  prevClose: number,
  step: number
): FVG | null {
  // Bullish FVG: today gapped up — gap between prevClose and today's low
  const bullGap = low - prevClose;
  if (bullGap > prevClose * 0.001) { // at least 0.1% gap
    const fvgLow = roundTo(prevClose, step);
    const fvgHigh = roundTo(low, step);
    return {
      high: fvgHigh,
      low: fvgLow,
      midpoint: roundTo((fvgHigh + fvgLow) / 2, step),
      direction: "bullish",
      filled: price <= fvgHigh, // price came back into FVG
    };
  }

  // Bearish FVG: today gapped down — gap between today's high and prevClose
  const bearGap = prevClose - high;
  if (bearGap > prevClose * 0.001) {
    const fvgLow = roundTo(high, step);
    const fvgHigh = roundTo(prevClose, step);
    return {
      high: fvgHigh,
      low: fvgLow,
      midpoint: roundTo((fvgHigh + fvgLow) / 2, step),
      direction: "bearish",
      filled: price >= fvgLow, // price came back into FVG
    };
  }

  // Intraday FVG: significant open-to-current displacement
  const intraGap = Math.abs(price - open) / price;
  if (intraGap > 0.003) { // 0.3% intraday displacement
    if (price > open) {
      return {
        high: roundTo(price, step),
        low: roundTo(open + (price - open) * 0.3, step),
        midpoint: roundTo(open + (price - open) * 0.65, step),
        direction: "bullish",
        filled: false,
      };
    } else {
      return {
        high: roundTo(open - (open - price) * 0.3, step),
        low: roundTo(price, step),
        midpoint: roundTo(open - (open - price) * 0.65, step),
        direction: "bearish",
        filled: false,
      };
    }
  }

  return null;
}

// ── Confluence Builder ────────────────────────────────────────────────────────

function buildConfluences(
  bias: "bullish" | "bearish" | "neutral",
  ms: MarketStructure,
  ob: OrderBlock,
  fvg: FVG | null,
  session: string,
  rsi: number,
  price: number,
  pivot: number
): string[] {
  const c: string[] = [];

  // 1. Market structure alignment
  if (ms.trend === bias) c.push(`Market structure ${ms.trend} — trend alignment confirmed`);
  if (ms.bos) c.push(`BOS (Break of Structure) detected — institutional momentum present`);
  if (ms.choch) c.push(`CHoCH (Change of Character) — potential trend reversal in play`);

  // 2. Premium/Discount alignment
  if (bias === "bullish" && ms.premiumDiscount === "discount")
    c.push(`Price in discount zone (below EQ ${ms.equilibrium.toFixed(2)}) — smart money buy area`);
  if (bias === "bearish" && ms.premiumDiscount === "premium")
    c.push(`Price in premium zone (above EQ ${ms.equilibrium.toFixed(2)}) — smart money sell area`);
  if (bias === "bullish" && ms.premiumDiscount === "equilibrium")
    c.push(`Price at equilibrium — wait for discount before entry`);

  // 3. Order Block
  if (ob.valid) c.push(`Valid ${ob.type} Order Block at ${ob.zone[0].toFixed(2)}–${ob.zone[1].toFixed(2)}`);

  // 4. FVG
  if (fvg && !fvg.filled) {
    if (fvg.direction === bias || bias === "neutral")
      c.push(`Unfilled ${fvg.direction} FVG at ${fvg.low.toFixed(4)}–${fvg.high.toFixed(4)} — potential magnet`);
  }

  // 5. Session confluence
  if (session === "London" || session === "New York")
    c.push(`${session} session active — highest probability for institutional order flow`);
  if (session === "Asia")
    c.push(`Asia session — accumulation phase, mark range for London raid`);

  // 6. Pivot confluence
  if (bias === "bullish" && price > pivot)
    c.push(`Price above pivot (${pivot.toFixed(2)}) — bullish intraday bias confirmed`);
  if (bias === "bearish" && price < pivot)
    c.push(`Price below pivot (${pivot.toFixed(2)}) — bearish intraday bias confirmed`);

  // 7. RSI secondary (not primary)
  if (bias === "bullish" && rsi < 40)
    c.push(`RSI ${rsi.toFixed(0)} — oversold on secondary indicator, adds weight to reversal`);
  if (bias === "bearish" && rsi > 60)
    c.push(`RSI ${rsi.toFixed(0)} — overbought on secondary indicator, adds weight to reversal`);

  return c;
}

// ── Trade Status ─────────────────────────────────────────────────────────────
// Three-state signal derived from the combination of:
//   HTF bias (macro direction) + LTF confirmation (intraday setup) + quality filters

function computeTradeStatus(
  htfBias: "bullish" | "bearish" | "neutral",
  ltfBias: "bullish" | "bearish" | "neutral",
  alignment: AlignmentContext,
  setupQuality: "A+" | "A" | "B" | "NO TRADE",
  rrRatio: number,
  confluenceCount: number,
  session: string
): { status: TradeStatus; reason: string } {

  // ── NO TRADE ──────────────────────────────────────────────────────────────
  // Market is ranging or there is no usable directional edge
  if (htfBias === "neutral" || ltfBias === "neutral") {
    return {
      status: "NO TRADE",
      reason: "No directional bias on either timeframe — market is ranging. Stand aside and wait for a structural break.",
    };
  }
  if (alignment.type === "ranging") {
    return {
      status: "NO TRADE",
      reason: "HTF and LTF signals are inconclusive — consolidation phase. Mark the range highs/lows and wait for BOS.",
    };
  }
  if (setupQuality === "NO TRADE") {
    const why = confluenceCount < 3
      ? `Only ${confluenceCount} confluence${confluenceCount === 1 ? "" : "s"} found (minimum 3 required)`
      : rrRatio < 2.0
      ? `R:R is 1:${rrRatio} — below the 1:2 minimum threshold`
      : "Setup does not meet quality criteria";
    return {
      status: "NO TRADE",
      reason: `${why}. Wait for price to reach a higher-quality OB or FVG entry.`,
    };
  }

  // ── TRADE READY ───────────────────────────────────────────────────────────
  // HTF bias exists + LTF confirms same direction + quality gate passed
  const isAligned = alignment.type === "continuation";
  const qualityGate = setupQuality === "A+" || setupQuality === "A";
  const rrGate = rrRatio >= 2.0;
  const sessionBoost = session === "London" || session === "New York";

  if (isAligned && qualityGate && rrGate) {
    const sessionNote = sessionBoost ? ` ${session} session active — optimal timing.` : " Wait for London/NY session for best execution.";
    return {
      status: "TRADE READY",
      reason: `HTF ${htfBias} bias confirmed. LTF ${ltfBias} setup aligns. ${confluenceCount} confluences, 1:${rrRatio} R:R (grade ${setupQuality}).${sessionNote}`,
    };
  }

  // ── WATCHLIST ─────────────────────────────────────────────────────────────
  // HTF bias is clear but LTF entry is not yet confirmed
  const watchReasons: string[] = [];

  if (!isAligned) {
    watchReasons.push(`LTF ${ltfBias} setup is ${alignment.type} against HTF ${htfBias} trend`);
  }
  if (!qualityGate) {
    watchReasons.push(`setup quality is ${setupQuality} — wait for a cleaner OB or FVG entry`);
  }
  if (!rrGate) {
    watchReasons.push(`R:R is 1:${rrRatio} — needs to reach at least 1:2 at entry`);
  }
  if (confluenceCount < 3) {
    watchReasons.push(`only ${confluenceCount} confluence${confluenceCount === 1 ? "" : "s"} — need 3+ for confirmation`);
  }

  return {
    status: "WATCHLIST",
    reason: `HTF ${htfBias} bias present. Waiting: ${watchReasons.join("; ")}.`,
  };
}

// ── SMC Entry / SL / TP ───────────────────────────────────────────────────────

function calculateSMCLevels(
  price: number,
  high: number,
  low: number,
  open: number,
  prevClose: number,
  pctChange: number,
  high52w: number,
  low52w: number,
  rsi: number,
  config: typeof ASSETS[0]
): KeyLevel {
  const { step, atr } = config;
  const session = getSession();

  // ── HTF Bias — conviction engine (same source as BiasCard) ─────────────────
  // confidence >= 55 → directional bias; < 55 → neutral (no tradeable edge)
  const macdHist = pctChange * 0.01; // same proxy used by bias route
  const { bias: htfRawBias, confidence: htfConfidence, smcContext: htfSmcContext } =
    deriveConvictionBias(rsi, pctChange, price, high52w, low52w, macdHist, high, low, open, prevClose);
  const htfBias = htfRawBias; // threshold already applied inside deriveConvictionBias

  // ── LTF Bias — intraday structure analysis ───────────────────────────────
  // Determines setup readiness only. Does NOT affect HTF Bias direction.
  const posInRange = (high - low) > 0 ? (price - low) / (high - low) : 0.5;
  let bias: "bullish" | "bearish" | "neutral";
  if      (pctChange > 0.25 && posInRange > 0.5) bias = "bullish";
  else if (pctChange < -0.25 && posInRange < 0.5) bias = "bearish";
  else bias = "neutral";

  // If HTF has a directional bias but LTF structure is unclear → keep HTF,
  // mark LTF as neutral (ranging). Never downgrade HTF due to LTF being unclear.
  // (alignment + tradeStatus will reflect this as WATCHLIST or NO TRADE)

  // Market structure
  const ms = analyzeMarketStructure(price, open, high, low, prevClose, high52w, low52w, pctChange);

  // Alignment between HTF and LTF
  const alignment = computeAlignment(htfBias, bias, ms);

  // Previous Day High/Low approx (using today's high/low as reference; true PDH/PDL requires historical feed)
  const pdHigh = roundTo(high, step);
  const pdLow  = roundTo(low, step);

  // Classic pivot
  const pivotRaw = (high + low + prevClose) / 3;
  const pivot    = roundTo(pivotRaw, step);
  const r1       = roundTo(2 * pivotRaw - low, step);
  const s1       = roundTo(2 * pivotRaw - high, step);
  const support  = roundTo(Math.min(s1, low - atr * 0.3), step);
  const resistance = roundTo(Math.max(r1, high + atr * 0.3), step);

  // Order Block
  const ob = detectOrderBlock(price, open, high, low, prevClose, bias, step);

  // FVG
  const fvg = detectFVG(price, open, high, low, prevClose, step);

  // ── SMC Entry Logic ──
  // Entry: at OB or FVG, NOT at current price
  // SL: beyond structure (swing high/low), NOT fixed %
  let entry: number, stopLoss: number, tp1: number, tp2: number, tp3: number;

  if (bias === "bullish") {
    // Buy at OB/FVG in discount zone
    const entryBase = ob.valid && ms.premiumDiscount === "discount"
      ? ob.zone[1]                       // top of bullish OB
      : fvg?.direction === "bullish" && fvg.midpoint < price
      ? fvg.midpoint                     // FVG midpoint
      : roundTo(ms.equilibrium * 0.998, step); // just below EQ

    entry    = roundTo(entryBase, step);
    // SL: below structure swing low (beyond liquidity, not arbitrary %)
    stopLoss = roundTo(Math.min(low - atr * 0.5, s1 - atr * 0.2), step);
    const risk = Math.abs(entry - stopLoss);
    // TP based on liquidity pools
    tp1 = roundTo(entry + risk * 2.0, step);   // internal range high
    tp2 = roundTo(entry + risk * 3.5, step);   // previous day high / resistance
    tp3 = roundTo(entry + risk * 5.0, step);   // external liquidity / 52w high area

  } else if (bias === "bearish") {
    // Sell at OB/FVG in premium zone
    const entryBase = ob.valid && ms.premiumDiscount === "premium"
      ? ob.zone[0]                       // bottom of bearish OB
      : fvg?.direction === "bearish" && fvg.midpoint > price
      ? fvg.midpoint                     // FVG midpoint
      : roundTo(ms.equilibrium * 1.002, step); // just above EQ

    entry    = roundTo(entryBase, step);
    // SL: above structure swing high
    stopLoss = roundTo(Math.max(high + atr * 0.5, r1 + atr * 0.2), step);
    const risk = Math.abs(stopLoss - entry);
    tp1 = roundTo(entry - risk * 2.0, step);
    tp2 = roundTo(entry - risk * 3.5, step);
    tp3 = roundTo(entry - risk * 5.0, step);

  } else {
    // Neutral: no directional trade, mark range
    entry    = roundTo(ms.equilibrium, step);
    stopLoss = roundTo(low - atr * 0.3, step);
    const risk = Math.abs(entry - stopLoss);
    tp1 = roundTo(entry + risk * 2.0, step);
    tp2 = roundTo(entry + risk * 3.5, step);
    tp3 = roundTo(entry + risk * 5.0, step);
  }

  // R:R calculation
  const risk   = Math.abs(entry - stopLoss);
  const reward = Math.abs(tp1 - entry);
  const rrRatio = risk > 0 ? parseFloat((reward / risk).toFixed(1)) : 0;

  // ── Confluence Scoring ──
  const confluences = buildConfluences(bias, ms, ob, fvg, session, rsi, price, pivot);
  const confluenceCount = confluences.length;

  // ── Setup Quality Filter ──
  // Minimum: 3 confluences + 1:2 R:R. Counter-trend setups are capped at A (never A+).
  const effectiveConfluences = confluenceCount + alignment.confidenceAdjustment / 5;
  let setupQuality: "A+" | "A" | "B" | "NO TRADE";
  if (bias === "neutral" || rrRatio < 2.0 || confluenceCount < 3) {
    setupQuality = "NO TRADE";
  } else if (
    alignment.type === "continuation" &&
    effectiveConfluences >= 5 && rrRatio >= 3.0 &&
    (session === "London" || session === "New York")
  ) {
    setupQuality = "A+";
  } else if (effectiveConfluences >= 4 && rrRatio >= 2.5) {
    setupQuality = alignment.type === "counter-trend" ? "B" : "A";
  } else {
    setupQuality = alignment.type === "counter-trend" && confluenceCount < 4 ? "NO TRADE" : "B";
  }

  // ── Trade Status ──
  const { status: tradeStatus, reason: tradeStatusReason } = computeTradeStatus(
    htfBias, bias, alignment, setupQuality, rrRatio, confluenceCount, session
  );

  // ── Liquidity Target ──
  const liquidityTarget = bias === "bullish"
    ? `Equal highs at ${pdHigh.toFixed(2)} and resistance ${resistance.toFixed(2)} — price targeting sell-side above structure`
    : bias === "bearish"
    ? `Equal lows at ${pdLow.toFixed(2)} and support ${support.toFixed(2)} — price targeting buy-side below structure`
    : `Range liquidity between ${support.toFixed(2)}–${resistance.toFixed(2)} — no directional target`;

  // ── Session Note ──
  const sessionNote = getSessionNote(session, bias);

  // ── Note ──
  const dec = step < 0.001 ? 5 : step < 0.01 ? 4 : step < 1 ? 2 : 0;
  const note = setupQuality === "NO TRADE"
    ? `NO TRADE — ${confluenceCount < 3 ? "insufficient confluences" : bias === "neutral" ? "no directional bias" : "R:R below 1:2"}. Wait for structure to develop.`
    : bias === "bullish"
    ? `${setupQuality} LONG — Entry at OB/FVG ${entry.toFixed(dec)}, SL below structure ${stopLoss.toFixed(dec)}, TP1 ${tp1.toFixed(dec)} (1:${rrRatio} R:R). ${confluenceCount} confluences. ${session} session.`
    : `${setupQuality} SHORT — Entry at OB/FVG ${entry.toFixed(dec)}, SL above structure ${stopLoss.toFixed(dec)}, TP1 ${tp1.toFixed(dec)} (1:${rrRatio} R:R). ${confluenceCount} confluences. ${session} session.`;

  return {
    asset: config.display,
    price,
    pctChange,
    high52w,
    low52w,
    bias,             // LTF Setup direction (structure-based)
    htfBias,          // HTF Bias (conviction engine — matches BiasCard)
    htfConfidence,    // conviction score
    smcContext: htfSmcContext,  // BOS/CHoCH/zone context for AI panel
    alignment,        // HTF vs LTF reconciliation
    tradeStatus,      // TRADE READY | WATCHLIST | NO TRADE
    tradeStatusReason,
    setupQuality,
    marketStructure: ms,
    orderBlock: ob,
    fvg,
    entry,
    stopLoss,
    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,
    riskReward: `1:${rrRatio}`,
    rrRatio,
    support,
    resistance,
    pivot,
    pdHigh,
    pdLow,
    liquidityTarget,
    confluences,
    confluenceCount,
    sessionContext: session,
    sessionNote,
    note,
  };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET() {
  if (cache.data.length > 0 && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ data: cache.data, timestamp: cache.ts, cached: true });
  }

  try {
    const apiKey = process.env.TWELVEDATA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ data: [], timestamp: Date.now(), error: "No TWELVEDATA_API_KEY" });
    }

    const { ensureCacheWarm, getQuotesForSymbols } = await import("@/lib/api/quotes-cache");
    await ensureCacheWarm();
    const quoteData = getQuotesForSymbols(ASSETS.map(a => a.symbol));

    // Fetch RSI for all assets
    const rsiResults = await Promise.all(
      ASSETS.map(async (asset) => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(
            `https://api.twelvedata.com/rsi?symbol=${asset.symbol}&interval=1day&time_period=14&outputsize=1&apikey=${apiKey}`,
            { signal: controller.signal, cache: "no-store" }
          );
          clearTimeout(timer);
          if (!res.ok) return 50;
          const data = await res.json();
          return data.code === 429 ? 50 : parseFloat(data.values?.[0]?.rsi ?? "50");
        } catch { return 50; }
      })
    );

    const levels: KeyLevel[] = [];

    for (let i = 0; i < ASSETS.length; i++) {
      const config = ASSETS[i];
      const quote = quoteData[config.symbol];
      if (!quote || (quote as any).code) continue;

      const price     = parseFloat(quote.close)           || 0;
      const high      = parseFloat(quote.high || quote.close) || price;
      const low       = parseFloat(quote.low  || quote.close) || price;
      const open      = parseFloat(quote.open || quote.close) || price;
      const prevClose = parseFloat(quote.previous_close || quote.close) || price;
      const pctChange = parseFloat(quote.percent_change) || 0;
      const high52w   = parseFloat(quote.fifty_two_week?.high ?? String(price * 1.1));
      const low52w    = parseFloat(quote.fifty_two_week?.low  ?? String(price * 0.9));
      const rsi       = rsiResults[i];

      if (price > 0) {
        levels.push(calculateSMCLevels(price, high, low, open, prevClose, pctChange, high52w, low52w, rsi, config));
      }
    }

    if (levels.length > 0) {
      cache = { data: levels, ts: Date.now() };
    }

    return NextResponse.json({ data: levels, timestamp: Date.now(), count: levels.length });
  } catch (error) {
    console.error("KeyLevels SMC API error:", error);
    return NextResponse.json({ data: cache.data, timestamp: Date.now(), error: "fetch failed" });
  }
}
