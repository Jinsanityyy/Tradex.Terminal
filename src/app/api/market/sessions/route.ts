import { NextResponse } from "next/server";
import type { SessionSummary } from "@/types";

export const dynamic = "force-dynamic";

let cache: { data: SessionSummary[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 120_000; // 2 min

// ── Session time windows (UTC) ──────────────────────────
// Asia/Tokyo:  00:00 – 09:00 UTC (Tokyo 9am–6pm)
// London:      07:00 – 16:00 UTC (London 8am–5pm)
// New York:    13:00 – 22:00 UTC (NY 8am–5pm ET, adjust for DST)
// Overlap London+NY: 13:00 – 16:00 UTC

interface SessionWindow {
  name: "asia" | "london" | "new-york";
  label: string;
  openUTC: number;  // hour
  closeUTC: number; // hour
}

const SESSIONS: SessionWindow[] = [
  { name: "asia",     label: "Asia / Tokyo", openUTC: 0,  closeUTC: 9 },
  { name: "london",   label: "London",       openUTC: 7,  closeUTC: 16 },
  { name: "new-york", label: "New York",     openUTC: 13, closeUTC: 22 },
];

function getSessionStatus(session: SessionWindow, nowHour: number): "active" | "closed" | "upcoming" {
  if (nowHour >= session.openUTC && nowHour < session.closeUTC) return "active";
  if (nowHour >= session.closeUTC) return "closed";
  return "upcoming";
}

function getVolatilityTone(status: "active" | "closed" | "upcoming", sessionName: string, nowHour: number): "high" | "moderate" | "low" {
  if (status === "upcoming") return "moderate";
  // London-NY overlap (13-16 UTC) is always high vol
  if (nowHour >= 13 && nowHour < 16 && (sessionName === "london" || sessionName === "new-york")) return "high";
  // First hour of any session tends to be high
  const session = SESSIONS.find(s => s.name === sessionName);
  if (session && nowHour === session.openUTC) return "high";
  if (status === "active") return "moderate";
  return "low";
}

// Generate session key moves from live news data
async function fetchRecentNews(): Promise<{ headline: string; sentiment: string; assets: string[] }[]> {
  try {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) return [];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${key}`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);
    if (!res.ok) return [];

    const raw: { headline: string; datetime: number }[] = await res.json();
    const now = Date.now() / 1000;

    // Get recent headlines (last 12 hours)
    return raw
      .filter(n => now - n.datetime < 43200)
      .slice(0, 20)
      .map(n => ({
        headline: n.headline,
        sentiment: deriveSentiment(n.headline),
        assets: extractAssets(n.headline),
      }));
  } catch {
    return [];
  }
}

function deriveSentiment(h: string): string {
  const text = h.toLowerCase();
  const bull = ["rally", "rise", "gain", "surge", "deal", "peace", "boost"];
  const bear = ["drop", "fall", "crash", "threat", "war", "fear", "loss"];
  const b = bull.filter(w => text.includes(w)).length;
  const s = bear.filter(w => text.includes(w)).length;
  return b > s ? "bullish" : s > b ? "bearish" : "neutral";
}

function extractAssets(h: string): string[] {
  const t = h.toUpperCase();
  const found: string[] = [];
  if (t.includes("GOLD") || t.includes("XAU")) found.push("XAUUSD");
  if (t.includes("OIL") || t.includes("CRUDE")) found.push("USOIL");
  if (t.includes("BITCOIN") || t.includes("BTC")) found.push("BTCUSD");
  if (t.includes("DOLLAR") || t.includes("USD")) found.push("DXY");
  if (t.includes("S&P") || t.includes("EQUIT")) found.push("SPX");
  if (t.includes("EUR")) found.push("EURUSD");
  if (t.includes("YEN") || t.includes("JPY")) found.push("USDJPY");
  return found;
}

// Fetch live quotes for session-relevant moves  -  uses shared cache
async function fetchQuoteMoves(): Promise<Record<string, { change: string; pct: string; price: string }>> {
  try {
    const { ensureCacheWarm, getQuotesForSymbols } = await import("@/lib/api/quotes-cache");
    await ensureCacheWarm();
    const cached = getQuotesForSymbols(["XAU/USD", "EUR/USD", "USD/JPY", "BTC/USD"]);

    const result: Record<string, { change: string; pct: string; price: string }> = {};

    // Try shared cache first
    for (const [sym, quote] of Object.entries(cached)) {
      if (quote && quote.close) {
        const display = sym.replace("/", "");
        result[display] = {
          change: parseFloat(quote.change || "0").toFixed(2),
          pct: parseFloat(quote.percent_change || "0").toFixed(2),
          price: quote.close,
        };
      }
    }

    if (Object.keys(result).length > 0) return result;

    // Fallback: direct fetch
    const key = process.env.TWELVEDATA_API_KEY;
    if (!key) return {};

    const symbols = "XAU/USD,EUR/USD,USD/JPY,BTC/USD";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://api.twelvedata.com/quote?symbol=${symbols}&apikey=${key}`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);
    if (!res.ok) return {};
    const data = await res.json();

    for (const [sym, quote] of Object.entries(data) as [string, any][]) {
      if (quote && quote.close && !quote.code) {
        const display = sym.replace("/", "");
        result[display] = {
          change: parseFloat(quote.change || "0").toFixed(2),
          pct: parseFloat(quote.percent_change || "0").toFixed(2),
          price: quote.close,
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}

function generateKeyMoves(
  session: SessionWindow,
  status: "active" | "closed" | "upcoming",
  quotes: Record<string, { change: string; pct: string; price: string }>,
  news: { headline: string; sentiment: string; assets: string[] }[]
): string[] {
  const moves: string[] = [];

  // Add real price moves
  const gold = quotes["XAUUSD"];
  const eurusd = quotes["EURUSD"];
  const usdjpy = quotes["USDJPY"];
  const btc = quotes["BTCUSD"];

  if (status === "upcoming") {
    // For upcoming sessions, list what to watch
    if (session.name === "new-york") {
      moves.push("Watch for US economic data releases and Fed commentary");
      if (gold) moves.push(`Gold at $${parseFloat(gold.price).toFixed(0)}  -  key level heading into NY`);
      moves.push("Tariff and geopolitical headlines may drive volatility");
      moves.push("London-NY overlap (13-16 UTC) typically highest volume period");
    } else if (session.name === "london") {
      moves.push("European data releases and ECB commentary expected");
      if (eurusd) moves.push(`EUR/USD at ${eurusd.price}  -  watch for directional break`);
      moves.push("London open typically drives gold direction for the day");
    } else {
      moves.push("PBoC and BOJ policy signals to monitor");
      if (usdjpy) moves.push(`USD/JPY at ${usdjpy.price}  -  Tokyo session sets JPY tone`);
      moves.push("Thin liquidity typical  -  watch for stop hunting around key levels");
    }
  } else {
    // For active/closed sessions, show what happened
    if (gold) {
      const dir = parseFloat(gold.pct) >= 0 ? "up" : "down";
      moves.push(`Gold ${dir} ${Math.abs(parseFloat(gold.pct))}% to $${parseFloat(gold.price).toFixed(0)}  -  ${parseFloat(gold.pct) > 0.5 ? "strong safe-haven bid" : parseFloat(gold.pct) < -0.5 ? "risk-on selling" : "rangebound"}`);
    }
    if (eurusd) {
      const dir = parseFloat(eurusd.pct) >= 0 ? "rallied" : "dropped";
      moves.push(`EUR/USD ${dir} ${Math.abs(parseFloat(eurusd.pct))}% to ${eurusd.price}  -  ${parseFloat(eurusd.pct) > 0 ? "EUR strength / USD weakness" : "USD bid"}`);
    }
    if (usdjpy) {
      const dir = parseFloat(usdjpy.pct) >= 0 ? "up" : "down";
      moves.push(`USD/JPY ${dir} ${Math.abs(parseFloat(usdjpy.pct))}% to ${usdjpy.price}  -  ${parseFloat(usdjpy.pct) > 0.3 ? "yield differential widening" : parseFloat(usdjpy.pct) < -0.3 ? "safe-haven JPY bid" : "consolidating"}`);
    }
    if (btc) {
      const dir = parseFloat(btc.pct) >= 0 ? "up" : "down";
      moves.push(`Bitcoin ${dir} ${Math.abs(parseFloat(btc.pct))}% to $${parseFloat(btc.price).toFixed(0)}  -  ${parseFloat(btc.pct) > 1 ? "risk-on momentum" : parseFloat(btc.pct) < -1 ? "selling pressure" : "range-trading"}`);
    }

    // Add a relevant news headline
    const topNews = news.find(n => n.assets.length > 0);
    if (topNews) {
      moves.push(`Headlines: "${topNews.headline.slice(0, 80)}..."`);
    }
  }

  return moves.slice(0, 5);
}

function generateLiquidityNotes(session: SessionWindow, status: "active" | "closed" | "upcoming", nowHour: number): string {
  if (session.name === "asia") {
    return status === "active"
      ? "Thin liquidity typical in early Asia. JPY crosses and gold may see stop hunting. Volume picks up after Tokyo open."
      : "Asia session liquidity was thin. Key moves driven by institutional flows and central bank activity.";
  }
  if (session.name === "london") {
    const isOverlap = nowHour >= 13 && nowHour < 16;
    return status === "active"
      ? `Strong liquidity in London session.${isOverlap ? " Currently in London-NY overlap  -  highest volume period." : " European institutional flow driving direction."}`
      : "London session saw strong institutional participation. Key directional moves set during first 2 hours.";
  }
  return status === "active"
    ? "Full liquidity in NY session. Institutional flow dominant. Watch for position squaring into the close."
    : "NY session delivered full liquidity conditions. End-of-day flows may have distorted price action.";
}

function generateWhatChanged(
  session: SessionWindow,
  quotes: Record<string, { change: string; pct: string; price: string }>,
  news: { headline: string; sentiment: string }[]
): string {
  const bullish = news.filter(n => n.sentiment === "bullish").length;
  const bearish = news.filter(n => n.sentiment === "bearish").length;
  const tone = bullish > bearish ? "risk-on" : bearish > bullish ? "risk-off" : "mixed";

  const gold = quotes["XAUUSD"];
  const goldDir = gold && parseFloat(gold.pct) > 0 ? "gold bid suggests safe-haven demand" : "gold soft as risk appetite holds";

  return `Sentiment ${tone} during ${session.label} session. ${goldDir.charAt(0).toUpperCase() + goldDir.slice(1)}. Headlines driving multi-directional catalyst environment.`;
}

function generateCarriesForward(
  session: SessionWindow,
  quotes: Record<string, { change: string; pct: string; price: string }>
): string {
  const gold = quotes["XAUUSD"];
  const eurusd = quotes["EURUSD"];

  const pieces: string[] = [];
  if (gold) {
    pieces.push(parseFloat(gold.pct) > 0 ? "Gold momentum carries forward" : "Gold weakness may persist");
  }
  if (eurusd) {
    pieces.push(parseFloat(eurusd.pct) > 0 ? "EUR strength into next session" : "USD bid may continue");
  }
  pieces.push("Headline risk remains the wildcard for direction");

  return pieces.join("; ") + ".";
}

export async function GET() {
  if (cache.data.length > 0 && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ data: cache.data, timestamp: cache.ts, cached: true });
  }

  try {
    const now = new Date();
    const nowHour = now.getUTCHours();

    // Fetch live data in parallel
    const [quotes, news] = await Promise.all([fetchQuoteMoves(), fetchRecentNews()]);

    const sessions: SessionSummary[] = SESSIONS.map((session) => {
      const status = getSessionStatus(session, nowHour);
      const volatilityTone = getVolatilityTone(status, session.name, nowHour);
      const keyMoves = generateKeyMoves(session, status, quotes, news);
      const liquidityNotes = generateLiquidityNotes(session, status, nowHour);
      const whatChanged = generateWhatChanged(session, quotes, news);
      const carriesForward = generateCarriesForward(session, quotes);

      // Generate key levels from live prices
      const keyLevels: string[] = [];
      const gold = quotes["XAUUSD"];
      const eurusd = quotes["EURUSD"];
      const usdjpy = quotes["USDJPY"];
      const btc = quotes["BTCUSD"];

      if (gold) {
        const p = parseFloat(gold.price);
        keyLevels.push(`Gold $${Math.floor(p / 10) * 10} support`);
        keyLevels.push(`Gold $${Math.ceil(p / 10) * 10 + 10} resistance`);
      }
      if (eurusd) {
        const p = parseFloat(eurusd.price);
        keyLevels.push(`EUR/USD ${(Math.floor(p * 100) / 100).toFixed(4)} support`);
      }
      if (usdjpy) {
        const p = parseFloat(usdjpy.price);
        keyLevels.push(`USD/JPY ${Math.floor(p)} key level`);
      }

      return {
        session: session.name,
        status,
        keyMoves,
        volatilityTone,
        liquidityNotes,
        keyLevels,
        whatChanged,
        carriesForward,
      };
    });

    if (sessions.length > 0) {
      cache = { data: sessions, ts: Date.now() };
    }

    return NextResponse.json({
      data: sessions,
      timestamp: Date.now(),
      currentHourUTC: nowHour,
    });
  } catch (error) {
    console.error("Sessions API error:", error);
    return NextResponse.json({ data: cache.data, timestamp: Date.now(), error: "fetch failed" });
  }
}
