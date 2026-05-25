import { NextResponse } from "next/server";

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

const SYMBOL_META: Record<string, { asset: string; query: string }> = {
  XAUUSD: { asset: "Gold (XAU/USD)",          query: "gold XAU/USD price forecast macro drivers Fed dollar inflation geopolitical risk" },
  XAGUSD: { asset: "Silver (XAG/USD)",         query: "silver XAG/USD price forecast macro drivers inflation industrial demand" },
  BTCUSD: { asset: "Bitcoin (BTC/USD)",        query: "bitcoin BTC/USD price forecast macro drivers institutional demand crypto sentiment" },
  ETHUSD: { asset: "Ethereum (ETH/USD)",       query: "ethereum ETH/USD price forecast crypto macro sentiment DeFi" },
  EURUSD: { asset: "Euro/Dollar (EUR/USD)",    query: "EURUSD euro dollar ECB Fed rate policy macro analysis forecast" },
  GBPUSD: { asset: "Pound/Dollar (GBP/USD)",   query: "GBPUSD pound dollar Bank of England macro analysis forecast" },
  USDJPY: { asset: "Dollar/Yen (USD/JPY)",     query: "USDJPY dollar yen BOJ Fed policy macro analysis forecast" },
  USDCAD: { asset: "Dollar/CAD (USD/CAD)",     query: "USDCAD dollar canadian oil BOC macro analysis forecast" },
  USDCHF: { asset: "Dollar/Franc (USD/CHF)",   query: "USDCHF dollar swiss franc safe haven SNB macro forecast" },
  AUDUSD: { asset: "Aussie/Dollar (AUD/USD)",  query: "AUDUSD australian dollar RBA commodity macro forecast" },
  NZDUSD: { asset: "Kiwi/Dollar (NZD/USD)",    query: "NZDUSD new zealand dollar RBNZ macro forecast" },
  GBPJPY: { asset: "Pound/Yen (GBP/JPY)",      query: "GBPJPY pound yen risk sentiment macro forecast" },
  USOIL:  { asset: "Crude Oil WTI",            query: "crude oil WTI price forecast OPEC supply demand macro" },
  UKOIL:  { asset: "Brent Crude Oil",          query: "brent crude oil price forecast OPEC geopolitical supply macro" },
  US500:  { asset: "S&P 500",                  query: "S&P 500 SPX forecast macro drivers risk sentiment Fed earnings" },
  US100:  { asset: "Nasdaq 100",               query: "Nasdaq 100 NDX forecast tech stocks macro Fed rate sentiment" },
  US30:   { asset: "Dow Jones",                query: "Dow Jones DJIA forecast macro economic sentiment" },
};

// In-memory cache: symbol → { data, ts }
const cache = new Map<string, { data: MacroContextResult; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 60 min

const BULLISH_WORDS = ["bullish", "rally", "surge", "gain", "rise", "rises", "rose", "upside", "support", "positive", "strong", "strength", "buy", "outperform", "advance", "higher", "boost", "optimism"];
const BEARISH_WORDS = ["bearish", "decline", "fall", "drop", "weak", "weakness", "sell", "pressure", "downside", "negative", "concern", "risk", "slump", "crash", "lower", "loss", "fear", "retreat"];

function detectSentiment(text: string): "bullish" | "bearish" | "neutral" {
  const lower = text.toLowerCase();
  const b = BULLISH_WORDS.filter(w => lower.includes(w)).length;
  const r = BEARISH_WORDS.filter(w => lower.includes(w)).length;
  if (b > r + 1) return "bullish";
  if (r > b + 1) return "bearish";
  return "neutral";
}

function titlesToDrivers(titles: string[]): string[] {
  return titles
    .slice(0, 4)
    .map(t => {
      const words = t.split(/\s+/);
      return words.length > 10 ? words.slice(0, 10).join(" ") + "…" : t;
    });
}

async function fetchFromTavily(query: string): Promise<{
  answer: string;
  titles: string[];
}> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY not configured");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: 6,
      include_answer: true,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Tavily ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const results: Array<{ title?: string }> = data.results ?? [];
  const titles = results.map(r => r.title ?? "").filter(Boolean);
  const answer: string = typeof data.answer === "string" ? data.answer : "";

  return { answer, titles };
}

