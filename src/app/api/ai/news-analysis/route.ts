import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { title, explanation, affectedMarkets, importance, forecast, previous, actual, status, source } = await req.json();

  // Detect event type for analysis framing
  const t = (title || "").toLowerCase();
  const isSpeech = t.includes("speak") || t.includes("testimony") || t.includes("conference") || t.includes("remarks");
  const isEconData = forecast !== undefined || previous !== undefined;
  const hasActual = actual && actual !== "—" && actual !== "";
  const analysisType = hasActual ? "POST-EVENT ANALYSIS" : isEconData ? "PRE-EVENT WATCH" : "MARKET IMPACT ANALYSIS";

  // Build context string for AI
  const dataContext = isEconData
    ? `\nEconomic Data: Forecast=${forecast || "—"} | Previous=${previous || "—"} | Actual=${hasActual ? actual : "not yet released"}`
    : "";
  const statusContext = status ? `\nEvent status: ${status}` : "";
  const sourceContext = source ? `\nSource: ${source}` : "";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system: `You are a senior macro market analyst at a trading desk. You write fundamental market analysis — not trading signals, not technical analysis, not SMC.

RULES:
- Analyze the SPECIFIC event. Never use generic copy-paste explanations.
- German sentiment → explain Eurozone growth, EUR weakness, ECB implications
- UK retail sales → explain consumer strength, GBP, BoE expectations  
- Fed speaks → hawkish vs dovish outcomes, USD, rates, gold, indices
- Iran/war/geopolitical → differentiate: oil supply, safe-haven, not everything is gold-bullish
- CPI/inflation → rates, currency strength, gold as inflation hedge
- NFP/jobs → growth signal, Fed expectations, USD
- Only include assets that are ACTUALLY affected by this specific event
- Be specific about countries, currencies, economic mechanisms
- Use clear plain language — no jargon, no SMC, no setup talk
- Respond only with valid JSON`,
      messages: [{
        role: "user",
        content: `Analyze this market event:

Title: "${title}"
Context: "${explanation || ""}"
Importance: ${importance}
Affected markets: ${(affectedMarkets || []).join(", ") || "not specified"}${dataContext}${statusContext}${sourceContext}

Analysis type needed: ${analysisType}

Return ONLY this JSON (no markdown):
{
  "analysisType": "${analysisType}",
  "mainAnalysis": "3-5 sentences. Answer: what happened, why markets care, what macro factor is at play (growth/inflation/rates/risk/supply/currency), what this means for financial markets. Be specific to THIS event.",
  "nowWatch": [
    "Specific thing #1 traders should watch after this (asset + what to look for)",
    "Specific thing #2",
    "Specific thing #3",
    "Specific thing #4 (optional, only if relevant)",
    "Specific thing #5 (optional, only if relevant)"
  ],
  "assets": [
    {
      "name": "e.g. Gold, USD, EUR, GBP, Oil, S&P 500 — only include genuinely affected assets",
      "ticker": "e.g. XAUUSD, DXY, EURUSD, GBPUSD, USOIL, SPX",
      "bias": "Bullish | Bearish | Neutral | Mixed",
      "context": "3-4 sentences explaining specifically WHY this asset is affected by THIS event. Include the mechanism: rate expectations, safe-haven demand, growth signal, currency flows, energy supply, etc."
    }
  ],
  "confirmationNote": "1-2 sentences: what confirms this interpretation is correct, and what would invalidate or reverse it."
}`
      }]
    })
  });

  const data = await res.json();
  const raw = data.content?.[0]?.text ?? "";
  const text = raw.replace(/```json[\s\S]*?```/g, (m: string) => m.slice(7, -3)).replace(/```/g, "").trim();

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json(null);
  }
}
