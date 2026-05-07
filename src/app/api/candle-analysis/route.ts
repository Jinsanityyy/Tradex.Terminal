import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchTimeSeries, type TwelveCandle } from "@/lib/api/twelvedata";
import type { Symbol, Timeframe } from "@/lib/agents/schemas";

export const dynamic = "force-dynamic";

export interface CandleAnalysisResult {
  symbol: string;
  timeframe: string;
  candleTime: string;
  candle: { o: number; h: number; l: number; c: number; changePercent: number; bodyPercent: number };
  summary: string;
  technicals: string;
  newsContext: string;
  catalysts: string[];
  sentiment: "bullish" | "bearish" | "neutral";
  magnitude: "major" | "moderate" | "minor";
  dataSource: string;
}

// TwelveData symbol mapping
const TD_SYMBOL: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  BTCUSD: "BTC/USD",
  ETHUSD: "ETH/USD",
  USOIL:  "WTI/USD",
  US500:  "SPX",
  US100:  "NDX",
};

// TwelveData interval mapping
const TD_INTERVAL: Record<Timeframe, string> = {
  M5:  "5min",
  M15: "15min",
  H1:  "1h",
  H4:  "4h",
};

// Finnhub candle fallback — only for symbols Finnhub supports
const FH_CONFIG: Partial<Record<Symbol, { endpoint: "forex" | "crypto"; symbol: string }>> = {
  XAUUSD: { endpoint: "forex",  symbol: "OANDA:XAU_USD"   },
  EURUSD: { endpoint: "forex",  symbol: "OANDA:EUR_USD"   },
  GBPUSD: { endpoint: "forex",  symbol: "OANDA:GBP_USD"   },
  BTCUSD: { endpoint: "crypto", symbol: "BINANCE:BTCUSDT" },
  ETHUSD: { endpoint: "crypto", symbol: "BINANCE:ETHUSDT" },
};

const FH_RESOLUTION: Record<Timeframe, string> = {
  M5: "5", M15: "15", H1: "60", H4: "240",
};

interface SimpleCandle { t: number; o: number; h: number; l: number; c: number }

// ── Fetch from TwelveData ──────────────────────────────────────────────────────
async function fetchFromTwelveData(symbol: Symbol, tf: Timeframe): Promise<{ candles: SimpleCandle[]; source: string } | null> {
  const tdSym = TD_SYMBOL[symbol];
  if (!tdSym || !process.env.TWELVEDATA_API_KEY) return null;

  try {
    // Fetch 20 candles so we have enough context candles around the target
    const raw: TwelveCandle[] = await fetchTimeSeries(tdSym, TD_INTERVAL[tf], 20);
    if (!raw || raw.length === 0) return null;

    // TwelveData returns newest-first; reverse to get chronological order
    const candles: SimpleCandle[] = raw
      .slice()
      .reverse()
      .map(c => ({
        t: new Date(c.datetime).getTime() / 1000,
        o: parseFloat(c.open),
        h: parseFloat(c.high),
        l: parseFloat(c.low),
        c: parseFloat(c.close),
      }))
      .filter(c => Number.isFinite(c.o) && c.o > 0);

    return candles.length > 0 ? { candles, source: "TwelveData (real-time)" } : null;
  } catch {
    return null;
  }
}

// ── Fetch from Finnhub ─────────────────────────────────────────────────────────
async function fetchFromFinnhub(symbol: Symbol, tf: Timeframe): Promise<{ candles: SimpleCandle[]; source: string } | null> {
  const cfg = FH_CONFIG[symbol];
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!cfg || !apiKey) return null;

  try {
    const resolution = FH_RESOLUTION[tf];
    const to   = Math.floor(Date.now() / 1000);
    const from = to - 20 * intervalSeconds(tf);

    const url = `https://finnhub.io/api/v1/${cfg.endpoint}/candle?symbol=${cfg.symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${apiKey}`;
    const res  = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.s !== "ok" || !Array.isArray(data.c) || data.c.length === 0) return null;

    const candles: SimpleCandle[] = (data.t as number[]).map((t: number, i: number) => ({
      t,
      o: data.o[i],
      h: data.h[i],
      l: data.l[i],
      c: data.c[i],
    })).filter(c => Number.isFinite(c.o) && c.o > 0);

    return candles.length > 0 ? { candles, source: "Finnhub (real-time)" } : null;
  } catch {
    return null;
  }
}

function intervalSeconds(tf: Timeframe): number {
  return { M5: 300, M15: 900, H1: 3600, H4: 14400 }[tf];
}

// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an elite market analyst combining macro economics with institutional price action.
Your job: explain WHY a specific candle moved the way it did.

Given: symbol, timeframe, OHLC of the target candle, surrounding candles for context, and current macro/news headlines.

