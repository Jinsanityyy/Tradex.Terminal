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

// Optional LLM narration — rewrites failureReasons + alternativeScenario only.
// The deterministic trap detection (challengesBias / riskFactor / trapType) is authoritative.
async function narrateContrarian(
  client: Anthropic,
  snapshot: MarketSnapshot,
  trend: TrendAgentOutput,
  smc: SMCAgentOutput,
  computed: ContrarianAgentOutput
): Promise<{ failureReasons: string[]; alternativeScenario: string } | null> {
  const sys = `You are the Contrarian Agent for a trade terminal. The risk assessment has ALREADY been decided deterministically. Write 3-4 concise reasons that support the GIVEN trap assessment, plus a one-line alternative scenario. Do NOT change the verdict. Return ONLY JSON: {"failureReasons":[...],"alternativeScenario":"..."}.`;
  const msg = `
DECIDED: challengesBias=${computed.challengesBias} | trap=${computed.trapType ?? "none"} | riskFactor=${computed.riskFactor}/100
Primary thesis: Trend ${trend.bias.toUpperCase()} @ ${trend.confidence}%, PA ${smc.bias.toUpperCase()} @ ${smc.confidence}%
${snapshot.symbolDisplay} ${snapshot.price.current} | RSI ${snapshot.indicators.rsi.toFixed(0)} | 52W pos ${snapshot.structure.pos52w}% | Zone ${snapshot.structure.zone} | Session ${snapshot.indicators.session}
Return JSON only.`.trim();

  const response = await anthropicCreate(client, {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: sys,
    messages: [{ role: "user", content: msg }],
  });
  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned);
  if (Array.isArray(parsed?.failureReasons) && parsed.failureReasons.length > 0 && typeof parsed.alternativeScenario === "string") {
    return { failureReasons: parsed.failureReasons.slice(0, 4), alternativeScenario: parsed.alternativeScenario };
  }
  return null;
}

export async function runContrarianAgent(
  snapshot: MarketSnapshot,
  trend: TrendAgentOutput,
  smc: SMCAgentOutput,
  anthropicApiKey?: string
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

    const result: ContrarianAgentOutput = {
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

    // Optional LLM narration — rewrites failureReasons + alternativeScenario only.
    if (anthropicApiKey) {
      try {
        const client = new Anthropic({ apiKey: anthropicApiKey });
        const narrated = await narrateContrarian(client, snapshot, trend, smc, result);
        if (narrated) {
          result.failureReasons = narrated.failureReasons;
          result.alternativeScenario = narrated.alternativeScenario;
          result.processingTime = Date.now() - start;
        }
      } catch (err) {
        console.warn("[contrarian-agent] narration failed, using deterministic reasons:", err);
      }
    }

    return result;
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
