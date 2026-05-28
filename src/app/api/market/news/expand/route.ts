import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { headline, summary, category, sentiment, goldReasoning, usdReasoning, affectedAssets } = body;

    if (!headline) {
      return NextResponse.json({ error: "Missing headline" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
    }

    const assetList = Array.isArray(affectedAssets) && affectedAssets.length
      ? affectedAssets.join(", ")
      : "Gold, USD";

    const prompt = `You are a professional forex and commodities market analyst writing for active traders. Given this news headline, write a concise 3-paragraph market analysis. Focus on what this means for prices and trading.

HEADLINE: ${headline}
${summary ? `SUMMARY: ${summary}` : ""}
CATEGORY: ${category || "general"}
SENTIMENT: ${sentiment || "neutral"}
AFFECTED MARKETS: ${assetList}
${goldReasoning ? `GOLD CONTEXT: ${goldReasoning}` : ""}
${usdReasoning ? `USD CONTEXT: ${usdReasoning}` : ""}

Write exactly 3 paragraphs:
1. What happened and the immediate market reaction
2. Why this matters for traders — macro implications, affected assets, key levels to watch
3. What to watch next — upcoming catalysts, confirmation signals, risk factors

Keep each paragraph 2-3 sentences. Write in plain prose, no headers, no bullet points. Be specific about price behavior and trading implications.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
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
