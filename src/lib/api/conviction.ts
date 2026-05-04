/**
 * Shared conviction engine — single source of truth for HTF directional bias.
 *
 * Both /api/market/bias and /api/market/keylevels must use this function
 * to ensure their HTF Bias outputs are always consistent.
 *
 * Rule:
 *   confidence >= 55  → directional bias (bullish | bearish)
 *   confidence < 55   → neutral (no tradeable edge)
 *
 * Structure (BOS/CHoCH) determines SETUP READINESS (LTF), NOT this bias.
 */

export interface ConvictionResult {
  bias: "bullish" | "bearish" | "neutral";
  confidence: number; // 0–100
  smcContext: string;
}

/**
 * Derives directional bias and conviction score from market data.
 * Identical scoring algorithm used by both the Bias API and Key Levels API.
 */
export function deriveConvictionBias(
  rsi: number,
  pctChange: number,
  price: number,
  high52w: number,
  low52w: number,
  macdHist: number,
  high: number,
  low: number,
  open: number,
  prevClose: number
): ConvictionResult {
  let score = 0;

  const range52   = high52w - low52w;
  const pos52     = range52 > 0 ? (price - low52w) / range52 : 0.5;
  const equilibrium = (high + low) / 2;
  const inDiscount  = price < equilibrium;
  const inPremium   = price > equilibrium;

  // ── BOS / CHoCH detection (primary weight) ──────────────────────────────
  const bosUp   = pctChange > 0.4;
  const bosDown = pctChange < -0.4;
  const choch   = (pos52 > 0.6 && pctChange < -0.6) || (pos52 < 0.4 && pctChange > 0.6);

  if (bosUp)   score += 30;
  if (bosDown) score -= 30;
  if (choch)   score = choch && pctChange > 0 ? Math.max(score, 20) : Math.min(score, -20);

  // ── Premium / Discount alignment ─────────────────────────────────────────
  if (pctChange > 0 && inDiscount) score += 15; // rising from support
  if (pctChange < 0 && inPremium)  score -= 15; // falling from resistance
  if (pctChange > 0 && inPremium)  score -= 5;  // buying into resistance = risky
  if (pctChange < 0 && inDiscount) score += 5;  // selling into support = risky

  // ── RSI (confirms momentum direction) ────────────────────────────────────
  if      (rsi > 70) score -= 10;
  else if (rsi > 60) score += 12;
  else if (rsi > 50) score += 6;
  else if (rsi > 40) score -= 6;
  else if (rsi > 30) score -= 12;
  else               score += 10; // deeply oversold → reversal potential

  // ── 52-week structural position ───────────────────────────────────────────
  if      (pos52 > 0.8) score += 8;
  else if (pos52 > 0.6) score += 12;
  else if (pos52 > 0.4) score += 3;
  else if (pos52 > 0.2) score -= 8;
  else                  score -= 12;

  // ── MACD histogram (momentum direction) ──────────────────────────────────
  if (macdHist > 0) score += Math.min(15, macdHist * 30);
  else              score += Math.max(-15, macdHist * 30);

  score = Math.max(-100, Math.min(100, score));

  // ── Conviction threshold: >= 55 = directional, < 55 = neutral ────────────
  const rawBias   = score > 15 ? "bullish" : score < -15 ? "bearish" : "neutral";
  const rawConf   = Math.min(95, Math.max(25, 50 + Math.abs(score) * 0.45));
  const confidence = Math.round(rawConf);

  // Apply 55% threshold — structure does NOT override this
  const bias: "bullish" | "bearish" | "neutral" =
    confidence >= 55 ? rawBias : "neutral";

  const smcContext = [
    bosUp   ? "BOS to upside detected"   :
    bosDown ? "BOS to downside detected" : "No clear BOS",
    choch   ? "CHoCH in play — potential trend reversal" : "",
    inDiscount ? "Price in discount zone (buy area)" :
    inPremium  ? "Price in premium zone (sell area)" :
                 "Price at equilibrium",
    `52w position: ${(pos52 * 100).toFixed(0)}% of annual range`,
  ].filter(Boolean).join(" | ");

  return { bias, confidence, smcContext };
}
