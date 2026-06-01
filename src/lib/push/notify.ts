/**
 * Real-time push notification helper
 *
 * Fire-and-forget sender used directly from signal logger and tracker
 * so users get instant alerts without waiting for the 5-minute cron.
 *
 * Always call as `void notifyXxx(...)` — never await it in a hot path.
 */

import { getServiceClient } from "@/lib/supabase/service";
import { sendFcmToMany } from "@/lib/push/fcm";
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

    const sends: Promise<unknown>[] = [];

    if (fcmTokens.length > 0 && process.env.FIREBASE_NT_JSON) {
      sends.push(sendFcmToMany(fcmTokens, payload).catch(() => {}));
    }

    if (webSubs.length > 0 && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      sends.push(sendPushToMany(webSubs, payload).catch(() => {}));
    }

    if (sends.length > 0) await Promise.all(sends);
  } catch {
    // Never crash the caller
  }
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
