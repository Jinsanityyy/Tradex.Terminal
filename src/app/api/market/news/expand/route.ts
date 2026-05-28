import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { headline, summary, category, sentiment, goldReasoning, usdReasoning, affectedAssets } = body;

    if (!headline) {
      return NextResponse.json({ error: "Missing headline" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    const assetList = Array.isArray(affectedAssets) && affectedAssets.length
      ? affectedAssets.join(", ")
      : "Gold, USD";

    const prompt = `You are a professional forex and commodities analyst writing for active traders. Given this news headline, write a 3-paragraph market analysis.

HEADLINE: ${headline}
${summary ? `SUMMARY: ${summary}` : ""}
CATEGORY: ${category || "general"}
SENTIMENT: ${sentiment || "neutral"}
AFFECTED MARKETS: ${assetList}
${goldReasoning ? `GOLD CONTEXT: ${goldReasoning}` : ""}
${usdReasoning ? `USD CONTEXT: ${usdReasoning}` : ""}

Write exactly 3 short paragraphs (2-3 sentences each):
1. What happened and why it matters
2. Market implications — which assets move, in which direction, and why
3. What to watch next — key levels, follow-up events, invalidation signals

Plain prose only. No headers, no bullets. Be specific about price behavior.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";

    if (!text || text.length < 50) {
      return NextResponse.json({ error: "No content generated" }, { status: 500 });
    }

    return NextResponse.json({ body: text }, {
      headers: { "Cache-Control": "public, max-age=1800" },
    });
  } catch (err) {
    console.error("[news/expand]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
