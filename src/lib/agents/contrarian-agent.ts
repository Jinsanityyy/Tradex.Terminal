/**
 * Agent 6  -  Contrarian Agent (Claude-Powered + Rule-Based Fallback)
 *
 * Challenges the dominant thesis:
 * - Identifies potential trap setups
 * - Points out opposite-side liquidity
 * - Highlights structural weaknesses in the primary bias
 * - Returns riskFactor (0–100): how much contrarian risk exists
 */

import Anthropic from "@anthropic-ai/sdk";
import { anthropicCreate } from "./circuit-breaker";
import type { MarketSnapshot, ContrarianAgentOutput } from "./schemas";
import type { TrendAgentOutput, SMCAgentOutput } from "./schemas";

// ─────────────────────────────────────────────────────────────────────────────
// LLM Prompt
// ─────────────────────────────────────────────────────────────────────────────

const CONTRARIAN_SYSTEM = `You are the Contrarian Agent in a professional multi-agent trading terminal. Your job is to challenge the dominant thesis and identify where the primary setup FAILS.

You are a devil's advocate. The other agents are biased toward their setups. Your job is to poke holes.

WHAT TO LOOK FOR:
- Bull traps: price extended to premium zone with RSI overbought  -  smart money may distribute
- Bear traps: price oversold at discount zone  -  lows swept, reversal imminent
- False breakouts: large range candle with small body (wick rejection)  -  not genuine BOS
- Stop hunts: price near 52-week extremes  -  equal highs/lows are liquidity magnets
- HTF-LTF divergence: daily bias says one thing but intraday moving opposite
- Weak conviction: both trend and structure agents below 60%  -  no real edge
- Asia session unreliability: Asia moves often reverse at London open
- CHoCH uncertainty: structural shift in progress, counter-trap possible

Return ONLY valid JSON:
{
  "challengesBias": true|false,
  "trapType": "bull trap" | "bear trap" | "false breakout" | "stop hunt" | "htf-ltf divergence" | null,
  "trapConfidence": 0-100,
  "oppositeLiquidity": number | null,
  "failureReasons": ["reason1", "reason2", "reason3"],
  "alternativeScenario": "What happens if the primary thesis is WRONG  -  specific price action scenario",
  "riskFactor": 0-100
}`;

