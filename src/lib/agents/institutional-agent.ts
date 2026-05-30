/**
 * Institutional Flow Agent (Rule-Based, No LLM)
 *
 * Three free data sources combined into a directional signal:
 * - CFTC Managed Money: hedge fund net positioning (weekly COT)
 * - Yahoo Finance GC=F: gold futures volume as direction proxy
 * - CBOE GLD options: put/call ratio + unusual volume detection
 */

import type { InstitutionalFlowAgentOutput } from "./schemas";

const signal = (v: string): "bullish" | "bearish" | "neutral" =>
  v === "bullish" ? "bullish" : v === "bearish" ? "bearish" : "neutral";

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ── CFTC Managed Money (Dukascopy blocks server-side requests) ────────────────
// COMEX Gold code: 088691. Published weekly (Fri for prior Tue).
async function fetchManagedMoney(): Promise<{
  longPct: number; shortPct: number;
  sig: "bullish" | "bearish" | "neutral"; extreme: boolean;
} | null> {
  try {
    const res = await Promise.race([
      fetch("https://www.cftc.gov/files/dea/newcot/c_disagg.txt", {
        headers: { "User-Agent": CHROME_UA, "Accept": "text/plain, */*" },
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000)),
    ]);
    if (!res.ok) return null;
    const text = await res.text();
    const rows = text.split("\n");
    if (rows.length < 2) return null;

    function parseRow(row: string): string[] {
      const out: string[] = [];
      let cur = "", inQ = false;
      for (const ch of row) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
        else { cur += ch; }
      }
      out.push(cur);
      return out;
    }

    const headers    = parseRow(rows[0]);
    const mmLongIdx  = headers.findIndex(h => /money\s*manager.+long/i.test(h)  && !/short|spread/i.test(h));
    const mmShortIdx = headers.findIndex(h => /money\s*manager.+short/i.test(h) && !/spread/i.test(h));
    if (mmLongIdx < 0 || mmShortIdx < 0) return null;

    const goldRow = rows.filter(r => r.includes("088691")).pop();
    if (!goldRow) return null;

    const fields  = parseRow(goldRow);
    const mmLong  = parseInt((fields[mmLongIdx]  ?? "").replace(/,/g, ""), 10) || 0;
    const mmShort = parseInt((fields[mmShortIdx] ?? "").replace(/,/g, ""), 10) || 0;
    if (!mmLong && !mmShort) return null;

    const total    = mmLong + mmShort;
    const longPct  = Math.round((mmLong / total) * 100);
    const shortPct = 100 - longPct;
    const extreme  = longPct >= 70 || shortPct >= 70;
    const sig: "bullish" | "bearish" | "neutral" =
      longPct  >= 70 ? "bullish" :
      shortPct >= 70 ? "bearish" :
      "neutral";
    return { longPct, shortPct, sig, extreme };
  } catch { return null; }
}

async function timedFetch(url: string, opts?: RequestInit): Promise<Response> {
  return Promise.race([
    fetch(url, opts),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 7000)),
  ]);
}

