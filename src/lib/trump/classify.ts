import type { TrumpPost } from "@/types";

const POLICY_MAP = [
  { category: "Tariffs",    keywords: ["tariff", "trade war", "trade deal", "import", "export", "customs", "duties"],        assets: ["DXY", "SPX", "EURUSD", "USDCAD"] },
  { category: "China",      keywords: ["china", "beijing", "xi jinping", "chinese", "taiwan"],                               assets: ["USDCAD", "SPX", "BTCUSD", "XAUUSD"] },
  { category: "Fed",        keywords: ["fed ", "federal reserve", "rate cut", "rate hike", "powell", "interest rate"],       assets: ["DXY", "US10Y", "XAUUSD", "SPX"] },
  { category: "Crypto",     keywords: ["bitcoin", "crypto", "digital asset", "blockchain", "ethereum"],                     assets: ["BTCUSD", "ETHUSD"] },
  { category: "Oil",        keywords: ["oil", "opec", "saudi", "energy", "pipeline", "drilling", "gas price"],              assets: ["USOIL", "USDCAD", "XAUUSD"] },
  { category: "Iran",       keywords: ["iran", "tehran", "hormuz", "sanctions", "nuclear deal"],                            assets: ["USOIL", "XAUUSD", "DXY"] },
  { category: "Russia",     keywords: ["russia", "putin", "ukraine", "moscow", "sanctions"],                                assets: ["XAUUSD", "USOIL", "EURUSD"] },
  { category: "Economy",    keywords: ["economy", "jobs", "gdp", "recession", "spending", "budget", "deficit"],             assets: ["SPX", "DXY", "US10Y"] },
  { category: "Geopolitics",keywords: ["military", "war", "nato", "defense", "bomb", "missile", "attack"],                  assets: ["XAUUSD", "USOIL", "DXY", "SPX"] },
  { category: "Government", keywords: ["congress", "senate", "shutdown", "executive order", "dhs", "fbi", "doj"],           assets: ["SPX", "DXY"] },
];

const IMPACT_TEMPLATES: Record<string, { whyItMatters: string; reaction: string }> = {
  Tariffs:     { whyItMatters: "Tariff threats directly impact trade flows, corporate earnings, and inflation expectations.", reaction: "USD volatile, equities under pressure, import-sensitive sectors hit hardest." },
  China:       { whyItMatters: "US-China tensions affect global supply chains, tech sector, and risk appetite.", reaction: "Risk-off across equities, AUD/NZD weakness, gold bid on uncertainty." },
  Fed:         { whyItMatters: "Presidential commentary on Fed policy creates uncertainty about central bank independence.", reaction: "USD weakens on rate cut pressure, gold supported, yields dip." },
  Crypto:      { whyItMatters: "Pro-crypto policy stance boosts institutional adoption narrative.", reaction: "BTC and altcoins bid, crypto equities supported." },
  Oil:         { whyItMatters: "Presidential energy policy directly impacts crude supply expectations.", reaction: "Oil prices react, CAD/NOK follow, inflation expectations adjust." },
  Iran:        { whyItMatters: "Iran tensions create geopolitical risk premium across energy and safe-haven assets.", reaction: "Oil and gold bid, DXY supported, equities pressured." },
  Russia:      { whyItMatters: "Russia-related developments affect European energy security and sanctions regime.", reaction: "EURUSD volatile, gold supported, oil sensitive to sanctions." },
  Economy:     { whyItMatters: "Presidential economic commentary shapes confidence and fiscal policy trajectory.", reaction: "Equities and USD respond to growth narrative." },
  Geopolitics: { whyItMatters: "Military actions and geopolitical escalation drive safe-haven flows.", reaction: "Gold and treasuries bid, equities sell-off, VIX elevated." },
  Government:  { whyItMatters: "Government shutdown threats create uncertainty for fiscal spending.", reaction: "Equities cautious, USD mixed." },
};

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

// Detect domestic political posts with no market relevance:
// endorsements, rally announcements, election commentary, social opinions
function isDomesticPolitics(text: string): boolean {
  const lower = text.toLowerCase();
  const domestic = [
    "congratulations", "congrats", "great win", "tremendous win", "strong win",
    "senator", "governor", "congressman", "candidate", "runoff", "primary",
    "rally for", "rallies for", "will do", "big rally", "beautiful rally",
    "campaign", "election", "will vote", "vegan", "open borders", "weak on crime",
    "god bless america", "make america great", "fake news", "witch hunt",
    "great career", "will remain my friend", "low iq", "insulting to",
  ];
  const market = [
    "tariff", "trade deal", "trade war", "sanction", "federal reserve", "rate cut",
    "rate hike", "interest rate", "china trade", "iran deal", "russia", "ukraine",
    "oil supply", "opec", "nuclear deal", "executive order", "shutdown", "dollar",
    "inflation", "gdp", "recession", "military strike", "military action", "air strike",
  ];
  const domesticHits = domestic.filter(s => lower.includes(s)).length;
  const marketHits   = market.filter(s => lower.includes(s)).length;
  return domesticHits >= 2 && marketHits === 0;
}

