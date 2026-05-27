/**
 * GET /api/cron/trial-expiry
 *
 * Runs daily (Vercel Cron). Finds users whose free trial ends within
 * the next 24 hours (sends a warning) or ended in the last 25 hours
 * (sends an "expired" notification) — then pushes via FCM + Web Push.
 *
 * De-duplicates per user so each user receives at most one warning
 * notification and one expiry notification in their lifetime.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToMany } from "@/lib/push/sender";
import { sendFcmToMany } from "@/lib/push/fcm";
import type { PushPayload } from "@/lib/push/sender";

export const dynamic   = "force-dynamic";
export const maxDuration = 55;

// ── Supabase admin client (service role) ─────────────────────────────────────
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ── push_state helpers (reuse same pattern as push-alerts cron) ───────────────
async function getSeenIds(sb: ReturnType<typeof getAdmin>, key: string): Promise<Set<string>> {
  const { data } = await sb.from("push_state").select("ids").eq("key", key).single();
  return new Set((data?.ids ?? []) as string[]);
}

async function markSeen(sb: ReturnType<typeof getAdmin>, key: string, ids: string[]) {
  if (ids.length === 0) return;
  const existing = await getSeenIds(sb, key);
  ids.forEach(id => existing.add(id));
  await sb.from("push_state").upsert(
    { key, ids: [...existing].slice(-2000) },
    { onConflict: "key" },
  );
}

// ── Send helpers ──────────────────────────────────────────────────────────────
async function notifyUsers(
  sb: ReturnType<typeof getAdmin>,
  userIds: string[],
  payload: PushPayload,
): Promise<{ fcm: number; web: number }> {
  if (userIds.length === 0) return { fcm: 0, web: 0 };

  const [fcmRows, webRows] = await Promise.all([
    sb.from("fcm_tokens").select("id, token").in("user_id", userIds),
    sb.from("push_subscriptions").select("id, subscription").in("user_id", userIds),
  ]);

  let fcmSent = 0;
  let webSent = 0;

  if (fcmRows.data && fcmRows.data.length > 0) {
    const r = await sendFcmToMany(
      fcmRows.data as Array<{ id: string; token: string }>,
      payload,
    );
    fcmSent = r.sent;
    // Clean expired tokens
    if (r.expired.length > 0) {
      await sb.from("fcm_tokens").delete().in("id", r.expired);
    }
  }

  if (webRows.data && webRows.data.length > 0) {
    const subs = webRows.data.map((s: any) => ({
      id: s.id,
      subscription: s.subscription as import("web-push").PushSubscription,
    }));
    const r = await sendPushToMany(subs, payload);
    webSent = r.sent;
    if (r.expired.length > 0) {
      await sb.from("push_subscriptions").delete().in("id", r.expired);
    }
  }

  return { fcm: fcmSent, web: webSent };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const sb  = getAdmin();
  const now = new Date();

  // Time windows
  const in25h  = new Date(now.getTime() + 25 * 60 * 60 * 1000); // warning: ends within 25 h
  const ago25h = new Date(now.getTime() - 25 * 60 * 60 * 1000); // expired: ended up to 25 h ago

  const WARN_KEY    = "trial_warn_seen";
  const EXPIRED_KEY = "trial_expired_seen";

  const [seenWarn, seenExpired] = await Promise.all([
    getSeenIds(sb, WARN_KEY),
    getSeenIds(sb, EXPIRED_KEY),
  ]);

  const warnUsers: string[]    = [];
  const expiredUsers: string[] = [];

  // ── 1. Users with a subscriptions row ──────────────────────────────────────
  const { data: subsRows } = await sb
    .from("subscriptions")
    .select("user_id, trial_ends_at, plan")
    .eq("plan", "free")
    .not("trial_ends_at", "is", null);

  for (const row of subsRows ?? []) {
    const trialEnd = new Date(row.trial_ends_at as string);
    const uid      = row.user_id as string;

    if (trialEnd > now && trialEnd < in25h && !seenWarn.has(uid)) {
      warnUsers.push(uid);
    } else if (trialEnd <= now && trialEnd > ago25h && !seenExpired.has(uid)) {
      expiredUsers.push(uid);
    }
  }

  // ── 2. Users without a subscriptions row (trial = created_at + 7 days) ────
  try {
    const { data: { users: authUsers } } = await sb.auth.admin.listUsers({ perPage: 1000 });

    // Build set of user_ids that already have a subscription row
    const { data: existingSubIds } = await sb.from("subscriptions").select("user_id");
    const subSet = new Set((existingSubIds ?? []).map((r: any) => r.user_id as string));

    for (const user of authUsers) {
      if (subSet.has(user.id)) continue; // already handled above

      const trialEnd = new Date(
        new Date(user.created_at).getTime() + 7 * 24 * 60 * 60 * 1000,
      );

      if (trialEnd > now && trialEnd < in25h && !seenWarn.has(user.id)) {
        warnUsers.push(user.id);
      } else if (trialEnd <= now && trialEnd > ago25h && !seenExpired.has(user.id)) {
        expiredUsers.push(user.id);
      }
    }
  } catch (err) {
    console.error("[trial-expiry] auth.admin.listUsers failed:", err);
  }

  if (warnUsers.length === 0 && expiredUsers.length === 0) {
    return NextResponse.json({ ok: true, pushed: 0, reason: "no trials expiring" });
  }

  // ── Send warning notifications ────────────────────────────────────────────
  const warnPayload: PushPayload = {
    title: "⏰ Trial expires tomorrow",
    body:  "Upgrade to Pro to keep your signals, AI Brain, and real-time alerts.",
    url:   "/dashboard/settings",
    severity: "high",
    type: "signal",
    tag:  "trial-expiring",
  };

  // ── Send expired notifications ────────────────────────────────────────────
  const expiredPayload: PushPayload = {
    title: "🔒 Your free trial has ended",
    body:  "Subscribe to Pro to unlock TradeX signals, AI Brain, and all premium features.",
    url:   "/dashboard/settings",
    severity: "high",
    type: "signal",
    tag:  "trial-expired",
  };

  const [warnResult, expiredResult] = await Promise.all([
    notifyUsers(sb, warnUsers, warnPayload),
    notifyUsers(sb, expiredUsers, expiredPayload),
  ]);

  // Mark as seen so we don't re-notify
  await Promise.all([
    markSeen(sb, WARN_KEY,    warnUsers),
    markSeen(sb, EXPIRED_KEY, expiredUsers),
  ]);

  return NextResponse.json({
    ok: true,
    warned:  { users: warnUsers.length,    fcm: warnResult.fcm,    web: warnResult.web },
    expired: { users: expiredUsers.length, fcm: expiredResult.fcm, web: expiredResult.web },
  });
}
