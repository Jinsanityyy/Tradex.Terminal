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

// ── Dukascopy SSI ─────────────────────────────────────────────────────────────
async function fetchSentiment(): Promise<{
  longPct: number; shortPct: number;
  sig: "bullish" | "bearish" | "neutral"; extreme: boolean;
} | null> {
  try {
    const res = await timedFetch(
      "https://freeserv.dukascopy.com/2.0/?path=trading_tools/SSI&stream=false&period=LIVE",
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }
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
    // Contrarian: crowd heavily short → institutions likely long → bullish signal
    const sig: "bullish" | "bearish" | "neutral" =
      shortPct >= 70 ? "bullish" : longPct >= 70 ? "bearish" : "neutral";
    return { longPct, shortPct, sig, extreme };
  } catch { return null; }
}

// ── CME Open Interest ─────────────────────────────────────────────────────────
async function fetchOI(): Promise<{
  oiChange: number; priceChange: number;
  sig: "bullish" | "bearish" | "neutral"; label: string;
} | null> {
  try {
    const res = await timedFetch(
      "https://www.cmegroup.com/CmeWS/mvc/Settlements/futures/activeContracts/GC.json",
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json", Referer: "https://www.cmegroup.com/" } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const front = (json?.settlements ?? json?.items ?? [])[0];
    if (!front) return null;
    const oiChange = parseInt(String(front.change ?? front.oiChange ?? "0").replace(/,/g, ""), 10) || 0;
    const settle    = parseFloat(String(front.settle ?? "0").replace(/,/g, ""));
    const prev      = parseFloat(String(front.priorSettle ?? settle).replace(/,/g, ""));
    const priceChange = prev > 0 ? settle - prev : 0;
    let sig: "bullish" | "bearish" | "neutral" = "neutral";
    let label = "OI data insufficient";
    if      (priceChange > 0 && oiChange > 0) { sig = "bullish"; label = "Price↑ OI↑ — real longs entering"; }
    else if (priceChange > 0 && oiChange < 0) { sig = "neutral"; label = "Price↑ OI↓ — short covering (weak)"; }
    else if (priceChange < 0 && oiChange > 0) { sig = "bearish"; label = "Price↓ OI↑ — real shorts entering"; }
    else if (priceChange < 0 && oiChange < 0) { sig = "neutral"; label = "Price↓ OI↓ — longs exiting (exhaustion)"; }
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
