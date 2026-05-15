import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AssetAIAnalysis } from "@/types";
import { setAIAnalysisCache } from "@/lib/api/ai-analysis-cache";

export const dynamic = "force-dynamic";

// ── Cache  -  10 minutes ────────────────────────────────────────────────────────
let cache: { data: Record<string, AssetAIAnalysis>; ts: number } | null = null;
const CACHE_TTL = 600_000;

// ── Assets ────────────────────────────────────────────────────────────────────
const ASSETS = [
  { symbol: "XAUUSD", apiSymbol: "XAU/USD",  display: "Gold (XAUUSD)",               invertBias: false },
  { symbol: "EURUSD", apiSymbol: "EUR/USD",  display: "EUR/USD (DXY Proxy)",           invertBias: true  },
  { symbol: "USDJPY", apiSymbol: "USD/JPY",  display: "S&P 500 Risk Proxy (USDJPY)",   invertBias: false },
  { symbol: "BTCUSD", apiSymbol: "BTC/USD",  display: "Bitcoin (BTC)",                 invertBias: false },
];

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an elite professional trader with 20+ years experience across forex, commodities, equities, and crypto. You trade using Smart Money Concepts (SMC) and ICT methodology.

Your mental model:
- You read market structure: BOS (Break of Structure), CHoCH (Change of Character), displacement, retracements
- You identify Order Blocks (OB): the last opposing candle before a displacement move
- You identify Fair Value Gaps (FVG): price imbalances between prevClose and today's low/high
- You track liquidity pools: equal highs/lows, session extremes, prior day/week highs/lows
- You think in sessions: Asia (accumulation/range), London (manipulation/expansion), New York (continuation/reversal)
- You apply macro context: DXY strength, yield curve, risk sentiment, central bank posture

PRICE LEVEL RULES  -  read carefully:
You are not a formula. You place levels exactly where you would draw them manually on a chart.

ENTRY:
- Order Block retest: top of the last bullish OB (last bearish candle before displacement up) for buys; bottom of last bearish OB for sells
- FVG fill: midpoint of the imbalance gap (prevClose to today's low = bullish FVG; today's high to prevClose = bearish FVG)
- Liquidity sweep + reversal: the swept level where price grabbed retail stops then reversed
- Use the actual price you see in the data  -  not a relative offset
- WATCHLIST: provide a projected zone price (your best estimate) or null if genuinely uncertain
- NO TRADE: always null

STOP LOSS:
- For buys: below the origin of the bullish displacement (swing low before the rally, OB origin, or the FVG low)
- For sells: above the origin of the bearish displacement (swing high before the drop, OB origin, or the FVG high)
- Add 1-3 ticks buffer beyond the structural level to avoid stop hunts
- The SL must represent true structural invalidation  -  not a formula
- Never use ATR multiples or fixed % distances

TAKE PROFIT  -  ONE RULE ONLY:

TP1 = the closest valid liquidity level in the direction of the trade.
That is the only rule. No exceptions.

What counts as liquidity:
  • Equal highs (for buys) or equal lows (for sells)  -  2+ touches at the same level
  • Most recent swing high (buys) / swing low (sells)
  • Session high/low (Asia, London, NY)
  • Nearest opposing pool (prior day high/low, consolidation extreme)

Do NOT:
  • Compare options and pick the "best" or "cleanest"
  • Skip a closer level because a farther one gives better RR
  • Apply caps or distance limits
  • Adjust for volatility
  • Use R-multiples (1.5R, 2R, etc.)  -  ever

If no clear liquidity is visible → return null. Do not invent a target.

TP2 = the next liquidity level after TP1, in the same direction. Do not skip levels.

TP3 = optional macro runner (52-week high/low, monthly structure). Default null.

STRUCTURAL BIAS:
- structuralBias: your HTF read  -  is the 52-week position, recent displacement, and momentum pointing bullish, bearish, or neutral?
- setupBias: the direction of the current LTF setup (buy/sell/neutral)

TRADE STATUS:
- "TRADE READY": clean OB/FVG/sweep present, structural alignment confirmed, specific entry+SL+TP identified → provide all prices
- "WATCHLIST": setup forming but not confirmed, or approaching a key level → provide projected prices or null
- "NO TRADE": no setup, mixed/choppy structure, or risk outweighs opportunity → all price fields MUST be null

