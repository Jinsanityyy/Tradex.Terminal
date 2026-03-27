import {
  AssetSnapshot, BiasData, Catalyst, EconomicEvent, TrumpPost,
  SessionSummary, NewsItem, AIBriefing, MarketNarrative, TradeContext,
} from "@/types";

// ==========================================
// ASSET SNAPSHOTS
// ==========================================
export const assetSnapshots: AssetSnapshot[] = [
  { symbol: "XAUUSD", name: "Gold", price: 3018.45, change: 12.30, changePercent: 0.41, bias: "bullish", class: "commodity", momentum: "strong" },
  { symbol: "DXY", name: "US Dollar Index", price: 103.82, change: -0.34, changePercent: -0.33, bias: "bearish", class: "forex", momentum: "moderate" },
  { symbol: "US10Y", name: "US 10Y Yield", price: 4.287, change: 0.032, changePercent: 0.75, bias: "bullish", class: "bond", momentum: "moderate" },
  { symbol: "SPX", name: "S&P 500", price: 5667.80, change: -23.40, changePercent: -0.41, bias: "bearish", class: "index", momentum: "weak" },
  { symbol: "NDX", name: "Nasdaq 100", price: 19842.50, change: -112.30, changePercent: -0.56, bias: "bearish", class: "index", momentum: "weak" },
  { symbol: "BTCUSD", name: "Bitcoin", price: 87245.00, change: 1340.00, changePercent: 1.56, bias: "bullish", class: "crypto", momentum: "strong" },
  { symbol: "EURUSD", name: "EUR/USD", price: 1.0842, change: 0.0023, changePercent: 0.21, bias: "bullish", class: "forex", momentum: "moderate" },
  { symbol: "GBPUSD", name: "GBP/USD", price: 1.2634, change: 0.0011, changePercent: 0.09, bias: "neutral", class: "forex", momentum: "weak" },
  { symbol: "USOIL", name: "Crude Oil WTI", price: 69.42, change: -0.87, changePercent: -1.24, bias: "bearish", class: "commodity", momentum: "moderate" },
  { symbol: "USDJPY", name: "USD/JPY", price: 150.23, change: -0.45, changePercent: -0.30, bias: "bearish", class: "forex", momentum: "moderate" },
];

// ==========================================
// MARKET BIAS DATA
// ==========================================
export const biasData: BiasData[] = [
  {
    asset: "Gold (XAUUSD)",
    bias: "bullish",
    confidence: 82,
    supportingFactors: [
      "Real yields declining as inflation expectations rise",
      "Geopolitical risk premium from Middle East tensions",
      "Central bank buying remains elevated (China, India, Turkey)",
      "DXY weakness supporting gold's upside",
      "ETF inflows accelerating — 3 consecutive weeks of positive flows",
    ],
    invalidationFactors: [
      "Hawkish Fed surprise pushing real yields sharply higher",
      "DXY breakout above 105.00 resistance",
      "De-escalation in Middle East geopolitics",
      "Risk-on rally pulling capital into equities",
    ],
    keyLevels: { support: 2980, resistance: 3050 },
    macroDrivers: ["Real yields", "USD weakness", "Geopolitical risk", "Central bank demand"],
    correlatedAssets: ["DXY (inverse)", "US10Y (inverse)", "Silver", "USDJPY (inverse)"],
    sessionBehavior: "London session typically drives directional moves; Asia accumulation phase.",
  },
  {
    asset: "US Dollar (DXY)",
    bias: "bearish",
    confidence: 68,
    supportingFactors: [
      "Fed rate cut expectations increasing — June pricing at 72%",
      "Soft labor market data weakening USD fundamentals",
      "Trump tariff uncertainty creating capital outflow concerns",
      "EUR strength from hawkish ECB relative stance",
    ],
    invalidationFactors: [
      "Hot CPI print re-pricing Fed to hold longer",
      "Flight to safety bid on major risk event",
      "Strong NFP surprise above 250K",
      "Tariff escalation triggering safe-haven USD demand",
    ],
    keyLevels: { support: 103.00, resistance: 104.50 },
    macroDrivers: ["Fed policy expectations", "Relative rate differentials", "Risk sentiment"],
    correlatedAssets: ["EURUSD (inverse)", "Gold (inverse)", "US10Y", "USDJPY"],
    sessionBehavior: "NY session most impactful for DXY; London sets the tone.",
  },
  {
    asset: "S&P 500 (SPX)",
    bias: "bearish",
    confidence: 58,
    supportingFactors: [
      "Tariff uncertainty weighing on forward earnings estimates",
      "Rising yields compressing equity valuations",
      "Breadth deteriorating — mega-cap concentration risk",
      "VIX elevated above 20, signaling hedging activity",
    ],
    invalidationFactors: [
      "Tariff de-escalation or trade deal framework",
      "Fed dovish pivot signaling earlier cuts",
      "Strong Q1 earnings beating lowered expectations",
      "VIX crush below 16 with breadth improvement",
    ],
    keyLevels: { support: 5580, resistance: 5720 },
    macroDrivers: ["Trade policy", "Earnings expectations", "Fed rate path", "Yields"],
    correlatedAssets: ["NDX", "VIX (inverse)", "US10Y (inverse for growth)", "DXY"],
    sessionBehavior: "Pre-market futures set the tone; first 30min of NY often reverses overnight moves.",
  },
  {
    asset: "Bitcoin (BTC)",
    bias: "bullish",
    confidence: 72,
    supportingFactors: [
      "ETF inflows strong — BlackRock IBIT seeing consistent demand",
      "Halving cycle momentum historically bullish at this stage",
      "Macro liquidity expectations improving with rate cut pricing",
      "On-chain metrics showing accumulation by long-term holders",
    ],
    invalidationFactors: [
      "Risk-off event triggering correlation with equities sell-off",
      "Regulatory crackdown or ETF outflow acceleration",
      "DXY breakout strengthening fiat preference",
      "Break below $82,000 key support invalidates structure",
    ],
    keyLevels: { support: 82000, resistance: 92000 },
    macroDrivers: ["Liquidity expectations", "ETF flows", "Risk appetite", "Halving cycle"],
    correlatedAssets: ["NDX", "SPX", "Gold (partial)", "ETH"],
    sessionBehavior: "24/7 market; US session tends to set direction; Asia often mean-reverts.",
  },
];

