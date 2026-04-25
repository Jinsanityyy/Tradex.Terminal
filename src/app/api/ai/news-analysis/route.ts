import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { title, explanation, affectedMarkets, importance } = await req.json();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: `You are a professional macro market analyst. Your job is to explain market-moving news in clear, structured language. 
Focus on connecting: Event → Why Markets Care → Asset Impact → Risk.
Be specific. No generic filler. No trading signals. No technical analysis.
Respond only with valid JSON.`,
      messages: [{
        role: "user",
        content: `Analyze this market news for retail forex/gold traders:

Headline: "${title}"
Context: "${explanation || ""}"
Importance: ${importance}
Affected: ${(affectedMarkets || []).join(", ")}

Return ONLY this JSON structure (no markdown, no backticks):
{
  "whatHappened": "1-2 sentences. Pure facts. What exactly happened.",
  "whyItMatters": "2-3 sentences. Macroeconomic significance. Why markets care about this.",
  "assets": {
    "gold": { "bias": "bullish|bearish|neutral", "reason": "1 sentence why gold moves this direction" },
    "usd": { "bias": "bullish|bearish|neutral", "reason": "1 sentence why USD moves this direction" },
    "stocks": { "bias": "bullish|bearish|neutral", "reason": "1 sentence why equities react this way" },
    "oil": { "bias": "bullish|bearish|neutral", "reason": "1 sentence why oil is affected or not" }
  },
  "riskScenario": "1-2 sentences. What could invalidate or reverse this move."
}`
      }]
    })
  });

  const data = await res.json();
  const text = (data.content?.[0]?.text ?? "{}").replace(/```json|```/g, "").trim();

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json(null);
  }
}