// ── GC Futures volume via Yahoo Finance (CME blocks server-side requests) ─────
async function fetchOI(): Promise<{
  oiChange: number; priceChange: number;
  sig: "bullish" | "bearish" | "neutral"; label: string;
} | null> {
  try {
    const res = await timedFetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=5d",
      { headers: { "User-Agent": CHROME_UA, "Accept": "application/json" } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const volumes: (number | null)[] = result.indicators?.quote?.[0]?.volume ?? [];

    // Filter out nulls (non-trading days)
    const validCloses = closes.filter((v): v is number => v != null);
    const validVols   = volumes.filter((v): v is number => v != null);
    if (validCloses.length < 2 || validVols.length < 2) return null;

    const lastClose = validCloses[validCloses.length - 1];
    const prevClose = validCloses[validCloses.length - 2];
    const lastVol   = validVols[validVols.length - 1];
    const prevVol   = validVols[validVols.length - 2];

    const priceChange = lastClose - prevClose;
    const oiChange    = lastVol - prevVol; // volume as OI proxy

    let sig: "bullish" | "bearish" | "neutral" = "neutral";
    let label = "GC volume data insufficient";
    if      (priceChange > 0 && oiChange > 0) { sig = "bullish"; label = "Price↑ Vol↑ — buyers absorbing"; }
    else if (priceChange > 0 && oiChange < 0) { sig = "neutral"; label = "Price↑ Vol↓ — short covering (weak)"; }
    else if (priceChange < 0 && oiChange > 0) { sig = "bearish"; label = "Price↓ Vol↑ — sellers pressing"; }
    else if (priceChange < 0 && oiChange < 0) { sig = "neutral"; label = "Price↓ Vol↓ — sellers exhausting"; }

    return { oiChange, priceChange, sig, label };
  } catch { return null; }
}

// ── CBOE GLD Options ──────────────────────────────────────────────────────────
async function fetchOptions(): Promise<{
  pcRatio: number; sig: "bullish" | "bearish" | "neutral";
} | null> {
  try {
    const res = await timedFetch(
      "https://cdn.cboe.com/api/global/delayed_quotes/options/GLD.json",
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const options: Record<string, unknown>[] = json?.data?.options ?? json?.options ?? [];
    if (!options.length) return null;
    let calls = 0, puts = 0;
    for (const o of options) {
      const vol = Number(o.volume ?? o.vol ?? 0);
      const isCall = String(o.option ?? o.symbol ?? "").includes("C") ||
                     String(o.call_put ?? o.type ?? "").toUpperCase() === "C";
      if (isCall) calls += vol; else puts += vol;
    }
    if (calls + puts === 0) return null;
    const pcRatio = Math.round((puts / (calls || 1)) * 100) / 100;
    const sig: "bullish" | "bearish" | "neutral" =
      pcRatio < 0.7 ? "bullish" : pcRatio > 1.3 ? "bearish" : "neutral";
    return { pcRatio, sig };
  } catch { return null; }
}

// ── Main ──────────────────────────────────────────────────────────────────────
export async function runInstitutionalAgent(): Promise<InstitutionalFlowAgentOutput> {
  const start = Date.now();

  const [sentimentData, oiData, optionsData] = await Promise.all([
    fetchManagedMoney(),
    fetchOI(),
    fetchOptions(),
  ]);

  const dataAvailable = !!(sentimentData || oiData || optionsData);

  if (!dataAvailable) {
    return {
      agentId: "institutional",
      flow: "neutral",
      confidence: 0,
      sentimentSignal: "neutral",
      oiSignal: "neutral",
      optionsSignal: "neutral",
      retailLongPct: null,
      oiChange: null,
      putCallRatio: null,
      insight: "All data sources offline — skipping",
      reasons: ["CFTC, Yahoo Finance and CBOE all returned errors"],
      score: 0,
      dataAvailable: false,
      processingTime: Date.now() - start,
    };
  }

  // Score: managed money extreme = ±2, non-extreme = ±1; volume and options = ±1 each
  let score = 0;
  if (sentimentData) {
    const s = sentimentData.sig === "bullish" ? 1 : sentimentData.sig === "bearish" ? -1 : 0;
    score += s * (sentimentData.extreme ? 2 : 1);
  }
  if (oiData)      score += oiData.sig      === "bullish" ? 1 : oiData.sig      === "bearish" ? -1 : 0;
  if (optionsData) score += optionsData.sig === "bullish" ? 1 : optionsData.sig === "bearish" ? -1 : 0;

  const flow: InstitutionalFlowAgentOutput["flow"] =
    score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";

  const sourcesActive = [sentimentData, oiData, optionsData].filter(Boolean).length;
  const absScore = Math.abs(score);
  const maxScore = sourcesActive <= 1 ? 2 : sourcesActive === 2 ? 3 : 4;
  const confidence = Math.round((absScore / maxScore) * 80 + (sourcesActive / 3) * 20);

  const parts: string[] = [];
  if (sentimentData?.extreme)
    parts.push(`Hedge funds ${sentimentData.longPct > sentimentData.shortPct ? sentimentData.longPct + "% net long" : sentimentData.shortPct + "% net short"} (CFTC)`);
  if (oiData && oiData.sig !== "neutral") parts.push(oiData.label);
  if (optionsData && optionsData.sig !== "neutral")
    parts.push(`P/C ${optionsData.pcRatio.toFixed(2)} (${optionsData.sig === "bullish" ? "calls dominating" : "puts dominating"})`);
  const insight = parts.length > 0 ? parts[0] : "No extreme institutional readings";

  const reasons: string[] = [];
  if (sentimentData)
    reasons.push(`CFTC managed money: ${sentimentData.longPct}% long / ${sentimentData.shortPct}% short → ${sentimentData.sig}${sentimentData.extreme ? " (EXTREME)" : ""}`);
  if (oiData)
    reasons.push(`GC volume: ${oiData.label} (Δ${oiData.oiChange >= 0 ? "+" : ""}${oiData.oiChange.toLocaleString()})`);
  if (optionsData)
    reasons.push(`CBOE options P/C ratio ${optionsData.pcRatio.toFixed(2)} → ${optionsData.sig}`);
  if (reasons.length === 0) reasons.push("Insufficient data for meaningful signal");

  return {
    agentId: "institutional",
    flow,
    confidence,
    sentimentSignal: sentimentData?.sig ?? "neutral",
    oiSignal:        oiData?.sig        ?? "neutral",
    optionsSignal:   optionsData?.sig   ?? "neutral",
    retailLongPct:   sentimentData?.longPct ?? null,
    oiChange:        oiData?.oiChange        ?? null,
    putCallRatio:    optionsData?.pcRatio    ?? null,
    insight,
    reasons,
    score,
    dataAvailable,
    processingTime: Date.now() - start,
  };
}
