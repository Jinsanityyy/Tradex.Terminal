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
      max_tokens: 1000,
      system: `You are a professional macro market analyst writing fundamental analysis for traders.

CRITICAL RULES:
- Analyze the SPECIFIC headline. Do not apply generic geopolitical templates.
- If the headline is about German sentiment, analyze German/Eurozone economics.
- If the headline is about UK retail sales, analyze GBP and consumer demand.
- If the headline is about Fed policy, analyze USD and rate expectations.
- If the headline is about oil supply, analyze energy markets first.
- Gold is NOT always the main asset. Only include it if genuinely relevant.
- Each response must be unique to the specific event — never copy a template.
- Do not mention SMC, technical analysis, or trading setups.
- Write like a macro analyst at a bank or hedge fund.
- Be specific about regions, currencies, and economic mechanisms involved.

Respond only with valid JSON. No markdown.`,
      messages: [{
        role: "user",
        content: `Analyze this specific news event for traders:

Headline: "${title}"
Additional context: "${explanation || "none"}"
Importance: ${importance}
Markets mentioned: ${(affectedMarkets || []).join(", ") || "none specified"}

Produce a unique, specific analysis of THIS headline. Do not use generic templates.

Return ONLY this JSON (no markdown backticks):
{
  "eventOverview": "2-3 sentences explaining what this headline actually means in plain language. Be specific to this event.",
  "whyMarketsCare": "2-3 sentences on the macro mechanism. Connect this specific event to growth/inflation/rates/sentiment/supply. Be specific to this headline's topic.",
  "assets": [
    {
      "name": "Asset name (e.g. Gold, USD, EUR, GBP, Oil, S&P 500, DAX — only include RELEVANT ones)",
      "bias": "Bullish | Bearish | Neutral | Mixed",
      "explanation": "2-4 sentences explaining the specific causal chain from THIS event to this asset's movement. Be concrete."
    }
  ],
  "marketLogic": "2-3 sentences describing the full cause-and-effect chain: this specific event → macro interpretation → investor reaction → asset movement.",
  "conditions": "1-2 sentences on when this analysis is valid and what could change it."
}`
      }]
    })
  });

  const data = await res.json();
  const raw = data.content?.[0]?.text ?? "";
  const text = raw.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    // Return null so frontend shows fallback
    return NextResponse.json(null);
  }
}
