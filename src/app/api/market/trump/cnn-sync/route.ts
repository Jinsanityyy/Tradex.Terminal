/**
 * /api/market/trump/cnn-sync
 *
 * Scheduled sync. Fetches the newest Truth Social posts, diffs against
 * Supabase, inserts what is new, and pushes an alert for market-relevant
 * ones. Supabase Realtime broadcasts the inserts to connected clients.
 *
 * Safe to call as often as the scheduler allows: the diff in step 3 means a
 * run with nothing new does no writes and sends no alerts. Vercel's own cron
 * is capped at one run a day on Hobby, so the schedule lives in an external
 * scheduler that calls this URL instead.
 *
 * Requires:
 *   SUPABASE_SERVICE_ROLE_KEY   -  bypass RLS for inserts
 *   CRON_SECRET                 -  when set, callers must send
 *                                  `Authorization: Bearer <CRON_SECRET>`
 *
 * Can also be called manually: GET /api/market/trump/cnn-sync
 * (pass Authorization: Bearer <CRON_SECRET> header)
 */

import { getServiceClient } from "@/lib/supabase/service";
import { stripHtml, classifyPost, deriveImpactScore } from "@/lib/trump/classify";
import { notifyTrumpPost } from "@/lib/push/notify";

const CNN_ARCHIVE_URL = "https://ix.cnn.io/data/truth-social/truth_archive.json";
const FETCH_LIMIT     = 20; // only inspect newest N posts per run

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

function jsonRes(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Left open when CRON_SECRET is unset so an unconfigured deploy keeps syncing
// rather than silently going quiet.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function fetchFromCnn(): Promise<CnnPost[]> {
  const res = await fetch(CNN_ARCHIVE_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data.slice(0, FETCH_LIMIT) : [];
}

// Truth Social is a Mastodon fork, so its status objects already carry the
// same field names the CNN archive uses — no normalisation needed.
async function fetchFromTruthSocial(): Promise<CnnPost[]> {
  const accountId = process.env.TRUTH_SOCIAL_ACCOUNT_ID ?? "107780257626128497";
  const res = await fetch(
    `https://truthsocial.com/api/v1/accounts/${accountId}/statuses?limit=${FETCH_LIMIT}&exclude_replies=true&exclude_reblogs=true`,
    {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://truthsocial.com/@realDonaldTrump",
      },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data.slice(0, FETCH_LIMIT) : [];
}

export async function GET(req: Request) {
  if (!authorized(req)) return jsonRes({ error: "Unauthorized" }, 401);

  const sb = getServiceClient();
  if (!sb) {
    console.error("[cnn-sync] SUPABASE_SERVICE_ROLE_KEY not set");
    return jsonRes({ error: "Supabase service client not configured. Set SUPABASE_SERVICE_ROLE_KEY." }, 503);
  }

  // 1. Fetch posts — CNN's archive is an undocumented endpoint that can vanish
  // without notice, so fall through to Truth Social's own API when it does.
  const sources = [
    { name: "cnn", fetch: fetchFromCnn },
    { name: "truthsocial", fetch: fetchFromTruthSocial },
  ];

  let raw: CnnPost[] = [];
  let source = "";
  const failures: string[] = [];

  for (const s of sources) {
    try {
      const posts = await s.fetch();
      if (posts.length > 0) {
        raw = posts;
        source = s.name;
        break;
      }
      failures.push(`${s.name}: returned 0 items`);
    } catch (err) {
      failures.push(`${s.name}: ${String(err)}`);
    }
  }

  // Non-200 on total failure so the external scheduler's own failure alerts
  // fire — otherwise the sync dies silently and nobody finds out.
  if (raw.length === 0) {
    console.error("[cnn-sync] every source failed:", failures);
    return jsonRes({ error: "All Trump post sources failed", failures }, 503);
  }

  if (source !== "cnn") console.warn(`[cnn-sync] CNN unavailable, served from ${source}:`, failures);

  // 2. Get IDs we already have
  const incomingIds = raw.map(p => p.id);
  const { data: existing, error: selectErr } = await sb
    .from("trump_posts")
    .select("id")
    .in("id", incomingIds);

  if (selectErr) {
    console.error("[cnn-sync] select error:", selectErr);
    return jsonRes({ error: `Supabase select failed: ${selectErr.message}` }, 500);
  }

  const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id));

  // 3. Filter to truly new posts only
  const newPosts = raw.filter(p => !existingIds.has(p.id)).map(p => ({
    id:               p.id,
    content:          stripHtml(p.content),   // store clean plain text
    created_at:       p.created_at,
    url:              p.url,
    replies_count:    p.replies_count   ?? null,
    reblogs_count:    p.reblogs_count   ?? null,
    favourites_count: p.favourites_count ?? null,
    fetched_at:       new Date().toISOString(),
  }));

  if (newPosts.length === 0) {
    console.log("[cnn-sync] no new posts");
    return jsonRes({ inserted: 0, message: "No new posts since last sync", source });
  }

  // 4. Insert  -  Supabase Realtime broadcasts each INSERT automatically
  const { error: insertErr } = await sb
    .from("trump_posts")
    .insert(newPosts);

  if (insertErr) {
    console.error("[cnn-sync] insert error:", insertErr);
    return jsonRes({ error: `Supabase insert failed: ${insertErr.message}` }, 500);
  }

  console.log(`[cnn-sync] inserted ${newPosts.length} new post(s):`, newPosts.map(p => p.id));

  // Push alert for market-relevant new posts (max 3 per sync). The DB diff above
  // guarantees each post alerts at most once.
  let alerted = 0;
  for (const p of newPosts) {
    if (alerted >= 3) break;
    const impactScore = deriveImpactScore(p.content);
    if (impactScore < 7) continue;
    const { category } = classifyPost(p.content);
    alerted++;
    void notifyTrumpPost({ content: p.content, category, impactScore, postId: p.id }).catch(() => {});
  }

  return jsonRes({ inserted: newPosts.length, ids: newPosts.map(p => p.id), pushed: alerted, source });
}
