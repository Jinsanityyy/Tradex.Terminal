import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

export interface CandleAnalysisRequest {
  symbol: string;
  timeframe: string;
  candle: { t: number; o: number; h: number; l: number; c: number };
  context: { t: number; o: number; h: number; l: number; c: number }[];
}

export interface CandleAnalysisResult {
  symbol: string;
  timeframe: string;
  candleTime: string;
  candle: { o: number; h: number; l: number; c: number; changePercent: number };
  summary: string;
  technicals: string;
  newsContext: string;
  catalysts: string[];
  sentiment: "bullish" | "bearish" | "neutral";
  magnitude: "major" | "moderate" | "minor";
}

const SYSTEM_PROMPT = `You are an elite market analyst. Explain WHY a specific candle moved the way it did.

Given: symbol, timeframe, OHLC of the target candle, surrounding candles for context, and current macro headlines.

Respond with ONLY valid JSON:
{
  "summary": "1–2 sentence TL;DR of what drove this candle",
  "technicals": "2–3 sentence price-action breakdown: structure, imbalance, momentum, reversal or continuation",
  "newsContext": "2–3 sentence macro/fundamental context at that time",
  "catalysts": ["bullet 1", "bullet 2", "bullet 3"],
  "sentiment": "bullish" | "bearish" | "neutral",
  "magnitude": "major" | "moderate" | "minor"
}

Rules:
- Generic terms only — no proprietary strategy names
- Catalysts: max 4 bullets, each under 12 words
- If doji or small body: explain consolidation / indecision
- magnitude: major = body > 0.5%, moderate = 0.2–0.5%, minor = < 0.2%`;

export async function POST(req: NextRequest) {
  try {
    const body: CandleAnalysisRequest = await req.json();
    const { symbol, timeframe, candle, context } = body;

    if (!candle || !symbol) {
      return NextResponse.json({ error: "candle and symbol required" }, { status: 400 });
    }

    const changePct = ((candle.c - candle.o) / candle.o) * 100;
    const bodyPct   = Math.abs(changePct);
    const magnitude = bodyPct > 0.5 ? "major" : bodyPct > 0.2 ? "moderate" : "minor";
    const p         = candle.o > 100 ? 2 : 4;

    // News for macro context
    let newsHeadlines: string[] = [];
    try {
      const origin  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const newsRes = await fetch(`${origin}/api/market/news`, { cache: "no-store" });
      if (newsRes.ok) {
        const nd = await newsRes.json();
        newsHeadlines = (nd.data ?? []).slice(0, 8).map((n: any) => n.headline as string);
      }
    } catch { /* proceed without */ }

    const candleTime = new Date(candle.t * 1000).toISOString();
    const ctxStr = (context ?? []).map(b => {
      const pct    = ((b.c - b.o) / b.o * 100).toFixed(3);
      const marker = b.t === candle.t ? " ← TARGET" : "";
      return `  ${new Date(b.t * 1000).toUTCString().slice(0, 25)} | O:${b.o.toFixed(p)} H:${b.h.toFixed(p)} L:${b.l.toFixed(p)} C:${b.c.toFixed(p)} (${pct}%)${marker}`;
    }).join("\n");

    const userPrompt = `
Symbol: ${symbol}
Timeframe: ${timeframe}
Target candle: ${new Date(candle.t * 1000).toUTCString().slice(0, 25)}
OHLC: O=${candle.o.toFixed(p)} H=${candle.h.toFixed(p)} L=${candle.l.toFixed(p)} C=${candle.c.toFixed(p)} (${changePct > 0 ? "+" : ""}${changePct.toFixed(3)}%)

Surrounding candles:
${ctxStr || "No context provided"}

Current macro headlines:
${newsHeadlines.length > 0 ? newsHeadlines.map(h => `• ${h}`).join("\n") : "• No headlines available"}

Explain why this candle moved. Return JSON only.
`.trim();

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GOOGLE_AI_API_KEY not configured" }, { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 700, temperature: 0.3 },
    });

    const raw     = result.response.text();
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: any;
    try { parsed = JSON.parse(cleaned); }
    catch { return NextResponse.json({ error: "AI parse failed", raw }, { status: 500 }); }

    return NextResponse.json({
      symbol, timeframe, candleTime,
      candle: { o: candle.o, h: candle.h, l: candle.l, c: candle.c, changePercent: parseFloat(changePct.toFixed(3)) },
      summary:     parsed.summary     ?? "",
      technicals:  parsed.technicals  ?? "",
      newsContext: parsed.newsContext  ?? "",
      catalysts:   Array.isArray(parsed.catalysts) ? parsed.catalysts : [],
      sentiment:   parsed.sentiment   ?? "neutral",
      magnitude:   parsed.magnitude   ?? magnitude,
    } satisfies CandleAnalysisResult);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Keep GET for backwards compat — just return instructions
export async function GET() {
  return NextResponse.json({ message: "Use POST with { symbol, timeframe, candle, context }" });
}
