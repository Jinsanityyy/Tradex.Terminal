import { NextRequest, NextResponse } from "next/server";
import { llmCreate, llmAvailable } from "@/lib/agents/llm-provider";
import { requirePro } from "@/lib/auth/entitlement";

export const dynamic = "force-dynamic";

export interface PostEventAnalysis {
  outcome: string;
  statementHighlights: string[];
  marketReaction: string;
  goldImpact: "bullish" | "bearish" | "neutral";
  goldAnalysis: string;
  usdImpact: "bullish" | "bearish" | "neutral";
  usdAnalysis: string;
  traderFocus: string[];
  timeframe: string;
}

export async function GET(req: NextRequest) {
  const gate = await requirePro(req);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const title   = searchParams.get("title")   ?? "";
  const summary = searchParams.get("summary") ?? "";
  const markets = searchParams.get("markets") ?? "";

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  if (!llmAvailable()) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  // When the release time has passed but no confirmed figure reached the feed, the
  // model must not invent one  -  and must never call an unknown result "in line".
  const actualMissing = /ACTUAL NOT PUBLISHED|not yet published/i.test(summary);

  const pendingRules = actualMissing
    ? `
CRITICAL  -  THE ACTUAL FIGURE IS NOT AVAILABLE:
The scheduled release time has passed but no confirmed print has reached the data feed. You do NOT know the result.
- NEVER state or imply a result. Do not say the print was in line, a beat, a miss, hawkish or dovish.
- NEVER invent a number, a quote, or statement language.
- Set "outcome" to state plainly that the confirmed figure has not published yet, then give the consensus expectation.
- Set BOTH "goldImpact" and "usdImpact" to "neutral"  -  there is no confirmed data to take a side on.
- Frame "marketReaction", "goldAnalysis" and "usdAnalysis" around PRICE ACTION: what Gold and DXY doing now, relative to where they traded just before the release, implies about the print.
- "statementHighlights" and "traderFocus" must be things to WATCH FOR, not things that happened.
`
    : `
The actual figure IS available in the context above. Analyse the real surprise against forecast. Only describe the print as in line when the actual genuinely equals the forecast.
`;

  const prompt = `You are a senior institutional macro analyst writing POST-EVENT analysis for traders. This event has ALREADY HAPPENED.

Event: "${title}"
News Context: "${summary?.slice(0, 700) || "No additional context"}"
Affected Markets: ${markets || "XAUUSD, DXY, US10Y"}
${pendingRules}
Write SPECIFIC post-event analysis  -  not a generic explanation of what this event type means. Analyze what actually occurred, what was said, and how markets should react. Never fabricate data you were not given.

Return ONLY valid JSON (no markdown):
{
  "outcome": "One sentence stating the actual decision/result (e.g. 'Fed held rates at 4.25-4.50%, Powell signaled patience with no urgency to cut')",
  "statementHighlights": [
    "Specific key point or quote from the statement/speech (be specific to THIS event)",
    "Another specific highlight (tone, language, forward guidance)",
    "Third highlight (market implications stated or implied)",
    "Fourth highlight if relevant (data references, risks mentioned)"
  ],
  "marketReaction": "2-3 sentences on how gold, USD, and rates moved or are likely moving in reaction to this specific outcome",
  "goldImpact": "bullish|bearish|neutral",
  "goldAnalysis": "2 sentences: how gold reacted to this specific outcome and what the trade setup is now",
  "usdImpact": "bullish|bearish|neutral",
  "usdAnalysis": "2 sentences: how USD moved on this and what comes next for DXY",
  "traderFocus": [
    "Specific thing traders should monitor now (price level, data, next event)",
    "Second actionable focus point",
    "Third follow-up catalyst or confirmation to watch"
  ],
  "timeframe": "Near-term directional bias and expected duration (e.g. '1-3 session USD strength, then watch for reversal if data misses')"
}`;

  try {
    const msg = await llmCreate({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (msg.content[0]?.type === "text" ? msg.content[0].text : "").replace(/```json|```/g, "").trim();
    const parsed: PostEventAnalysis = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[post-event]", err);
    return NextResponse.json({ error: "analysis failed" }, { status: 500 });
  }
}