CRITICAL: Respond with ONLY valid JSON  -  no markdown, no preamble, no code blocks. Return exactly this structure:
{
  "action": "Look for BUY Setups" | "Look for SELL Setups" | "Wait for Confirmation" | "Avoid Trading",
  "actionSub": "one concise SMC-based description",
  "actionIntent": "buy" | "sell" | "wait" | "avoid",
  "marketPhase": "Accumulation" | "Manipulation" | "Expansion" | "Distribution" | "Pullback" | "Range",
  "phaseDescription": "one professional sentence describing current phase",
  "narrative": "2-3 sentence analysis combining macro context and price action structure",
  "supportingFactors": ["SMC factor 1", "factor 2", "factor 3"],
  "invalidationFactors": ["invalidation 1", "invalidation 2", "invalidation 3"],
  "waitFor": "specific price action confirmation to wait for",
  "confirms": "what price action confirms the setup is valid",
  "invalidates": "what price action invalidates the entire thesis",
  "tradeStatus": "TRADE READY" | "WATCHLIST" | "NO TRADE",
  "setupNarrative": "1-2 sentence setup rationale",
  "structuralBias": "bullish" | "bearish" | "neutral",
  "setupBias": "bullish" | "bearish" | "neutral",
  "entry": <exact price number, or null>,
  "stopLoss": <exact price number, or null>,
  "tp1": <exact price number, or null>,
  "tp2": <exact price number, or null>,
  "tp3": <exact price number, or null>,
  "entryZone": "description: which structure zone, e.g. 'Bullish OB 2678–2682  -  last bearish candle before displacement'",
  "slZone": "invalidation logic, e.g. 'Below swing low 2661  -  structure invalid on close below'",
  "tp1Zone": "liquidity target, e.g. 'Equal highs 2710  -  prior session pool'",
  "tp2Zone": "secondary target, e.g. 'Weekly resistance 2735  -  external liquidity'"
}`;

// ── Session helper ────────────────────────────────────────────────────────────
function getCurrentSession(): string {
  const h = new Date().getUTCHours();
  if (h >= 0  && h < 8)  return "Asia (accumulation/range  -  mark highs/lows for London raid)";
  if (h >= 8  && h < 13) return "London (manipulation/expansion  -  highest probability for directional moves)";
  if (h >= 13 && h < 21) return "New York (continuation or reversal of London move)";
  return "Closed (between sessions  -  prepare levels for Asia open)";
}

// ── Analyze one asset via Claude ──────────────────────────────────────────────
async function analyzeAsset(
  client: Anthropic,
  symbol: string,
  display: string,
  price: number,
  high: number,
  low: number,
  open: number,
  prevClose: number,
  pctChange: number,
  htfBias: string,
  htfConfidence: number,
  smcContext: string,
  pos52: number,
  high52w: number,
  low52w: number,
): Promise<AssetAIAnalysis> {
  const zone = pos52 > 60 ? "PREMIUM" : pos52 < 40 ? "DISCOUNT" : "EQUILIBRIUM";
  const dayRange = high - low;
  const posInDay = dayRange > 0 ? ((price - low) / dayRange * 100).toFixed(0) : "50";
  const gap = (price - prevClose);
  const gapPct = prevClose > 0 ? ((gap / prevClose) * 100).toFixed(2) : "0.00";
  const gapDir = gap > 0 ? "gapped UP" : gap < 0 ? "gapped DOWN" : "flat open";
  const session = getCurrentSession();

  const userMessage = `
Analyze ${display} (${symbol})  -  act as a professional SMC trader placing real levels on a chart.

TODAY'S PRICE ACTION:
- Current Price: ${price}
- Open: ${open} | High: ${high} | Low: ${low} | Prev Close: ${prevClose}
- 24h Change: ${pctChange > 0 ? "+" : ""}${pctChange.toFixed(2)}%
- Day range: ${dayRange.toFixed(4)} | Position in day range: ${posInDay}%
- vs Prev Close: ${gapDir} (${gap > 0 ? "+" : ""}${gap.toFixed(4)} / ${gapDir !== "flat open" ? (pctChange > 0 ? "+" : "") + gapPct + "%" : "0%"})

52-WEEK CONTEXT:
- Range: ${low52w} – ${high52w}
- Current position: ${pos52.toFixed(0)}% through 52-week range
- Zone: ${zone}

SESSION: ${session}

