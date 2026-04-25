import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { headline: title, explanation, importance, affectedMarkets, newsContext } = await req.json();

  const contextStr = newsContext ? `
News Agent Context:
- Overall market regime: ${newsContext.regime}
- Overall impact: ${newsContext.overallImpact}
- Risk score: ${newsContext.riskScore}/100
- Dominant catalyst: ${newsContext.dominantCatalyst}
- Agent's direction on this: ${newsContext.agentDirection ?? "not matched"}
- Agent reasons: ${newsContext.reasons?.slice(0,3).join("; ")}
- Bias changers: ${newsContext.biasChangers?.slice(0,2).join("; ")}` : "";

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
      system: "You are a trading analyst for Gold (XAUUSD) and forex. Use the News Agent context to give informed, specific analysis. Be direct. No generic answers. Valid JSON only.",
      messages: [{
        role: "user",
        content: `Analyze this catalyst using our 7-agent system's News Agent data:

Headline: "${title}"
Context: "${explanation || ""}"
Importance: ${importance}
Affected: ${(affectedMarkets || []).join(", ")}
${contextStr}

Return ONLY this JSON:
{"whyItMatters":"2 sentences why this moves Gold/forex markets specifically","goldEffect":"XAUUSD direction (bullish/bearish/neutral) and exact reason","usdEffect":"USD direction and exact reason","tradeBias":"What traders should do: buy/sell/wait Gold or USD and why","watchFor":"Specific level or event to watch"}`
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
      goldEffect: "Monitor XAUUSD price action.",
      usdEffect: "Watch USD pairs for reaction.",
      tradeBias: "Wait for confirmation before positioning.",
      watchFor: "Key support and resistance levels."
    });
  }
}