// ==========================================
// CATALYSTS
// ==========================================
export const catalysts: Catalyst[] = [
  {
    id: "cat-1",
    title: "Trump Announces 25% Tariffs on EU Auto Imports",
    timestamp: "2025-03-25T14:30:00Z",
    affectedMarkets: ["EURUSD", "DAX", "SPX", "DXY"],
    importance: "high",
    status: "live",
    explanation: "President Trump signed executive order imposing 25% tariffs on European automobile imports effective April 2. EU threatened retaliatory measures on US tech exports.",
    marketImplication: "USD-positive short-term on safe-haven; EURUSD bearish; European equities under pressure; US auto stocks mixed.",
    sentimentTag: "bearish",
  },
  {
    id: "cat-2",
    title: "Fed Governor Waller Signals Openness to June Cut",
    timestamp: "2025-03-25T12:15:00Z",
    affectedMarkets: ["DXY", "US10Y", "Gold", "SPX"],
    importance: "high",
    status: "completed",
    explanation: "Waller stated that 'if disinflation continues at current pace, a June adjustment would be appropriate.' Markets repriced June cut probability from 58% to 72%.",
    marketImplication: "Dovish USD; yields lower; gold and equities supported. Key for rate-sensitive positioning.",
    sentimentTag: "bullish",
  },
  {
    id: "cat-3",
    title: "China PBoC Cuts RRR by 50bps",
    timestamp: "2025-03-25T02:00:00Z",
    affectedMarkets: ["USDCNH", "Copper", "AUD", "HSI"],
    importance: "high",
    status: "completed",
    explanation: "PBoC cut reserve requirement ratio by 50bps to support slowing economy. Releases ~$140B in liquidity. Signals growing concern about deflationary pressures.",
    marketImplication: "CNH weakening; commodity-linked FX supported; copper bid; risk appetite marginal positive.",
    sentimentTag: "bullish",
  },
  {
    id: "cat-4",
    title: "US Consumer Confidence Falls to 14-Month Low",
    timestamp: "2025-03-25T15:00:00Z",
    affectedMarkets: ["SPX", "DXY", "US10Y"],
    importance: "medium",
    status: "completed",
    explanation: "Conference Board Consumer Confidence Index dropped to 92.3 vs 96.0 expected, lowest since January 2024. Present conditions and expectations both declined.",
    marketImplication: "Growth concerns rising; supports Fed cut narrative; USD and yields softer; equities mixed on growth vs rate cut trade-off.",
    sentimentTag: "bearish",
  },
  {
    id: "cat-5",
    title: "Israel-Hezbollah Ceasefire Talks Collapse",
    timestamp: "2025-03-25T10:45:00Z",
    affectedMarkets: ["Gold", "Oil", "VIX"],
    importance: "medium",
    status: "live",
    explanation: "Diplomatic sources report ceasefire negotiations broke down after Hezbollah rejected key security provisions. Military activity intensifying along northern border.",
    marketImplication: "Risk premium bid for gold and oil; VIX supported; safe-haven flows into treasuries.",
    sentimentTag: "bearish",
  },
  {
    id: "cat-6",
    title: "ECB Lagarde: 'We Are Not Done Fighting Inflation'",
    timestamp: "2025-03-25T09:30:00Z",
    affectedMarkets: ["EURUSD", "Bund", "DAX"],
    importance: "medium",
    status: "completed",
    explanation: "Lagarde pushed back against rate cut expectations, stating sticky services inflation requires continued vigilance. June cut pricing dropped from 45% to 30%.",
    marketImplication: "EUR-positive; rate differential supports EURUSD; European bonds selling off.",
    sentimentTag: "bullish",
  },
];