async function runLLMContrarian(
  client: Anthropic,
  snapshot: MarketSnapshot,
  trend: TrendAgentOutput,
  smc: SMCAgentOutput
): Promise<ContrarianAgentOutput> {
  const start = Date.now();
  const { price, structure, indicators } = snapshot;

  const msg = `
Challenge the primary thesis for ${snapshot.symbolDisplay} (${snapshot.symbol}).

PRIMARY THESIS TO CHALLENGE:
- Trend Agent says: ${trend.bias.toUpperCase()} at ${trend.confidence}% confidence
  Reasons: ${trend.reasons.slice(0, 2).join("; ")}
- Price Action says: ${smc.bias.toUpperCase()} at ${smc.confidence}% | Setup: ${smc.setupType}
  BOS detected: ${smc.bosDetected} | Sweep: ${smc.liquiditySweepDetected} | Zone: ${smc.premiumDiscount}

MARKET DATA:
- Price: ${price.current} | Change: ${price.changePercent > 0 ? "+" : ""}${price.changePercent.toFixed(2)}%
- High: ${price.high} | Low: ${price.low} | Day range: ${price.dayRange.toFixed(4)}
- RSI: ${indicators.rsi.toFixed(1)} | ATR: ${indicators.atrProxy.toFixed(2)}%
- Session: ${indicators.session}
- 52W position: ${structure.pos52w}% (${structure.zone}) | HTF: ${structure.htfBias} at ${structure.htfConfidence}%
- In premium: ${structure.inPremium} | In discount: ${structure.inDiscount}
- 52W High: ${structure.high52w} | 52W Low: ${structure.low52w}

Find the trap. Identify where the primary setup fails. Opposite liquidity level = where retail stops would be hunted.`.trim();

  const response = await anthropicCreate(client, {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: CONTRARIAN_SYSTEM,
    messages: [{ role: "user", content: msg }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    agentId: "contrarian",
    challengesBias: parsed.challengesBias,
    trapType: parsed.trapType,
    trapConfidence: parsed.trapConfidence,
    oppositeLiquidity: parsed.oppositeLiquidity,
    failureReasons: (parsed.failureReasons ?? []).slice(0, 4),
    alternativeScenario: parsed.alternativeScenario,
    riskFactor: Math.min(95, parsed.riskFactor ?? 20),
    processingTime: Date.now() - start,
  };
}

export async function runContrarianAgent(
  snapshot: MarketSnapshot,
  trend: TrendAgentOutput,
  smc: SMCAgentOutput,
  anthropicApiKey?: string
): Promise<ContrarianAgentOutput> {
  const start = Date.now();

  if (anthropicApiKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicApiKey });
      return await runLLMContrarian(client, snapshot, trend, smc);
    } catch (err) {
      console.warn("Contrarian Agent LLM fallback:", err);
    }
  }

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
        `Bull trap risk: price extended to PREMIUM zone (${current.toFixed(4)}) with RSI ${rsi.toFixed(0)}  -  smart money may distribute into retail longs`
      );
    }

    // Bear trap: price at discount + oversold + extended move down
    if (htfBias === "bearish" && inDiscount && rsi < 32) {
      trapType = "bear trap";
      riskFactor += 30;
      failureReasons.push(
        `Bear trap risk: price extended to DISCOUNT zone with RSI ${rsi.toFixed(0)}  -  liquidity below may have been swept, reversal potential`
      );
    }

    // False breakout: BOS detected but price immediately reversed
    if (smc.bosDetected && Math.abs(changePercent) > 0.6 && dayRange > 0) {
      const bodyRatio = Math.abs(current - price.open) / dayRange;
      if (bodyRatio < 0.4) {
        trapType = trapType ?? "false breakout";
        riskFactor += 20;
        failureReasons.push(
          `False breakout risk: large range (${dayRange.toFixed(4)}) with small body  -  long wick suggests rejection, not genuine BOS`
        );
      }
    }

    // Stop hunt: near 52-week extreme
    if (pos52w > 88) {
      trapType = trapType ?? "stop hunt";
      riskFactor += 15;
      failureReasons.push(
        `Stop hunt risk: price at ${pos52w}% of 52-week range  -  equal highs above ${structure.high52w.toFixed(4)} are a magnet for stop runs before reversal`
      );
      oppositeLiquidity = parseFloat((structure.high52w * 1.002).toFixed(4));
    }

    if (pos52w < 12) {
      trapType = trapType ?? "stop hunt";
      riskFactor += 15;
      failureReasons.push(
        `Stop hunt risk: price at ${pos52w}% of 52-week range  -  equal lows below ${structure.low52w.toFixed(4)} are a magnet for stop runs before reversal`
      );
      oppositeLiquidity = parseFloat((structure.low52w * 0.998).toFixed(4));
    }

    // Weak conviction: both bias agents below 60% confidence
    if (htfConfidence < 55 && trend.confidence < 55) {
      riskFactor += 20;
      failureReasons.push(
        `Weak conviction: HTF bias only ${htfConfidence}% and Trend only ${trend.confidence}%  -  insufficient edge for high-probability trade`
      );
    }

    // Timeframe divergence: HTF bullish but intraday trending down
    if (htfBias === "bullish" && changePercent < -0.4) {
      riskFactor += 15;
      failureReasons.push(
        `HTF-LTF divergence: daily bias bullish but intraday ${changePercent.toFixed(2)}%  -  possible distribution/manipulation before real move`
      );
    }
    if (htfBias === "bearish" && changePercent > 0.4) {
      riskFactor += 15;
      failureReasons.push(
        `HTF-LTF divergence: daily bias bearish but intraday +${changePercent.toFixed(2)}%  -  possible accumulation/manipulation before real breakdown`
      );
    }

    // Asia session unreliability
    if (session === "Asia") {
      riskFactor += 10;
      failureReasons.push(
        `Asia session trap: moves during Asia often reverse during London open  -  wait for London confirmation before committing`
      );
    }

    // CHoCH = structural uncertainty
    if (smc.chochDetected) {
      riskFactor += 15;
      failureReasons.push(
        `CHoCH active: structural shift in progress  -  counter-trend trap possible if CHoCH fails to develop into new BOS`
      );
    }

    // Opposite liquidity: where are retail stops on the other side?
    // Use an instrument-aware buffer instead of a fixed 0.5% (too large for forex, too small for BTC).
    // Gold: $1.5 buffer; forex: 0.15% of price; crypto/indices: 0.25% of price.
    if (oppositeLiquidity === null) {
      const liqBuf = snapshot.symbol === "XAUUSD" ? 1.5
        : snapshot.symbol === "XAGUSD" || snapshot.symbol === "XPTUSD" ? 0.08
        : current > 5000 ? current * 0.0025  // BTC, high-price indices
        : current > 100  ? current * 0.002   // indices, mid-price
        : current * 0.0015;                  // forex

      oppositeLiquidity = htfBias === "bullish"
        ? parseFloat((low * 0.995).toFixed(4))
        : htfBias === "bearish"
        ? parseFloat((high * 1.005).toFixed(4))
        : parseFloat(((high + low) / 2).toFixed(4));
    }

    // ── Contrarian Challenge ───────────────────────────────────────────────
    // Require riskFactor >= 50 AND a named trap type to avoid challenging on minor
    // aggregated signals (e.g., Asia session alone + mild HTF divergence shouldn't
    // be enough to challenge a well-supported primary thesis).
    const challengesBias = riskFactor >= 50 && trapType !== null;
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
      : `ALTERNATIVE: No clear bias  -  both sides of range are valid manipulation targets. Wait for definitive BOS before taking any directional trade.`;

    if (failureReasons.length === 0) {
      failureReasons.push(`No significant contrarian signals detected  -  primary thesis intact`);
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