STRUCTURE CONTEXT (conviction engine):
- HTF Bias: ${htfBias.toUpperCase()} at ${htfConfidence}% conviction
- SMC signals: ${smcContext || "No clear BOS/CHoCH detected"}

YOUR TASK:
1. Read the price action: is there an OB, FVG, or liquidity sweep setup present?
2. Determine trade status: TRADE READY / WATCHLIST / NO TRADE
3. Place exact INTRADAY price levels from structure  -  not formulas:
   - Entry: where would you actually place a limit order on this chart?
   - SL: the structural level that invalidates your thesis
   - TP1: the nearest realistic intraday liquidity (within this session's expected range)
   - TP2: the next intraday target  -  further than TP1 but still reachable today
   - TP3: only if there is a clear macro structural target beyond TP2

IMPORTANT  -  day range context for TP sizing:
The current day range is ${dayRange.toFixed(symbol === "USDJPY" ? 2 : symbol === "XAUUSD" || symbol === "BTCUSD" ? 2 : 4)}.
Use this to calibrate realistic targets. TP1 should target price action within the current session, not a multi-day move.

Return valid JSON only.
`.trim();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1100,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  return JSON.parse(cleaned) as AssetAIAnalysis;
}

// ── Fallback analysis (when Claude unavailable  -  cold cache) ──────────────────
// Price levels are null: keylevels route uses its own structural formula as backup.
function fallbackAnalysis(htfBias: string, confidence: number, smcContext: string, tradeStatus: string): AssetAIAnalysis {
  const isBull = htfBias === "bullish";
  const isBear = htfBias === "bearish";
  const isActive = confidence >= 55;
  const bias = htfBias as "bullish" | "bearish" | "neutral";

  return {
    action: !isActive ? "Avoid Trading" : isBull ? "Look for BUY Setups" : isBear ? "Look for SELL Setups" : "Wait for Confirmation",
    actionSub: !isActive ? "No directional edge  -  stand aside" : isBull ? "HTF bullish  -  wait for discount OB/FVG entry" : "HTF bearish  -  wait for premium OB/FVG entry",
    actionIntent: !isActive ? "avoid" : isBull ? "buy" : isBear ? "sell" : "wait",
    marketPhase: confidence >= 70 ? "Expansion" : isActive ? "Pullback" : "Range",
    phaseDescription: `Market in ${isBull ? "bullish" : isBear ? "bearish" : "neutral"} phase  -  ${smcContext || "awaiting directional confirmation"}`,
    narrative: `${smcContext || "No clear SMC structure detected."} Conviction at ${confidence}%. ${isActive ? "Directional bias present  -  align entries with trend." : "Below threshold  -  wait for clarity."}`,
    supportingFactors: [smcContext || "Monitoring for BOS confirmation", `HTF ${htfBias} bias at ${confidence}% conviction`, "Awaiting AI analysis refresh"],
    invalidationFactors: ["Break of current structure invalidates setup", "Drop below 55% conviction threshold", "Opposing macro catalyst"],
    waitFor: isBull ? "Pullback to discount zone OB/FVG" : isBear ? "Bounce to premium zone OB/FVG" : "Clear BOS on H1 or H4",
    confirms: isBull ? "Bullish engulfing at OB / FVG fill + BOS" : isBear ? "Bearish rejection at OB / FVG + BOS" : "Decisive candle close beyond range",
    invalidates: isBull ? "Break and close below last significant swing low" : isBear ? "Break and close above last significant swing high" : "Strong directional displacement without retest",
    tradeStatus: tradeStatus as "TRADE READY" | "WATCHLIST" | "NO TRADE",
    setupNarrative: `${isActive ? `${htfBias} bias confirmed at ${confidence}%.` : "Insufficient conviction for directional trade."} ${tradeStatus === "TRADE READY" ? "Setup is active  -  monitor for entry." : tradeStatus === "WATCHLIST" ? "Setup forming  -  not yet confirmed." : "No valid setup currently."}`,
    structuralBias: bias,
    setupBias: bias,
    // Price levels null  -  keylevels route will use structural formula as fallback
    entry: null, stopLoss: null, tp1: null, tp2: null, tp3: null,
    entryZone: "AI analysis unavailable  -  levels computed from structure",
    slZone: "AI analysis unavailable  -  SL placed beyond swing structure",
    tp1Zone: "AI analysis unavailable  -  targeting nearest session liquidity",
    tp2Zone: "AI analysis unavailable  -  targeting secondary structure level",
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET() {
  // Serve cache if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ data: cache.data, timestamp: cache.ts, cached: true });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  try {
    // Get market data from existing caches (no extra API calls)
    const { ensureCacheWarm, getQuotesForSymbols } = await import("@/lib/api/quotes-cache");
    const { deriveConvictionBias } = await import("@/lib/api/conviction");

    await ensureCacheWarm();
    const quotes = getQuotesForSymbols(ASSETS.map(a => a.apiSymbol));

    // Build context for each asset
    const contexts = ASSETS.map(asset => {
      const q = quotes[asset.apiSymbol];
      if (!q || (q as any).code) {
        return { ...asset, valid: false as const };
      }

      const price     = parseFloat((q as any).close)           || 0;
      const high      = parseFloat((q as any).high  || (q as any).close) || price;
      const low       = parseFloat((q as any).low   || (q as any).close) || price;
      const open      = parseFloat((q as any).open  || (q as any).close) || price;
      const prevClose = parseFloat((q as any).previous_close   || (q as any).close) || price;
      const pctChange = parseFloat((q as any).percent_change)  || 0;
      const high52w   = parseFloat((q as any).fifty_two_week?.high ?? String(price * 1.1));
      const low52w    = parseFloat((q as any).fifty_two_week?.low  ?? String(price * 0.9));

      const effectivePct  = asset.invertBias ? -pctChange  : pctChange;
      const macdHist      = effectivePct * 0.01;
      const effectiveHigh = asset.invertBias ? price * 2 - low : high;
      const effectiveLow  = asset.invertBias ? price * 2 - high : low;
      const effectiveRsi  = 50; // default  -  RSI fetch avoided to save API credits

      const { bias: htfBias, confidence: htfConf, smcContext } = deriveConvictionBias(
        effectiveRsi, effectivePct, price, high52w, low52w, macdHist,
        effectiveHigh, effectiveLow, open, prevClose
      );

      const range52 = high52w - low52w;
      const pos52   = range52 > 0 ? ((price - low52w) / range52) * 100 : 50;

      return {
        ...asset,
        valid: true as const,
        price, high, low, open, prevClose,
        pctChange, htfBias, htfConf, smcContext,
        pos52, high52w, low52w,
      };
    });

    // Call Claude for each valid asset in parallel (or use fallback)
    const results: Record<string, AssetAIAnalysis> = {};

    if (apiKey) {
      const client = new Anthropic({ apiKey });

      await Promise.all(
        contexts.map(async ctx => {
          if (!ctx.valid) {
            results[ctx.symbol] = fallbackAnalysis("neutral", 50, "", "NO TRADE");
            return;
          }
          try {
            results[ctx.symbol] = await analyzeAsset(
              client,
              ctx.symbol,
              ctx.display,
              ctx.price,
              ctx.high,
              ctx.low,
              ctx.open,
              ctx.prevClose,
              ctx.pctChange,
              ctx.htfBias,
              ctx.htfConf,
              ctx.smcContext,
              ctx.pos52,
              ctx.high52w,
              ctx.low52w,
            );
          } catch (e) {
            console.error(`AI analysis failed for ${ctx.symbol}:`, e);
            results[ctx.symbol] = fallbackAnalysis(ctx.htfBias, ctx.htfConf, ctx.smcContext, "WATCHLIST");
          }
        })
      );
    } else {
      // No API key  -  use fallback for all
      contexts.forEach(ctx => {
        results[ctx.symbol] = ctx.valid
          ? fallbackAnalysis(ctx.htfBias, ctx.htfConf, ctx.smcContext, "WATCHLIST")
          : fallbackAnalysis("neutral", 50, "", "NO TRADE");
      });
    }

    cache = { data: results, ts: Date.now() };
    // Write to shared cache so /api/market/keylevels can read Claude's outputs
    setAIAnalysisCache(results);
    return NextResponse.json({ data: results, timestamp: cache.ts, cached: false });

  } catch (error) {
    console.error("AI analysis endpoint error:", error);
    // Return stale cache if available, else empty fallback
    if (cache) {
      return NextResponse.json({ data: cache.data, timestamp: cache.ts, cached: true, stale: true });
    }
    return NextResponse.json({ data: {}, timestamp: Date.now(), error: "unavailable" });
  }
}

// ── Force refresh (POST) ──────────────────────────────────────────────────────
export async function POST() {
  cache = null; // bust cache
  return GET();
}