// ==========================================
// ECONOMIC EVENTS
// ==========================================
export const economicEvents: EconomicEvent[] = [
  {
    id: "ev-1", time: "08:30", currency: "USD", country: "US",
    event: "Durable Goods Orders (MoM)", impact: "high",
    forecast: "1.0%", previous: "-6.2%", actual: "0.9%",
    deviation: "-0.1%", interpretation: "Slightly below forecast but strong rebound from prior month's decline. Manufacturing recovery narrative intact. Neutral-to-slight USD negative.",
    affectedAssets: ["DXY", "US10Y", "SPX"], status: "completed",
  },
  {
    id: "ev-2", time: "10:00", currency: "USD", country: "US",
    event: "Consumer Confidence", impact: "high",
    forecast: "96.0", previous: "98.3", actual: "92.3",
    deviation: "-3.7", interpretation: "Significant miss. Consumers increasingly pessimistic about labor market and business conditions. Supports Fed cut pricing. USD-negative, gold-positive.",
    affectedAssets: ["DXY", "Gold", "SPX", "US10Y"], status: "completed",
  },
  {
    id: "ev-3", time: "10:00", currency: "USD", country: "US",
    event: "New Home Sales", impact: "medium",
    forecast: "680K", previous: "664K", actual: "662K",
    deviation: "-18K", interpretation: "Below expectations. Housing sector remains sluggish amid elevated mortgage rates. Marginal negative for USD.",
    affectedAssets: ["SPX", "US10Y"], status: "completed",
  },
  {
    id: "ev-4", time: "13:00", currency: "USD", country: "US",
    event: "5-Year Note Auction", impact: "medium",
    forecast: "4.12%", previous: "4.06%",
    affectedAssets: ["US10Y", "DXY"], status: "upcoming",
  },
  {
    id: "ev-5", time: "08:30", currency: "USD", country: "US",
    event: "GDP (QoQ) — Final", impact: "high",
    forecast: "3.2%", previous: "3.2%",
    affectedAssets: ["DXY", "SPX", "US10Y"], status: "upcoming",
  },
  {
    id: "ev-6", time: "08:30", currency: "USD", country: "US",
    event: "Initial Jobless Claims", impact: "medium",
    forecast: "225K", previous: "223K",
    affectedAssets: ["DXY", "US10Y"], status: "upcoming",
  },
  {
    id: "ev-7", time: "10:00", currency: "USD", country: "US",
    event: "Pending Home Sales (MoM)", impact: "medium",
    forecast: "1.5%", previous: "-4.6%",
    affectedAssets: ["SPX"], status: "upcoming",
  },
  {
    id: "ev-8", time: "08:30", currency: "USD", country: "US",
    event: "Core PCE Price Index (MoM)", impact: "high",
    forecast: "0.3%", previous: "0.3%",
    affectedAssets: ["DXY", "Gold", "SPX", "US10Y"], status: "upcoming",
  },
];

