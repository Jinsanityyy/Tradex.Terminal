import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export interface MacroContextResult {
  symbol:      string;
  summary:     string;
  keyDrivers:  string[];
  sentiment:   "bullish" | "bearish" | "neutral";
  headlines:   string[];
  generatedAt: string;
  cached:      boolean;
}

// Maps our symbols to human-readable asset names + targeted Tavily search query
const SYMBOL_META: Record<string, { asset: string; query: string }> = {
  XAUUSD: { asset: "Gold (XAU/USD)",          query: "gold XAU/USD price macro drivers Fed dollar inflation geopolitical risk today" },
  XAGUSD: { asset: "Silver (XAG/USD)",         query: "silver XAG/USD price macro drivers inflation industrial demand today" },
  BTCUSD: { asset: "Bitcoin (BTC/USD)",        query: "bitcoin BTC price macro drivers institutional demand crypto sentiment today" },
  ETHUSD: { asset: "Ethereum (ETH/USD)",       query: "ethereum ETH price crypto macro sentiment DeFi today" },
  EURUSD: { asset: "Euro/Dollar (EUR/USD)",    query: "EURUSD euro dollar ECB Fed rate policy macro analysis today" },
  GBPUSD: { asset: "Pound/Dollar (GBP/USD)",   query: "GBPUSD pound dollar Bank of England macro analysis today" },
  USDJPY: { asset: "Dollar/Yen (USD/JPY)",     query: "USDJPY dollar yen BOJ Fed policy macro analysis today" },
  USDCAD: { asset: "Dollar/CAD (USD/CAD)",     query: "USDCAD dollar canadian oil BOC macro analysis today" },
  USDCHF: { asset: "Dollar/Franc (USD/CHF)",   query: "USDCHF dollar swiss franc safe haven SNB macro today" },
  AUDUSD: { asset: "Aussie/Dollar (AUD/USD)",  query: "AUDUSD australian dollar RBA commodity macro today" },
  NZDUSD: { asset: "Kiwi/Dollar (NZD/USD)",    query: "NZDUSD new zealand dollar RBNZ macro today" },
  GBPJPY: { asset: "Pound/Yen (GBP/JPY)",      query: "GBPJPY pound yen risk sentiment macro today" },
  USOIL:  { asset: "Crude Oil WTI",            query: "crude oil WTI price OPEC supply demand macro today" },
  UKOIL:  { asset: "Brent Crude Oil",          query: "brent crude oil price OPEC geopolitical supply macro today" },
  US500:  { asset: "S&P 500",                  query: "S&P 500 SPX macro drivers risk sentiment Fed earnings today" },
  US100:  { asset: "Nasdaq 100",               query: "Nasdaq 100 NDX tech stocks macro Fed rate sentiment today" },
  US30:   { asset: "Dow Jones",                query: "Dow Jones DJIA macro economic sentiment today" },
};

// In-memory cache: symbol → { data, ts }
const cache = new Map<string, { data: MacroContextResult; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 60 min

async function searchTavily(query: string): Promise<{ titles: string[]; content: string }> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { titles: [], content: "" };

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,   // current Tavily API uses Bearer auth
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: 6,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Tavily ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();

  const results: Array<{ title?: string; content?: string }> = data.results ?? [];
  const titles  = results.map(r => r.title ?? "").filter(Boolean).slice(0, 6);
  const content = results
    .map(r => r.title && r.content ? `[${r.title}]\n${r.content.slice(0, 400)}` : "")
    .filter(Boolean)
    .join("\n\n");

  return { titles, content };
}

async function synthesizeWithClaude(
  asset: string,
  symbol: string,
  content: string,
): Promise<{ summary: string; keyDrivers: string[]; sentiment: "bullish" | "bearish" | "neutral" }> {
  const client = new Anthropic();

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `You are a senior macro analyst. Based on these recent news snippets about ${asset}, provide a concise trading-relevant macro context.

NEWS SNIPPETS:
${content || "No live news available — use general macro knowledge."}

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "summary": "2–3 sentence macro overview of what is driving ${symbol} right now",
  "keyDrivers": ["max 4 bullet drivers, each under 10 words"],
  "sentiment": "bullish" | "bearish" | "neutral"
}

Focus on: central bank policy, USD strength, inflation data, geopolitical risk, risk-on/off sentiment. Be specific and actionable.`,
    }],
  });

  const text = (msg.content[0] as { type: string; text: string }).text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Claude returned no JSON");
  const parsed = JSON.parse(match[0]);

  return {
    summary:    typeof parsed.summary === "string" ? parsed.summary : "Macro context unavailable.",
    keyDrivers: Array.isArray(parsed.keyDrivers) ? parsed.keyDrivers.slice(0, 4) : [],
    sentiment:  (["bullish", "bearish", "neutral"] as const).includes(parsed.sentiment)
      ? parsed.sentiment : "neutral",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "XAUUSD").toUpperCase();

  // Serve from cache if fresh
  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return NextResponse.json({ ...hit.data, cached: true });
  }

  const meta = SYMBOL_META[symbol];
  if (!meta) {
    return NextResponse.json({ error: `Symbol ${symbol} not supported` }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  try {
    // Tavily is optional — if key missing, Claude uses training knowledge only
    let titles: string[] = [];
    let content = "";
    if (process.env.TAVILY_API_KEY) {
      try {
        const result = await searchTavily(meta.query);
        titles  = result.titles;
        content = result.content;
      } catch (e) {
        console.warn("[macro-context] Tavily failed, falling back to Claude only:", e);
      }
    }
    const { summary, keyDrivers, sentiment } = await synthesizeWithClaude(meta.asset, symbol, content);

    const result: MacroContextResult = {
      symbol,
      summary,
      keyDrivers,
      sentiment,
      headlines: titles,
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    cache.set(symbol, { data: result, ts: Date.now() });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[macro-context]", msg);

    // Return stale cache rather than an error if we have it
    if (hit) return NextResponse.json({ ...hit.data, cached: true });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
