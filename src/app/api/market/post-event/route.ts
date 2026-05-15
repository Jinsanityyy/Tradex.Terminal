import { NextRequest, NextResponse } from "next/server";

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
  const { searchParams } = new URL(req.url);
  const title   = searchParams.get("title")   ?? "";
  const summary = searchParams.get("summary") ?? "";
  const markets = searchParams.get("markets") ?? "";

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const prompt = `You are a senior institutional macro analyst writing POST-EVENT analysis for traders. This event has ALREADY HAPPENED.

Event: "${title}"
News Context: "${summary?.slice(0, 500) || "No additional context"}"
Affected Markets: ${markets || "XAUUSD, DXY, US10Y"}

Write SPECIFIC post-event analysis  -  not a generic explanation of what this event type means. Analyze what actually occurred, what was said, and how markets should react.

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
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json();
    const text = (data.content?.[0]?.text ?? "").replace(/```json|```/g, "").trim();
    const parsed: PostEventAnalysis = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[post-event]", err);
    return NextResponse.json({ error: "analysis failed" }, { status: 500 });
  }
}