// ==========================================
// TRUMP POSTS
// ==========================================
export const trumpPosts: TrumpPost[] = [
  {
    id: "tr-1",
    timestamp: "2025-03-25T14:22:00Z",
    content: "The European Union has been ripping off the United States for DECADES on trade. Their cars flood our market while they block ours. 25% AUTO TARIFFS start April 2nd. FAIR TRADE, not FREE TRADE!",
    source: "Truth Social",
    sentimentClassification: "bearish",
    impactScore: 9,
    affectedAssets: ["EURUSD", "DAX", "SPX", "DXY", "BMW", "VOW"],
    policyCategory: "Tariffs",
    whyItMatters: "Direct tariff announcement targeting EU's largest export sector. Previous auto tariff threats caused 2-3% DAX drops. EU retaliation risk creates bilateral escalation.",
    potentialReaction: "EURUSD sell-off; European equities under pressure; USD bid on safe-haven; gold supported on uncertainty.",
    tags: ["tariffs", "trade-policy", "EU", "auto"],
  },
  {
    id: "tr-2",
    timestamp: "2025-03-25T11:45:00Z",
    content: "Chairman Powell and the Fed are BEHIND THE CURVE as usual. Inflation is coming down FAST and they refuse to cut rates. We need LOWER RATES NOW to keep America competitive!",
    source: "Truth Social",
    sentimentClassification: "bullish",
    impactScore: 7,
    affectedAssets: ["DXY", "US10Y", "Gold", "SPX"],
    policyCategory: "Fed",
    whyItMatters: "Presidential pressure on Fed independence is a recurring theme. While Fed maintains independence, markets watch for potential policy influence signals. Historically these posts don't move Fed but increase volatility around meetings.",
    potentialReaction: "Marginal USD-negative as markets price political interference risk; gold bid on uncertainty; yields dip on cut expectations.",
    tags: ["fed", "rates", "monetary-policy"],
  },
  {
    id: "tr-3",
    timestamp: "2025-03-25T08:30:00Z",
    content: "China is devaluing their currency AGAIN to offset our tariffs. This is CURRENCY MANIPULATION and we will respond accordingly. MASSIVE tariffs coming on more Chinese goods!",
    source: "Truth Social",
    sentimentClassification: "bearish",
    impactScore: 8,
    affectedAssets: ["USDCNH", "SPX", "Copper", "AUDUSD", "BTC"],
    policyCategory: "China",
    whyItMatters: "Escalation in US-China trade rhetoric directly impacts global risk sentiment. CNH weakness allegations could trigger additional tariffs beyond current levels. Supply chain disruption fears resurface.",
    potentialReaction: "Risk-off across equities; AUD and commodity FX weakness; copper under pressure; DXY mixed (safe-haven vs trade damage).",
    tags: ["china", "tariffs", "currency", "trade-policy"],
  },
  {
    id: "tr-4",
    timestamp: "2025-03-24T20:15:00Z",
    content: "Bitcoin is the future and America will be the CRYPTO CAPITAL of the world. We are creating the most crypto-friendly regulatory framework ever seen. BUY AMERICAN, BUY CRYPTO!",
    source: "Truth Social",
    sentimentClassification: "bullish",
    impactScore: 6,
    affectedAssets: ["BTC", "ETH", "SOL", "Coinbase"],
    policyCategory: "Crypto",
    whyItMatters: "Pro-crypto stance from sitting president supports institutional adoption narrative. Regulatory clarity expectations boost sentiment. Previous similar posts triggered 3-5% BTC rallies.",
    potentialReaction: "BTC and crypto market bid; crypto-related equities supported; marginal risk-on for broader markets.",
    tags: ["crypto", "regulation", "bitcoin"],
  },
  {
    id: "tr-5",
    timestamp: "2025-03-24T16:00:00Z",
    content: "Just had a GREAT call with MBS of Saudi Arabia. Oil prices are too high and they agree. Production increases coming. ENERGY DOMINANCE!",
    source: "Truth Social",
    sentimentClassification: "bearish",
    impactScore: 7,
    affectedAssets: ["USOIL", "XLE", "USDCAD", "USDRUB"],
    policyCategory: "Oil",
    whyItMatters: "Trump-Saudi coordination on oil output directly impacts crude prices. OPEC+ production increase expectations weigh on oil. Lower oil = lower inflation expectations = supports rate cut narrative.",
    potentialReaction: "Oil sell-off; energy stocks under pressure; CAD weakness; inflation expectations lower; indirect gold support via lower real yields.",
    tags: ["oil", "saudi", "energy", "geopolitics"],
  },
  {
    id: "tr-6",
    timestamp: "2025-03-24T12:30:00Z",
    content: "The Fake News media won't report it but our economy is BOOMING. Stock market near all-time highs. Jobs everywhere. THANK YOU PRESIDENT TRUMP!",
    source: "Truth Social",
    sentimentClassification: "bullish",
    impactScore: 3,
    affectedAssets: ["SPX"],
    policyCategory: "Economy",
    whyItMatters: "Generic bullish rhetoric with no policy substance. Low market impact but indicates administration comfort with current economic trajectory.",
    potentialReaction: "Minimal direct market impact. Noise, not signal.",
    tags: ["economy", "markets"],
  },
];

