/**
 * Truth Social provider proxy  -  /api/market/trump/ts
 *
 * Provider selection via TRUTH_SOCIAL_PROVIDER env var:
 *   "cnn"           -  CNN live archive (free, no key, recommended  -  bypasses CF blocking)
 *   "apify"         -  Apify actor (set APIFY_TOKEN + APIFY_ACTOR_ID)
 *   "scrapcreators" -  ScrapeCreators API (set SCRAPCREATORS_API_KEY)
 *   "direct"        -  direct Truth Social Mastodon API (free, may be CF-blocked)
 *   unset/empty     -  tries CNN archive first, then direct
 *
 * Always returns a Mastodon-compatible status array OR { configured: false, error: "..." }
 */
// Node runtime required for Supabase SSR cookie helpers used in service client.
// CNN archive is fetched server-side (no CF issue  -  CNN CDN has public CORS).
export const runtime = "nodejs";

const PROVIDER   = (process.env.TRUTH_SOCIAL_PROVIDER ?? "").toLowerCase().trim();
const USERNAME   = process.env.TRUTH_SOCIAL_USERNAME ?? "realDonaldTrump";

// Apify
const APIFY_TOKEN    = process.env.APIFY_TOKEN ?? "";
const APIFY_ACTOR_ID = process.env.APIFY_ACTOR_ID ?? "";
// "dataset" = fetch last run (fast, requires scheduled actor)
// "sync"    = trigger new run and wait (slower, ~20-30s, may timeout on Vercel)
const APIFY_RUN_MODE = (process.env.APIFY_RUN_MODE ?? "dataset").toLowerCase();

// ScrapeCreators
const SC_KEY = process.env.SCRAPCREATORS_API_KEY ?? "";

// ── Response helpers ──────────────────────────────────────────────────────────

