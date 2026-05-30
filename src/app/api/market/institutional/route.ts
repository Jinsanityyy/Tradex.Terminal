import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CACHE_TTL = 10 * 60 * 1000;
const cache = new Map<string, { data: InstitutionalData; ts: number }>();

export interface SentimentData {
  longPct: number;
  shortPct: number;
  signal: "bullish" | "bearish" | "neutral";
  extreme: boolean;
}

export interface OIData {
  openInterest: number;
  oiChange: number;
  priceChange: number;
  signal: "bullish" | "bearish" | "neutral";
  label: string;
}

export interface OptionsData {
  putCallRatio: number;
  callVolume: number;
  putVolume: number;
  unusualCalls: number;
  unusualPuts: number;
  signal: "bullish" | "bearish" | "neutral";
}

export interface InstitutionalData {
  sentiment: SentimentData | null;
  oi: OIData | null;
  options: OptionsData | null;
  confluence: "bullish" | "bearish" | "neutral";
  score: number;
  ts: number;
}

// ── Asset configuration ───────────────────────────────────────────────────────

interface AssetConfig {
  label: string;
  cftcCode: string;          // CFTC contract market code (disaggregated report)
  stooqTicker: string;       // Stooq.com ticker for volume
  yahooTicker: string;       // Yahoo Finance fallback ticker
  optionsTicker: string;     // CBOE ETF options ticker
}

const ASSET_CONFIGS: Record<string, AssetConfig> = {
  XAUUSD: { label: "Gold",      cftcCode: "088691", stooqTicker: "gc.f",    yahooTicker: "GC=F",    optionsTicker: "GLD"  },
  XAGUSD: { label: "Silver",    cftcCode: "084691", stooqTicker: "si.f",    yahooTicker: "SI=F",    optionsTicker: "SLV"  },
  BTC:    { label: "Bitcoin",   cftcCode: "133741", stooqTicker: "btc-usd", yahooTicker: "BTC-USD", optionsTicker: "IBIT" },
  USOIL:  { label: "Crude Oil", cftcCode: "067651", stooqTicker: "cl.f",    yahooTicker: "CL=F",    optionsTicker: "USO"  },
};

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ── CFTC Managed Money ────────────────────────────────────────────────────────

async function fetchManagedMoney(cftcCode: string): Promise<SentimentData | null> {
  return (await fetchCFTCOData(cftcCode)) ?? (await fetchCFTCText(cftcCode));
}

async function fetchCFTCOData(cftcCode: string): Promise<SentimentData | null> {
  try {
    const qs = new URLSearchParams({
      "$format": "json",
      "$top": "1",
      "$filter": `CFTC_Contract_Market_Code eq '${cftcCode}'`,
      "$orderby": "As_of_Date_Form_YYYY_MM_DD desc",
    });
    const res = await Promise.race([
      fetch(`https://publicreporting.cftc.gov/api/odata/wsdot/DisaggregatedFuturesOnly?${qs}`, {
        headers: { "User-Agent": CHROME_UA, "Accept": "application/json" },
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000)),
    ]);
    if (!res.ok) return null;
    const json = await res.json();
    const rec = json?.value?.[0];
    if (!rec) return null;

    const keys     = Object.keys(rec);
    const longKey  = keys.find(k => /money|mm/i.test(k) && /long/i.test(k) && !/short|spread/i.test(k));
    const shortKey = keys.find(k => /money|mm/i.test(k) && /short/i.test(k) && !/spread/i.test(k));
    if (!longKey || !shortKey) return null;

    return buildSentiment(Number(rec[longKey]) || 0, Number(rec[shortKey]) || 0);
  } catch { return null; }
}

async function fetchCFTCText(cftcCode: string): Promise<SentimentData | null> {
  const urls = [
    "https://www.cftc.gov/files/dea/newcot/c_disagg.txt",
    "https://www.cftc.gov/dea/newcot/c_disagg.txt",
  ];
  for (const url of urls) {
    try {
      const res = await Promise.race([
        fetch(url, { headers: { "User-Agent": CHROME_UA, "Accept": "text/plain, */*" } }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000)),
      ]);
      if (!res.ok) continue;
      const text = await res.text();
      const result = parseCFTCCsv(text, cftcCode);
      if (result) return result;
    } catch { continue; }
  }
  return null;
}