// ==========================================
// SESSION SUMMARIES
// ==========================================
export const sessionSummaries: SessionSummary[] = [
  {
    session: "asia",
    status: "closed",
    keyMoves: [
      "Gold rallied $8 to $3015 on PBoC RRR cut and safe-haven demand",
      "USDJPY dipped to 149.80 before recovering to 150.20",
      "Nikkei closed -0.3% on tariff uncertainty",
      "AUD bid on China stimulus hopes — AUDUSD +0.35%",
      "Bitcoin pushed above $87K on Asia-hour accumulation",
    ],
    volatilityTone: "moderate",
    liquidityNotes: "Thin liquidity in early Asia; improved after PBoC announcement. JPY crosses saw stop hunting around 149.80 level.",
    keyLevels: ["Gold $3000 support held", "USDJPY 149.80 key support", "Nikkei 39,500 support"],
    whatChanged: "PBoC RRR cut shifted sentiment — commodity FX and gold caught a bid. Risk appetite marginally improved.",
    carriesForward: "Gold momentum into London; JPY weakness on yield differential; China stimulus expectations supporting AUD.",
  },
  {
    session: "london",
    status: "active",
    keyMoves: [
      "EURUSD rallied to 1.0850 on hawkish Lagarde comments",
      "Gold extended to $3018 — London buyers stepping in",
      "DXY broke below 104.00 handle on EUR strength and soft data",
      "UK CPI came in hot — GBPUSD spiked to 1.2650 before fading",
      "European equities mixed — DAX -0.4% on tariff fears, FTSE +0.2%",
    ],
    volatilityTone: "high",
    liquidityNotes: "Strong liquidity in London session. Volatility elevated on ECB commentary and tariff headlines. Spread widening in EURUSD during Lagarde speech.",
    keyLevels: ["EURUSD 1.0870 resistance", "DXY 103.50 support", "Gold $3025 next resistance", "DAX 18,200 support"],
    whatChanged: "Lagarde hawkish pivot strengthened EUR and shifted rate differential narrative. Tariff headlines offsetting risk appetite.",
    carriesForward: "EUR strength into NY; gold bid; tariff uncertainty may dominate US session; consumer confidence data ahead.",
  },
  {
    session: "new-york",
    status: "upcoming",
    keyMoves: [
      "Consumer Confidence at 10:00 ET — key for sentiment",
      "5-Year Note Auction at 13:00 ET — demand gauge",
      "Trump tariff headlines may escalate during US hours",
      "Fed Waller speech impact may continue to be digested",
    ],
    volatilityTone: "high",
    liquidityNotes: "Full liquidity expected. Overlap with London (8-12 ET) typically highest volume period. Watch for position squaring into month-end.",
    keyLevels: ["SPX 5650 support", "NDX 19,750 key level", "DXY 103.50 break opens 103.00", "Gold $3025-3050 resistance zone"],
    whatChanged: "Pre-NY: dovish Waller, hawkish Lagarde, China RRR cut, Trump tariff headlines all creating multi-directional catalysts.",
    carriesForward: "Data-dependent session. Consumer confidence sets tone for growth narrative. Tariff headlines are the wildcard.",
  },
];

