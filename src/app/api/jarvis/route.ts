import { NextRequest, NextResponse } from "next/server";
import { llmCreate, llmAvailable } from "@/lib/agents/llm-provider";
import { getAgentCache } from "@/lib/agents/agent-cache-store";
import { getOpenSignals } from "@/lib/signals/storage";
import { getServiceClient } from "@/lib/supabase/service";
import type { Symbol, Timeframe } from "@/lib/agents/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Intent = "greeting" | "market_analysis" | "news" | "signals" | "price" | "general";

function detectIntent(msg: string): Intent {
  const m = msg.toLowerCase();
  if (/\b(hello|hey|hi|wake|vega|good\s*(morning|evening|afternoon)|startup|online)\b/.test(m))
    return "greeting";
  if (/\b(news|catalyst|driver|happening|event|geopolit|headline|reuters|bloomberg)\b/.test(m))
    return "news";
  if (/\b(signal|open trade|position|armed|my trade|active setup)\b/.test(m))
    return "signals";
  if (/\b(price|quote|level|how much|where is|current price|spot)\b/.test(m))
    return "price";
  if (/\b(analyz|bias|outlook|market|bullish|bearish|trend|direction|should i|buy|sell|entry|setup|session)\b/.test(m))
    return "market_analysis";
  return "general";
}

async function fetchTopCatalysts() {
  try {
    const db = getServiceClient();
    if (!db) return [];
    const { data } = await db
      .from("catalysts")
      .select("title, sentiment_tag, driver_category, market_implication")
      .order("created_at", { ascending: false })
      .limit(4);
    return (data ?? []) as Array<{
      title: string;
      sentiment_tag?: string;
      driver_category?: string;
      market_implication?: string;
    }>;
  } catch {
    return [];
  }
}

const VEGA_SYSTEM = `You are Vega, the AI market intelligence assistant embedded inside the TradeX trading terminal. You are a calm, hyper-efficient assistant who speaks with quiet precision and confidence. You are an expert in forex, gold, and macro markets.

Rules:
- Your name is Vega. Always write it as "Vega" — never spell it out letter by letter or use periods between letters.
- Keep every response to 2–4 sentences maximum. Never exceed this.
- Never use bullet points, headers, or markdown formatting.
- Speak in natural, complete sentences. Be direct and actionable.
- Reference specific data points (price, bias, RR ratio) when available in context.
- If asked about something outside trading/markets, politely redirect.
- Personality: calm, intelligent, slightly formal. Never say "I'm sorry" or "I'm just an AI."`;

