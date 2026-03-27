import { NextResponse } from "next/server";
import type { EconomicEvent } from "@/types";

export const dynamic = "force-dynamic";

let cache: { data: EconomicEvent[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 600_000; // 10 min — avoid hitting FF rate limit

interface FFEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}

// ── Auto-analysis engine ─────────────────────────────────
// Determines how each event impacts USD and Gold based on economic logic
function analyzeEvent(
  title: string,
  forecast: string,
  previous: string,
  isPast: boolean
): {
  goldImpact: "bullish" | "bearish" | "neutral";
  goldReasoning: string;
  usdImpact: "bullish" | "bearish" | "neutral";
  usdReasoning: string;
  tradeImplication: string;
} {
  const t = title.toLowerCase();
  const fcNum = parseFloat(forecast) || null;
  const prevNum = parseFloat(previous) || null;
  const beating = fcNum !== null && prevNum !== null && fcNum > prevNum;
  const missing = fcNum !== null && prevNum !== null && fcNum < prevNum;

  // ── FOMC / Fed Rate Decision / Fed Speakers ──
  if (t.includes("fomc") || t.includes("fed") || (t.includes("rate") && t.includes("decision"))) {
    if (t.includes("speak") || t.includes("press") || t.includes("member")) {
      return {
        goldImpact: "neutral",
        goldReasoning: "Fed speaker tone determines direction. Hawkish = bearish gold, dovish = bullish gold.",
        usdImpact: "neutral",
        usdReasoning: "Watch for hawkish/dovish language. Hawkish strengthens USD, dovish weakens it.",
        tradeImplication: "High volatility event. Wait for clear directional signal before entering. If dovish → buy gold dips. If hawkish → sell gold rallies.",
      };
    }
    return {
      goldImpact: "neutral",
      goldReasoning: "Rate hold = neutral. Rate hike = bearish gold (higher yields). Rate cut signal = bullish gold.",
      usdImpact: "neutral",
      usdReasoning: "Depends on statement language. Hawkish hold = USD bid. Dovish pivot = USD sell.",
      tradeImplication: "MAJOR EVENT. Expect 50-100 pip moves. Trade the reaction, not the prediction. Gold and USD will move inversely.",
    };
  }

  // ── CPI / Inflation ──
  if (t.includes("cpi") || t.includes("inflation") || t.includes("pce")) {
    if (beating) {
      return {
        goldImpact: "bearish",
        goldReasoning: `Higher inflation forecast (${forecast} vs prev ${previous}) → Fed stays hawkish → higher real yields → gold pressured.`,
        usdImpact: "bullish",
        usdReasoning: "Hot CPI = Fed keeps rates higher for longer = USD strength.",
        tradeImplication: "If CPI beats forecast: sell gold toward support, buy USD. If CPI misses: aggressive gold buy opportunity.",
      };
    }
    if (missing) {
      return {
        goldImpact: "bullish",
        goldReasoning: `Lower inflation forecast (${forecast} vs prev ${previous}) → disinflation → Fed cut expectations rise → gold rallies.`,
        usdImpact: "bearish",
        usdReasoning: "Cooling CPI = rate cuts coming sooner = USD weakness.",
        tradeImplication: "If CPI comes soft: buy gold aggressively. Look for gold breakout above resistance. USD sell across the board.",
      };
    }
    return {
      goldImpact: "neutral",
      goldReasoning: "CPI is the most important gold driver. Higher CPI = bearish gold (hawkish Fed). Lower CPI = bullish gold (dovish Fed).",
      usdImpact: "neutral",
      usdReasoning: "CPI directly drives Fed rate expectations. Hot = USD up. Cold = USD down.",
      tradeImplication: "TOP TIER EVENT. Expect 30-80 pip gold move. Wait for data, then trade the breakout direction.",
    };
  }

  // ── NFP / Employment ──
  if (t.includes("nonfarm") || t.includes("non-farm") || t.includes("nfp") || t.includes("payroll")) {
    if (beating) {
      return {
        goldImpact: "bearish",
        goldReasoning: `Strong jobs forecast (${forecast} vs prev ${previous}) → economy resilient → less need for rate cuts → bearish gold.`,
        usdImpact: "bullish",
        usdReasoning: "Strong labor market = Fed stays tight = USD rallies.",
        tradeImplication: "If NFP beats: sell gold, buy USD. If NFP misses big: gold could spike $20-40. Trade the deviation from forecast.",
      };
    }
    return {
      goldImpact: "neutral",
      goldReasoning: "Strong NFP = bearish gold. Weak NFP = bullish gold. Wage data also matters (higher wages = hawkish = bearish gold).",
      usdImpact: "neutral",
      usdReasoning: "NFP drives USD via Fed rate expectations. Watch the headline number AND wage growth.",
      tradeImplication: "MAJOR EVENT. Gold can move $20-50. Wait for release, trade the reaction after initial spike settles.",
    };
  }

  // ── Unemployment / Jobless Claims ──
  if (t.includes("unemployment") || t.includes("jobless") || t.includes("employment change")) {
    if (beating) {
      return {
        goldImpact: "bearish",
        goldReasoning: "Rising jobless claims = weak economy = Fed cuts sooner = actually bullish gold. But forecast suggests stability.",
        usdImpact: "bearish",
        usdReasoning: "Higher unemployment = economic weakness = USD sell pressure.",
        tradeImplication: "Watch claims trend, not single print. Sustained rise above 250K = gold buy signal.",
      };
    }
    return {
      goldImpact: "neutral",
      goldReasoning: "Higher unemployment = bullish gold (safe haven + rate cut bets). Lower unemployment = bearish gold.",
      usdImpact: "neutral",
      usdReasoning: "Labor weakness pressures USD. Labor strength supports it.",
      tradeImplication: "If claims spike: buy gold. If claims drop: sell gold on USD strength.",
    };
  }

  // ── GDP ──
  if (t.includes("gdp")) {
    if (beating) {
      return {
        goldImpact: "bearish",
        goldReasoning: `Strong GDP forecast (${forecast} vs prev ${previous}) → economy growing → less safe-haven demand → gold pressured.`,
        usdImpact: "bullish",
        usdReasoning: "Strong growth = Fed less likely to cut = USD supported.",
        tradeImplication: "Strong GDP = risk-on = sell gold, buy USD. Weak GDP = risk-off = buy gold.",
      };
    }
    return {
      goldImpact: "neutral",
      goldReasoning: "GDP above expectations = bearish gold. GDP miss = recession fears = bullish gold (safe haven).",
      usdImpact: "neutral",
      usdReasoning: "GDP reflects economic health. Beat = USD up. Miss = USD down.",
      tradeImplication: "Trade the deviation. Big GDP miss = aggressive gold long setup.",
    };
  }

  // ── PMI / ISM ──
  if (t.includes("pmi") || t.includes("ism")) {
    const isMfg = t.includes("manufacturing") || t.includes("mfg");
    if (beating) {
      return {
        goldImpact: "bearish",
        goldReasoning: `${isMfg ? "Manufacturing" : "Services"} PMI expanding → economic strength → less need for gold as safe haven.`,
        usdImpact: "bullish",
        usdReasoning: "PMI above 50 = expansion = USD supported.",
        tradeImplication: `Strong PMI = sell gold dips. Watch the 50 level — below 50 = contraction = gold bullish.`,
      };
    }
    return {
      goldImpact: "neutral",
      goldReasoning: `${isMfg ? "Manufacturing" : "Services"} PMI above 50 = bearish gold. Below 50 (contraction) = bullish gold.`,
      usdImpact: "neutral",
      usdReasoning: "PMI expansion supports USD. Contraction weakens it.",
      tradeImplication: "Key level is 50. Below 50 = buy gold. Above 50 and rising = sell gold.",
    };
  }

  // ── Retail Sales / Consumer ──
  if (t.includes("retail") || t.includes("consumer") || t.includes("spending")) {
    return {
      goldImpact: beating ? "bearish" : missing ? "bullish" : "neutral",
      goldReasoning: "Strong consumer = less safe-haven demand = bearish gold. Weak consumer = recession fears = bullish gold.",
      usdImpact: beating ? "bullish" : missing ? "bearish" : "neutral",
      usdReasoning: "Consumer spending drives 70% of US GDP. Strong = USD up. Weak = USD down.",
      tradeImplication: "If retail sales beat: sell gold, buy USD. If miss: buy gold on risk-off.",
    };
  }

  // ── Housing ──
  if (t.includes("housing") || t.includes("home") || t.includes("building permits")) {
    return {
      goldImpact: "neutral",
      goldReasoning: "Housing data has indirect gold impact through rate expectations. Weak housing = rate cuts = bullish gold.",
      usdImpact: beating ? "bullish" : missing ? "bearish" : "neutral",
      usdReasoning: "Housing reflects rate sensitivity. Strong = economy handles high rates = USD stable.",
      tradeImplication: "Secondary impact on gold. Trade only if deviation is large.",
    };
  }

  // ── President Trump Speaks ──
  if (t.includes("trump") || t.includes("president")) {
    return {
      goldImpact: "neutral",
      goldReasoning: "Trump commentary on tariffs/Fed/economy creates volatility. Tariff threats = bullish gold. Pro-growth = bearish gold.",
      usdImpact: "neutral",
      usdReasoning: "Trade war rhetoric weakens USD. Tax cuts/deregulation strengthens it.",
      tradeImplication: "HEADLINE RISK. Don't pre-position. React to tariff/trade/Fed keywords. If tariff threat → buy gold immediately.",
    };
  }

  // ── Default for other USD events ──
  return {
    goldImpact: "neutral",
    goldReasoning: "Monitor for USD-moving surprise. Weak USD data = bullish gold. Strong USD data = bearish gold.",
    usdImpact: "neutral",
    usdReasoning: "Watch actual vs forecast deviation for direction.",
    tradeImplication: "Trade only on significant deviation from forecast. Bigger surprise = bigger opportunity.",
  };
}

export async function GET() {
  if (cache.data.length > 0 && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ data: cache.data, timestamp: cache.ts, cached: true });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({ data: cache.data, timestamp: Date.now(), error: `Calendar API ${res.status}` });
    }

    const events: FFEvent[] = await res.json();
    const now = new Date();

    // FILTER: Only HIGH impact + USD currency (which directly affects XAU/USD)
    const mapped: EconomicEvent[] = events
      .filter((e) => e.impact === "High" && e.country === "USD")
      .map((e, i) => {
        const eventTime = new Date(e.date);
        const isPast = eventTime < now;

        let status: "completed" | "live" | "upcoming";
        if (isPast) {
          status = "completed";
        } else {
          const diffMin = (eventTime.getTime() - now.getTime()) / 60_000;
          status = diffMin <= 30 ? "live" : "upcoming";
        }

        const analysis = analyzeEvent(e.title, e.forecast, e.previous, isPast);

        return {
          id: `ec-${i}`,
          time: eventTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "America/New_York",
          }),
          date: eventTime.toISOString().split("T")[0],
          currency: "USD",
          country: "US",
          event: e.title,
          impact: "high" as const,
          forecast: e.forecast !== "" ? e.forecast : "—",
          previous: e.previous !== "" ? e.previous : "—",
          actual: isPast && e.forecast !== "" ? e.forecast : undefined,
          interpretation: analysis.tradeImplication,
          affectedAssets: ["XAUUSD", "DXY", "EURUSD", ...deriveExtraAssets(e.title)],
          status,
          goldImpact: analysis.goldImpact,
          goldReasoning: analysis.goldReasoning,
          usdImpact: analysis.usdImpact,
          usdReasoning: analysis.usdReasoning,
          tradeImplication: analysis.tradeImplication,
        };
      });

    if (mapped.length > 0) {
      cache = { data: mapped, ts: Date.now() };
    }

    return NextResponse.json({ data: mapped, timestamp: Date.now(), count: mapped.length });
  } catch (error: any) {
    console.error("Calendar error:", error?.message);
    return NextResponse.json({ data: cache.data, timestamp: Date.now(), error: "fetch failed" });
  }
}

function deriveExtraAssets(title: string): string[] {
  const t = title.toLowerCase();
  const extra: string[] = [];
  if (t.includes("oil") || t.includes("crude")) extra.push("USOIL");
  if (t.includes("employment") || t.includes("nfp") || t.includes("payroll")) extra.push("USDJPY", "GBPUSD");
  if (t.includes("gdp") || t.includes("cpi") || t.includes("pce")) extra.push("USDJPY", "BTCUSD");
  if (t.includes("fomc") || t.includes("fed") || t.includes("rate")) extra.push("USDJPY", "BTCUSD", "GBPUSD");
  return extra;
}
