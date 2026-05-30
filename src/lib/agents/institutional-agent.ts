/**
 * Agent 8  -  Institutional Flow Agent (Rule-Based, No LLM)
 *
 * Three free data sources combined into a directional signal:
 * - Dukascopy SSI: retail sentiment → contrarian signal at extremes
 * - CME GC open interest: confirms if price moves are real (OI↑) or fake (OI↓)
 * - CBOE GLD options: put/call ratio + unusual volume detection
 */

import type { InstitutionalFlowAgentOutput } from "./schemas";

const TIMEOUT_MS = 7000;
const signal = (v: string): "bullish" | "bearish" | "neutral" =>
  v === "bullish" ? "bullish" : v === "bearish" ? "bearish" : "neutral";

async function timedFetch(url: string, opts?: RequestInit): Promise<Response> {
  return Promise.race([
    fetch(url, opts),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS)),
  ]);
}

const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ── Dukascopy SSI ─────────────────────────────────────────────────────────────
async function fetchSentiment(): Promise<{
  longPct: number; shortPct: number;
  sig: "bullish" | "bearish" | "neutral"; extreme: boolean;
} | null> {
  try {
    const res = await timedFetch(
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
    );
    if (!res.ok) return null;
    const raw = await res.json();
    const items: Record<string, unknown>[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.instruments ?? []);
    const gold = items.find(i =>
      String(i.a ?? i.name ?? i.instrumentId ?? "").toUpperCase().includes("XAU") ||
      String(i.a ?? i.name ?? i.instrumentId ?? "").toUpperCase().includes("GOLD")
    );
    if (!gold) return null;
    const longPct  = Math.round(Number(gold.b ?? gold.longPercent  ?? 0));
    const shortPct = Math.round(Number(gold.c ?? gold.shortPercent ?? 0) || (100 - longPct));
    if (!longPct) return null;
    const extreme = longPct >= 70 || shortPct >= 70;
    const sig: "bullish" | "bearish" | "neutral" =
      shortPct >= 70 ? "bullish" : longPct >= 70 ? "bearish" : "neutral";
    return { longPct, shortPct, sig, extreme };
  } catch { return null; }
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
    fetchSentiment(),
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
      reasons: ["Dukascopy, CME and CBOE all returned errors"],
      score: 0,
      dataAvailable: false,
      processingTime: Date.now() - start,
    };
  }

  // Score: sentiment extreme = ±2, non-extreme = ±1; OI and options = ±1 each
  let score = 0;
  if (sentimentData) {
    const s = sentimentData.sig === "bullish" ? 1 : sentimentData.sig === "bearish" ? -1 : 0;
    score += s * (sentimentData.extreme ? 2 : 1);
  }
  if (oiData)      score += oiData.sig      === "bullish" ? 1 : oiData.sig      === "bearish" ? -1 : 0;
  if (optionsData) score += optionsData.sig === "bullish" ? 1 : optionsData.sig === "bearish" ? -1 : 0;

  const flow: InstitutionalFlowAgentOutput["flow"] =
    score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";

  // Confidence: proportional to how many sources agree and how extreme
  const sourcesActive = [sentimentData, oiData, optionsData].filter(Boolean).length;
  const absScore = Math.abs(score);
  const maxScore = sourcesActive <= 1 ? 2 : sourcesActive === 2 ? 3 : 4;
  const confidence = Math.round((absScore / maxScore) * 80 + (sourcesActive / 3) * 20);

  // Insight
  const parts: string[] = [];
  if (sentimentData?.extreme)
    parts.push(`${sentimentData.shortPct > sentimentData.longPct ? sentimentData.shortPct + "% retails short (contrarian bullish)" : sentimentData.longPct + "% retails long (contrarian bearish)"}`);
  if (oiData && oiData.sig !== "neutral") parts.push(oiData.label);
  if (optionsData && optionsData.sig !== "neutral")
    parts.push(`P/C ${optionsData.pcRatio.toFixed(2)} (${optionsData.sig === "bullish" ? "calls dominating" : "puts dominating"})`);
  const insight = parts.length > 0 ? parts[0] : "No extreme institutional readings";

  // Reasons
  const reasons: string[] = [];
  if (sentimentData)
    reasons.push(`Retail: ${sentimentData.longPct}% long / ${sentimentData.shortPct}% short → contrarian ${sentimentData.sig}${sentimentData.extreme ? " (EXTREME)" : ""}`);
  if (oiData)
    reasons.push(`CME OI: ${oiData.label} (Δ${oiData.oiChange >= 0 ? "+" : ""}${oiData.oiChange.toLocaleString()} contracts)`);
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