function parseCFTCCsv(raw: string, cftcCode: string): SentimentData | null {
  const rows = raw.replace(/\r/g, "").split("\n").filter(r => r.trim());
  if (rows.length < 2) return null;

  function parseRow(row: string): string[] {
    const out: string[] = [];
    let cur = "", inQ = false;
    for (const ch of row) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { out.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    out.push(cur.trim());
    return out;
  }

  const headers = parseRow(rows[0]);
  const longPatterns  = [/money\s*manager.+long/i, /leveraged\s*fund.+long/i, /noncommercial.+long/i];
  const shortPatterns = [/money\s*manager.+short/i, /leveraged\s*fund.+short/i, /noncommercial.+short/i];

  let mmLongIdx = -1, mmShortIdx = -1;
  for (const p of longPatterns) {
    const idx = headers.findIndex(h => p.test(h) && !/short|spread/i.test(h));
    if (idx >= 0) { mmLongIdx = idx; break; }
  }
  for (const p of shortPatterns) {
    const idx = headers.findIndex(h => p.test(h) && !/spread/i.test(h));
    if (idx >= 0) { mmShortIdx = idx; break; }
  }
  if (mmLongIdx < 0 || mmShortIdx < 0) return null;

  const assetRow = rows.filter(r => r.includes(cftcCode)).pop();
  if (!assetRow) return null;

  const fields  = parseRow(assetRow);
  const mmLong  = parseInt((fields[mmLongIdx]  ?? "").replace(/,/g, ""), 10) || 0;
  const mmShort = parseInt((fields[mmShortIdx] ?? "").replace(/,/g, ""), 10) || 0;
  return buildSentiment(mmLong, mmShort);
}

function buildSentiment(mmLong: number, mmShort: number): SentimentData | null {
  if (!mmLong && !mmShort) return null;
  const total    = mmLong + mmShort;
  const longPct  = Math.round((mmLong / total) * 100);
  const shortPct = 100 - longPct;
  const extreme  = longPct >= 70 || shortPct >= 70;
  const signal: SentimentData["signal"] =
    longPct  >= 70 ? "bullish" :
    shortPct >= 70 ? "bearish" :
    "neutral";
  return { longPct, shortPct, signal, extreme };
}

// ── Futures volume — Stooq primary, Yahoo fallback ───────────────────────────

async function fetchOI(stooqTicker: string, yahooTicker: string): Promise<OIData | null> {
  return (await fetchOIStooq(stooqTicker)) ?? (await fetchOIYahoo(yahooTicker));
}

async function fetchOIStooq(ticker: string): Promise<OIData | null> {
  try {
    const res = await Promise.race([
      fetch(`https://stooq.com/q/d/l/?s=${ticker}&i=d`, {
        headers: { "User-Agent": CHROME_UA, "Accept": "text/csv,text/plain,*/*" },
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000)),
    ]);
    if (!res.ok) return null;
    const text = await res.text();

    const rows = text.trim().replace(/\r/g, "").split("\n").filter(r => r.trim());
    if (rows.length < 3) return null;

    const dataRows = rows.slice(1).filter(r => !r.startsWith("Date"));
    if (dataRows.length < 2) return null;

    function parseRow(row: string) {
      const cols = row.split(",");
      return { close: parseFloat(cols[4] ?? "0"), vol: parseInt(cols[5] ?? "0", 10) };
    }

    const last = parseRow(dataRows[dataRows.length - 1]);
    const prev = parseRow(dataRows[dataRows.length - 2]);
    if (!last.close || !prev.close) return null;

    return buildOIData(last.close, prev.close, last.vol, prev.vol);
  } catch { return null; }
}

async function fetchOIYahoo(ticker: string): Promise<OIData | null> {
  const base = `https://query{n}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
  for (const n of [1, 2]) {
    try {
      const res = await Promise.race([
        fetch(base.replace("{n}", String(n)), {
          headers: { "User-Agent": CHROME_UA, "Accept": "application/json", "Referer": "https://finance.yahoo.com/" },
        }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
      ]);
      if (!res.ok) continue;
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) continue;

      const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
      const volumes: (number | null)[] = result.indicators?.quote?.[0]?.volume ?? [];
      const validCloses = closes.filter((v): v is number => v != null);
      const validVols   = volumes.filter((v): v is number => v != null);
      if (validCloses.length < 2 || validVols.length < 2) continue;

      return buildOIData(
        validCloses[validCloses.length - 1], validCloses[validCloses.length - 2],
        validVols[validVols.length - 1],     validVols[validVols.length - 2],
      );
    } catch { continue; }
  }
  return null;
}

function buildOIData(lastClose: number, prevClose: number, lastVol: number, prevVol: number): OIData | null {
  if (!lastClose || !prevClose) return null;
  const priceChange = lastClose - prevClose;
  const oiChange    = lastVol - prevVol;

  let signal: OIData["signal"] = "neutral";
  let label = "Volume data insufficient";
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
}

// ── CBOE Options Flow ─────────────────────────────────────────────────────────

async function fetchOptions(etfTicker: string): Promise<OptionsData | null> {
  try {
    const res = await Promise.race([
      fetch(`https://cdn.cboe.com/api/global/delayed_quotes/options/${etfTicker}.json`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
    ]);
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
      putCallRatio < 0.7 ? "bullish" :
      putCallRatio > 1.3 ? "bearish" :
      "neutral";

    return {
      putCallRatio: Math.round(putCallRatio * 100) / 100,
      callVolume: callVol,
      putVolume: putVol,
      unusualCalls,
      unusualPuts,
      signal,
    };
  } catch { return null; }
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

export async function GET(req: Request) {
  const url    = new URL(req.url);
  const asset  = url.searchParams.get("asset") ?? "XAUUSD";
  const cfg    = ASSET_CONFIGS[asset] ?? ASSET_CONFIGS.XAUUSD;
  const cacheKey = `inst_${asset}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const [sentiment, oi, options] = await Promise.all([
    fetchManagedMoney(cfg.cftcCode),
    fetchOI(cfg.stooqTicker, cfg.yahooTicker),
    fetchOptions(cfg.optionsTicker),
  ]);

  const { confluence, score } = calcConfluence(sentiment, oi, options);
  const data: InstitutionalData = { sentiment, oi, options, confluence, score, ts: Date.now() };

  cache.set(cacheKey, { data, ts: Date.now() });
  return NextResponse.json(data);
}
