/**
 * GET /api/cron/push-alerts
 *
 * Runs every 5 minutes (Vercel Cron). Checks for new high-impact
 * catalysts and Trump posts, then sends Web Push notifications to
 * all subscribed users — even when the app is fully closed.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToMany } from "@/lib/push/sender";
import type { PushPayload } from "@/lib/push/sender";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

const SEEN_CATALYSTS_KEY = "push_seen_catalysts";
const SEEN_TRUMP_KEY     = "push_seen_trump";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

async function getSeenIds(sb: ReturnType<typeof getSupabaseAdmin>, key: string): Promise<Set<string>> {
  const { data } = await sb.from("push_state").select("ids").eq("key", key).single();
  if (!data?.ids) return new Set();
  return new Set(data.ids as string[]);
}

async function markSeen(sb: ReturnType<typeof getSupabaseAdmin>, key: string, newIds: string[]) {
  if (newIds.length === 0) return;
  const existing = await getSeenIds(sb, key);
  newIds.forEach(id => existing.add(id));
  const arr = [...existing].slice(-200);
  await sb.from("push_state").upsert({ key, ids: arr }, { onConflict: "key" });
}

async function getAllSubscriptions(sb: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await sb
    .from("push_subscriptions")
    .select("id, subscription");
  if (error || !data) return [];
  return data as Array<{ id: string; subscription: PushSubscriptionJSON }>;
}

async function removeExpiredSubscriptions(sb: ReturnType<typeof getSupabaseAdmin>, ids: string[]) {
  if (ids.length === 0) return;
  await sb.from("push_subscriptions").delete().in("id", ids);
}

export async function GET(req: NextRequest) {
  // Cron auth
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const vapidPub  = process.env.VAPID_PUBLIC_KEY;
  const vapidPriv = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPub || !vapidPriv) {
    return NextResponse.json({ ok: false, error: "VAPID keys not configured" }, { status: 503 });
  }

  const sb    = getSupabaseAdmin();
  const subs  = await getAllSubscriptions(sb);
  if (subs.length === 0) {
    return NextResponse.json({ ok: true, pushed: 0, reason: "no subscribers" });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tradex.app";
  const payloads: PushPayload[] = [];

  // ── Check high-impact catalysts ───────────────────────────────────────────
  try {
    const res = await fetch(`${baseUrl}/api/market/catalysts`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const highItems = (json.data ?? []).filter((c: { importance: string; id?: string }) => c.importance === "high" && c.id);
      const seenCats  = await getSeenIds(sb, SEEN_CATALYSTS_KEY);
      const newHigh   = highItems.filter((c: { id?: string }) => !seenCats.has(c.id!));

      for (const c of newHigh.slice(0, 3)) {
        payloads.push({
          title: "High Impact Event",
          body: c.title,
          url: "/dashboard/economic-calendar",
          severity: "high",
          type: "news",
          tag: `catalyst-${c.id}`,
        });
      }
      await markSeen(sb, SEEN_CATALYSTS_KEY, newHigh.map((c: { id?: string }) => c.id!));
    }
  } catch (err) {
    console.error("[push-alerts] catalyst fetch failed:", err);
  }

  // ── Check Trump posts ─────────────────────────────────────────────────────
  try {
    const res = await fetch(`${baseUrl}/api/market/trump`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const posts    = (json.posts ?? []).filter((p: { id?: string }) => p.id);
      const seenTrump = await getSeenIds(sb, SEEN_TRUMP_KEY);
      const newPosts  = posts.filter((p: { id?: string }) => !seenTrump.has(p.id!));

      for (const p of newPosts.slice(0, 2)) {
        const body = (p.content ?? "").slice(0, 100) + ((p.content ?? "").length > 100 ? "…" : "");
        payloads.push({
          title: "Trump Post",
          body,
          url: "/dashboard/trump-monitor",
          severity: "high",
          type: "trump",
          tag: `trump-${p.id}`,
        });
      }
      await markSeen(sb, SEEN_TRUMP_KEY, newPosts.map((p: { id?: string }) => p.id!));
    }
  } catch (err) {
    console.error("[push-alerts] trump fetch failed:", err);
  }

  if (payloads.length === 0) {
    return NextResponse.json({ ok: true, pushed: 0, reason: "no new alerts" });
  }

  // ── Send each payload to all subscribers ──────────────────────────────────
  const validSubs = subs.map(s => ({
    id: s.id,
    subscription: s.subscription as import("web-push").PushSubscription,
  }));

  let totalSent = 0;
  const allExpired: string[] = [];

  for (const payload of payloads) {
    const result = await sendPushToMany(validSubs, payload);
    totalSent += result.sent;
    allExpired.push(...result.expired);
  }

  // Clean up expired subscriptions
  const uniqueExpired = [...new Set(allExpired)];
  await removeExpiredSubscriptions(sb, uniqueExpired);

  return NextResponse.json({
    ok: true,
    pushed: totalSent,
    payloads: payloads.length,
    subscribers: subs.length,
    expiredCleaned: uniqueExpired.length,
  });
}
