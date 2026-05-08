import { NextRequest, NextResponse } from "next/server";

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

const SYSTEM_PROMPT = `You are an elite market analyst with deep knowledge of macroeconomics, geopolitics, and price action. Explain WHY a specific candle moved the way it did.

Respond with ONLY valid JSON — no markdown, no code fences:
{
  "summary": "1–2 sentence TL;DR of what drove this candle",
  "technicals": "2–3 sentence price-action breakdown: structure, imbalance, momentum, reversal or continuation",
  "newsContext": "2–3 sentences of macro/fundamental context using your training knowledge of Fed policy, USD dynamics, geopolitical risk, inflation data, and safe-haven demand around that date. NEVER leave this empty.",
  "catalysts": ["bullet 1", "bullet 2", "bullet 3"],
  "sentiment": "bullish",
  "magnitude": "major"
}

Rules:
- sentiment: exactly one of bullish, bearish, neutral
- magnitude: exactly one of major, moderate, minor (major = body > 0.5%, moderate = 0.2–0.5%, minor = < 0.2%)
- catalysts: max 4 bullets, each under 12 words
- newsContext REQUIRED — use training knowledge if no headlines provided
- For XAUUSD: consider Fed policy, USD strength, geopolitical risk, inflation, central bank buying`;

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("No GOOGLE_AI_API_KEY");

  // Try models across both API versions
  const attempts = [
    { version: "v1",     model: "gemini-2.0-flash" },
    { version: "v1",     model: "gemini-1.5-flash" },
    { version: "v1beta", model: "gemini-2.5-flash-preview-05-20" },
    { version: "v1beta", model: "gemini-2.0-flash" },
    { version: "v1beta", model: "gemini-2.0-flash-lite" },
    { version: "v1",     model: "gemini-1.5-pro" },
  ];

  let lastErr = "No model succeeded";
  for (const { version, model } of attempts) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 700, temperature: 0.3 },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        lastErr = `[${version}/${model}] ${data?.error?.message ?? `HTTP ${res.status}`}`;
        continue;
      }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      lastErr = `[${version}/${model}] empty response`;
    } catch (e: any) {
      lastErr = `[${version}/${model}] ${e?.message ?? String(e)}`;
    }
  }
  throw new Error(lastErr);
}

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

    const userPrompt = `Symbol: ${symbol}
Timeframe: ${timeframe}
Target candle: ${new Date(candle.t * 1000).toUTCString().slice(0, 25)}
OHLC: O=${candle.o.toFixed(p)} H=${candle.h.toFixed(p)} L=${candle.l.toFixed(p)} C=${candle.c.toFixed(p)} (${changePct > 0 ? "+" : ""}${changePct.toFixed(3)}%)

Surrounding candles:
${ctxStr || "No context provided"}

Current macro headlines:
${newsHeadlines.length > 0 ? newsHeadlines.map(h => `• ${h}`).join("\n") : "• No headlines available — use training knowledge of macro events near this date"}

Explain why this candle moved. Return JSON only.`;

    let raw: string;
    try {
      raw = await callGemini(userPrompt);
    } catch (e: any) {
      return NextResponse.json({ error: "Gemini unavailable", geminiError: e?.message ?? String(e) }, { status: 503 });
    }

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

export async function GET() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "GOOGLE_AI_API_KEY is not set in environment variables" });
  }
  try {
    const result = await callGemini("Reply with exactly this JSON: {\"test\":\"ok\"}");
    return NextResponse.json({ ok: true, keyPresent: true, geminiResponse: result.slice(0, 200) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, keyPresent: true, error: e?.message ?? String(e) });
  }
}
