import { NextResponse } from "next/server";
import type { EconomicEvent } from "@/types";

export const dynamic = "force-dynamic";

let cache: { data: EconomicEvent[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 60_000; // 1 min — refresh status more frequently

interface FFEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
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
    const fcLabel = fcNum != null ? `${forecast}%` : "the forecast";
    const prLabel = prevNum != null ? `${previous}%` : "the prior reading";
    return {
      goldImpact: beating ? "bearish" : missing ? "bullish" : "neutral",
      goldReasoning: beating
        ? `Retail Sales forecasted at ${fcLabel} vs prior ${prLabel} signals strong consumer health — households are still spending despite elevated rates. This reduces safe-haven demand for Gold as recession fears ease and the Fed faces less pressure to cut.`
        : missing
        ? `Retail Sales projected at ${fcLabel} vs prior ${prLabel} signals slowing consumer activity — a warning sign for growth. Weak consumption raises recession risk and rate-cut expectations, both powerful bullish drivers for Gold as a safe-haven asset.`
        : `Retail Sales is the pulse of consumer spending, the largest component of U.S. GDP. A beat above forecast reduces rate-cut urgency and pressures Gold; a miss raises recession fears and lifts safe-haven demand for Gold.`,
      usdImpact: beating ? "bullish" : missing ? "bearish" : "neutral",
      usdReasoning: beating
        ? `Strong Retail Sales at ${fcLabel} vs prior ${prLabel} reinforces economic resilience, giving the Fed justification to keep rates elevated. This supports the Dollar as rate differentials remain favorable for USD-denominated assets.`
        : missing
        ? `Soft Retail Sales at ${fcLabel} vs prior ${prLabel} signals that consumers are pulling back — a drag on GDP growth. This accelerates rate-cut expectations and weakens the Dollar as yield differentials compress.`
        : `Consumer spending accounts for roughly 70% of U.S. GDP. A stronger-than-expected print reduces rate-cut urgency and lifts the Dollar; a miss accelerates cut bets and drives USD lower across the board.`,
      tradeImplication: beating
        ? "Beat expected: sell Gold on spikes, buy USD dips. Look for DXY breakout above resistance. Avoid long Gold until CPI or NFP provides a dovish counter-signal."
        : missing
        ? "Miss expected: buy Gold dips — rate-cut repricing is the most powerful Gold driver. DXY likely weakens across the board. Watch for Gold breakout above key resistance."
        : "Trade the deviation: beat = sell Gold, buy USD. Miss = buy Gold on risk-off. In-line = minimal reaction, wait for next major catalyst.",
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

// ── Pre-event narrative (upcoming / live events) ─────────────────────────────
function generatePreEvent(title: string, forecast: string, previous: string): {
  preEventSummary: string;
  preEventBullets: string[];
} {
  const t = title.toLowerCase();

  // ── FOMC Rate Decision ──
  if (t.includes("fomc") || (t.includes("rate") && t.includes("decision"))) {
    return {
      preEventSummary:
        "The FOMC rate decision is the single highest-impact event for Gold and USD traders. The actual rate is almost always priced in — what moves markets is the statement language, dot plot revisions, and Powell's press conference. Any shift toward signaling fewer cuts (hawkish) hammers Gold and lifts the Dollar; any hint of dovishness does the opposite. Expect price compression in the hour before the release and a sharp directional break the moment the decision hits.",
      preEventBullets: [
        "Rate hold is expected — the statement adjectives are what matter: 'patient', 'cautious', 'confident' each carry a different signal",
        "Dot plot: any revision to fewer rate cuts this year = bearish Gold, bullish USD",
        "Powell's press conference (30 min after release) is often more volatile than the decision itself — stay positioned",
        "Watch Gold's 5-min chart during Q&A: if reporters push on cut timing and Powell resists, Gold fades",
        "Rate cut surprise (rare): immediate Gold spike $30-50, DXY breakdown — hold Gold longs multi-day",
        "Pre-event: avoid new positions inside 30 minutes of the decision — spreads widen and slippage is high",
      ],
    };
  }

  // ── Fed Chair / Fed Speakers ──
  if (t.includes("powell") || (t.includes("fed") && (t.includes("speak") || t.includes("chair") || t.includes("press") || t.includes("member")))) {
    return {
      preEventSummary:
        "Fed speaker events are high-alert moments for Gold and USD traders. Powell's language, in particular, moves markets more than most economic data releases. The key signal to listen for is whether the tone is hawkish (rates higher for longer, not ready to cut) or dovish (inflation progress made, cuts are getting closer). Words like 'further progress needed' lean hawkish and weigh on Gold; phrases like 'gaining confidence' lean dovish and lift it. Don't pre-position — wait for the language, then trade the direction.",
      preEventBullets: [
        "Hawkish signal words: 'not yet confident', 'further progress needed', 'labor market still tight' — sell Gold on bounce",
        "Dovish signal words: 'gaining confidence', 'inflation has eased substantially', 'appropriate to cut' — buy Gold dips",
        "Tariff / trade-war mentions = immediate Gold spike — safe-haven demand activates on uncertainty",
        "Watch the first 5-min Gold candle after the speech begins — direction = market's initial read",
        "DXY confirms: DXY rising = hawkish read = sell Gold. DXY falling = dovish = buy Gold dips",
        "Best entry: wait for the 15–30 min retest after the initial spike — that move is cleaner and more sustained",
      ],
    };
  }

  // ── CPI / PCE / Inflation ──
  if (t.includes("cpi") || t.includes("pce") || t.includes("inflation")) {
    const fc = parseFloat(forecast), pr = parseFloat(previous);
    const hasData = !isNaN(fc) && !isNaN(pr);
    const hot = hasData && fc > pr;
    const cold = hasData && fc < pr;
    const biasHint = hot ? " With the forecast above the prior reading, markets may be pricing in a slightly hotter print." : cold ? " With the forecast below the prior reading, some cooling is expected — but the magnitude of the miss or beat is what matters." : "";
    return {
      preEventSummary:
        `CPI is the single most important monthly release for Gold and USD markets. The Fed's entire rate path is anchored to this number — a hotter print delays cuts, keeps real yields high, and is the core bearish force on Gold while lifting the Dollar. A cooler print accelerates cut expectations, triggers a relief rally in Gold, and softens the Dollar.${biasHint} Markets have an options-implied expectation baked in — a meaningful surprise in either direction amplifies the move.`,
      preEventBullets: [
        "Watch year-over-year Core CPI (ex-food and energy) — this is the Fed's preferred inflation gauge",
        "A 0.1% beat/miss from consensus typically triggers a $15–25 Gold move; 0.2%+ deviation = $30–50 move",
        hot
          ? "Forecast is above prior — if confirmed hot, sell Gold rallies and watch DXY for breakout"
          : cold
          ? "Forecast is below prior — if confirmed soft, buy Gold dips aggressively as rate-cut bets reprice"
          : "In-line print = muted reaction — wait for the Fed's next commentary for fresh directional bias",
        "Pre-event: Gold often compresses into a tight range — the breakout direction IS the trade",
        "Watch TIPS yields (real rates) after the print: rising real yields = bearish Gold regardless of direction",
        "Don't fight the first 15-min move — CPI surprises sustain directional momentum for hours",
      ],
    };
  }

  // ── NFP / Non-Farm Payrolls ──
  if (t.includes("nonfarm") || t.includes("non-farm") || t.includes("nfp") || t.includes("payroll")) {
    const fc = parseFloat(forecast), pr = parseFloat(previous);
    const hasData = !isNaN(fc) && !isNaN(pr);
    const strong = hasData && fc > pr;
    return {
      preEventSummary:
        `Non-Farm Payrolls is the most watched monthly jobs report and a primary input into Fed rate decisions. A strong number signals economic resilience — the Fed can afford to keep rates elevated, which pressures Gold and supports the Dollar. A weak number raises recession concerns, revives rate-cut bets, and drives safe-haven flows into Gold.${hasData ? ` The consensus forecast of ${forecast}K vs the prior ${previous}K sets the bar — the deviation from this level, not the absolute number, is what moves markets.` : ""} The initial Gold move is often sharp and partially reversed — patience on the 15-minute retest pays more than chasing the spike.`,
      preEventBullets: [
        "Watch three components: headline jobs, unemployment rate, and average hourly earnings (wage inflation)",
        "Strong wages (+0.4% m/m or higher) = hawkish signal even if headline disappoints — sell Gold",
        "Headline miss + rising unemployment = double-bearish signal for USD = buy Gold",
        "The first 5-min candle is often a headfake — wait for the 15-min retest before entering",
        "Watch USDJPY: rising after print = risk-on = Gold headwind. Falling = risk-off = Gold bid",
        "Gold can move $20–50 on a major NFP surprise — size positions accordingly before the print",
      ],
    };
  }

  // ── Retail Sales / Consumer ──
  if (t.includes("retail") || t.includes("consumer") || (t.includes("spending") && !t.includes("pce"))) {
    const fc = parseFloat(forecast), pr = parseFloat(previous);
    const hasData = !isNaN(fc) && !isNaN(pr);
    const beat = hasData && fc > pr;
    const miss = hasData && fc < pr;
    return {
      preEventSummary:
        `Retail Sales measures consumer spending — the largest driver of U.S. GDP at roughly 70% of total economic activity. A beat signals that households remain financially healthy despite elevated interest rates, reducing the Fed's urgency to cut. This is a classic risk-on, Gold-bearish, USD-bullish setup. A miss raises recession fears and revives rate-cut bets, pushing safe-haven flows into Gold.${hasData ? ` The forecast of ${forecast}% vs the prior ${previous}%${beat ? " implies consumer resilience — a confirm would pressure Gold" : miss ? " implies softening demand — a confirm would support Gold" : " — any significant deviation from forecast triggers the directional move"}.` : ""}`,
      preEventBullets: [
        "A deviation of ±0.3% from forecast is considered significant and will move markets",
        "Core Retail Sales (ex-autos) matters equally — autos are volatile, so core tells the real consumer health story",
        beat
          ? "Beat expected: sell Gold on the spike, buy USD — look for DXY breakout above prior resistance"
          : miss
          ? "Miss expected: buy Gold dips — initial drop often reverses within 15 minutes as rate-cut bets reprice"
          : "No clear lean — wait for the print, then trade the deviation",
        "Watch USDJPY: rising = USD strength confirmed. Falling = dollar weakness, Gold bid",
        "If both headline AND core beat = strong signal — hold the directional trade for the full session",
        "Weak retail sales for 2+ consecutive months = recession setup = sustained bullish bias for Gold",
      ],
    };
  }

  // ── GDP ──
  if (t.includes("gdp")) {
    const fc = parseFloat(forecast), pr = parseFloat(previous);
    const hasData = !isNaN(fc) && !isNaN(pr);
    const beat = hasData && fc > pr;
    return {
      preEventSummary:
        `GDP is a quarterly snapshot of U.S. economic health and a key input into Fed rate thinking. Strong growth signals the economy can handle elevated rates, reducing the urgency for cuts — bearish for Gold, supportive for USD. A GDP miss raises recession risk and accelerates cut bets, creating safe-haven demand for Gold.${hasData ? ` The forecast of ${forecast}% vs the prior ${previous}% ${beat ? "suggests continued growth — a confirm would pressure Gold near-term" : "implies a slowdown — a confirm could trigger Gold buying"}.` : ""} Note that the GDP deflator (inflation within the GDP report) also matters — an elevated deflator adds hawkish pressure on the Fed.`,
      preEventBullets: [
        "Flash GDP (first estimate) moves markets most — revisions rarely trigger significant reactions",
        "GDP below 1.5% annualized raises recession concerns — Gold bullish setup on the miss",
        "GDP above 3% = economy handles high rates = delayed cuts = sell Gold rallies",
        "Also watch the GDP Price Deflator — high deflator = persistent inflation = hawkish Fed = bearish Gold",
        "This is a secondary Gold driver — trade only on large deviations (±0.5% from consensus or more)",
        "Watch DXY reaction first, then confirm Gold direction — both should move in sync",
      ],
    };
  }

  // ── PMI / ISM ──
  if (t.includes("pmi") || t.includes("ism")) {
    const isMfg = t.includes("manufacturing") || t.includes("mfg");
    const fc = parseFloat(forecast), pr = parseFloat(previous);
    const hasData = !isNaN(fc) && !isNaN(pr);
    const expansionary = hasData && fc > 50;
    const contractionary = hasData && fc < 50;
    return {
      preEventSummary:
        `${isMfg ? "Manufacturing" : "Services"} PMI is a real-time survey of business activity — the 50 level is the key dividing line between expansion and contraction. Readings above 50 signal a growing sector, which reduces safe-haven demand for Gold and supports the Dollar. Readings below 50 signal contraction, raising recession fears and bullish Gold conditions. The Prices Paid sub-index within the ISM is also closely watched — elevated prices = inflationary pressure = hawkish Fed = Gold headwind.${hasData && fc !== pr ? ` The forecast of ${forecast} ${expansionary ? "signals expansion — would pressure Gold if confirmed" : contractionary ? "signals contraction — would support Gold on a confirm" : "sits near the neutral zone"}.` : ""}`,
      preEventBullets: [
        "Key level is 50: above = expansion = Gold bearish. Below = contraction = Gold bullish",
        "Watch the Prices Paid sub-index — above 60 = inflationary = bearish Gold despite growth signals",
        isMfg
          ? "Manufacturing PMI below 50 for 3+ consecutive months signals industrial recession — sustained Gold bid"
          : "Services PMI is the dominant sector — a miss here has broader recession implications than manufacturing",
        expansionary
          ? "Forecast above 50 — a confirm puts risk-on pressure on Gold, DXY should tick up"
          : contractionary
          ? "Forecast below 50 — a confirm is Gold supportive, watch for safe-haven flows"
          : "Near 50 forecast — deviation in either direction is the tradeable event",
        "New Orders sub-index is the leading edge — strong orders today = strong future activity",
        "Trade PMI reactions with tight stops — first-hour reversals are common after initial spike",
      ],
    };
  }

  // ── Unemployment / Jobless Claims ──
  if (t.includes("unemployment") || t.includes("jobless") || t.includes("employment change") || t.includes("claims")) {
    return {
      preEventSummary:
        "Weekly Jobless Claims are the labor market's real-time heartbeat — released every Thursday, they give traders the earliest read on whether hiring conditions are deteriorating between major jobs reports. A sustained rise toward 250K or higher signals labor market cracks, raises rate-cut expectations, and is Gold bullish. Conversely, persistently low claims reinforce Fed patience, keeping rates elevated and creating headwinds for Gold. A single week rarely moves markets significantly — it's the trend over 3–4 weeks that traders respect.",
      preEventBullets: [
        "Watch the 4-week moving average — single-week spikes are often noise from holidays or seasonal factors",
        "Claims above 250K sustained = early recession warning = Gold buy signal building",
        "Claims below 200K = labor market remains tight = Fed stays patient = Gold headwind",
        "Continuing claims (ongoing unemployment) matter as much as the headline — watch for trend",
        "A single large miss (>30K from consensus) can cause a sharp Gold reaction — size positions carefully",
        "This is a secondary event — unless claims spike dramatically, wait for NFP for the definitive labor read",
      ],
    };
  }

  // ── Housing ──
  if (t.includes("housing") || t.includes("home") || t.includes("building permit")) {
    return {
      preEventSummary:
        "Housing data is one of the most rate-sensitive sectors of the economy and serves as a leading indicator of economic momentum. Weak housing starts or existing home sales signal that elevated mortgage rates are biting, which can feed into broader economic slowdown concerns and revive rate-cut bets — mildly bullish for Gold. Strong housing data, however, suggests the economy is absorbing high rates, reducing the urgency for Fed cuts and creating headwinds for Gold. The impact on Gold is secondary — trade only on a significant deviation from forecast.",
      preEventBullets: [
        "Housing data has indirect Gold impact — it works through rate-cut expectations, not direct safe-haven dynamics",
        "Weak housing = rate-sensitive sectors struggling = Fed may need to cut sooner = bullish Gold bias",
        "Strong housing = economy handling high rates = delayed cuts = neutral to bearish Gold",
        "Watch the 30-year fixed mortgage rate trend alongside this data for context",
        "Trade only if deviation is large (±10% from consensus) — this is a secondary catalyst",
        "Combine with next week's CPI or Fed speaker for confirmation before positioning",
      ],
    };
  }

  // ── Trump / President speaks ──
  if (t.includes("trump") || t.includes("president")) {
    return {
      preEventSummary:
        "Presidential speeches and press conferences carry headline risk that can trigger sharp, immediate Gold moves. Trump's commentary in particular has been market-moving — tariff threats create instant Gold spikes as safe-haven demand activates; pro-growth or deregulation language can briefly pressure Gold as risk appetite improves. The challenge is that the direction is unknowable in advance. The strategy is to be ready to react within seconds of the headline, not to pre-position based on assumption.",
      preEventBullets: [
        "Tariff / trade war keywords = immediate Gold buy — safe-haven demand activates regardless of other signals",
        "Fed criticism or pressure to cut rates = Gold bullish (implies USD weakness expectations)",
        "Pro-growth, tax cut, or deregulation language = risk-on = brief Gold headwind",
        "Geopolitical escalation mentions = buy Gold immediately",
        "Don't pre-position — direction is unknowable. Set alerts and react to headline keywords",
        "First 5-min Gold candle after the headline = market's verdict. Trade in that direction on the retest",
      ],
    };
  }

  // ── Default ──
  return {
    preEventSummary:
      "This economic release is a secondary market catalyst that can move Gold and USD if the actual print significantly deviates from the consensus forecast. The general rule: strong U.S. data = USD bid + Gold pressure (reduces rate-cut urgency). Weak U.S. data = USD sell + Gold bid (increases rate-cut bets). The magnitude of the deviation from forecast determines whether the move is tradeable or noise.",
    preEventBullets: [
      "Compare the actual print vs consensus forecast — deviation of ±0.3% or more = tradeable move",
      "Strong data = USD strengthens = Gold faces headwind. Weak data = USD softens = Gold bids",
      "Wait for the initial 5-min spike to exhaust before entering — first candles are often reversals",
      "Watch DXY reaction to confirm Gold's direction after the release",
      "If the data is in-line with forecast, expect minimal reaction — wait for the next major catalyst",
    ],
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

  // ── Retail Sales / Consumer ──
  if (t.includes("retail") || t.includes("consumer") || (t.includes("spending") && !t.includes("pce"))) {
    const fc = parseFloat(forecast), pr = parseFloat(previous);
    const hasData = !isNaN(fc) && !isNaN(pr);
    const strong = hasData && fc > pr;
    const weak = hasData && fc < pr;
    return {
      postEventSummary: strong
        ? `Retail Sales was projected to rebound to ${forecast}% from the prior ${previous}%, signaling resilient consumer spending. If the actual print confirmed this strength, Gold faces near-term headwinds — strong consumers reduce recession risk and give the Fed less reason to cut rates. Consumer health removes the safe-haven premium embedded in Gold's price. Any Gold bounce from current levels should be treated as a selling opportunity unless the next CPI or NFP data delivers a dovish surprise.`
        : weak
        ? `Retail Sales was projected to slow to ${forecast}% from the prior ${previous}%, flagging a weakening consumer. If the actual print came in line with or below forecast, this is a warning signal for U.S. growth. Slowing retail activity raises recession risk, accelerates rate-cut bets, and creates a sustained tailwind for Gold as a safe-haven asset. Look for Gold to build a support base and potentially break higher toward the next key resistance level.`
        : `Retail Sales has been released and the market impact is now priced in. Compare Gold's current level against where it was 1 hour before the release — a rally signals the print was weak (below forecast, rate-cut bullish); a decline signals the print was strong (above forecast, risk-on). The first 15–30 minutes of directional movement is the most reliable signal.`,
      postEventBullets: strong
        ? [
            "Strong consumer = Fed holds rates = Gold faces continued headwind near-term — sell rallies",
            "Look for clean Gold sell entries on the second push lower or on a retest of the breakdown level",
            "Watch DXY: if holding gains post-release, USD strength is confirmed — don't fight it",
            "Core Retail Sales (ex-autos) confirms or denies the headline — check if both components beat",
            "Next catalysts to watch: CPI (inflation) and NFP (jobs) — dovish surprises there could reverse Gold's direction",
          ]
        : weak
        ? [
            "Weak consumer = recession risk rising = rate-cut expectations accelerating = buy Gold dips",
            "Watch for Gold to test and potentially break above the prior session's resistance level",
            "DXY should weaken — EURUSD and GBPUSD likely benefiting from USD selling pressure",
            "If both headline AND core retail sales missed = stronger signal — hold Gold longs with patience",
            "This is a multi-session bullish Gold setup — don't rush the exit on the initial bounce",
          ]
        : [
            "In-line print = muted market reaction — avoid chasing the initial spike",
            "Compare Gold's price now vs 1 hour before the release to gauge the market's true interpretation",
            "If Gold barely moved, the market treated this as a non-event — wait for next major catalyst",
            "Watch Fed speakers this week for fresh direction on rate-cut timing",
          ],
    };
  }

  // ── PMI / ISM ──
  if (t.includes("pmi") || t.includes("ism")) {
    const fc = parseFloat(forecast), pr = parseFloat(previous);
    const hasData = !isNaN(fc) && !isNaN(pr);
    const expanding = hasData && fc > 50;
    const contracting = hasData && fc < 50;
    const beat = hasData && fc > pr;
    return {
      postEventSummary: expanding && beat
        ? `${t.includes("manufacturing") ? "Manufacturing" : "Services"} PMI printed above the key 50 expansion level at ${forecast} (vs prior ${previous}). Expanding business activity signals economic resilience — reducing the urgency for Fed rate cuts. Gold faces headwinds as risk appetite returns and safe-haven demand fades. USD should be supported by the positive growth signal.`
        : contracting
        ? `${t.includes("manufacturing") ? "Manufacturing" : "Services"} PMI printed below the critical 50 threshold at ${forecast} (vs prior ${previous}), signaling contraction. Business activity is shrinking — a warning sign for growth that raises recession concerns and rate-cut expectations. This is a Gold-bullish, USD-bearish setup. Watch for sustained buying in Gold if the PMI trend continues deteriorating.`
        : `PMI has been released. Compare the print vs the 50 level and vs the prior reading — expansion above 50 pressures Gold, contraction below 50 supports it. The direction of the trend (improving vs worsening) matters as much as the absolute level.`,
      postEventBullets: expanding
        ? [
            "PMI above 50 = economic expansion = risk-on = sell Gold rallies",
            "Watch the Prices Paid sub-index — above 60 = inflationary pressure = extra hawkish signal",
            "DXY should be bid — USD benefits from growth signals",
            "New Orders component is the leading indicator — strong orders = future activity stays elevated",
          ]
        : [
            "PMI below 50 = contraction = recession risk = buy Gold dips",
            "Sustained PMI below 50 for 2+ months = strong Gold buy signal builds",
            "DXY should weaken — USD under pressure from growth concerns",
            "Watch Employment sub-index — weakness there compounds the bearish growth narrative",
          ],
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

// ── Known recurring USD high-impact events (fallback when API has no upcoming) ─
// Times are in UTC (13:30 = 8:30 AM ET = 21:30 PHT)
const WEEKLY_SCHEDULE: Array<{
  dayOffset: number; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
  utcHour: number;
  utcMin: number;
  title: string;
  impact: "high" | "medium";
}> = [
  { dayOffset: 1, utcHour: 14, utcMin: 0,  title: "CB Consumer Confidence",          impact: "medium" },
  { dayOffset: 1, utcHour: 14, utcMin: 0,  title: "JOLTS Job Openings",              impact: "high"   },
  { dayOffset: 2, utcHour: 12, utcMin: 15, title: "ADP Non-Farm Employment Change",  impact: "high"   },
  { dayOffset: 2, utcHour: 12, utcMin: 30, title: "GDP q/q (Advance)",               impact: "high"   },
  { dayOffset: 2, utcHour: 14, utcMin: 0,  title: "ISM Manufacturing PMI",           impact: "high"   },
  { dayOffset: 3, utcHour: 12, utcMin: 30, title: "Unemployment Claims",             impact: "high"   },
  { dayOffset: 3, utcHour: 12, utcMin: 30, title: "Core PCE Price Index m/m",        impact: "high"   },
  { dayOffset: 4, utcHour: 12, utcMin: 30, title: "Non-Farm Payrolls",               impact: "high"   },
  { dayOffset: 4, utcHour: 12, utcMin: 30, title: "Unemployment Rate",               impact: "high"   },
];

function buildFallbackUpcoming(now: Date): EconomicEvent[] {
  // Find next Monday
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 6 ? 2 : 8 - dayOfWeek;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + daysToMonday);
  monday.setUTCHours(0, 0, 0, 0);

  return WEEKLY_SCHEDULE.map((s, i) => {
    const eventTime = new Date(monday);
    eventTime.setUTCDate(monday.getUTCDate() + s.dayOffset);
    eventTime.setUTCHours(s.utcHour, s.utcMin, 0, 0);

    const analysis = analyzeEvent(s.title, "", "", false);
    const pre = generatePreEvent(s.title, "", "");

    return {
      id: `fallback-${i}`,
      time: eventTime.toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Manila",
      }),
      date: eventTime.toISOString().split("T")[0],
      utcTimestamp: eventTime.getTime(),
      currency: "USD",
      country: "US",
      event: s.title,
      impact: s.impact,
      forecast: "—",
      previous: "—",
      interpretation: analysis.tradeImplication,
      affectedAssets: ["XAUUSD", "DXY", "EURUSD", ...deriveExtraAssets(s.title)],
      status: "upcoming" as const,
      goldImpact: analysis.goldImpact,
      goldReasoning: analysis.goldReasoning,
      usdImpact: analysis.usdImpact,
      usdReasoning: analysis.usdReasoning,
      tradeImplication: analysis.tradeImplication,
      preEventSummary: pre.preEventSummary,
      preEventBullets: pre.preEventBullets,
    };
  });
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

    // FILTER: HIGH + MEDIUM impact USD events (Medium catches Flash PMIs, retail sales etc.
    // on weeks where there are no HIGH impact events)
    const mapped: EconomicEvent[] = events
      .filter((e) => (e.impact === "High" || e.impact === "Medium") && e.country === "USD")
      .map((e, i) => {
        // FairFX dates are in UTC — parse directly
        const eventTime = new Date(e.date);
        
        // Use a 15-min buffer: events within 15 min after scheduled time are still "live"
        const msSinceEvent = now.getTime() - eventTime.getTime();
        const isPast = msSinceEvent > 15 * 60 * 1000; // 15 min buffer

        let status: "completed" | "live" | "upcoming";
        if (isPast) {
          status = "completed";
        } else {
          const diffMin = (eventTime.getTime() - now.getTime()) / 60_000;
          status = diffMin <= 30 ? "live" : "upcoming";
        }

        // Map FairFX impact string to our Impact type
        const impact: "high" | "medium" = e.impact === "High" ? "high" : "medium";

        const analysis = analyzeEvent(e.title, e.forecast, e.previous, isPast);
        const post = isPast ? generatePostEvent(e.title, e.forecast, e.previous) : null;
        const pre = !isPast ? generatePreEvent(e.title, e.forecast, e.previous) : null;

        return {
          id: `ec-${i}`,
          time: eventTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Manila",
          }),
          date: eventTime.toISOString().split("T")[0],
          utcTimestamp: eventTime.getTime(),
          currency: "USD",
          country: "US",
          event: e.title,
          impact,
          forecast: e.forecast !== "" ? e.forecast : "—",
          previous: e.previous !== "" ? e.previous : "—",
          actual: isPast && e.actual && e.actual !== "" ? e.actual : undefined,
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
          preEventSummary: pre?.preEventSummary,
          preEventBullets: pre?.preEventBullets,
        };
      });

    // If API returned no upcoming events, inject known next-week schedule as fallback
    const hasUpcoming = mapped.some(e => e.status === "upcoming" || e.status === "live");
    const final = hasUpcoming ? mapped : [...mapped, ...buildFallbackUpcoming(now)];

    if (final.length > 0) {
      cache = { data: final, ts: Date.now() };
    }

    return NextResponse.json({ data: final, timestamp: Date.now(), count: final.length });
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