// ==========================================
// NEWS ITEMS
// ==========================================
export const newsItems: NewsItem[] = [
  { id: "n-1", timestamp: "2025-03-25T15:10:00Z", headline: "Consumer Confidence Plunges to 14-Month Low Amid Tariff Fears", category: "economy", sentiment: "bearish", impactScore: 8, affectedAssets: ["SPX", "DXY", "US10Y"], summary: "Conference Board index fell to 92.3 vs 96.0 expected, with both present conditions and expectations declining sharply.", source: "Reuters" },
  { id: "n-2", timestamp: "2025-03-25T14:35:00Z", headline: "White House Confirms 25% EU Auto Tariffs — Effective April 2", category: "tariffs", sentiment: "bearish", impactScore: 9, affectedAssets: ["EURUSD", "DAX", "SPX", "DXY"], summary: "Administration confirms tariff order signed. EU trade commissioner warns of 'swift and proportionate' response.", source: "Bloomberg" },
  { id: "n-3", timestamp: "2025-03-25T12:20:00Z", headline: "Fed's Waller: June Cut 'Appropriate' If Disinflation Continues", category: "central-banks", sentiment: "bullish", impactScore: 8, affectedAssets: ["DXY", "US10Y", "Gold", "SPX"], summary: "Most explicit signal yet from a Fed governor supporting near-term rate cut. CME FedWatch June probability jumped to 72%.", source: "CNBC" },
  { id: "n-4", timestamp: "2025-03-25T09:35:00Z", headline: "ECB Lagarde Pushes Back on Rate Cut Expectations", category: "central-banks", sentiment: "bullish", impactScore: 7, affectedAssets: ["EURUSD", "Bund", "DAX"], summary: "ECB President signals more work needed on inflation. June cut pricing drops to 30%.", source: "Financial Times" },
  { id: "n-5", timestamp: "2025-03-25T02:15:00Z", headline: "PBoC Cuts Reserve Requirement Ratio by 50bps", category: "central-banks", sentiment: "bullish", impactScore: 7, affectedAssets: ["USDCNH", "Copper", "AUDUSD", "HSI"], summary: "China's central bank eases monetary policy, releasing ~$140B in liquidity to support slowing economy.", source: "Xinhua" },
  { id: "n-6", timestamp: "2025-03-25T10:50:00Z", headline: "Israel-Hezbollah Ceasefire Negotiations Break Down", category: "geopolitics", sentiment: "bearish", impactScore: 6, affectedAssets: ["Gold", "Oil", "VIX"], summary: "Diplomatic sources confirm talks collapsed. Military escalation risk rising along northern border.", source: "Al Jazeera" },
  { id: "n-7", timestamp: "2025-03-25T08:00:00Z", headline: "UK CPI Surprises to the Upside at 3.4% YoY", category: "inflation", sentiment: "bearish", impactScore: 5, affectedAssets: ["GBPUSD", "Gilt"], summary: "UK inflation remains sticky above BoE target. Rate cut expectations pushed back.", source: "ONS" },
  { id: "n-8", timestamp: "2025-03-25T13:00:00Z", headline: "BlackRock IBIT Bitcoin ETF Sees $340M Daily Inflow", category: "crypto", sentiment: "bullish", impactScore: 5, affectedAssets: ["BTC", "ETH"], summary: "Institutional demand for Bitcoin ETFs continues with largest single-day inflow this week.", source: "CoinDesk" },
  { id: "n-9", timestamp: "2025-03-25T11:30:00Z", headline: "US Durable Goods Orders Rebound 0.9% — Slightly Below Forecast", category: "economy", sentiment: "neutral", impactScore: 4, affectedAssets: ["DXY", "SPX"], summary: "Strong recovery from -6.2% prior but missed 1.0% forecast. Manufacturing stabilization continues.", source: "BLS" },
  { id: "n-10", timestamp: "2025-03-25T07:00:00Z", headline: "Goldman Sachs Raises Gold Target to $3,200 on Central Bank Buying", category: "commodities", sentiment: "bullish", impactScore: 5, affectedAssets: ["Gold", "Silver"], summary: "GS upgrades gold forecast citing structural demand from central banks and geopolitical hedging.", source: "Goldman Sachs Research" },
];

