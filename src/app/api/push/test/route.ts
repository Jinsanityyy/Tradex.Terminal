import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { getServiceClient } from "@/lib/supabase/service";
import { sendFcmToToken } from "@/lib/push/fcm";
import { sendPushToSubscription } from "@/lib/push/sender";

export const dynamic = "force-dynamic";

/**
 * Push notification diagnostics.
 *
 * GET  /api/push/test
 *   Returns a safe health report (no secrets): which env vars are configured and
 *   how many FCM tokens / web-push subscriptions exist in the DB. This alone
 *   pinpoints the most common breakages ("FIREBASE_NT_JSON not set", "0 tokens",
 *   "SUPABASE_SERVICE_ROLE_KEY missing").
 *
 * POST /api/push/test   (authenticated)
 *   Sends a real test notification to the CURRENT user's own devices and returns
 *   per-token results, including the actual firebase-admin error code on failure
 *   (e.g. messaging/mismatched-credential = wrong Firebase project,
 *   messaging/registration-token-not-registered = stale token). This turns the
 *   otherwise-silent send path into an instant diagnosis.
 */

function envReport() {
  return {
    firebaseAdmin:   Boolean(process.env.FIREBASE_NT_JSON),
    supabaseService: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    vapid:           Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    appUrl:          process.env.NEXT_PUBLIC_APP_URL ?? null,
  };
}

export async function GET() {
  const env = envReport();
  const db = getServiceClient();

  let fcmCount: number | null = null;
  let webCount: number | null = null;
  if (db) {
    const [fcm, web] = await Promise.all([
      db.from("fcm_tokens").select("id", { count: "exact", head: true }),
      db.from("push_subscriptions").select("id", { count: "exact", head: true }),
    ]);
    fcmCount = fcm.count ?? 0;
    webCount = web.count ?? 0;
  }

  // Surface a plain-language verdict so the cause is obvious at a glance.
  const problems: string[] = [];
  if (!env.firebaseAdmin)   problems.push("FIREBASE_NT_JSON not set — mobile (FCM) push cannot be sent.");
  if (!env.supabaseService) problems.push("SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL missing — recipient list is unreadable, nothing is sent.");
  if (db && fcmCount === 0)  problems.push("0 FCM tokens registered — no Android device has registered. Re-enable alerts in the app.");

  return NextResponse.json({
    ok: problems.length === 0,
    env,
    recipients: { fcmTokens: fcmCount, webSubscriptions: webCount },
    problems,
    hint: "POST to this endpoint (logged in) to send a real test push to your own devices and see the exact send error.",
  });
}

export async function POST(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 503 });

  const payload = {
    title: "🔔 TradeX test",
    body:  "If you can read this, push delivery is working.",
    url:   "/dashboard",
    severity: "high" as const,
    type:  "agent" as const,
    tag:   "push-test",
  };

  // FCM (mobile) — current user's tokens
  const { data: fcmRows } = await db.from("fcm_tokens").select("id, token").eq("user_id", user.id);
  const fcmResults = await Promise.all(
    (fcmRows ?? []).map(async (r: { id: string; token: string }) => {
      const res = await sendFcmToToken(r.token, payload);
      return { id: r.id, ok: res.ok, error: res.error, messageId: res.messageId };
    })
  );

  // Web push — current user's subscriptions
  const { data: webRows } = await db.from("push_subscriptions").select("id, subscription").eq("user_id", user.id);
  const webResults = await Promise.all(
    (webRows ?? []).map(async (r: { id: string; subscription: import("web-push").PushSubscription }) => {
      const res = await sendPushToSubscription(r.subscription, payload);
      return { id: r.id, ok: res.ok, error: res.error };
    })
  );

  const fcmSent = fcmResults.filter(r => r.ok).length;
  const webSent = webResults.filter(r => r.ok).length;

  return NextResponse.json({
    ok: fcmSent + webSent > 0,
    summary: `FCM ${fcmSent}/${fcmResults.length} sent, Web ${webSent}/${webResults.length} sent`,
    fcm: fcmResults,
    web: webResults,
    note: fcmResults.length === 0 && webResults.length === 0
      ? "You have no registered devices — enable alerts in the app first, then POST again."
      : undefined,
  });
}
