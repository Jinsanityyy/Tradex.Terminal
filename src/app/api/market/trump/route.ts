import { NextResponse } from "next/server";
import * as https from "node:https";
import type { TrumpPost } from "@/types";

// HTTP/1.1 GET via node:https — handles gzip/deflate decompression + redirects
import * as zlib from "node:zlib";

function httpsGet(url: string, redirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.get(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json, */*",
          "Accept-Encoding": "gzip, deflate",
          "Host": u.hostname,
        },
      },
      (res) => {
        // Follow redirects
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && redirects > 0) {
          res.resume();
          return httpsGet(res.headers.location, redirects - 1).then(resolve).catch(reject);
        }
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const encoding = res.headers["content-encoding"] ?? "";
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("error", reject);
        res.on("end", () => {
          const raw = Buffer.concat(chunks);
          if (encoding === "gzip") {
            zlib.gunzip(raw, (err, buf) => err ? reject(err) : resolve(buf.toString("utf8")));
          } else if (encoding === "deflate") {
            zlib.inflate(raw, (err, buf) => err ? reject(err) : resolve(buf.toString("utf8")));
          } else {
            resolve(raw.toString("utf8"));
          }
        });
      }
    );
    req.setTimeout(10_000, () => { req.destroy(); reject(new Error("timeout")); });
    req.on("error", reject);
  });
}

export const dynamic = "force-dynamic";

let cache: { data: TrumpPost[]; ts: number } = { data: [], ts: 0 };
const CACHE_TTL = 120_000; // 2 min

// Trump's Truth Social handle
const TRUTH_SOCIAL_HANDLE = "realDonaldTrump";
// Cached resolved account ID (refreshed per process restart)
let _resolvedAccountId: string | null = null;

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

function classifyPost(text: string): { category: string; assets: string[]; tags: string[] } {
  const lower = text.toLowerCase();
  let bestCategory = "Politics";
  let bestAssets: string[] = ["SPX", "DXY"];
  let bestScore = 0;
  const tags: string[] = [];

  for (const policy of POLICY_MAP) {
    const hits = policy.keywords.filter(k => lower.includes(k)).length;
    if (hits > bestScore) {
      bestScore = hits;
      bestCategory = policy.category;
      bestAssets = policy.assets;
    }
    if (hits > 0) tags.push(policy.category.toLowerCase().replace(/\s/g, "-"));
  }

  return { category: bestCategory, assets: bestAssets, tags: tags.length > 0 ? tags : ["politics"] };
}

function deriveSentiment(text: string): "bullish" | "bearish" | "neutral" {
  const h = text.toLowerCase();
  const bull = ["deal", "agree", "peace", "boost", "support", "pro-", "bullish", "win", "success", "great", "beautiful", "fantastic", "tremendous"];
  const bear = ["threat", "war", "sanction", "attack", "block", "ban", "shutdown", "hit", "urge", "drastic", "harder", "blow", "defeat", "disaster", "terrible"];
  const b = bull.filter(w => h.includes(w)).length;
  const s = bear.filter(w => h.includes(w)).length;
  return b > s ? "bullish" : s > b ? "bearish" : "neutral";
}

function deriveImpactScore(text: string): number {
  const lower = text.toLowerCase();
  let score = 5;
  const highImpact = ["tariff", "war", "sanction", "nuclear", "shut down", "executive order", "deal", "attack", "military", "rate cut", "rate hike"];
  const medImpact = ["threaten", "warn", "demand", "urge", "announce", "plan", "propose"];
  score += highImpact.filter(w => lower.includes(w)).length * 1.5;
  score += medImpact.filter(w => lower.includes(w)).length * 0.5;
  return Math.min(10, Math.round(score));
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function analyzeGoldUSD(content: string, category: string): Promise<{
  goldImpact: "bullish" | "bearish" | "neutral";
  goldReasoning: string;
  usdImpact: "bullish" | "bearish" | "neutral";
  usdReasoning: string;
} | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: `You are a macro analyst. Given a Trump statement, state the specific directional impact on Gold (XAUUSD) and USD (DXY). Be specific to this exact content — no generic templates. Valid JSON only.`,
        messages: [{
          role: "user",
          content: `Trump post: "${content.slice(0, 400)}"\nCategory: ${category}\n\nReturn ONLY this JSON:\n{"goldImpact":"bullish|bearish|neutral","goldReasoning":"1 sentence why gold moves this way","usdImpact":"bullish|bearish|neutral","usdReasoning":"1 sentence why USD moves this way"}`,
        }],
      }),
    });
    const data = await res.json();
    const text = (data.content?.[0]?.text ?? "").replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Match curl exactly — minimal headers only to avoid bot detection
const TS_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/json",
};

function mapStatuses(statuses: { id: string; created_at: string; content: string; reblog: unknown | null; in_reply_to_id: string | null; card?: { title?: string; description?: string } | null }[]) {
  const own = statuses.filter(s => !s.reblog && !s.in_reply_to_id && (s.content || s.card?.title));
  return own.slice(0, 10).map((s) => {
    const text = stripHtml(s.content) || s.card?.title || s.card?.description || "";
    const { category, assets, tags } = classifyPost(text);
    const sentiment = deriveSentiment(text);
    const impactScore = deriveImpactScore(text);
    const template = IMPACT_TEMPLATES[category] ?? IMPACT_TEMPLATES.Government;
    return {
      id: `ts-${s.id}`,
      timestamp: s.created_at,
      content: text,
      source: "Truth Social" as const,
      sentimentClassification: sentiment,
      impactScore,
      affectedAssets: [...new Set(assets)],
      policyCategory: category,
      whyItMatters: template.whyItMatters,
      potentialReaction: template.reaction,
      tags,
    };
  });
}

// Lookup Trump's account ID dynamically so the hardcoded ID never goes stale
async function resolveAccountId(): Promise<string | null> {
  if (_resolvedAccountId) return _resolvedAccountId;
  try {
    const raw = await httpsGet(`https://truthsocial.com/api/v1/accounts/lookup?acct=${TRUTH_SOCIAL_HANDLE}`);
    const data: { id: string } = JSON.parse(raw);
    _resolvedAccountId = data.id;
    console.log(`[trump/lookup] resolved account ID: ${data.id}`);
    return data.id;
  } catch (err) {
    console.error("[trump/lookup] ERROR:", err);
    return null;
  }
}

// ── Source 1a: Truth Social Mastodon API ─────────────────────────────────────
async function fetchTruthSocialAPI(accountId: string): Promise<Omit<TrumpPost, "goldImpact" | "goldReasoning" | "usdImpact" | "usdReasoning">[]> {
  try {
    const url = `https://truthsocial.com/api/v1/accounts/${accountId}/statuses?limit=20&exclude_reblogs=true`;
    console.log(`[trump/truth-social-api] fetching via curl: ${url}`);
    const raw = await httpsGet(url);
    const statuses: { id: string; created_at: string; content: string; reblog: unknown | null; in_reply_to_id: string | null; card?: { title?: string; description?: string } | null }[] = JSON.parse(raw);
    console.log(`[trump/truth-social-api] got ${statuses.length} statuses`);
    const mapped = mapStatuses(statuses);
    console.log(`[trump/truth-social-api] mapped ${mapped.length} posts after filter`);
    return mapped;
  } catch (err) {
    console.error("[trump/truth-social-api] ERROR:", err);
    return [];
  }
}

// ── Source 1a-proxy: Truth Social via allorigins.win ─────────────────────────
// Vercel IPs are blocked by Truth Social — route through a CORS proxy
const TS_ACCOUNT_ID = "107780257626128497"; // realDonaldTrump — hardcoded as backup

async function fetchTruthSocialViaProxy(): Promise<Omit<TrumpPost, "goldImpact" | "goldReasoning" | "usdImpact" | "usdReasoning">[]> {
  try {
    const target = `https://truthsocial.com/api/v1/accounts/${TS_ACCOUNT_ID}/statuses?limit=20&exclude_reblogs=true`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`;
    console.log("[trump/proxy] fetching via allorigins.win");
    const res = await fetch(proxyUrl, { cache: "no-store", next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`proxy HTTP ${res.status}`);
    const wrapper: { contents: string; status: { http_code: number } } = await res.json();
    if (wrapper.status.http_code !== 200) throw new Error(`TS returned ${wrapper.status.http_code} via proxy`);
    const statuses: { id: string; created_at: string; content: string; reblog: unknown | null; in_reply_to_id: string | null; card?: { title?: string; description?: string } | null }[] = JSON.parse(wrapper.contents);
    console.log(`[trump/proxy] got ${statuses.length} statuses`);
    const mapped = mapStatuses(statuses);
    console.log(`[trump/proxy] mapped ${mapped.length} posts`);
    return mapped;
  } catch (err) {
    console.error("[trump/proxy] ERROR:", err);
    return [];
  }
}

// ── Source 1: Truth Social (direct → proxy fallback) ─────────────────────────
async function fetchTruthSocial(): Promise<Omit<TrumpPost, "goldImpact" | "goldReasoning" | "usdImpact" | "usdReasoning">[]> {
  // Try direct node:https first (works locally)
  const accountId = await resolveAccountId();
  if (accountId) {
    const direct = await fetchTruthSocialAPI(accountId);
    if (direct.length > 0) return direct;
  }
  // Vercel IPs blocked — try via proxy
  console.log("[trump] direct failed, trying proxy");
  return fetchTruthSocialViaProxy();
}

// ── RSS helper ────────────────────────────────────────────────────────────────
// Shared parser for any RSS 2.0 feed. Filters items that mention Trump/policy.
type RawPost = Omit<TrumpPost, "goldImpact" | "goldReasoning" | "usdImpact" | "usdReasoning">;

const TRUMP_FILTER = /trump|white house|potus|tariff|truth social|mar-a-lago/i;

function parseRssFeed(xml: string, sourceName: string, prefix: string, limit = 8): RawPost[] {
  const items: RawPost[] = [];
  const blocks = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const m of blocks) {
    const b = m[1];
    const rawTitle = (b.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim();
    const rawDesc  = (b.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1").trim();
    const pubDate  = (b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim();
    const guid     = (b.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1] ?? "").trim();
    const title = stripHtml(rawTitle);
    const desc  = stripHtml(rawDesc).slice(0, 200);
    if (!title) continue;
    if (!TRUMP_FILTER.test(title + " " + desc)) continue;
    const text = title;
    const { category, assets, tags } = classifyPost(text + " " + desc);
    const template = IMPACT_TEMPLATES[category] ?? IMPACT_TEMPLATES.Government;
    items.push({
      id: `${prefix}-${guid || items.length}`,
      timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      content: text,
      source: sourceName,
      sentimentClassification: deriveSentiment(text + " " + desc),
      impactScore: deriveImpactScore(text + " " + desc),
      affectedAssets: [...new Set(assets)],
      policyCategory: category,
      whyItMatters: template.whyItMatters,
      potentialReaction: template.reaction,
      tags,
    });
    if (items.length >= limit) break;
  }
  return items;
}

async function fetchRSS(url: string, sourceName: string, prefix: string, limit = 8): Promise<RawPost[]> {
  try {
    const r = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Feedfetcher-Google/1.0)" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const xml = await r.text();
    const items = parseRssFeed(xml, sourceName, prefix, limit);
    console.log(`[trump/${prefix}] ${items.length} Trump-related items`);
    return items;
  } catch (err) {
    console.error(`[trump/${prefix}] ERROR:`, err);
    return [];
  }
}

// ── Source: Reuters ───────────────────────────────────────────────────────────
function fetchReutersTrump(): Promise<RawPost[]> {
  return fetchRSS(
    "https://feeds.reuters.com/reuters/businessNews",
    "Reuters",
    "rt",
    8,
  );
}

// ── Source: CNBC ──────────────────────────────────────────────────────────────
function fetchCNBCTrump(): Promise<RawPost[]> {
  return fetchRSS(
    "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    "CNBC",
    "cnbc",
    8,
  );
}

// ── Source: Google News RSS (broad fallback) ──────────────────────────────────
function fetchGoogleNewsTrump(): Promise<RawPost[]> {
  return fetchRSS(
    "https://news.google.com/rss/search?q=Trump+tariff+policy&hl=en-US&gl=US&ceid=US:en",
    "Google News",
    "gn",
    8,
  );
}

// ── Source 2: Finnhub news filtered for Trump ────────────────────────────────
async function fetchFinnhubTrump(): Promise<Omit<TrumpPost, "goldImpact" | "goldReasoning" | "usdImpact" | "usdReasoning">[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${key}`,
      { signal: controller.signal, cache: "no-store" }
    );
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);

    const allNews: {
      id: number;
      headline: string;
      summary: string;
      source: string;
      datetime: number;
    }[] = await res.json();

    const trumpNews = allNews.filter(n =>
      (n.headline + " " + n.summary).toLowerCase().match(/trump|white house|potus|truth social/)
    );

    return trumpNews.slice(0, 10).map((item, i) => {
      const text = item.headline;
      const { category, assets, tags } = classifyPost(text + " " + (item.summary ?? ""));
      const sentiment = deriveSentiment(text);
      const impactScore = deriveImpactScore(text + " " + (item.summary ?? ""));
      const template = IMPACT_TEMPLATES[category] ?? IMPACT_TEMPLATES.Government;

      return {
        id: `fh-${item.id ?? i}`,
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
  } catch (err) {
    clearTimeout(timer);
    console.error("[trump/finnhub]", err);
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const forceRefresh = searchParams.get("refresh") === "1";

  if (!forceRefresh && cache.data.length > 0 && Date.now() - cache.ts < CACHE_TTL) {
    const sources = [...new Set(cache.data.map(p => p.source))];
    return NextResponse.json({ data: cache.data, timestamp: cache.ts, cached: true, sources });
  }

  // Run all free news sources in parallel: Reuters + CNBC + Google News + Finnhub (if key set)
  const [reutersPosts, cnbcPosts, googlePosts, finnhubPosts] = await Promise.all([
    fetchReutersTrump(),
    fetchCNBCTrump(),
    fetchGoogleNewsTrump(),
    fetchFinnhubTrump(),
  ]);

  // Merge: Finnhub first (has descriptions), then Reuters, CNBC, Google News
  // Deduplicate by normalised title (first 60 chars)
  const seen = new Set<string>();
  const rawPosts: RawPost[] = [];
  for (const post of [...finnhubPosts, ...reutersPosts, ...cnbcPosts, ...googlePosts]) {
    const key = post.content.slice(0, 60).toLowerCase().replace(/\W+/g, "");
    if (!seen.has(key)) {
      seen.add(key);
      rawPosts.push(post);
    }
  }

  const feedSource = [
    reutersPosts.length  > 0 && "Reuters",
    cnbcPosts.length     > 0 && "CNBC",
    finnhubPosts.length  > 0 && "Finnhub",
    googlePosts.length   > 0 && "Google News",
  ].filter(Boolean).join(", ") || "none";

  console.log(`[trump] merged ${rawPosts.length} posts from: ${feedSource}`);

  if (rawPosts.length === 0) {
    return NextResponse.json({ data: [], timestamp: Date.now(), empty: true, feedSource: "none" });
  }

  // Enrich with Claude Gold/USD analysis (parallel, best-effort)
  const aiResults = await Promise.allSettled(
    rawPosts.map(p => analyzeGoldUSD(p.content, p.policyCategory))
  );

  const posts: TrumpPost[] = rawPosts.map((p, i) => {
    const ai = aiResults[i].status === "fulfilled" ? aiResults[i].value : null;
    return {
      ...p,
      goldImpact:    ai?.goldImpact,
      goldReasoning: ai?.goldReasoning,
      usdImpact:     ai?.usdImpact,
      usdReasoning:  ai?.usdReasoning,
    };
  });

  cache = { data: posts, ts: Date.now() };
  const sources = [...new Set(posts.map(p => p.source))];
  return NextResponse.json({ data: posts, timestamp: Date.now(), count: posts.length, feedSource, sources });
}