// ==========================================
// AI BRIEFINGS
// ==========================================
export const aiBriefings: AIBriefing[] = [
  {
    id: "brief-1",
    type: "market-open",
    title: "Pre-Market Intelligence Brief",
    timestamp: "2025-03-25T12:00:00Z",
    whatHappened: "Asia session was defined by the PBoC RRR cut, which injected $140B in liquidity and lifted commodity-linked assets. Gold rallied to $3015 on safe-haven and CNH weakness flows. USDJPY tested 149.80 before recovering. China stimulus expectations supported AUD.",
    whyItMatters: "The PBoC move signals growing concern about China's deflationary trajectory. This has second-order effects: commodity demand expectations, global liquidity conditions, and risk appetite. Combined with overnight Trump tariff rhetoric against China, the macro landscape is increasingly fragmented.",
    whatChanged: "China stimulus shifted the liquidity narrative; Fed's Waller pre-speech leaks suggested dovish tilt; Trump tariff escalation against EU is a new development adding to trade uncertainty.",
    whatToWatch: [
      "Consumer Confidence at 10:00 ET — growth sentiment gauge",
      "EU response to auto tariff announcement",
      "5-Year auction demand — tests treasury market appetite",
      "Gold $3025-3050 resistance zone reaction",
      "DXY 103.50 support — break opens 103.00",
    ],
    biasSupport: [
      "Fed Waller dovish signal supports rate-sensitive assets",
      "PBoC easing supports commodity complex",
      "Geopolitical risk premium keeping gold bid",
    ],
    biasInvalidation: [
      "Hot consumer confidence could delay Fed cut expectations",
      "Risk-off panic on tariff escalation could lift DXY on safe-haven",
      "Strong auction demand could push yields higher, pressuring gold",
    ],
  },
  {
    id: "brief-2",
    type: "mid-session",
    title: "Mid-Session Update — London/NY Overlap",
    timestamp: "2025-03-25T16:00:00Z",
    whatHappened: "Consumer Confidence cratered to 92.3, well below 96.0 forecast. This is the weakest reading in 14 months. DXY dropped below 103.80 on the data. Gold spiked to $3018. Trump officially signed EU auto tariff order — 25% effective April 2. EURUSD volatile — initially sold on tariff headlines then recovered on DXY weakness.",
    whyItMatters: "The consumer confidence miss reinforces the growth slowdown narrative and strengthens the case for Fed cuts. However, tariff escalation creates a stagflationary risk — growth slowing while tariffs add inflationary pressure. This tension will define the next few weeks of trading.",
    whatChanged: "Consumer confidence miss shifted growth expectations lower. Tariff order formalized — no longer just rhetoric. EU retaliation threats make this a bilateral escalation. Rate cut pricing at 72% for June — highest since February.",
    whatToWatch: [
      "EU's formal response to tariff announcement",
      "Treasury auction results at 13:00 ET",
      "Any additional Trump posts on tariffs or Fed",
      "Gold's ability to hold above $3015",
      "SPX 5650 support level test",
    ],
    biasSupport: [
      "Weak consumer confidence cements dovish Fed expectations",
      "DXY weakness supports gold and EUR",
      "Geopolitical risk premium elevated",
    ],
    biasInvalidation: [
      "EU de-escalation response could calm trade fears",
      "Strong auction could stabilize yields",
      "If consumer spending data contradicts confidence survey",
    ],
  },
];

// ==========================================
// MARKET NARRATIVE
// ==========================================
export const marketNarrative: MarketNarrative = {
  summary: "Markets are navigating a fragmented macro landscape: dovish Fed signals and weak US data support rate-sensitive assets, while Trump tariff escalation creates trade uncertainty. Gold benefits from both narratives — lower yields and geopolitical risk. DXY caught between safe-haven demand and rate cut pricing. Equities face headwinds from trade policy uncertainty despite improved liquidity expectations.",
  regime: "policy-headline",
  dominantTheme: "Fed Dovish Pivot vs Tariff Escalation",
  conviction: 72,
};

// ==========================================
// TRADE CONTEXT
// ==========================================
export const tradeContext: TradeContext = {
  condition: "Volatile, headline-driven, multi-catalyst environment. High conviction on rate-sensitive themes but tariff wildcard creates two-way risk.",
  directionalLean: "Bullish gold, bearish DXY, cautiously bearish equities. Bitcoin structurally supported but correlated to risk sentiment.",
  cautionFactors: [
    "Tariff headlines can flip sentiment in seconds",
    "Month-end rebalancing flows may distort price action",
    "Consumer confidence miss may be priced in quickly",
    "Geopolitical escalation risk remains elevated",
  ],
  idealMindset: "Patient, selective execution. Focus on high-conviction setups with clear invalidation. Don't chase headline reactions — wait for the secondary move. This is a market for prepared traders, not reactive ones.",
};
