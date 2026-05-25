import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const geminiKey = process.env.GOOGLE_AI_API_KEY;

  const result: Record<string, unknown> = {
    TAVILY_API_KEY:    tavilyKey  ? `set (${tavilyKey.slice(0, 6)}...)` : "MISSING",
    GOOGLE_AI_API_KEY: geminiKey  ? `set (${geminiKey.slice(0, 6)}...)` : "MISSING",
    tavilyTest: null,
    geminiTest: null,
  };

  // Test Tavily
  if (tavilyKey) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${tavilyKey}`,
        },
        body: JSON.stringify({ query: "gold price today", search_depth: "basic", max_results: 1 }),
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      result.tavilyTest = { status: res.status, ok: res.ok, resultCount: body.results?.length ?? 0, error: body.detail ?? body.error ?? null };
    } catch (e) {
      result.tavilyTest = { error: String(e) };
    }
  }

  // Test Gemini
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Say OK" }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
          cache: "no-store",
        }
      );
      const body = await res.json().catch(() => ({}));
      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      result.geminiTest = { status: res.status, ok: res.ok, response: text, error: body?.error?.message ?? null };
    } catch (e) {
      result.geminiTest = { error: String(e) };
    }
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
