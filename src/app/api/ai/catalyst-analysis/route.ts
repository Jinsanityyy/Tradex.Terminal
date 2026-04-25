import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { headline, explanation, importance, affectedMarkets } = await req.json();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: "You are a trading analyst specializing in Gold (XAUUSD) and forex markets. Be direct and specific. No generic answers. Respond only with valid JSON.",
      messages: [{
        role: "user",
        content: `Analyze this market catalyst for Gold and forex traders:

Headline: "${headline}"
Context: "${explanation || ""}"
Importance: ${importance}
Affected: ${(affectedMarkets || []).join(", ")}

Return ONLY this JSON (no markdown):
{"whyItMatters":"2 sentences on why this moves markets","goldEffect":"specific effect on XAUUSD - bullish/bearish and why","usdEffect":"specific effect on USD - bullish/bearish and why","tradeBias":"1 sentence: what traders should do - buy/sell/wait and which asset","watchFor":"1 sentence: key price level or event to watch next"}`
      }]
    })
  });

  const data = await res.json();
  const text = (data.content?.[0]?.text ?? "{}").replace(/```json|```/g, "").trim();

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({
      whyItMatters: explanation || "Analysis unavailable.",
      goldEffect: "Monitor price action for directional bias.",
      usdEffect: "Watch USD pairs for reaction.",
      tradeBias: "Wait for confirmation before positioning.",
      watchFor: "Key support and resistance levels."
    });
  }
}
