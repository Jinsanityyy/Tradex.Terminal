/**
 * Truth Social provider proxy — /api/market/trump/ts
 *
 * Provider selection via TRUTH_SOCIAL_PROVIDER env var:
 *   "apify"        — Apify actor (recommended, set APIFY_TOKEN + APIFY_ACTOR_ID)
 *   "scrapcreators"— ScrapeCreators API (set SCRAPCREATORS_API_KEY)
 *   unset/empty    — returns 503 "not configured"
 *
 * Always returns a Mastodon-compatible status array OR { configured: false, error: "..." }
 */
// Switch to Node.js runtime so we can set maxDuration for Apify sync runs
// (Edge runtime cannot have maxDuration > 30s on Vercel)
export const runtime = "nodejs";
export const maxDuration = 60; // seconds — requires Vercel Pro or higher

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
};

function normalizeItem(item: Record<string, unknown>): MastodonLike | null {
  const id = String(
    item.id ?? item.statusId ?? item.status_id ?? item.postId ?? ""
  ).trim();
  const text = String(
    item.text ?? item.content ?? item.full_text ?? item.body ?? item.message ?? ""
  ).trim();
  if (!id || !text) return null;

  const isRepost = Boolean(
    item.repost ?? item.reblog ?? item.isRepost ?? item.isReblog ?? item.is_repost
  );
  const replyId = item.in_reply_to_id ?? item.inReplyToId ?? item.reply_to ?? null;

  return {
    id,
    created_at: String(
      item.created_at ?? item.createdAt ?? item.date ??
      item.publishedAt ?? item.timestamp ?? new Date().toISOString()
    ),
    content: text,
    reblog: isRepost ? ({} as null) : null,
    in_reply_to_id: replyId ? String(replyId) : null,
    url: String(
      item.url ?? item.postUrl ?? item.statusUrl ?? item.link ??
      `https://truthsocial.com/@${USERNAME}/${id}`
    ),
  };
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
    // Fetch last successful run's dataset (instant — requires scheduled actor in Apify)
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

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET() {
  console.log(`[ts] provider="${PROVIDER}" username="${USERNAME}"`);

  if (PROVIDER === "apify") return fetchViaApify();
  if (PROVIDER === "scrapcreators") return fetchViaScrapeCreators();

  console.warn("[ts] TRUTH_SOCIAL_PROVIDER not set or unrecognized:", PROVIDER || "(empty)");
  return jsonError(
    503,
    `Truth Social provider not configured. Set TRUTH_SOCIAL_PROVIDER=apify (and APIFY_TOKEN + APIFY_ACTOR_ID) or TRUTH_SOCIAL_PROVIDER=scrapcreators (and SCRAPCREATORS_API_KEY) in your environment variables.`,
    false
  );
}