async function fetchFromGemini(
  asset: string,
  symbol: string,
): Promise<{ summary: string; keyDrivers: string[]; sentiment: "bullish" | "bearish" | "neutral" }> {
  const apiKey = (process.env.GOOGLE_AI_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

  const prompt = `You are a senior macro analyst. Provide a concise trading-relevant macro context for ${asset} based on your training knowledge.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "summary": "2–3 sentence macro overview of what drives ${symbol}",
  "keyDrivers": ["up to 4 bullet drivers, each under 10 words"],
  "sentiment": "bullish" | "bearish" | "neutral"
}`;

  const models = [
    { version: "v1beta", model: "gemini-2.5-flash" },
    { version: "v1beta", model: "gemini-2.0-flash" },
    { version: "v1beta", model: "gemini-2.0-flash-lite" },
  ];

  const errors: string[] = [];
  for (const { version, model } of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 512, temperature: 0.3 },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        errors.push(`[${model}] ${data?.error?.message ?? `HTTP ${res.status}`}`);
        continue;
      }
      const parts: Array<{ text?: string; thought?: boolean }> =
        data?.candidates?.[0]?.content?.parts ?? [];
      const text = parts.filter(p => !p.thought).map(p => p.text ?? "").join("").trim();
      if (!text) { errors.push(`[${model}] empty`); continue; }
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) { errors.push(`[${model}] no JSON`); continue; }
      const parsed = JSON.parse(match[0]);
      return {
        summary:    typeof parsed.summary === "string" ? parsed.summary : "",
        keyDrivers: Array.isArray(parsed.keyDrivers) ? parsed.keyDrivers.slice(0, 4) : [],
        sentiment:  (["bullish", "bearish", "neutral"] as const).includes(parsed.sentiment)
          ? parsed.sentiment : "neutral",
      };
    } catch (e: unknown) {
      errors.push(`[${model}] ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(errors.join(" | "));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "XAUUSD").toUpperCase();

  const hit = cache.get(symbol);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return NextResponse.json({ ...hit.data, cached: true });
  }

  const meta = SYMBOL_META[symbol];
  if (!meta) {
    return NextResponse.json({ error: `Symbol ${symbol} not supported` }, { status: 400 });
  }

  const hasTavily = !!process.env.TAVILY_API_KEY;
  const hasGemini = !!process.env.GOOGLE_AI_API_KEY;

  if (!hasTavily && !hasGemini) {
    return NextResponse.json({ error: "No AI keys configured (need TAVILY_API_KEY or GOOGLE_AI_API_KEY)" }, { status: 503 });
  }

  try {
    let result: MacroContextResult;

    if (hasTavily) {
      // Primary: Tavily answer — no Gemini rate limits
      const { answer, titles } = await fetchFromTavily(meta.query);
      const summary = answer || `Live macro data for ${meta.asset} retrieved from latest news.`;
      result = {
        symbol,
        summary,
        keyDrivers: titlesToDrivers(titles),
        sentiment:  detectSentiment(summary + " " + titles.join(" ")),
        headlines:  titles,
        generatedAt: new Date().toISOString(),
        cached: false,
      };
    } else {
      // Fallback: Gemini with training knowledge (no live data)
      const { summary, keyDrivers, sentiment } = await fetchFromGemini(meta.asset, symbol);
      result = {
        symbol,
        summary,
        keyDrivers,
        sentiment,
        headlines:  [],
        generatedAt: new Date().toISOString(),
        cached: false,
      };
    }

    cache.set(symbol, { data: result, ts: Date.now() });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[macro-context]", msg);
    if (hit) return NextResponse.json({ ...hit.data, cached: true });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