export async function POST(req: NextRequest) {
  const { message, symbol = "XAUUSD", timeframe = "H1", userName = "" } = await req.json() as {
    message: string;
    symbol?: string;
    timeframe?: string;
    userName?: string;
  };

  // Clean the trader's name so we can greet them personally.
  const trader = (userName || "").trim().split(/\s+/)[0].slice(0, 24);

  if (!message?.trim()) {
    return NextResponse.json({ reply: "Systems online. How can I assist?", intent: "greeting" });
  }

  const intent = detectIntent(message);
  const contextParts: string[] = [];

  // ── Greeting: no LLM needed ─────────────────────────────────────────────────
  if (intent === "greeting") {
    const h = new Date().getUTCHours();
    const period = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
    const cached = await getAgentCache(symbol as Symbol, timeframe as Timeframe);
    const biasLine = cached
      ? ` ${symbol} is currently showing a ${cached.agents.master.finalBias.toUpperCase()} bias with ${cached.agents.master.confidence}% confidence.`
      : "";
    const hello = trader ? `Good ${period}, ${trader}.` : `Good ${period}.`;
    return NextResponse.json({
      reply: `${hello} Vega online — all systems operational.${biasLine} How can I help you trade today?`,
      intent,
    });
  }

  // ── Fetch market data based on intent ───────────────────────────────────────
  if (intent === "market_analysis" || intent === "price") {
    const cached = await getAgentCache(symbol as Symbol, timeframe as Timeframe);
    if (cached) {
      const { finalBias, confidence, tradePlan, noTradeReason, consensusScore } = cached.agents.master;
      const price = cached.snapshot.price.current;
      contextParts.push(`${symbol} ${timeframe} — Bias: ${finalBias.toUpperCase()}, Confidence: ${confidence}%, Consensus: ${consensusScore}/10, Current price: ${price}.`);
      if (tradePlan) {
        const dir = tradePlan.direction === "long" ? "BUY/LONG" : "SELL/SHORT";
        contextParts.push(`Active trade plan: ${dir} entry at ${tradePlan.entry}, SL ${tradePlan.stopLoss}, TP1 ${tradePlan.tp1}${tradePlan.tp2 ? `, TP2 ${tradePlan.tp2}` : ""}, RR ${tradePlan.rrRatio?.toFixed(1)}R.`);
      }
      if (noTradeReason) contextParts.push(`No-trade reason: ${noTradeReason}`);
      const trend = cached.agents.trend;
      const news = cached.agents.news;
      contextParts.push(`Trend agent: ${trend.bias} (${trend.confidence}%). News agent: ${news.impact} impact, regime: ${news.regime}.`);
    } else {
      contextParts.push(`No cached analysis available for ${symbol} ${timeframe}. Data compiling.`);
    }
  }

  if (intent === "news") {
    const cats = await fetchTopCatalysts();
    if (cats.length > 0) {
      contextParts.push(
        `Active market drivers: ${cats.map(c => `${c.title} [${c.sentiment_tag ?? "neutral"}${c.driver_category ? `, ${c.driver_category}` : ""}]`).join(" | ")}`
      );
    } else {
      contextParts.push("No active market catalysts at this time.");
    }
  }

  if (intent === "signals") {
    try {
      const signals = await getOpenSignals();
      const forSymbol = signals.filter(s => s.symbol === symbol && s.status === "open");
      if (forSymbol.length > 0) {
        const s = forSymbol[0];
        const dir = s.tradePlan?.direction === "long" ? "LONG/BUY" : "SHORT/SELL";
        contextParts.push(
          `Open signal for ${symbol}: ${dir} at entry ${s.tradePlan?.entry ?? "N/A"}, SL ${s.tradePlan?.stopLoss ?? "N/A"}, TP1 ${s.tradePlan?.tp1 ?? "N/A"}, RR ${s.tradePlan?.rrRatio?.toFixed(1) ?? "?"}R — status: ${s.status}.`
        );
      } else {
        contextParts.push(`No open signals for ${symbol} at this time.`);
      }
    } catch {
      contextParts.push("Signal data temporarily unavailable.");
    }
  }

  // ── LLM synthesis ───────────────────────────────────────────────────────────
  if (!llmAvailable()) {
    return NextResponse.json({
      reply: contextParts.length > 0
        ? contextParts.join(" ")
        : "LLM provider not configured. Raw data: " + (contextParts[0] ?? "No data available."),
      intent,
    });
  }

  const context = contextParts.length > 0
    ? `\n\nMarket data:\n${contextParts.join("\n")}`
    : "";

  // Let the model address the trader by name when natural (not every line).
  const system = trader
    ? `${VEGA_SYSTEM}\n\nThe trader you are speaking with is named "${trader}". Address them by name occasionally when natural — never overuse it.`
    : VEGA_SYSTEM;

  try {
    const result = await llmCreate(
      {
        // Valid Anthropic id (matches the other agents). Gemini ignores this and
        // uses GEMINI_MODEL internally, so this is safe for both providers.
        model: "claude-haiku-4-5-20251001",
        max_tokens: 180,
        system,
        messages: [{ role: "user", content: `${message}${context}` }],
        temperature: 0.65,
        jsonMode: false,
      },
      18_000
    );

    const reply = result.content[0]?.text?.trim();
    // If the model returns nothing, fall back to the raw data we gathered rather
    // than a generic "offline" message — the user still gets useful information.
    return NextResponse.json({
      reply: reply || (contextParts.length > 0 ? contextParts.join(" ") : "I'm here. Ask me about the market, news, or your signals."),
      intent,
    });
  } catch (err) {
    console.warn("[jin] LLM synthesis failed:", err);
    // Degrade gracefully: serve the raw gathered data instead of an error wall.
    return NextResponse.json({
      reply: contextParts.length > 0
        ? contextParts.join(" ")
        : "My analysis core is busy right now — give me a moment and try again.",
      intent,
    });
  }
}
