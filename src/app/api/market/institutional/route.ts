import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE_TTL = 10 * 60 * 1000; // 10 min
const cache = new Map<string, { data: InstitutionalData; ts: number }>();

export interface SentimentData {
  longPct: number;
  shortPct: number;
  signal: "bullish" | "bearish" | "neutral"; // contrarian
  extreme: boolean; // >70% one side
}

export interface OIData {
  openInterest: number;
  oiChange: number;
  priceChange: number;
  signal: "bullish" | "bearish" | "neutral";
  label: string; // e.g. "Price↑ OI↑ → Real buyers"
}

export interface OptionsData {
  putCallRatio: number;
  callVolume: number;
  putVolume: number;
  unusualCalls: number; // count of strikes with unusual call volume
  unusualPuts: number;
  signal: "bullish" | "bearish" | "neutral";
}

export interface InstitutionalData {
  sentiment: SentimentData | null;
  oi: OIData | null;
  options: OptionsData | null;
  confluence: "bullish" | "bearish" | "neutral";
  score: number; // -3 to +3
  ts: number;
}

const TIMEOUT = 8000;
const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
function withTimeout(p: Promise<Response>): Promise<Response> {
  return Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), TIMEOUT))]);
}

// ── Dukascopy SSI ─────────────────────────────────────────────────────────────
async function fetchSentiment(): Promise<SentimentData | null> {
  try {
    const res = await withTimeout(fetch(
      "https://freeserv.dukascopy.com/2.0/?path=trading_tools/SSI&stream=false",
      {
        headers: {
          "User-Agent": CHROME_UA,
          "Accept": "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.dukascopy.com/trading-tools/widgets/ssi/",
          "Origin": "https://www.dukascopy.com",
          "Cache-Control": "no-cache",
        },
      }
    ));
    if (!res.ok) return null;
    const raw = await res.json();

    const items: unknown[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.instruments ?? []);
    const gold = (items as Record<string, unknown>[]).find((i) =>
      String(i.a ?? i.name ?? i.instrumentId ?? "").toUpperCase().includes("XAU") ||
      String(i.a ?? i.name ?? i.instrumentId ?? "").toUpperCase().includes("GOLD")
    );
    if (!gold) return null;

    const longPct = Number(gold.b ?? gold.longPercent ?? gold.longVolume ?? 0);
    const shortPct = Number(gold.c ?? gold.shortPercent ?? gold.shortVolume ?? 0) ||
      (100 - longPct);

    if (!longPct) return null;

    const extreme = longPct >= 70 || shortPct >= 70;
    const signal: SentimentData["signal"] =
      shortPct >= 70 ? "bullish" :
      longPct  >= 70 ? "bearish" :
      "neutral";

    return { longPct: Math.round(longPct), shortPct: Math.round(shortPct), signal, extreme };
  } catch {
    return null;
  }
}

// ── GC Futures volume via Yahoo Finance (CME blocks server-side requests) ─────
async function fetchOI(): Promise<OIData | null> {
  try {
    const res = await withTimeout(fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=5d",
      { headers: { "User-Agent": CHROME_UA, "Accept": "application/json" } }
    ));
    if (!res.ok) return null;
    const json = await res.json();

    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const volumes: (number | null)[] = result.indicators?.quote?.[0]?.volume ?? [];

    const validCloses = closes.filter((v): v is number => v != null);
    const validVols   = volumes.filter((v): v is number => v != null);
    if (validCloses.length < 2 || validVols.length < 2) return null;

    const lastClose = validCloses[validCloses.length - 1];
    const prevClose = validCloses[validCloses.length - 2];
    const lastVol   = validVols[validVols.length - 1];
    const prevVol   = validVols[validVols.length - 2];

    const priceChange = lastClose - prevClose;
    const oiChange    = lastVol - prevVol;

    let signal: OIData["signal"] = "neutral";
    let label = "GC volume data insufficient";
    if (priceChange > 0 && oiChange > 0) {
      signal = "bullish"; label = "Price↑ Vol↑ — buyers absorbing";
    } else if (priceChange > 0 && oiChange < 0) {
      signal = "neutral"; label = "Price↑ Vol↓ — short covering (weak)";
    } else if (priceChange < 0 && oiChange > 0) {
      signal = "bearish"; label = "Price↓ Vol↑ — sellers pressing";
    } else if (priceChange < 0 && oiChange < 0) {
      signal = "neutral"; label = "Price↓ Vol↓ — sellers exhausting";
    }

    return { openInterest: lastVol, oiChange, priceChange, signal, label };
  } catch {
    return null;
  }
}

// ── CBOE GLD Options Flow ─────────────────────────────────────────────────────
async function fetchOptions(): Promise<OptionsData | null> {
  try {
    const res = await withTimeout(fetch(
      "https://cdn.cboe.com/api/global/delayed_quotes/options/GLD.json",
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
    ));
    if (!res.ok) return null;
    const json = await res.json();

    const options: Record<string, unknown>[] = json?.data?.options ?? json?.options ?? [];
    if (options.length === 0) return null;

    let callVol = 0, putVol = 0, unusualCalls = 0, unusualPuts = 0;

    for (const o of options) {
      const vol = Number(o.volume ?? o.vol ?? 0);
      const oi  = Number(o.open_interest ?? o.openInterest ?? o.oi ?? 1);
      const cp  = String(o.option ?? o.symbol ?? "").includes("C") ||
                  String(o.call_put ?? o.type ?? "").toUpperCase() === "C";

      if (cp) {
        callVol += vol;
        if (oi > 0 && vol / oi > 3 && vol > 500) unusualCalls++;
      } else {
        putVol += vol;
        if (oi > 0 && vol / oi > 3 && vol > 500) unusualPuts++;
      }
    }

    const total = callVol + putVol;
    if (total === 0) return null;

    const putCallRatio = putVol / (callVol || 1);
    const signal: OptionsData["signal"] =
      putCallRatio < 0.7  ? "bullish" :  // calls dominating
      putCallRatio > 1.3  ? "bearish" :  // puts dominating
      "neutral";

    return {
      putCallRatio: Math.round(putCallRatio * 100) / 100,
      callVolume: callVol,
      putVolume: putVol,
      unusualCalls,
      unusualPuts,
      signal,
    };
  } catch {
    return null;
  }
}

// ── Score + Confluence ────────────────────────────────────────────────────────
function calcConfluence(
  sentiment: SentimentData | null,
  oi: OIData | null,
  options: OptionsData | null,
): { confluence: InstitutionalData["confluence"]; score: number } {
  let score = 0;
  const toPoints = (s: "bullish" | "bearish" | "neutral") =>
    s === "bullish" ? 1 : s === "bearish" ? -1 : 0;

  if (sentiment) score += toPoints(sentiment.signal) * (sentiment.extreme ? 2 : 1);
  if (oi) score += toPoints(oi.signal);
  if (options) score += toPoints(options.signal);

  const confluence: InstitutionalData["confluence"] =
    score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";

  return { confluence, score };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET() {
  const cached = cache.get("institutional");
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const [sentiment, oi, options] = await Promise.all([
    fetchSentiment(),
    fetchOI(),
    fetchOptions(),
  ]);

  const { confluence, score } = calcConfluence(sentiment, oi, options);
  const data: InstitutionalData = { sentiment, oi, options, confluence, score, ts: Date.now() };

  cache.set("institutional", { data, ts: Date.now() });
  return NextResponse.json(data);
}
