/**
 * Agent 2 — SMC Agent (LLM-Powered)
 *
 * Analyzes Smart Money Concepts:
 * - BOS / CHoCH detection
 * - Order Block identification
 * - Fair Value Gap detection
 * - Liquidity sweep detection
 * - Premium / Discount zone assessment
 * - Probable liquidity targets
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

const SMC_SYSTEM_PROMPT = `You are an elite Smart Money Concepts (SMC) / ICT analyst. You think in terms of institutional order flow — not retail indicators.

Your job: analyze the provided market structure data and identify the highest-probability SMC setup.

RULES:
- BOS (Break of Structure): displacement candle breaking beyond last swing high/low with conviction
- CHoCH (Change of Character): structural shift — previous trend broken, new direction forming
- Order Block (OB): the last opposing candle before a displacement move (last bearish before rally = bullish OB; last bullish before drop = bearish OB)
- FVG (Fair Value Gap): imbalance between prevClose and current range that price will likely fill
- Liquidity sweep: price runs beyond equal highs/lows to grab retail stops before reversing
- Premium: above equilibrium — smart money sells here
- Discount: below equilibrium — smart money buys here

CRITICAL OUTPUT RULES:
- Respond with ONLY valid JSON, no markdown, no code blocks
- All price levels must be precise numbers based on the actual data provided
- Return null for levels you cannot identify with confidence
- Do not invent setups that don't exist in the data

Return exactly this JSON structure:
{
  "bias": "bullish" | "bearish" | "neutral",
  "confidence": 0-100,
  "setupType": "OB" | "FVG" | "BOS" | "CHoCH" | "Sweep" | "None",
  "setupPresent": true | false,
  "bosDetected": true | false,
  "chochDetected": true | false,
  "liquiditySweepDetected": true | false,
  "premiumDiscount": "PREMIUM" | "EQUILIBRIUM" | "DISCOUNT",
  "keyLevels": {
    "orderBlockHigh": <price or null>,
    "orderBlockLow": <price or null>,
    "fvgHigh": <price or null>,
    "fvgLow": <price or null>,
    "fvgMid": <price or null>,
    "liquidityTarget": <price or null>,
    "sweepLevel": <price or null>,
    "premiumZoneTop": <price or null>,
    "discountZoneBottom": <price or null>
  },
  "reasons": ["reason1", "reason2", "reason3"],
  "invalidationLevel": <price or null>
}`;

async function runLLMAnalysis(
  client: Anthropic,
  snapshot: MarketSnapshot
): Promise<SMCAgentOutput> {
  const start = Date.now();
  const { price, structure, indicators } = snapshot;

  const fvgHigh = price.current > price.prevClose
    ? null
    : price.prevClose;  // bearish FVG above
  const fvgLow = price.current < price.prevClose
    ? null
    : price.prevClose;  // bullish FVG below

  const eq = structure.equilibrium;
  const premiumTop = eq + (price.high - eq) * 0.5;
  const discountBottom = eq - (eq - price.low) * 0.5;

  const userMessage = `
Analyze ${snapshot.symbolDisplay} (${snapshot.symbol}) for SMC/ICT setup.

PRICE ACTION (${snapshot.timeframe}):
- Current: ${price.current} | Open: ${price.open} | High: ${price.high} | Low: ${price.low} | Prev Close: ${price.prevClose}
- Change: ${price.changePercent > 0 ? "+" : ""}${price.changePercent.toFixed(2)}% (${price.change > 0 ? "+" : ""}${price.change.toFixed(4)})
- Day range: ${price.dayRange.toFixed(4)} | Position in range: ${price.positionInDay}%

STRUCTURE:
- 52-week range: ${structure.low52w} – ${structure.high52w}
- 52w position: ${structure.pos52w}% (${structure.zone})
- Equilibrium: ${eq.toFixed(4)}
- Is in discount: ${structure.inDiscount} | Is in premium: ${structure.inPremium}
- HTF conviction: ${structure.htfBias.toUpperCase()} at ${structure.htfConfidence}%
- SMC context: ${structure.smcContext}

MOMENTUM:
- RSI(14): ${indicators.rsi.toFixed(1)}
- MACD hist proxy: ${indicators.macdHist > 0 ? "positive" : "negative"}
- Session: ${indicators.session}

IMBALANCE REFERENCES:
- Potential FVG above (bearish): ${fvgHigh?.toFixed(4) ?? "none"}
- Potential FVG below (bullish): ${fvgLow?.toFixed(4) ?? "none"}
- Premium zone top estimate: ${premiumTop.toFixed(4)}
- Discount zone bottom estimate: ${discountBottom.toFixed(4)}

IDENTIFY the most actionable SMC setup based on this data. Place precise price levels.
Return JSON only.`.trim();

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 900,
    system: SMC_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned);

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
// Rule-Based Fallback
// ─────────────────────────────────────────────────────────────────────────────

function runRuleBasedSMC(snapshot: MarketSnapshot): SMCAgentOutput {
  const start = Date.now();
  const { price, structure, indicators } = snapshot;

  const { htfBias, htfConfidence, zone, smcContext, inDiscount, inPremium, equilibrium, high52w, low52w } = structure;
  const { changePercent, current, high, low, prevClose } = price;

  // BOS detection from conviction smcContext
  const bosUp   = smcContext.includes("BOS to upside");
  const bosDown = smcContext.includes("BOS to downside");
  const bosDetected = bosUp || bosDown;

  // CHoCH: structural shift
  const chochDetected = smcContext.includes("CHoCH") || (
    (structure.pos52w > 65 && changePercent < -0.6) ||
    (structure.pos52w < 35 && changePercent > 0.6)
  );

  // Liquidity sweep: large intraday move that recovered (wick detection proxy)
  const range = high - low;
  const body  = Math.abs(current - price.open);
  const liquiditySweepDetected = range > 0 && (range - body) / range > 0.4 && Math.abs(changePercent) > 0.5;

  // Setup type priority: Sweep > BOS > CHoCH > OB/FVG > None
  let setupType: SetupType = "None";
  if (liquiditySweepDetected) setupType = "Sweep";
  else if (bosDetected) setupType = "BOS";
  else if (chochDetected) setupType = "CHoCH";
  else if (htfConfidence > 60) setupType = htfBias === "neutral" ? "None" : "OB";

  const setupPresent = setupType !== "None";

  // OB levels (simplified: last session's key levels)
  const obRange = current * 0.003; // 0.3% range for OB zone
  const obHigh = bosUp ? parseFloat((current - obRange * 0.5).toFixed(4)) : null;
  const obLow  = bosUp ? parseFloat((current - obRange * 1.5).toFixed(4)) : null;

  // FVG levels: imbalance between prevClose and intraday range
  const fvgGap = current - prevClose;
  const fvgHigh = fvgGap < 0 ? parseFloat(Math.max(current, prevClose).toFixed(4)) : null;
  const fvgLow  = fvgGap > 0 ? parseFloat(Math.min(current, prevClose).toFixed(4)) : null;
  const fvgMid  = (fvgHigh !== null && fvgLow !== null)
    ? parseFloat(((fvgHigh + fvgLow) / 2).toFixed(4))
    : null;

  // Liquidity targets: nearest equal highs/lows
  const nearHigh52 = structure.pos52w > 85;
  const nearLow52  = structure.pos52w < 15;
  const liquidityTarget = htfBias === "bullish"
    ? parseFloat((high * 1.005).toFixed(4))
    : parseFloat((low * 0.995).toFixed(4));

  const sweepLevel = liquiditySweepDetected
    ? htfBias === "bullish"
      ? parseFloat(low.toFixed(4))
      : parseFloat(high.toFixed(4))
    : null;

  const premiumZoneTop     = parseFloat((equilibrium + (high - equilibrium) * 0.6).toFixed(4));
  const discountZoneBottom = parseFloat((equilibrium - (equilibrium - low) * 0.6).toFixed(4));

  // Bias: follow HTF but adjust for current zone and setup
  let bias: DirectionalBias = htfBias;
  if (setupType === "Sweep") {
    // After sweep, expect reversal in opposite direction of sweep
    bias = htfBias; // follow structural bias
  }

  let confidence = htfConfidence;
  if (setupPresent && bosDetected) confidence = Math.min(95, confidence + 10);
  if (chochDetected) confidence = Math.min(90, confidence + 5);

  const reasons: string[] = [];

  if (bosUp)  reasons.push(`BOS to upside confirmed — displacement above ${prevClose.toFixed(4)}, institutional order flow bullish`);
  if (bosDown) reasons.push(`BOS to downside confirmed — displacement below ${prevClose.toFixed(4)}, institutional order flow bearish`);
  if (chochDetected) reasons.push(`CHoCH detected — structural trend shifting, monitor for new BOS confirmation`);
  if (liquiditySweepDetected) reasons.push(`Liquidity sweep detected — large wick indicates stop hunt, ${htfBias === "bullish" ? "buy-side" : "sell-side"} liquidity grabbed`);
  if (inDiscount) reasons.push(`Price at ${zone} (${current.toFixed(4)} < equilibrium ${equilibrium.toFixed(4)}) — institutional buy zone, OB/FVG long setups valid`);
  if (inPremium) reasons.push(`Price at ${zone} (${current.toFixed(4)} > equilibrium ${equilibrium.toFixed(4)}) — institutional sell zone, OB/FVG short setups valid`);
  if (nearHigh52) reasons.push(`Price near 52-week high (${structure.pos52w}% of range) — external liquidity above, sweep potential`);
  if (nearLow52)  reasons.push(`Price near 52-week low (${structure.pos52w}% of range) — external liquidity below, sweep potential`);

  if (reasons.length === 0) {
    reasons.push(`HTF ${htfBias} bias at ${htfConfidence}% conviction — awaiting structure confirmation`);
    reasons.push(`${zone} zone — ${zone === "PREMIUM" ? "sell pressure area" : zone === "DISCOUNT" ? "buy pressure area" : "neutral zone, no directional edge"}`);
    reasons.push(`No confirmed BOS/CHoCH — monitor for structural trigger before entering`);
  }

  const step = current > 1000 ? 5 : current > 100 ? 1 : 0.0005;
  const invalidationLevel = bias === "bullish"
    ? parseFloat((Math.floor(low * 0.998 / step) * step).toFixed(4))
    : bias === "bearish"
    ? parseFloat((Math.ceil(high * 1.002 / step) * step).toFixed(4))
    : null;

  return {
    agentId: "smc",
    bias,
    confidence: Math.round(confidence),
    setupType,
    setupPresent,
    keyLevels: {
      orderBlockHigh: obHigh,
      orderBlockLow: obLow,
      fvgHigh,
      fvgLow,
      fvgMid,
      liquidityTarget,
      sweepLevel,
      premiumZoneTop,
      discountZoneBottom,
    },
    premiumDiscount: zone,
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

export async function runSMCAgent(
  snapshot: MarketSnapshot,
  anthropicApiKey?: string
): Promise<SMCAgentOutput> {
  const start = Date.now();

  if (anthropicApiKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicApiKey });
      return await runLLMAnalysis(client, snapshot);
    } catch (err) {
      console.warn("SMC Agent LLM fallback:", err);
    }
  }

  // Rule-based fallback
  try {
    return runRuleBasedSMC(snapshot);
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
      reasons: ["SMC analysis failed — defaulting to neutral"],
      invalidationLevel: null,
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
