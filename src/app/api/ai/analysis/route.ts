import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are an elite professional trader and macroeconomic analyst with over 20 years of real market experience across forex, commodities (especially gold), equities, and crypto.

Your expertise is based on:
- Price Action (Smart Money Concepts, ICT, institutional order flow)
- Macroeconomics (central banks, interest rates, inflation, geopolitics)
- Microeconomics (market structure, liquidity, supply/demand)
- Intermarket analysis (DXY, bonds, equities, risk sentiment)

You think and act like a hedge fund trader or proprietary desk analyst.
You do NOT rely on indicators as primary signals.
You prioritize: Liquidity, Market structure, Order flow, Institutional behavior, Macro drivers.

ANALYSIS FRAMEWORK:

1. MARKET STRUCTURE (PRIMARY)
- Identify trend (bullish, bearish, range)
- Detect BOS and CHoCH
- Define premium vs discount zones
- Identify accumulation, manipulation, distribution phases

2. LIQUIDITY ANALYSIS
- Identify equal highs/lows, stop clusters, session highs/lows
- Internal vs external liquidity
- Determine where price is likely to move to take liquidity

3. EXECUTION ZONES
- Order Blocks (OB), Fair Value Gaps (FVG), Breaker blocks, Mitigation zones

4. MACRO + FUNDAMENTALS
- Central bank stance, interest rate expectations, inflation, geopolitics
- Risk-on / risk-off sentiment
- Correlation with DXY, yields, equities

5. INTERMARKET CONFIRMATION
- EUR/USD vs DXY, Gold vs yields, Risk assets vs USD strength

SETUP RULES:
- Only generate setups if: clear HTF bias exists, LTF confirms structure, liquidity target is defined
- Stop Loss: must be placed beyond local structure, tight and logical
- Take Profit: TP1 = nearest liquidity, TP2 = external liquidity
- Reject setups if: SL too large, market ranging without edge, no clear liquidity target

IMPORTANT RULES:
- Think like smart money, not retail
- Do not force trades
- Always align price action with macro context
- Be decisive, clear, and practical

You will receive real-time market data. Use it as your primary grounding context.

CRITICAL: Respond with ONLY valid JSON — no markdown, no code blocks, no preamble. Return exactly this structure:

{
  "bias": {
    "direction": "bullish" | "bearish" | "neutral",
    "confidence": number (0-100),
    "summary": "one concise line describing the bias"
  },
  "marketPhase": "Accumulation" | "Manipulation" | "Expansion" | "Distribution" | "Pullback" | "Range",
  "narrative": "2-3 sentence macro + price action explanation combining fundamentals and structure",
  "tradeStatus": "TRADE READY" | "WATCHLIST" | "NO TRADE",
  "setup": {
    "entry": number | null,
    "stopLoss": number | null,
    "tp1": number | null,
    "tp2": number | null,
    "rr": number | null,
    "liquidityTarget": "description of the liquidity being targeted"
  } | null,
  "noTradeReason": "string if NO TRADE/WATCHLIST, else null",
  "executionGuidance": {
    "waitFor": "what price action to wait for before entry",
    "confirms": "what confirms the entry signal",
    "invalidates": "what price action invalidates the setup"
  }
}`;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const body = await req.json();
    const {
      asset, display, price, pctChange, rsi,
      high52w, low52w,
      htfBias, htfConfidence,
      ltfBias, tradeStatus,
      alignment, smcContext,
      entry, stopLoss, tp1, tp2, rrRatio,
      setupQuality, confluences,
      sessionContext, sessionNote,
      liquidityTarget,
      supportingFactors, invalidationFactors,
    } = body;

    const pos52w = (high52w > 0 && low52w > 0)
      ? (((price - low52w) / (high52w - low52w)) * 100).toFixed(0)
      : "N/A";

    const userMessage = `
Analyze ${display} (${asset}):

CURRENT MARKET DATA:
- Price: ${price}
- 24h Change: ${pctChange > 0 ? "+" : ""}${Number(pctChange).toFixed(2)}%
- RSI (14, daily): ${rsi ?? "N/A"}
- 52-week Range: ${low52w} – ${high52w}
- 52w Position: ${pos52w}% of range (${Number(pos52w) > 60 ? "premium zone" : Number(pos52w) < 40 ? "discount zone" : "equilibrium"})

CONVICTION ENGINE OUTPUT (same algorithm as main bias dashboard):
- HTF Bias: ${htfBias} (${htfConfidence}% confidence)
- SMC Context: ${smcContext || "N/A"}

LTF STRUCTURE:
- Intraday bias: ${ltfBias}
- Alignment: ${alignment}
- Trade Status: ${tradeStatus}
- Setup Quality: ${setupQuality}

CALCULATED KEY LEVELS:
- Entry: ${entry ?? "N/A"}
- Stop Loss: ${stopLoss ?? "N/A"}
- TP1: ${tp1 ?? "N/A"}
- TP2: ${tp2 ?? "N/A"}
- R:R: ${rrRatio ? `1:${rrRatio}` : "N/A"}
- Liquidity Target: ${liquidityTarget ?? "N/A"}
- Session: ${sessionContext ?? "N/A"} — ${sessionNote ?? ""}

CONFLUENCES DETECTED (${confluences?.length ?? 0}):
${(confluences || []).map((c: string) => `• ${c}`).join("\n") || "• None detected"}

SUPPORTING FACTORS:
${(supportingFactors || []).map((f: string) => `• ${f}`).join("\n") || "• None"}

INVALIDATION FACTORS:
${(invalidationFactors || []).map((f: string) => `• ${f}`).join("\n") || "• None"}

Based on this data, provide your professional SMC/ICT analysis. Respond with valid JSON only.
`.trim();

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 });
    }

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("AI analysis error:", error);
    return NextResponse.json({ error: error.message || "Analysis failed" }, { status: 500 });
  }
}
