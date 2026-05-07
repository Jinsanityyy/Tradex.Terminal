import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchTimeSeries, type TwelveCandle } from "@/lib/api/twelvedata";
import { fetchYahooCandles } from "@/lib/api/yahoo-finance";
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

interface SimpleCandle { t: number; o: number; h: number; l: number; c: number }

// ── TwelveData ────────────────────────────────────────────────────────────────
const TD_SYMBOL: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD", EURUSD: "EUR/USD", GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY", BTCUSD: "BTC/USD", ETHUSD: "ETH/USD",
  USOIL:  "WTI/USD", US500: "SPX",      US100:  "NDX",
};
const TD_INTERVAL: Record<Timeframe, string> = {
  M5: "5min", M15: "15min", H1: "1h", H4: "4h",
};

async function fromTwelveData(symbol: Symbol, tf: Timeframe): Promise<{ candles: SimpleCandle[]; source: string } | null> {
  const tdSym = TD_SYMBOL[symbol];
  if (!tdSym || !process.env.TWELVEDATA_API_KEY) return null;
  try {
    const raw: TwelveCandle[] = await fetchTimeSeries(tdSym, TD_INTERVAL[tf], 20);
    if (!raw?.length) return null;
    const candles = raw.slice().reverse().map(c => ({
      t: new Date(c.datetime).getTime() / 1000,
      o: parseFloat(c.open), h: parseFloat(c.high),
      l: parseFloat(c.low),  c: parseFloat(c.close),
    })).filter(c => Number.isFinite(c.o) && c.o > 0);
    return candles.length > 1 ? { candles, source: "TwelveData (real-time)" } : null;
  } catch { return null; }
}

// ── Finnhub ───────────────────────────────────────────────────────────────────
const FH_CFG: Partial<Record<Symbol, { endpoint: "forex" | "crypto"; sym: string }>> = {
  XAUUSD: { endpoint: "forex",  sym: "OANDA:XAU_USD"   },
  EURUSD: { endpoint: "forex",  sym: "OANDA:EUR_USD"   },
  GBPUSD: { endpoint: "forex",  sym: "OANDA:GBP_USD"   },
  BTCUSD: { endpoint: "crypto", sym: "BINANCE:BTCUSDT" },
  ETHUSD: { endpoint: "crypto", sym: "BINANCE:ETHUSDT" },
};
const FH_RES: Record<Timeframe, string> = { M5: "5", M15: "15", H1: "60", H4: "240" };
function tfSecs(tf: Timeframe) { return { M5: 300, M15: 900, H1: 3600, H4: 14400 }[tf]; }

async function fromFinnhub(symbol: Symbol, tf: Timeframe): Promise<{ candles: SimpleCandle[]; source: string } | null> {
  const cfg    = FH_CFG[symbol];
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!cfg || !apiKey) return null;
  try {
    const to   = Math.floor(Date.now() / 1000);
    const from = to - 25 * tfSecs(tf);
    const url  = `https://finnhub.io/api/v1/${cfg.endpoint}/candle?symbol=${cfg.sym}&resolution=${FH_RES[tf]}&from=${from}&to=${to}&token=${apiKey}`;
    const res  = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const d = await res.json();
    if (d.s !== "ok" || !Array.isArray(d.c) || d.c.length < 2) return null;
    const candles: SimpleCandle[] = (d.t as number[]).map((t: number, i: number) => ({
      t, o: d.o[i], h: d.h[i], l: d.l[i], c: d.c[i],
    })).filter(c => Number.isFinite(c.o) && c.o > 0);
    return candles.length > 1 ? { candles, source: "Finnhub (real-time)" } : null;
  } catch { return null; }
}

// ── Yahoo Finance — last resort, ~15min delayed ───────────────────────────────
const YAHOO_DISPLAY: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD", EURUSD: "EUR/USD", GBPUSD: "GBP/USD", BTCUSD: "BTC/USD",
};

async function fromYahoo(symbol: Symbol, tf: Timeframe): Promise<{ candles: SimpleCandle[]; source: string } | null> {
  const display = YAHOO_DISPLAY[symbol];
  if (!display) return null;
  try {
    const bars = await fetchYahooCandles(display, tf);
    if (!bars?.length || bars.length < 2) return null;
    return {
      candles: bars.map(b => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c })),
      source: "Yahoo Finance (15min delayed)",
    };
  } catch { return null; }
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

    // Priority: TwelveData → Finnhub → Yahoo (delayed)
    const result =
      await fromTwelveData(symbol, timeframe) ??
      await fromFinnhub(symbol, timeframe)    ??
      await fromYahoo(symbol, timeframe);

    if (!result) {
      return NextResponse.json(
        { error: `No candle data available for ${symbol} ${timeframe}. Check that TWELVEDATA_API_KEY or FINNHUB_API_KEY is set in .env.local.` },
        { status: 503 }
      );
    }

    const { candles, source } = result;
    const targetIdx   = candles.length - 2; // most recent COMPLETE candle
    const candle      = candles[targetIdx];
    const context     = candles.slice(Math.max(0, targetIdx - 9), targetIdx + 2);
    const changePct   = ((candle.c - candle.o) / candle.o) * 100;
    const bodyPct     = Math.abs(changePct);
    const magnitude   = bodyPct > 0.5 ? "major" : bodyPct > 0.2 ? "moderate" : "minor";

    // News headlines
    let newsHeadlines: string[] = [];
    try {
      const origin  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const newsRes = await fetch(`${origin}/api/market/news`, { cache: "no-store" });
      if (newsRes.ok) {
        const nd = await newsRes.json();
        newsHeadlines = (nd.data ?? []).slice(0, 8).map((n: any) => n.headline as string);
      }
    } catch { /* ignore */ }

    const p          = candle.o > 100 ? 2 : 4;
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
Target candle: O=${candle.o.toFixed(p)} H=${candle.h.toFixed(p)} L=${candle.l.toFixed(p)} C=${candle.c.toFixed(p)} (${changePct > 0 ? "+" : ""}${changePct.toFixed(3)}%)

Surrounding candles (oldest → newest):
${contextStr}

Current macro headlines:
${newsHeadlines.length > 0 ? newsHeadlines.map(h => `• ${h}`).join("\n") : "• No headlines available"}

Explain why this specific candle moved. Return JSON only.
`.trim();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

    const client = new Anthropic({ apiKey });
    const msg    = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw     = msg.content[0].type === "text" ? msg.content[0].text : "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: any;
    try { parsed = JSON.parse(cleaned); }
    catch { return NextResponse.json({ error: "AI parse failed", raw }, { status: 500 }); }

    return NextResponse.json({
      symbol, timeframe, candleTime, dataSource: source,
      candle: {
        o: candle.o, h: candle.h, l: candle.l, c: candle.c,
        changePercent: parseFloat(changePct.toFixed(3)),
        bodyPercent:   parseFloat(bodyPct.toFixed(3)),
      },
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
