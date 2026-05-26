/**
 * GET /api/cron/push-alerts
 *
 * Runs every 5 minutes (Vercel Cron). Checks for new high-impact
 * catalysts, Trump posts, high-impact news, new signals, and SL/TP
 * hits — then sends Web Push + FCM notifications to all subscribed users.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToMany } from "@/lib/push/sender";
import { sendFcmToMany } from "@/lib/push/fcm";
import type { PushPayload } from "@/lib/push/sender";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

const SEEN_CATALYSTS_KEY = "push_seen_catalysts";
const SEEN_TRUMP_KEY     = "push_seen_trump";
const SEEN_NEWS_KEY      = "push_seen_news";
const SEEN_SIGNALS_KEY   = "push_seen_signals";
const SEEN_SLTP_KEY      = "push_seen_sltp";

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

async function getAllFcmTokens(sb: ReturnType<typeof getSupabaseAdmin>) {
  const { data } = await sb.from("fcm_tokens").select("id, token");
  return (data ?? []) as Array<{ id: string; token: string }>;
}

async function removeExpiredFcmTokens(sb: ReturnType<typeof getSupabaseAdmin>, ids: string[]) {
  if (ids.length === 0) return;
  await sb.from("fcm_tokens").delete().in("id", ids);
}

async function removeExpiredSubscriptions(sb: ReturnType<typeof getSupabaseAdmin>, ids: string[]) {
  if (ids.length === 0) return;
  await sb.from("push_subscriptions").delete().in("id", ids);
}

export async function GET(req: NextRequest) {
  // ── Cron auth ─────────────────────────────────────────────────────────────
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

  const sb = getSupabaseAdmin();

  // ── Fetch all subscriber channels upfront ─────────────────────────────────
  const [subs, fcmTokens] = await Promise.all([
    getAllSubscriptions(sb),
    getAllFcmTokens(sb),
  ]);

  // Only bail out if there are literally zero recipients anywhere
  if (subs.length === 0 && fcmTokens.length === 0) {
    return NextResponse.json({ ok: true, pushed: 0, reason: "no subscribers" });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tradex.app";
  const payloads: PushPayload[] = [];

  // ── 1. High-impact catalysts ───────────────────────────────────────────────
  try {
    const res = await fetch(`${baseUrl}/api/market/catalysts`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const highItems = (json.data ?? []).filter(
        (c: { importance: string; id?: string }) => c.importance === "high" && c.id
      );
      const seenCats = await getSeenIds(sb, SEEN_CATALYSTS_KEY);
      const newHigh  = highItems.filter((c: { id?: string }) => !seenCats.has(c.id!));

      for (const c of newHigh.slice(0, 3)) {
        payloads.push({
          title: "⚡ High Impact Event",
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

  // ── 2. Trump posts ─────────────────────────────────────────────────────────
  try {
    const res = await fetch(`${baseUrl}/api/market/trump`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const posts     = (json.posts ?? []).filter((p: { id?: string }) => p.id);
      const seenTrump = await getSeenIds(sb, SEEN_TRUMP_KEY);
      const newPosts  = posts.filter((p: { id?: string }) => !seenTrump.has(p.id!));

      for (const p of newPosts.slice(0, 2)) {
        const body = (p.content ?? "").slice(0, 100) + ((p.content ?? "").length > 100 ? "…" : "");
        payloads.push({
          title: "🇺🇸 Trump Post",
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

  // ── 3. High-impact news (impactScore ≥ 8) ─────────────────────────────────
  try {
    const res = await fetch(`${baseUrl}/api/market/news`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const allNews = (json.data ?? []) as Array<{
        id: string;
        headline: string;
        impactScore: number;
        category?: string;
      }>;
      const highNews = allNews.filter(n => n.id && n.impactScore >= 8);
      const seenNews = await getSeenIds(sb, SEEN_NEWS_KEY);
      const newNews  = highNews.filter(n => !seenNews.has(n.id));

      for (const n of newNews.slice(0, 2)) {
        payloads.push({
          title: "📰 Market Alert",
          body: n.headline.slice(0, 120) + (n.headline.length > 120 ? "…" : ""),
          url: "/dashboard/news",
          severity: "high",
          type: "news",
          tag: `news-${n.id}`,
        });
      }
      await markSeen(sb, SEEN_NEWS_KEY, newNews.map(n => n.id));
    }
  } catch (err) {
    console.error("[push-alerts] news fetch failed:", err);
  }

  // ── 4. New signals + SL/TP hit alerts ─────────────────────────────────────
  try {
    const res = await fetch(`${baseUrl}/api/signals?period=24h&limit=20`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const recent = (json.recent ?? []) as Array<{
        id: string;
        symbol: string;
        symbolDisplay: string;
        finalBias: string;
        timeframe: string;
        status: string;
        tradePlan: { direction: string; entry: number; tp1: number; stopLoss: number; rrRatio: number } | null;
      }>;

      // 4a. New open signals (new trade setups)
      const seenSignals = await getSeenIds(sb, SEEN_SIGNALS_KEY);
      const newSignals  = recent.filter(s => s.status === "open" && !seenSignals.has(s.id) && s.tradePlan);

      for (const s of newSignals.slice(0, 2)) {
        const dir    = s.tradePlan!.direction === "long" ? "🟢 BUY" : "🔴 SELL";
        const rr     = s.tradePlan!.rrRatio?.toFixed(1) ?? "?";
        payloads.push({
          title: `📊 New Signal: ${s.symbolDisplay ?? s.symbol}`,
          body: `${dir} | Entry: ${s.tradePlan!.entry} | RR: ${rr}R | TF: ${s.timeframe}`,
          url: "/dashboard/signals",
          severity: "high",
          type: "signal",
          tag: `signal-${s.id}`,
        });
      }
      await markSeen(sb, SEEN_SIGNALS_KEY, newSignals.map(s => s.id));

      // 4b. SL / TP hit outcomes
      const seenSlTp    = await getSeenIds(sb, SEEN_SLTP_KEY);
      const resolvedNow = recent.filter(
        s => ["win_tp1", "win_tp2", "loss_sl"].includes(s.status) && !seenSlTp.has(s.id)
      );

      for (const s of resolvedNow.slice(0, 3)) {
        const isWin = s.status.startsWith("win_");
        const which = s.status === "win_tp2" ? "TP2 ✅✅" : s.status === "win_tp1" ? "TP1 ✅" : "SL ❌";
        payloads.push({
          title: `${isWin ? "🏆 TP Hit" : "🛑 SL Hit"}: ${s.symbolDisplay ?? s.symbol}`,
          body: `${which} triggered on ${s.timeframe} ${s.finalBias} signal`,
          url: "/dashboard/signals",
          severity: isWin ? "medium" : "high",
          type: "signal",
          tag: `sltp-${s.id}`,
        });
      }
      await markSeen(sb, SEEN_SLTP_KEY, resolvedNow.map(s => s.id));
    }
  } catch (err) {
    console.error("[push-alerts] signals fetch failed:", err);
  }

  // ── Nothing new to send ────────────────────────────────────────────────────
  if (payloads.length === 0) {
    return NextResponse.json({ ok: true, pushed: 0, reason: "no new alerts" });
  }

  // ── Send to Web Push subscribers ──────────────────────────────────────────
  let totalSent = 0;
  const allExpiredSubs: string[] = [];

  if (subs.length > 0) {
    const validSubs = subs.map(s => ({
      id: s.id,
      subscription: s.subscription as import("web-push").PushSubscription,
    }));

    for (const payload of payloads) {
      const result = await sendPushToMany(validSubs, payload);
      totalSent += result.sent;
      allExpiredSubs.push(...result.expired);
    }
    await removeExpiredSubscriptions(sb, [...new Set(allExpiredSubs)]);
  }

  // ── Send to FCM (native Android / iOS app) ────────────────────────────────
  let fcmSent = 0;
  const allExpiredFcm: string[] = [];

  if (fcmTokens.length > 0 && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    for (const payload of payloads) {
      const result = await sendFcmToMany(fcmTokens, payload);
      fcmSent += result.sent;
      allExpiredFcm.push(...result.expired);
    }
    await removeExpiredFcmTokens(sb, [...new Set(allExpiredFcm)]);
  }

  return NextResponse.json({
    ok: true,
    pushed: totalSent + fcmSent,
    webPush: totalSent,
    fcm: fcmSent,
    payloads: payloads.length,
    subscribers: subs.length + fcmTokens.length,
    expiredCleaned: new Set(allExpiredSubs).size + new Set(allExpiredFcm).size,
  });
}
