import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const tavilyKey  = process.env.TAVILY_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const result: Record<string, unknown> = {
    TAVILY_API_KEY:    tavilyKey  ? `set (${tavilyKey.slice(0, 6)}...)` : "MISSING",
    ANTHROPIC_API_KEY: anthropicKey ? `set (${anthropicKey.slice(0, 10)}...)` : "MISSING",
    tavilyTest: null,
    claudeTest: null,
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

  // Test Claude
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 20,
          messages: [{ role: "user", content: "Say OK" }],
        }),
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      result.claudeTest = { status: res.status, ok: res.ok, response: body.content?.[0]?.text ?? null, error: body.error?.message ?? null };
    } catch (e) {
      result.claudeTest = { error: String(e) };
    }
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
