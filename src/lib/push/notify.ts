/**
 * Real-time push notification helper
 *
 * Fire-and-forget sender used directly from signal logger and tracker
 * so users get instant alerts without waiting for the 5-minute cron.
 *
 * Always call as `void notifyXxx(...)` — never await it in a hot path.
 */

import { getServiceClient } from "@/lib/supabase/service";
import { sendFcmToMany, findFirebaseCredEnv } from "@/lib/push/fcm";
import { sendPushToMany } from "@/lib/push/sender";
import type { PushPayload } from "@/lib/push/sender";
import type { SignalRecord, SignalStatus } from "@/lib/signals/types";

// ── Signal dedup — prevents re-notifying the same setup on every home refresh ──
const SIGNAL_SEEN = new Map<string, number>();
const SIGNAL_TTL  = 4 * 60 * 60 * 1000; // 4 hours

function signalAlreadyNotified(fp: string): boolean {
  const ts = SIGNAL_SEEN.get(fp);
  if (!ts) return false;
  if (Date.now() - ts > SIGNAL_TTL) { SIGNAL_SEEN.delete(fp); return false; }
  return true;
}
function markSignalNotified(fp: string) {
  SIGNAL_SEEN.set(fp, Date.now());
  const cutoff = Date.now() - SIGNAL_TTL;
  for (const [k, v] of SIGNAL_SEEN) if (v < cutoff) SIGNAL_SEEN.delete(k);
}

// ── Fetch recipients ────────────────────────────────────────────────────────

async function getFcmTokens() {
  const db = getServiceClient();
  if (!db) return [];
  const { data } = await db.from("fcm_tokens").select("id, token");
  return (data ?? []) as Array<{ id: string; token: string }>;
}

async function getWebPushSubs() {
  const db = getServiceClient();
  if (!db) return [];
  const { data } = await db.from("push_subscriptions").select("id, subscription");
  return (data ?? []) as Array<{ id: string; subscription: import("web-push").PushSubscription }>;
}

// ── Core sender ────────────────────────────────────────────────────────────

export async function broadcast(payload: PushPayload): Promise<void> {
  try {
    const [fcmTokens, webSubs] = await Promise.all([getFcmTokens(), getWebPushSubs()]);

    // Visibility: the send path used to swallow every failure, so a broken setup
    // looked identical to a working one. Log the recipient counts + env state so
    // production logs reveal WHY nothing arrived (no tokens / missing creds / errors).
    if (fcmTokens.length === 0 && webSubs.length === 0) {
      console.warn("[push] broadcast skipped — no recipients (fcm=0, web=0). Check token registration / SUPABASE_SERVICE_ROLE_KEY.");
      return;
    }
    // Same flexible env detection as the sender — gating on the exact name
    // FIREBASE_NT_JSON would silently skip real alerts when the credential
    // lives under a different FIREBASE*JSON variable.
    const hasFirebaseCred = Boolean(findFirebaseCredEnv());
    if (fcmTokens.length > 0 && !hasFirebaseCred) {
      console.warn(`[push] ${fcmTokens.length} FCM token(s) but no FIREBASE*JSON env var is set — mobile push will NOT send.`);
    }

    const sends: Promise<unknown>[] = [];

    if (fcmTokens.length > 0 && hasFirebaseCred) {
      sends.push(
        sendFcmToMany(fcmTokens, payload)
          .then(r => {
            console.log(`[push] FCM "${payload.title}": sent=${r.sent} failed=${r.failed} expired=${r.expired.length}`);
            if (r.expired.length > 0) void cleanupExpiredFcm(r.expired);
          })
          .catch(e => console.warn("[push] FCM send error:", e?.message ?? e))
      );
    }

    if (webSubs.length > 0 && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      sends.push(
        sendPushToMany(webSubs, payload)
          .then(r => console.log(`[push] Web "${payload.title}": sent=${r.sent} failed=${r.failed} expired=${r.expired.length}`))
          .catch(e => console.warn("[push] Web send error:", e?.message ?? e))
      );
    }

    if (sends.length > 0) await Promise.all(sends);
  } catch (e) {
    // Never crash the caller — but do leave a trace.
    console.warn("[push] broadcast failed:", (e as Error)?.message ?? e);
  }
}

// Prune dead FCM tokens so the recipient list stays clean and counts stay meaningful.
async function cleanupExpiredFcm(ids: string[]): Promise<void> {
  try {
    const db = getServiceClient();
    if (!db || ids.length === 0) return;
    await db.from("fcm_tokens").delete().in("id", ids);
    console.log(`[push] pruned ${ids.length} expired FCM token(s)`);
  } catch { /* non-fatal */ }
}

// ── Public helpers ──────────────────────────────────────────────────────────

