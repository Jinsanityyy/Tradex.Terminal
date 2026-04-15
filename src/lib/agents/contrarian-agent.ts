/**
 * Agent 6 — Contrarian Agent (Rule-Based)
 *
 * Challenges the dominant thesis:
 * - Identifies potential trap setups
 * - Points out opposite-side liquidity
 * - Highlights structural weaknesses in the primary bias
 * - Returns riskFactor (0–100): how much contrarian risk exists
 */

import type { MarketSnapshot, ContrarianAgentOutput } from "./schemas";
import type { TrendAgentOutput, SMCAgentOutput } from "./schemas";

export async function runContrarianAgent(
  snapshot: MarketSnapshot,
  trend: TrendAgentOutput,
  smc: SMCAgentOutput
): Promise<ContrarianAgentOutput> {
  const start = Date.now();

  try {
    const { price, structure, indicators } = snapshot;
    const { current, high, low, changePercent, dayRange } = price;
    const { pos52w, htfBias, htfConfidence, zone, inPremium, inDiscount } = structure;
    const { rsi, atrProxy, session } = indicators;

    const failureReasons: string[] = [];
    let riskFactor = 20; // base contrarian risk
    let trapType: string | null = null;
    let oppositeLiquidity: number | null = null;

    // ── Trap Detection ────────────────────────────────────────────────────

    // Bull trap: price at premium + overbought + extended move
    if (htfBias === "bullish" && inPremium && rsi > 68) {
      trapType = "bull trap";
      riskFactor += 30;
      failureReasons.push(
        `Bull trap risk: price extended to PREMIUM zone (${current.toFixed(4)}) with RSI ${rsi.toFixed(0)} — smart money may distribute into retail longs`
      );
    }

    // Bear trap: price at discount + oversold + extended move down
    if (htfBias === "bearish" && inDiscount && rsi < 32) {
      trapType = "bear trap";
      riskFactor += 30;
      failureReasons.push(
        `Bear trap risk: price extended to DISCOUNT zone with RSI ${rsi.toFixed(0)} — liquidity below may have been swept, reversal potential`
      );
    }

    // False breakout: BOS detected but price immediately reversed
    if (smc.bosDetected && Math.abs(changePercent) > 0.6 && dayRange > 0) {
      const bodyRatio = Math.abs(current - price.open) / dayRange;
      if (bodyRatio < 0.4) {
        trapType = trapType ?? "false breakout";
        riskFactor += 20;
        failureReasons.push(
          `False breakout risk: large range (${dayRange.toFixed(4)}) with small body — long wick suggests rejection, not genuine BOS`
        );
      }
    }

    // Stop hunt: near 52-week extreme
    if (pos52w > 88) {
      riskFactor += 15;
      failureReasons.push(
        `Stop hunt risk: price at ${pos52w}% of 52-week range — equal highs above ${structure.high52w.toFixed(4)} are a magnet for stop runs before reversal`
      );
      oppositeLiquidity = parseFloat((structure.high52w * 1.002).toFixed(4));
    }

    if (pos52w < 12) {
      riskFactor += 15;
      failureReasons.push(
        `Stop hunt risk: price at ${pos52w}% of 52-week range — equal lows below ${structure.low52w.toFixed(4)} are a magnet for stop runs before reversal`
      );
      oppositeLiquidity = parseFloat((structure.low52w * 0.998).toFixed(4));
    }

    // Weak conviction: both bias agents below 60% confidence
    if (htfConfidence < 55 && trend.confidence < 55) {
      riskFactor += 20;
      failureReasons.push(
        `Weak conviction: HTF bias only ${htfConfidence}% and Trend only ${trend.confidence}% — insufficient edge for high-probability trade`
      );
    }

    // Timeframe divergence: HTF bullish but intraday trending down
    if (htfBias === "bullish" && changePercent < -0.4) {
      riskFactor += 15;
      failureReasons.push(
        `HTF-LTF divergence: daily bias bullish but intraday ${changePercent.toFixed(2)}% — possible distribution/manipulation before real move`
      );
    }
    if (htfBias === "bearish" && changePercent > 0.4) {
      riskFactor += 15;
      failureReasons.push(
        `HTF-LTF divergence: daily bias bearish but intraday +${changePercent.toFixed(2)}% — possible accumulation/manipulation before real breakdown`
      );
    }

    // Asia session unreliability
    if (session === "Asia") {
      riskFactor += 10;
      failureReasons.push(
        `Asia session trap: moves during Asia often reverse during London open — wait for London confirmation before committing`
      );
    }

    // CHoCH = structural uncertainty
    if (smc.chochDetected) {
      riskFactor += 15;
      failureReasons.push(
        `CHoCH active: structural shift in progress — counter-trend trap possible if CHoCH fails to develop into new BOS`
      );
    }

    // Opposite liquidity: where are retail stops on the other side?
    if (oppositeLiquidity === null) {
      oppositeLiquidity = htfBias === "bullish"
        ? parseFloat((low * 0.995).toFixed(4))  // equal lows below for bullish bias
        : parseFloat((high * 1.005).toFixed(4)); // equal highs above for bearish bias
    }

    // ── Contrarian Challenge ───────────────────────────────────────────────
    const challengesBias = riskFactor > 40;
    const trapConfidence = Math.min(90, riskFactor);

    // ── Alternative Scenario ───────────────────────────────────────────────
    const alternativeScenario = htfBias === "bullish"
      ? `ALTERNATIVE (bearish): Price sweeps ${oppositeLiquidity.toFixed(4)} equal lows below, triggers stop hunt on retail longs, ${
          pos52w > 70 ? "then initiates real bearish BOS from premium zone" :
          "before larger reversal move develops"
        }. Watch for bearish engulfing / displacement below ${(low * 0.998).toFixed(4)}.`
      : htfBias === "bearish"
      ? `ALTERNATIVE (bullish): Price sweeps ${oppositeLiquidity.toFixed(4)} equal highs above, triggers stop hunt on retail shorts, ${
          pos52w < 30 ? "then initiates real bullish BOS from discount zone" :
          "before larger reversal develops"
        }. Watch for bullish engulfing / displacement above ${(high * 1.002).toFixed(4)}.`
      : `ALTERNATIVE: No clear bias — both sides of range are valid manipulation targets. Wait for definitive BOS before taking any directional trade.`;

    if (failureReasons.length === 0) {
      failureReasons.push(`No significant contrarian signals detected — primary thesis intact`);
      riskFactor = 15;
    }

    return {
      agentId: "contrarian",
      challengesBias,
      trapType,
      trapConfidence,
      oppositeLiquidity,
      failureReasons: failureReasons.slice(0, 4),
      alternativeScenario,
      riskFactor: Math.min(95, riskFactor),
      processingTime: Date.now() - start,
    };
  } catch (err) {
    return {
      agentId: "contrarian",
      challengesBias: false,
      trapType: null,
      trapConfidence: 20,
      oppositeLiquidity: null,
      failureReasons: ["Contrarian analysis failed"],
      alternativeScenario: "Contrarian analysis unavailable",
      riskFactor: 20,
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