Respond with ONLY valid JSON, no markdown, no code fences:
{
  "summary": "1–2 sentence plain-English TL;DR of what drove this candle",
  "technicals": "2–3 sentence price-action breakdown: structure, imbalance, momentum, reversal or continuation",
  "newsContext": "2–3 sentence macro/fundamental context explaining the directional bias at that time",
  "catalysts": ["bullet 1", "bullet 2", "bullet 3"],
  "sentiment": "bullish" | "bearish" | "neutral",
  "magnitude": "major" | "moderate" | "minor"
}

Rules:
- Do NOT reference any proprietary strategy names — use generic terms only
- Keep every field concise. Catalysts: max 4 bullets, each under 12 words.
- If doji or small body, explain consolidation / indecision context.
- magnitude: major = body > 0.5% move, moderate = 0.2–0.5%, minor = < 0.2%`;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol    = (searchParams.get("symbol")    ?? "XAUUSD") as Symbol;
    const timeframe = (searchParams.get("timeframe") ?? "H1")     as Timeframe;

    // ── 1. Fetch candles: TwelveData → Finnhub ──────────────────────────────
    const result =
      await fetchFromTwelveData(symbol, timeframe) ??
      await fetchFromFinnhub(symbol, timeframe);

    if (!result) {
      return NextResponse.json({ error: "No real-time candle data available for this symbol. Try XAUUSD, EURUSD, GBPUSD or BTCUSD." }, { status: 503 });
    }

    const { candles, source } = result;

    // Target = most recent COMPLETE candle (second-to-last; last may be forming)
    const targetIdx = candles.length - 2;
    if (targetIdx < 0) {
      return NextResponse.json({ error: "Not enough candle data" }, { status: 503 });
    }

    const candle  = candles[targetIdx];
    const context = candles.slice(Math.max(0, targetIdx - 9), targetIdx + 2);

    const changePercent = ((candle.c - candle.o) / candle.o) * 100;
    const bodyPercent   = Math.abs(changePercent);
    const magnitude: "major" | "moderate" | "minor" =
      bodyPercent > 0.5 ? "major" : bodyPercent > 0.2 ? "moderate" : "minor";

    // ── 2. News headlines for macro context ─────────────────────────────────
    let newsHeadlines: string[] = [];
    try {
      const origin  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const newsRes = await fetch(`${origin}/api/market/news`, { cache: "no-store" });
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        newsHeadlines = (newsData.data ?? []).slice(0, 8).map((n: any) => n.headline as string);
      }
    } catch { /* proceed without news */ }

    // ── 3. Build prompt ──────────────────────────────────────────────────────
    const p = candle.o > 100 ? 2 : 4;
    const candleTime = new Date(candle.t * 1000).toISOString();
    const contextStr = context.map(b => {
      const pct    = ((b.c - b.o) / b.o * 100).toFixed(3);
      const marker = b.t === candle.t ? " ← TARGET" : "";
      return `  ${new Date(b.t * 1000).toUTCString().slice(0, 25)} | O:${b.o.toFixed(p)} H:${b.h.toFixed(p)} L:${b.l.toFixed(p)} C:${b.c.toFixed(p)} (${pct}%)${marker}`;
    }).join("\n");

    const userPrompt = `
Symbol: ${symbol}
Timeframe: ${timeframe}
Data source: ${source}
Target candle time: ${candleTime}
Target candle: O=${candle.o.toFixed(p)} H=${candle.h.toFixed(p)} L=${candle.l.toFixed(p)} C=${candle.c.toFixed(p)} (${changePercent > 0 ? "+" : ""}${changePercent.toFixed(3)}%)

Surrounding candles (oldest → newest):
${contextStr}

Current macro headlines:
${newsHeadlines.length > 0 ? newsHeadlines.map(h => `• ${h}`).join("\n") : "• No headlines available"}

Explain why this specific candle moved. Return JSON only.
`.trim();

    // ── 4. Claude analysis ───────────────────────────────────────────────────
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 500 });

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw     = msg.content[0].type === "text" ? msg.content[0].text : "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI parse failed", raw }, { status: 500 });
    }

    const analysis: CandleAnalysisResult = {
      symbol,
      timeframe,
      candleTime,
      candle: {
        o: candle.o, h: candle.h, l: candle.l, c: candle.c,
        changePercent: parseFloat(changePercent.toFixed(3)),
        bodyPercent:   parseFloat(bodyPercent.toFixed(3)),
      },
      summary:     parsed.summary     ?? "",
      technicals:  parsed.technicals  ?? "",
      newsContext: parsed.newsContext  ?? "",
      catalysts:   Array.isArray(parsed.catalysts) ? parsed.catalysts : [],
      sentiment:   parsed.sentiment   ?? "neutral",
      magnitude:   parsed.magnitude   ?? magnitude,
      dataSource:  source,
    };

    return NextResponse.json(analysis);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
