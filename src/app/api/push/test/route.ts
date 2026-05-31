/**
 * GET /api/push/test?type=signal&secret=xxx
 *
 * Sends a sample push notification so you can preview the real look
 * on your device (Android app + browser).
 *
 * Query params:
 *   type   = signal | entry | sltp | news | trump | catalyst  (default: signal)
 *   secret = must match CRON_SECRET env var (or any value if CRON_SECRET not set)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { sendFcmToMany } from "@/lib/push/fcm";
import { sendPushToMany } from "@/lib/push/sender";
import type { PushPayload } from "@/lib/push/sender";

export const dynamic = "force-dynamic";

const SAMPLES: Record<string, PushPayload & { tag?: string }> = {
  signal: {
    title: "📊 New Signal: XAUUSD",
    body:  "🟢 BUY | Entry: 3,245.50 | RR: 2.4R | TF: H1",
    url:   "/dashboard/signals",
    severity: "high",
    type:  "signal",
    tag:   "test-signal",
  },
  entry: {
    title: "⚠️ Entry Zone: XAUUSD",
    body:  "🟢 BUY entry at 3,245.50 — price is approaching now!",
    url:   "/dashboard/signals",
    severity: "high",
    type:  "signal",
    tag:   "test-entry",
  },
  sltp: {
    title: "🏆 TP Hit: XAUUSD",
    body:  "TP2 ✅✅ triggered on H1 bullish signal",
    url:   "/dashboard/signals",
    severity: "medium",
    type:  "signal",
    tag:   "test-sltp",
  },
  sl: {
    title: "🛑 SL Hit: EURUSD",
    body:  "SL ❌ triggered on H4 bearish signal",
    url:   "/dashboard/signals",
    severity: "high",
    type:  "signal",
    tag:   "test-sl",
  },
  news: {
    title: "📰 Market Alert",
    body:  "US CPI hotter than expected — core inflation at 3.8% YoY, dollar surges",
    url:   "/dashboard/news",
    severity: "high",
    type:  "news",
    tag:   "test-news",
  },
  trump: {
    title: "🇺🇸 Trump Post",
    body:  "TARIFFS ARE COMING — NO EXCEPTIONS. AMERICA FIRST!",
    url:   "/dashboard/trump-monitor",
    severity: "high",
    type:  "trump",
    tag:   "test-trump",
  },
  catalyst: {
    title: "⚡ High Impact Event",
    body:  "Non-Farm Payrolls (USD) — Expected: 200K",
    url:   "/dashboard/economic-calendar",
    severity: "high",
    type:  "news",
    tag:   "test-catalyst",
  },
};

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "signal";
  const payload = SAMPLES[type];

  if (!payload) {
    return NextResponse.json({
      error: `Unknown type. Valid types: ${Object.keys(SAMPLES).join(", ")}`,
    }, { status: 400 });
  }

  const db = getServiceClient();
  const [fcmData, subData] = await Promise.all([
    db?.from("fcm_tokens").select("id, token"),
    db?.from("push_subscriptions").select("id, subscription"),
  ]);

  const fcmTokens = (fcmData?.data ?? []) as Array<{ id: string; token: string }>;
  const webSubs   = (subData?.data ?? []) as Array<{ id: string; subscription: import("web-push").PushSubscription }>;

  let fcmResult   = { sent: 0, failed: 0, expired: [] as string[], messageIds: [] as string[] };
  let webResult   = { sent: 0, failed: 0, expired: [] as string[] };
  const hasFcmEnv = Boolean(process.env.FIREBASE_NT_JSON);
  const hasVapid  = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PR_ATE_KEY);

  if (fcmTokens.length > 0 && hasFcmEnv) {
    fcmResult = await sendFcmToMany(fcmTokens, payload as PushPayload);
  }
  if (webSubs.length > 0 && hasVapid) {
    webResult = await sendPushToMany(webSubs, payload as PushPayload);
  }

  return NextResponse.json({
    ok: true,
    type,
    payload,
    debug: {
      fcm: {
        tokensFound:   fcmTokens.length,
        envConfigured: hasFcmEnv,
        sent:          fcmResult.sent,
        failed:        fcmResult.failed,
        messageIds:    fcmResult.messageIds,   // real Firebase message IDs if delivered
        tokens:        fcmTokens.map(t => "..." + t.token.slice(-12)),
      },
      webPush: {
        subsFound:     webSubs.length,
        envConfigured: hasVapid,
        sent:          webResult.sent,
        failed:        webResult.failed,
      },
    },
  });
}
