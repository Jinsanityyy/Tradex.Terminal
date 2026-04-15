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

// ── Post-event narrative (completed events only) ──────────────────────────────
function generatePostEvent(title: string, forecast: string, previous: string): {
  postEventSummary: string;
  postEventBullets: string[];
} {
  const t = title.toLowerCase();

  // ── Fed Chair / Fed Speaker ──
  if (t.includes("powell") || (t.includes("fed") && (t.includes("speak") || t.includes("chair") || t.includes("press")))) {
    const isPressConference = t.includes("press") || t.includes("conference");
    return {
      postEventSummary:
        isPressConference
          ? "Powell's press conference has concluded. In these sessions, Powell typically covers 5 core themes: (1) Current inflation trajectory and whether it's convincingly returning to 2%; (2) Labor market resilience — whether job growth is cooling or staying hot; (3) Rate path guidance — any hint of cuts, holds, or hikes and the timeline; (4) Balance sheet policy (QT pace); (5) External risks such as tariffs, geopolitics, or banking stress. The press conference Q&A often moves markets more than the prepared statement — reporters press Powell on rate cut timing, which creates the clearest directional signals. Watch how Gold behaved: if it fell sharply during Q&A, hawkish language dominated. If it rallied, dovish signals emerged."
          : "Powell's speech has concluded. In this type of appearance, Powell typically addresses: (1) Whether inflation is on track to return to 2% — this is the primary gold driver; (2) The strength of the labor market and whether it's slowing; (3) The appropriate level of rates and how long they'll stay there; (4) Any concern about economic slowdown or financial stability. The market's reaction in the first 15 minutes post-speech reveals how it was interpreted. A Gold drop signals hawkish read; a Gold rally signals dovish read. The 30-minute retest after the initial move is often the cleaner entry.",
      postEventBullets: [
        "Key Topic 1 — INFLATION: If Powell said inflation is 'still elevated' or 'not confident' → hawkish → sell Gold on bounces",
        "Key Topic 2 — LABOR: If Powell said jobs market is 'solid' or 'resilient' → delayed cuts → bearish Gold near-term",
        "Key Topic 3 — RATE PATH: Any mention of 'two cuts this year' or 'further progress needed' is the single biggest price mover",
        "Key Topic 4 — RISKS: Tariff/trade war mention = bullish Gold (safe haven demand spikes), watch for immediate Gold bid",
        "Read Gold's 15-min chart: direction of move vs pre-speech levels = market's verdict on hawkish vs dovish",
        "Watch DXY: rising = hawkish interpretation confirmed, falling = dovish confirmed",
        "USDJPY rising post-speech = rate differential bets favor USD = sell Gold rallies",
        "Best entry: wait for the 30-min retest after the initial spike — that move is cleaner and more sustained",
      ],
    };
  }

  // ── FOMC Rate Decision ──
  if (t.includes("fomc") || (t.includes("rate") && t.includes("decision"))) {
    return {
      postEventSummary:
        "The FOMC rate decision has been released. The outcome is now priced into markets. Key focus shifts to the statement language and any projected rate path changes. If the committee signaled fewer cuts ahead (hawkish hold), Gold faces downward pressure and USD strengthens. If the statement indicated concern about growth or opened the door to cuts (dovish), Gold should be rallying and USD selling off. Any surprise deviation from the expected path creates multi-session trending moves.",
      postEventBullets: [
        "Compare Gold price now vs 1 hour before decision — this tells you how the market read it",
        "Check if DXY broke above or below its pre-decision level",
        "If rates held and statement was neutral: expect range-bound for 1–2 sessions before next catalyst",
        "Rate cut = strong Gold buy signal — hold longs for multi-day move",
        "Rate hike (rare): strong sell Gold, strong buy USD across the board",
      ],
    };
  }

  // ── CPI / PCE / Inflation ──
  if (t.includes("cpi") || t.includes("pce") || t.includes("inflation")) {
    const fc = parseFloat(forecast), pr = parseFloat(previous);
    const hot = !isNaN(fc) && !isNaN(pr) && fc > pr;
    const cold = !isNaN(fc) && !isNaN(pr) && fc < pr;
    return {
      postEventSummary: hot
        ? `Inflation came in hotter than previous (${forecast} vs ${previous}). This reinforces the Fed's hawkish stance — rate cuts are pushed further out. Gold is under pressure as real yields rise. USD is likely bid. Any Gold bounce from here should be treated as a sell opportunity until the next data point shows cooling.`
        : cold
        ? `Inflation printed softer than previous (${forecast} vs ${previous}). This increases rate-cut expectations, which is bullish for Gold and bearish for USD. Watch for Gold to break above the pre-release resistance level. This is a buy-the-dips environment for Gold in the near term.`
        : `Inflation printed in line with expectations. Markets will re-anchor around the current Fed narrative. With no major surprise, Gold may consolidate before the next catalyst. Watch for the Fed's next commentary for direction.`,
      postEventBullets: hot
        ? [
            "Sell Gold rallies — hot CPI = no rate cuts soon",
            "Watch DXY: should strengthen on CPI beat",
            "Look for Gold to test support — a break lower opens next major S level",
            "USDJPY likely rising — USD bids dominant",
            "Avoid long Gold until next month's CPI or dovish Fed commentary",
          ]
        : cold
        ? [
            "Buy Gold dips — cooling inflation = rate cuts getting closer",
            "DXY likely falling — USD weakness across the board",
            "Gold may break above key resistance — watch for breakout setup",
            "EURUSD, GBPUSD should rally vs USD",
            "This is a multi-session bullish Gold signal — hold longs with patience",
          ]
        : [
            "No major surprise — avoid overtrading",
            "Watch the Fed's next speech for fresh direction",
            "Gold likely to consolidate in the current range",
            "Only trade confirmed breakout above resistance or below support",
          ],
    };
  }

  // ── NFP ──
  if (t.includes("nonfarm") || t.includes("non-farm") || t.includes("nfp") || t.includes("payroll")) {
    const fc = parseFloat(forecast), pr = parseFloat(previous);
    const strong = !isNaN(fc) && !isNaN(pr) && fc > pr;
    return {
      postEventSummary: strong
        ? `Jobs data came in strong (${forecast}K vs previous ${previous}K). A robust labor market signals the economy can handle higher rates for longer — this is bearish for Gold and bullish for USD. The initial NFP spike in Gold is often faded. Watch for Gold to roll over from the pre-release level and continue lower.`
        : `Jobs data printed weaker or in line (${forecast}K vs previous ${previous}K). Softer employment raises recession concerns and boosts rate-cut expectations — bullish for Gold. Any sell-off in Gold on the print should be bought, especially if the number is a significant miss.`,
      postEventBullets: strong
        ? [
            "Sell Gold on any bounce — strong NFP = delayed rate cuts",
            "DXY likely bid — look for long USD setups across pairs",
            "Gold first-hour rejection = confirmation of bearish bias",
            "Watch USDJPY: strong NFP = USDJPY rising",
            "Key risk: if jobs are strong but wages soft, Gold may recover",
          ]
        : [
            "Buy Gold dips — weak jobs = rate cut bets rising",
            "First 15 min spike often retraces — buy the dip, not the spike",
            "DXY should weaken — EURUSD, Gold, GBPUSD benefit",
            "Watch Gold's next resistance level for breakout confirmation",
          ],
    };
  }

  // ── GDP ──
  if (t.includes("gdp")) {
    const fc = parseFloat(forecast), pr = parseFloat(previous);
    const beat = !isNaN(fc) && !isNaN(pr) && fc > pr;
    return {
      postEventSummary: beat
        ? `GDP printed strong (${forecast}% vs ${previous}%). A growing economy reduces safe-haven demand and supports the Fed's higher-for-longer stance. Gold faces downward pressure in the short term while USD benefits.`
        : `GDP came in soft or as expected (${forecast}% vs ${previous}%). Slowing growth increases recession risk and rate-cut bets — this environment is typically bullish for Gold. Watch for sustained Gold buying.`,
      postEventBullets: beat
        ? ["Sell Gold on rallies — strong growth = risk-on", "Watch DXY for further USD strength"]
        : ["Buy Gold dips — slow growth = Fed cuts closer", "Risk-off sentiment should support Gold multi-session"],
    };
  }

  // ── Default completed event ──
  return {
    postEventSummary:
      `This event has concluded. The market impact is now priced in. Compare the current price of Gold and DXY against their pre-event levels to gauge the market's interpretation. A significant deviation from forecast typically produces 30–90 minute directional moves that can extend into the next session.`,
    postEventBullets: [
      "Check Gold price now vs 1 hour before the event",
      "If Gold moved >$10: a directional trend is confirmed — trade in that direction",
      "If Gold barely moved: event was in-line with expectations — wait for next catalyst",
      "Watch DXY for USD strength/weakness confirmation",
    ],
  };
}

async function fetchFFWeek(url: string): Promise<FFEvent[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    clearTimeout(timer);
    return [];
  }
}

export async function GET() {
  if (cache.data.length > 0 && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ data: cache.data, timestamp: cache.ts, cached: true });
  }

  try {
    // Fetch both this week AND next week so upcoming events are always visible
    const [thisWeek, nextWeek] = await Promise.all([
      fetchFFWeek("https://nfs.faireconomy.media/ff_calendar_thisweek.json"),
      fetchFFWeek("https://nfs.faireconomy.media/ff_calendar_nextweek.json"),
    ]);

    const events: FFEvent[] = [...thisWeek, ...nextWeek];

    if (events.length === 0) {
      return NextResponse.json({ data: cache.data, timestamp: Date.now(), error: "Calendar API returned no events" });
    }
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
        const post = isPast ? generatePostEvent(e.title, e.forecast, e.previous) : null;

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
          postEventSummary: post?.postEventSummary,
          postEventBullets: post?.postEventBullets,
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
