/**
 * /api/market/trump/cnn-sync
 *
 * Vercel Cron job — runs every 5 minutes (configured in vercel.json).
 * Fetches CNN's live Truth Social archive, diffs against Supabase,
 * and inserts any new posts. Supabase Realtime then broadcasts inserts
 * to all connected dashboard clients automatically.
 *
 * Requires:
 *   SUPABASE_SERVICE_ROLE_KEY  — bypass RLS for inserts
 *   CRON_SECRET                — shared secret set in Vercel env + vercel.json header
 *
 * Can also be called manually: GET /api/market/trump/cnn-sync
 * (pass Authorization: Bearer <CRON_SECRET> header)
 */

import { getServiceClient } from "@/lib/supabase/service";
import { stripHtml } from "@/lib/trump/classify";

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

export async function GET() {
  const sb = getServiceClient();
  if (!sb) {
    console.error("[cnn-sync] SUPABASE_SERVICE_ROLE_KEY not set");
    return jsonRes({ error: "Supabase service client not configured. Set SUPABASE_SERVICE_ROLE_KEY." }, 503);
  }

  // 1. Fetch CNN archive
  let raw: CnnPost[];
  try {
    const res = await fetch(CNN_ARCHIVE_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      // No cache — always want the freshest list
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`CNN HTTP ${res.status}`);
    const data = await res.json();
    raw = Array.isArray(data) ? data.slice(0, FETCH_LIMIT) : [];
  } catch (err) {
    console.error("[cnn-sync] fetch error:", err);
    return jsonRes({ error: `CNN archive fetch failed: ${String(err)}` }, 500);
  }

  if (raw.length === 0) {
    return jsonRes({ inserted: 0, message: "CNN archive returned 0 items" });
  }

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
    return jsonRes({ inserted: 0, message: "No new posts since last sync" });
  }

  // 4. Insert — Supabase Realtime broadcasts each INSERT automatically
  const { error: insertErr } = await sb
    .from("trump_posts")
    .insert(newPosts);

  if (insertErr) {
    console.error("[cnn-sync] insert error:", insertErr);
    return jsonRes({ error: `Supabase insert failed: ${insertErr.message}` }, 500);
  }

  console.log(`[cnn-sync] inserted ${newPosts.length} new post(s):`, newPosts.map(p => p.id));
  return jsonRes({ inserted: newPosts.length, ids: newPosts.map(p => p.id) });
}
