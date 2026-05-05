/**
 * Shared conviction engine — single source of truth for HTF directional bias.
 *
 * Both /api/market/bias and /api/market/keylevels must use this function
 * to ensure their HTF Bias outputs are always consistent.
 *
 * Rule:
 *   confidence >= 50  → directional bias (bullish | bearish)
 *   confidence < 50   → neutral (no tradeable edge)
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

  const range52    = high52w - low52w;
  const pos52      = range52 > 0 ? (price - low52w) / range52 : 0.5;
  const equilibrium = (high + low) / 2;
  const inDiscount  = price < equilibrium;
  const inPremium   = price > equilibrium;

  // ── BOS / CHoCH detection (primary weight) ──────────────────────────────
  // Lower threshold from 0.4% to 0.2% — gold/forex rarely move 0.4% in Asia
  const bosUp   = pctChange > 0.2;
  const bosDown = pctChange < -0.2;
  const choch   = (pos52 > 0.6 && pctChange < -0.5) || (pos52 < 0.4 && pctChange > 0.5);

  if (bosUp)   score += 30;
  if (bosDown) score -= 30;
  if (choch)   score = choch && pctChange > 0 ? Math.max(score, 20) : Math.min(score, -20);

  // ── Premium / Discount alignment ─────────────────────────────────────────
  if (pctChange > 0 && inDiscount) score += 15; // rising from support — high conviction
  if (pctChange < 0 && inPremium)  score -= 15; // falling from resistance — high conviction
  if (pctChange > 0 && inPremium)  score -= 2;  // slightly cautious buying into resistance (reduced from -5)
  if (pctChange < 0 && inDiscount) score += 2;  // slightly cautious selling into support (reduced from +5)

  // ── RSI (confirms momentum direction) ────────────────────────────────────
  if      (rsi > 70) score -= 8;   // overbought — reduce longs (less penalty, was -10)
  else if (rsi > 60) score += 14;  // strong bullish momentum
  else if (rsi > 50) score += 7;   // above midline
  else if (rsi > 40) score -= 7;   // below midline
  else if (rsi > 30) score -= 14;  // strong bearish momentum
  else               score += 8;   // deeply oversold → reversal

  // ── 52-week structural position (more resolution) ─────────────────────────
  // Gold at 80%+ of 52w range = clearly bullish. Old scoring was too flat.
  if      (pos52 > 0.75) score += 15;  // upper range — sustained buying pressure
  else if (pos52 > 0.55) score += 10;  // above equilibrium — bullish lean
  else if (pos52 > 0.40) score += 4;   // mid range — slight lean
  else if (pos52 > 0.25) score -= 8;   // lower range — bearish lean
  else                   score -= 15;  // deep discount from year high — bearish structure

  // ── MACD histogram (momentum direction) ──────────────────────────────────
  if (macdHist > 0) score += Math.min(15, macdHist * 60);  // amplified from *30
  else              score += Math.max(-15, macdHist * 60);

  score = Math.max(-100, Math.min(100, score));

  // ── Bias threshold: >10 = directional (was >15) ───────────────────────────
  const rawBias   = score > 10 ? "bullish" : score < -10 ? "bearish" : "neutral";
  const rawConf   = Math.min(95, Math.max(25, 50 + Math.abs(score) * 0.45));
  const confidence = Math.round(rawConf);

  // Apply 50% threshold — down from 55% to be more responsive
  const bias: "bullish" | "bearish" | "neutral" =
    confidence >= 50 ? rawBias : "neutral";

  const smcContext = [
    bosUp   ? "BOS to upside detected"   :
    bosDown ? "BOS to downside detected" : "No clear BOS",
    choch   ? "CHoCH in play — potential trend reversal" : "",
    inDiscount ? "Price in discount zone (buy area)" :
    inPremium  ? "Price in premium zone" :
                 "Price at equilibrium",
    `52w position: ${(pos52 * 100).toFixed(0)}% of annual range`,
  ].filter(Boolean).join(" | ");

  return { bias, confidence, smcContext };
}
