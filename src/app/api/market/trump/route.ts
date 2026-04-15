import { NextResponse } from "next/server";
import type { TrumpPost } from "@/types";

export const dynamic = "force-dynamic";

let cache: { data: TrumpPost[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 120_000; // 2 min

// Policy categories & their keywords
const POLICY_MAP: { category: string; keywords: string[]; assets: string[] }[] = [
  { category: "Tariffs", keywords: ["tariff", "trade war", "trade deal", "import", "export", "customs", "duties"], assets: ["DXY", "SPX", "EURUSD", "USDCAD"] },
  { category: "China", keywords: ["china", "beijing", "xi jinping", "chinese", "taiwan"], assets: ["USDCAD", "SPX", "BTCUSD", "XAUUSD"] },
  { category: "Fed", keywords: ["fed ", "federal reserve", "rate cut", "rate hike", "powell", "interest rate", "monetary"], assets: ["DXY", "US10Y", "XAUUSD", "SPX"] },
  { category: "Crypto", keywords: ["bitcoin", "crypto", "digital asset", "blockchain", "ethereum"], assets: ["BTCUSD", "ETHUSD"] },
  { category: "Oil", keywords: ["oil", "opec", "saudi", "energy", "pipeline", "drilling", "gas price"], assets: ["USOIL", "USDCAD", "XAUUSD"] },
  { category: "Iran", keywords: ["iran", "tehran", "hormuz", "sanctions", "nuclear deal"], assets: ["USOIL", "XAUUSD", "DXY"] },
  { category: "Russia", keywords: ["russia", "putin", "ukraine", "moscow", "sanctions"], assets: ["XAUUSD", "USOIL", "EURUSD"] },
  { category: "Economy", keywords: ["economy", "jobs", "gdp", "recession", "spending", "budget", "deficit", "debt ceiling"], assets: ["SPX", "DXY", "US10Y"] },
  { category: "Geopolitics", keywords: ["military", "war", "nato", "defense", "bomb", "missile", "attack"], assets: ["XAUUSD", "USOIL", "DXY", "SPX"] },
  { category: "Government", keywords: ["congress", "senate", "shutdown", "executive order", "dhs", "fbi", "doj"], assets: ["SPX", "DXY"] },
];

// Market impact reasoning templates
const IMPACT_TEMPLATES: Record<string, { whyItMatters: string; reaction: string }> = {
  Tariffs: {
    whyItMatters: "Tariff threats directly impact trade flows, corporate earnings, and inflation expectations. Markets reprice supply chain costs and retaliatory risks.",
    reaction: "USD volatile (safe-haven vs growth damage), equities under pressure, import-sensitive sectors hit hardest.",
  },
  China: {
    whyItMatters: "US-China tensions affect global supply chains, tech sector, commodity demand, and risk appetite across all asset classes.",
    reaction: "Risk-off across equities, AUD/NZD weakness on China proxy, gold bid on uncertainty, crypto volatile.",
  },
  Fed: {
    whyItMatters: "Presidential commentary on Fed policy creates uncertainty about central bank independence. Markets watch for potential policy influence signals.",
    reaction: "USD weakens on rate cut pressure, gold supported, yields dip on dovish expectations. Bond market volatility rises.",
  },
  Crypto: {
    whyItMatters: "Pro-crypto policy stance boosts institutional adoption narrative and regulatory clarity expectations.",
    reaction: "BTC and altcoins bid, crypto-related equities supported, marginal positive for broader risk sentiment.",
  },
  Oil: {
    whyItMatters: "Presidential energy policy directly impacts crude supply expectations, inflation outlook, and petro-currency dynamics.",
    reaction: "Oil prices react to supply signals, CAD/NOK follow, inflation expectations adjust, gold indirectly affected.",
  },
  Iran: {
    whyItMatters: "Iran tensions create geopolitical risk premium across energy and safe-haven assets. Hormuz Strait disruption risk affects global oil supply.",
    reaction: "Oil and gold bid on risk premium, DXY supported on safe-haven, equities pressured on escalation fears.",
  },
  Russia: {
    whyItMatters: "Russia-related developments affect European energy security, sanctions regime, and global geopolitical risk calculus.",
    reaction: "EURUSD volatile, gold supported, oil price sensitive to sanctions, defense stocks react.",
  },
  Economy: {
    whyItMatters: "Presidential economic commentary shapes consumer/business confidence, spending expectations, and fiscal policy trajectory.",
    reaction: "Equities and USD respond to growth narrative, yields move on deficit expectations.",
  },
  Geopolitics: {
    whyItMatters: "Military actions and geopolitical escalation drive safe-haven flows and risk repricing across global markets.",
    reaction: "Gold and treasuries bid, equities sell-off, oil spiked on supply risk, VIX elevated.",
  },
  Government: {
    whyItMatters: "Government shutdown threats and policy changes create uncertainty for fiscal spending and regulatory environment.",
    reaction: "Equities cautious, USD mixed, credit markets watch for government funding risks.",
  },
};

function classifyPost(headline: string, summary: string): {
  category: string;
  assets: string[];
  tags: string[];
} {
  const text = (headline + " " + summary).toLowerCase();
  let bestCategory = "Politics";
  let bestAssets: string[] = ["SPX", "DXY"];
  let bestScore = 0;
  const tags: string[] = [];

  for (const policy of POLICY_MAP) {
    const hits = policy.keywords.filter(k => text.includes(k)).length;
    if (hits > bestScore) {
      bestScore = hits;
      bestCategory = policy.category;
      bestAssets = policy.assets;
    }
    if (hits > 0) {
      tags.push(policy.category.toLowerCase().replace(/\s/g, "-"));
    }
  }

  return { category: bestCategory, assets: bestAssets, tags: tags.length > 0 ? tags : ["politics"] };
}

function deriveSentiment(headline: string): "bullish" | "bearish" | "neutral" {
  const h = headline.toLowerCase();
  const bull = ["deal", "agree", "peace", "boost", "support", "pro-", "bullish", "win", "success", "present"];
  const bear = ["threat", "war", "sanction", "attack", "block", "ban", "shutdown", "hit", "urge", "drastic", "harder", "blow", "defeat"];
  const b = bull.filter(w => h.includes(w)).length;
  const s = bear.filter(w => h.includes(w)).length;
  return b > s ? "bullish" : s > b ? "bearish" : "neutral";
}

function deriveImpactScore(headline: string, summary: string): number {
  const text = (headline + " " + summary).toLowerCase();
  let score = 5; // base
  const highImpact = ["tariff", "war", "sanction", "nuclear", "shut down", "executive order", "deal", "attack", "military"];
  const medImpact = ["threaten", "warn", "demand", "urge", "announce", "plan", "propose"];
  score += highImpact.filter(w => text.includes(w)).length * 1.5;
  score += medImpact.filter(w => text.includes(w)).length * 0.5;
  return Math.min(10, Math.round(score));
}

// ── Static fallback posts when Finnhub key unavailable ──────────────────────
const FALLBACK_POSTS: TrumpPost[] = [
  {
    id: "trump-fallback-1",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    content: "Trump administration signals new tariff package targeting key trading partners — escalation risk for global markets",
    source: "Reuters",
    sentimentClassification: "bearish",
    impactScore: 9,
    affectedAssets: ["DXY", "SPX", "EURUSD", "XAUUSD"],
    policyCategory: "Tariffs",
    whyItMatters: IMPACT_TEMPLATES.Tariffs.whyItMatters,
    potentialReaction: IMPACT_TEMPLATES.Tariffs.reaction,
    tags: ["tariffs", "trade-war"],
  },
  {
    id: "trump-fallback-2",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    content: "President Trump calls on Federal Reserve to cut interest rates immediately — 'they should lower rates now'",
    source: "Truth Social",
    sentimentClassification: "bullish",
    impactScore: 8,
    affectedAssets: ["DXY", "XAUUSD", "SPX", "US10Y"],
    policyCategory: "Fed",
    whyItMatters: IMPACT_TEMPLATES.Fed.whyItMatters,
    potentialReaction: IMPACT_TEMPLATES.Fed.reaction,
    tags: ["fed", "rate-cut"],
  },
  {
    id: "trump-fallback-3",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    content: "Trump threatens additional 50% tariffs on China if trade talks fail to progress within two weeks",
    source: "Bloomberg",
    sentimentClassification: "bearish",
    impactScore: 9,
    affectedAssets: ["SPX", "USDCAD", "BTCUSD", "XAUUSD"],
    policyCategory: "China",
    whyItMatters: IMPACT_TEMPLATES.China.whyItMatters,
    potentialReaction: IMPACT_TEMPLATES.China.reaction,
    tags: ["china", "tariffs"],
  },
  {
    id: "trump-fallback-4",
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    content: "White House confirms executive order on domestic energy production — push for increased oil and gas drilling",
    source: "AP",
    sentimentClassification: "bearish",
    impactScore: 7,
    affectedAssets: ["USOIL", "USDCAD", "XAUUSD"],
    policyCategory: "Oil",
    whyItMatters: IMPACT_TEMPLATES.Oil.whyItMatters,
    potentialReaction: IMPACT_TEMPLATES.Oil.reaction,
    tags: ["oil", "energy"],
  },
];

export async function GET() {
  if (cache.data.length > 0 && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ data: cache.data, timestamp: cache.ts, cached: true });
  }

  try {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) {
      // Return static fallback — better than empty when API key not configured
      return NextResponse.json({ data: FALLBACK_POSTS, timestamp: Date.now(), fallback: true });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${key}`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Finnhub: ${res.status}`);

    const allNews: {
      id: number;
      headline: string;
      summary: string;
      source: string;
      datetime: number;
      url: string;
    }[] = await res.json();

    // Filter for Trump-related content
    const trumpNews = allNews.filter(n =>
      (n.headline + " " + n.summary).toLowerCase().match(/trump|white house|president.*us|potus|oval office|truth social/)
    );

    const posts: TrumpPost[] = trumpNews.slice(0, 15).map((item, i) => {
      const { category, assets, tags } = classifyPost(item.headline, item.summary);
      const sentiment = deriveSentiment(item.headline);
      const impactScore = deriveImpactScore(item.headline, item.summary);
      const template = IMPACT_TEMPLATES[category] ?? IMPACT_TEMPLATES.Government;

      return {
        id: `tp-${item.id ?? i}`,
        timestamp: new Date(item.datetime * 1000).toISOString(),
        content: item.headline,
        source: item.source ?? "News",
        sentimentClassification: sentiment,
        impactScore,
        affectedAssets: [...new Set(assets)],
        policyCategory: category,
        whyItMatters: template.whyItMatters,
        potentialReaction: template.reaction,
        tags,
      };
    });

    if (posts.length > 0) {
      cache = { data: posts, ts: Date.now() };
    }

    return NextResponse.json({ data: posts, timestamp: Date.now(), count: posts.length });
  } catch (error) {
    console.error("Trump API error:", error);
    return NextResponse.json({ data: cache.data, timestamp: Date.now(), error: "fetch failed" });
  }
}