export function classifyPost(text: string) {
  // Short-circuit: domestic political posts have no market impact
  if (isDomesticPolitics(text)) {
    return { category: "Politics", assets: [] as string[], tags: ["politics"], isDomestic: true };
  }

  const lower = text.toLowerCase();
  let bestCategory = "Politics";
  let bestAssets: string[] = ["SPX", "DXY"];
  let bestScore = 0;
  const tags: string[] = [];
  for (const p of POLICY_MAP) {
    const hits = p.keywords.filter(k => lower.includes(k)).length;
    if (hits > bestScore) { bestScore = hits; bestCategory = p.category; bestAssets = p.assets; }
    if (hits > 0) tags.push(p.category.toLowerCase().replace(/\s/g, "-"));
  }
  return { category: bestCategory, assets: bestAssets, tags: tags.length > 0 ? tags : ["politics"], isDomestic: false };
}

export function deriveSentiment(text: string): "bullish" | "bearish" | "neutral" {
  // Domestic posts are market-neutral regardless of positive/negative tone
  if (isDomesticPolitics(text)) return "neutral";

  const h = text.toLowerCase();
  const bull = ["trade deal", "peace deal", "rate cut", "stimulus", "boost economy", "strong growth"];
  const bear = ["tariff", "sanction", "war", "shutdown", "rate hike", "recession", "attack", "nuclear"];
  const b = bull.filter(w => h.includes(w)).length;
  const s = bear.filter(w => h.includes(w)).length;
  return b > s ? "bullish" : s > b ? "bearish" : "neutral";
}

export function deriveImpactScore(text: string): number {
  // Domestic political endorsements/rallies/social commentary = near-zero market impact
  if (isDomesticPolitics(text)) return 1;

  const lower = text.toLowerCase();
  let score = 4;
  // Precise high-impact phrases only — avoid false positives from casual word use
  const hi = ["tariff", "trade war", "sanction", "nuclear deal", "shut down government",
               "executive order", "rate cut", "rate hike", "military strike", "military action",
               "air strike", "bomb", "invasion", "peace deal", "ceasefire"];
  const med = ["threaten", "warn", "demand", "urge", "impose", "announce deal", "propose"];
  score += hi.filter(w => lower.includes(w)).length * 1.5;
  score += med.filter(w => lower.includes(w)).length * 0.5;
  return Math.min(10, Math.round(score));
}

export function mapTruthSocialStatus(s: {
  id: string;
  created_at: string;
  content: string;
  reblog: unknown | null;
  in_reply_to_id: string | null;
  url?: string;
  reblogs_count?: number;
  favourites_count?: number;
  replies_count?: number;
  account?: { avatar?: string };
  card?: { title?: string; description?: string } | null;
}): Omit<TrumpPost, "goldImpact" | "goldReasoning" | "usdImpact" | "usdReasoning"> | null {
  if (s.reblog || s.in_reply_to_id) return null;
  const text = stripHtml(s.content) || s.card?.title || s.card?.description || "";
  if (!text) return null;
  const { category, assets, tags, isDomestic } = classifyPost(text);
  const template = isDomestic
    ? { whyItMatters: "Domestic political commentary — endorsement, rally, or social opinion with no direct market implications.", reaction: "No expected market reaction." }
    : (IMPACT_TEMPLATES[category] ?? IMPACT_TEMPLATES.Government);
  return {
    id: `ts-${s.id}`,
    timestamp: s.created_at,
    content: text,
    source: "Truth Social",
    postUrl: s.url ?? `https://truthsocial.com/@realDonaldTrump/${s.id}`,
    avatarUrl: s.account?.avatar,
    retruths: s.reblogs_count,
    likes: s.favourites_count,
    replies: s.replies_count,
    sentimentClassification: deriveSentiment(text),
    impactScore: deriveImpactScore(text),
    affectedAssets: [...new Set(assets)],
    policyCategory: category,
    whyItMatters: template.whyItMatters,
    potentialReaction: template.reaction,
    tags,
  };
}