function jsonError(status: number, error: string, configured = true) {
  return new Response(JSON.stringify({ error, configured }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonPosts(posts: object[]) {
  return new Response(JSON.stringify(posts), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
}

// ── Normalizer ────────────────────────────────────────────────────────────────
// Converts any scraper's output schema → Mastodon-compatible status object
// so the existing mapTruthSocialStatus() in classify.ts can process it unchanged.

type MastodonLike = {
  id: string;
  created_at: string;
  content: string;
  reblog: null;
  in_reply_to_id: string | null;
  url?: string;
  reblogs_count?: number;
  favourites_count?: number;
  replies_count?: number;
  account?: { avatar?: string };
};

function normalizeItem(item: Record<string, unknown>): MastodonLike | null {
  const id = String(
    item.id ?? item.statusId ?? item.status_id ?? item.postId ?? ""
  ).trim();
  const text = String(
    item.text ?? item.content ?? item.full_text ?? item.body ?? item.message ?? ""
  ).trim();
  if (!id || !text) return null;

  // Filter out reposts and replies here  -  return null so they never reach mapTruthSocialStatus
  const isRepost = Boolean(
    item.repost ?? item.reblog ?? item.isRepost ?? item.isReblog ?? item.is_repost
  );
  const replyId = item.in_reply_to_id ?? item.inReplyToId ?? item.reply_to ?? null;
  if (isRepost || replyId) return null;

  const toNum = (v: unknown) => typeof v === "number" ? v : (v ? parseInt(String(v), 10) || undefined : undefined);

  // Avatar: try various field names scrapers use
  const avatarUrl = String(
    (item.account as Record<string, unknown>)?.avatar ??
    item.profilePicUrl ?? item.avatarUrl ?? item.avatar ??
    item.userAvatar ?? item.profile_image_url ?? item.profileImageUrl ?? ""
  ) || undefined;

  return {
    id,
    created_at: String(
      item.created_at ?? item.createdAt ?? item.date ??
      item.publishedAt ?? item.timestamp ?? new Date().toISOString()
    ),
    content: text,
    reblog: null,
    in_reply_to_id: null,
    url: String(
      item.url ?? item.postUrl ?? item.statusUrl ?? item.link ??
      `https://truthsocial.com/@${USERNAME}/${id}`
    ),
    reblogs_count:    toNum(item.reblogs_count   ?? item.reblogsCount   ?? item.retruths     ?? item.retruths_count   ?? item.boosts_count),
    favourites_count: toNum(item.favourites_count ?? item.favouritesCount ?? item.likes        ?? item.likes_count      ?? item.like_count),
    replies_count:    toNum(item.replies_count    ?? item.repliesCount   ?? item.replies       ?? item.reply_count),
    account: avatarUrl ? { avatar: avatarUrl } : undefined,
  };
}

// Fetch Trump's avatar URL from Truth Social account API
async function fetchTrumpAvatar(): Promise<string | null> {
  try {
    const res = await fetch(
      `https://truthsocial.com/api/v1/accounts/${process.env.TRUTH_SOCIAL_ACCOUNT_ID ?? "107780257626128497"}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json() as { avatar?: string };
      if (data.avatar) return data.avatar;
    }
  } catch {}
  return null;
}

// ── Apify provider ────────────────────────────────────────────────────────────

async function fetchViaApify(): Promise<Response> {
  if (!APIFY_TOKEN) {
    console.error("[ts/apify] APIFY_TOKEN not set");
    return jsonError(503, "Apify token missing. Set APIFY_TOKEN in your environment variables.", false);
  }
  if (!APIFY_ACTOR_ID) {
    console.error("[ts/apify] APIFY_ACTOR_ID not set");
    return jsonError(503, "Apify actor ID missing. Find a Truth Social scraper on apify.com/store and set APIFY_ACTOR_ID.", false);
  }

  let fetchUrl: string;
  let fetchOpts: RequestInit;

  if (APIFY_RUN_MODE === "sync") {
    // muhammetakkurtt/truth-social-scraper: run-sync-get-dataset-items
    // Vercel serverless max execution: 60s (Pro) / 10s (Hobby). Use Pro or Edge.
    fetchUrl = `https://api.apify.com/v2/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=55&memory=256`;
    fetchOpts = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // muhammetakkurtt/truth-social-scraper input schema
      body: JSON.stringify({
        username: USERNAME,           // primary field name for this actor
        usernames: [USERNAME],        // fallback if actor uses array format
        maxPosts: 20,
        maxItems: 20,
        resultsLimit: 20,
      }),
      signal: AbortSignal.timeout(58_000),
    };
    console.log(`[ts/apify] sync run: ${APIFY_ACTOR_ID} username=${USERNAME}`);
  } else {
    // Fetch last successful run's dataset (instant  -  requires scheduled actor in Apify)
    fetchUrl = `https://api.apify.com/v2/acts/${encodeURIComponent(APIFY_ACTOR_ID)}/runs/last/dataset/items?token=${APIFY_TOKEN}&limit=30&status=SUCCEEDED`;
    fetchOpts = { signal: AbortSignal.timeout(10_000) };
    console.log(`[ts/apify] last-run dataset: ${APIFY_ACTOR_ID}`);
  }

  let res: Response;
  try {
    res = await fetch(fetchUrl, fetchOpts);
  } catch (err) {
    console.error("[ts/apify] fetch error:", err);
    return jsonError(500, `Apify request failed: ${String(err)}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[ts/apify] HTTP ${res.status}: ${body.slice(0, 300)}`);
    return jsonError(res.status, `Apify HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const raw: Record<string, unknown>[] = await res.json().catch(() => []);
  console.log(`[ts/apify] raw items: ${raw.length}`);

  const normalized = raw
    .map(normalizeItem)
    .filter((x): x is MastodonLike => x !== null && x.reblog === null && x.in_reply_to_id === null)
    .slice(0, 20);

  console.log(`[ts/apify] normalized (original posts only): ${normalized.length}`);

  // Inject avatar if not already present in Apify data
  const hasAvatar = normalized.some(p => p.account?.avatar);
  if (!hasAvatar) {
    const avatar = await fetchTrumpAvatar();
    if (avatar) normalized.forEach(p => { p.account = { avatar }; });
    console.log(`[ts/apify] avatar: ${avatar ? "fetched from TS API" : "unavailable"}`);
  }

  return jsonPosts(normalized);
}

// ── ScrapeCreators provider ───────────────────────────────────────────────────

async function fetchViaScrapeCreators(): Promise<Response> {
  if (!SC_KEY) {
    console.error("[ts/scrapcreators] SCRAPCREATORS_API_KEY not set");
    return jsonError(503, "ScrapeCreators API key missing. Set SCRAPCREATORS_API_KEY in your environment variables.", false);
  }

  // Try common ScrapeCreators Truth Social endpoint patterns
  const url = `https://api.scrapecreators.com/v1/truthsocial/user-posts?username=${encodeURIComponent(USERNAME)}&limit=20`;
  console.log(`[ts/scrapcreators] GET ${url}`);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "x-api-key": SC_KEY, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.error("[ts/scrapcreators] fetch error:", err);
    return jsonError(500, `ScrapeCreators request failed: ${String(err)}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[ts/scrapcreators] HTTP ${res.status}: ${body.slice(0, 300)}`);
    return jsonError(res.status, `ScrapeCreators HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => ({}));
  // ScrapeCreators may wrap results in { posts, data, statuses, items } or return array directly
  const rawItems: Record<string, unknown>[] = Array.isArray(data)
    ? data
    : (data.posts ?? data.data ?? data.statuses ?? data.items ?? data.results ?? []);

  console.log(`[ts/scrapcreators] raw items: ${rawItems.length}`);

  const normalized = rawItems
    .map(normalizeItem)
    .filter((x): x is MastodonLike => x !== null && x.reblog === null && x.in_reply_to_id === null)
    .slice(0, 20);

  console.log(`[ts/scrapcreators] normalized: ${normalized.length}`);
  return jsonPosts(normalized);
}

// ── Direct Truth Social provider (no API key needed) ─────────────────────────
const TRUTH_ACCOUNT_ID = process.env.TRUTH_SOCIAL_ACCOUNT_ID ?? "107780257626128497";

async function fetchDirect(): Promise<Response> {
  const url = `https://truthsocial.com/api/v1/accounts/${TRUTH_ACCOUNT_ID}/statuses?limit=20&exclude_replies=true&exclude_reblogs=true`;
  console.log(`[ts/direct] GET ${url}`);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Referer": `https://truthsocial.com/@${USERNAME}`,
        "Origin": "https://truthsocial.com",
      },
      signal: AbortSignal.timeout(12_000),
    });
  } catch (err) {
    console.error("[ts/direct] fetch error:", err);
    return jsonError(500, `Truth Social fetch failed: ${String(err)}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[ts/direct] HTTP ${res.status}: ${body.slice(0, 200)}`);
    return jsonError(res.status, `Truth Social HTTP ${res.status}  -  try TRUTH_SOCIAL_PROVIDER=scrapcreators`, false);
  }

  const raw: Record<string, unknown>[] = await res.json().catch(() => []);
  console.log(`[ts/direct] raw items: ${raw.length}`);

  const normalized = raw
    .map(normalizeItem)
    .filter((x): x is MastodonLike => x !== null)
    .slice(0, 20);

  console.log(`[ts/direct] normalized: ${normalized.length}`);
  return jsonPosts(normalized);
}

// ── CNN Archive provider (free, no API key, bypasses CF blocking) ─────────────

const CNN_ARCHIVE_URL = "https://ix.cnn.io/data/truth-social/truth_archive.json";

type CnnPost = {
  id: string;
  created_at: string;
  content: string;
  url: string;
  media: unknown[];
  replies_count: number;
  reblogs_count: number;
  favourites_count: number;
};

async function fetchViaCnn(): Promise<Response> {
  console.log("[ts/cnn] fetching CNN Truth Social archive");

  // Try 1: Supabase cache (populated by /api/market/trump/cnn-sync cron)
  try {
    const { getServiceClient } = await import("@/lib/supabase/service");
    const sb = getServiceClient();
    if (sb) {
      const { data: rows, error } = await sb
        .from("trump_posts")
        .select("id, content, created_at, url, replies_count, reblogs_count, favourites_count")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && rows && rows.length > 0) {
        console.log(`[ts/cnn] Supabase cache hit: ${rows.length} posts`);
        const normalized: MastodonLike[] = rows.map((r: {
          id: string; content: string; created_at: string; url: string | null;
          replies_count: number | null; reblogs_count: number | null; favourites_count: number | null;
        }) => ({
          id: r.id,
          created_at: r.created_at,
          content: r.content,
          reblog: null,
          in_reply_to_id: null,
          url: r.url ?? `https://truthsocial.com/@${USERNAME}/${r.id}`,
          replies_count: r.replies_count ?? undefined,
          reblogs_count: r.reblogs_count ?? undefined,
          favourites_count: r.favourites_count ?? undefined,
        }));
        // Inject Trump's avatar so the card shows his real profile photo
        const avatar = await fetchTrumpAvatar();
        if (avatar) normalized.forEach(p => { p.account = { avatar }; });
        console.log(`[ts/cnn] avatar: ${avatar ? "fetched" : "unavailable (flag fallback)"}`);
        return jsonPosts(normalized);
      }
    }
  } catch (err) {
    console.warn("[ts/cnn] Supabase cache miss:", err);
  }

  // Try 2: CNN archive direct fetch (if Supabase is empty or not configured)
  let res: Response;
  try {
    res = await fetch(CNN_ARCHIVE_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error("[ts/cnn] CNN fetch error:", err);
    return jsonError(500, `CNN archive fetch failed: ${String(err)}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[ts/cnn] CNN HTTP ${res.status}: ${body.slice(0, 200)}`);
    return jsonError(res.status, `CNN archive HTTP ${res.status}`);
  }

  const raw: CnnPost[] = await res.json().catch(() => []);
  console.log(`[ts/cnn] CNN archive raw items: ${raw.length}`);

  const normalized: MastodonLike[] = raw
    .slice(0, 20)
    .map(p => ({
      id: p.id,
      created_at: p.created_at,
      content: p.content,
      reblog: null,
      in_reply_to_id: null,
      url: p.url ?? `https://truthsocial.com/@${USERNAME}/${p.id}`,
      replies_count:    p.replies_count    ?? undefined,
      reblogs_count:    p.reblogs_count    ?? undefined,
      favourites_count: p.favourites_count ?? undefined,
    }));

  // Inject Trump's avatar so the card shows his real profile photo
  const avatar = await fetchTrumpAvatar();
  if (avatar) normalized.forEach(p => { p.account = { avatar }; });
  console.log(`[ts/cnn] avatar: ${avatar ? "fetched" : "unavailable (flag fallback)"}`);

  return jsonPosts(normalized);
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET() {
  console.log(`[ts] provider="${PROVIDER}" username="${USERNAME}"`);

  if (PROVIDER === "cnn")            return fetchViaCnn();
  if (PROVIDER === "apify")          return fetchViaApify();
  if (PROVIDER === "scrapcreators")  return fetchViaScrapeCreators();
  if (PROVIDER === "direct")         return fetchDirect();

  // Default: CNN archive (free, reliable) → direct TS as last resort
  console.log("[ts] no provider set  -  trying CNN archive first");
  const cnnRes = await fetchViaCnn();
  if (cnnRes.ok) {
    const body = await cnnRes.clone().json().catch(() => []);
    if (Array.isArray(body) && body.length > 0) return cnnRes;
  }

  console.warn("[ts] CNN archive empty  -  falling back to direct");
  return fetchDirect();
}