export async function notifyNewSignal(signal: SignalRecord): Promise<void> {
  if (!signal.tradePlan) return;

  const fp = `${signal.symbol}|${signal.tradePlan.entry}|${signal.tradePlan.direction}|${signal.timeframe}`;
  if (signalAlreadyNotified(fp)) return;
  markSignalNotified(fp);

  const dir  = signal.tradePlan.direction === "long" ? "🟢 BUY" : "🔴 SELL";
  const rr   = signal.tradePlan.rrRatio?.toFixed(1) ?? "?";
  const sym  = signal.symbolDisplay ?? signal.symbol;

  await broadcast({
    title: `📊 New Signal: ${sym}`,
    body:  `${dir} | Entry: ${signal.tradePlan.entry} | RR: ${rr}R | TF: ${signal.timeframe}`,
    url:   "/dashboard/signals",
    severity: "high",
    type:  "signal",
    tag:   `signal-${signal.symbol}-${signal.tradePlan.entry}-${signal.tradePlan.direction}`,
  });
}

export async function notifyEntryZone(signal: SignalRecord): Promise<void> {
  if (!signal.tradePlan) return;
  const dir = signal.tradePlan.direction === "long" ? "🟢 BUY" : "🔴 SELL";
  const sym = signal.symbolDisplay ?? signal.symbol;

  await broadcast({
    title:    `⚠️ Entry Zone: ${sym}`,
    body:     `${dir} entry at ${signal.tradePlan.entry} — price is approaching now!`,
    url:      "/dashboard/signals",
    severity: "high",
    type:     "signal",
    tag:      `entry-${signal.id}`,
  });
}

export async function notifyOutcome(
  signal: SignalRecord,
  status: SignalStatus
): Promise<void> {
  if (!["win_tp1", "win_tp2", "loss_sl"].includes(status)) return;

  const isWin = status.startsWith("win_");
  const which =
    status === "win_tp2" ? "TP2 ✅✅" :
    status === "win_tp1" ? "TP1 ✅"   : "SL ❌";
  const sym = signal.symbolDisplay ?? signal.symbol;

  await broadcast({
    title:    `${isWin ? "🏆 TP Hit" : "🛑 SL Hit"}: ${sym}`,
    body:     `${which} triggered on ${signal.timeframe} ${signal.finalBias} signal`,
    url:      "/dashboard/signals",
    severity: isWin ? "medium" : "high",
    type:     "signal",
    tag:      `sltp-${signal.id}`,
  });
}

// ── High-impact news ─────────────────────────────────────────────────────────
// Fired from the orchestrator after the news agent classifies fresh headlines.
// Only HIGH-impact catalysts go out, max 2 per run, deduped for 6 hours so the
// same story doesn't re-alert on every agent refresh.

const NEWS_SEEN = new Map<string, number>();
const NEWS_TTL  = 6 * 60 * 60 * 1000;

function newsAlreadyNotified(fp: string): boolean {
  const ts = NEWS_SEEN.get(fp);
  if (!ts) return false;
  if (Date.now() - ts > NEWS_TTL) { NEWS_SEEN.delete(fp); return false; }
  return true;
}

export async function notifyHighImpactNews(
  catalysts: Array<{ headline: string; impact: string }>
): Promise<void> {
  const high = catalysts.filter(c => c.impact === "high");
  let sent = 0;
  for (const c of high) {
    if (sent >= 2) break; // never burst more than 2 headlines per run
    const fp = c.headline.trim().toLowerCase().slice(0, 80);
    if (newsAlreadyNotified(fp)) continue;
    NEWS_SEEN.set(fp, Date.now());
    sent++;
    await broadcast({
      title:    "📰 High-Impact News",
      body:     c.headline.slice(0, 150),
      url:      "/dashboard",
      severity: "high",
      type:     "news",
      tag:      `news-${fp.slice(0, 40).replace(/[^a-z0-9]/g, "")}`,
    });
  }
}

// ── Trump posts ──────────────────────────────────────────────────────────────
// Fired from the cnn-sync cron for NEWLY inserted posts only (the route diffs
// against the DB, so each post can alert at most once). Gated on market
// relevance — impactScore ≥ 7 — so casual posts don't spam every device.

export async function notifyTrumpPost(post: {
  content: string;
  category: string;
  impactScore: number;
  postId: string;
}): Promise<void> {
  if (post.impactScore < 7) return;
  await broadcast({
    title:    `🦅 Trump — ${post.category} (impact ${post.impactScore}/10)`,
    body:     post.content.slice(0, 150),
    url:      "/dashboard",
    severity: "high",
    type:     "trump",
    tag:      `trump-${post.postId}`,
  });
}
