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
import { broadcast } from "@/lib/push/notify";

export const dynamic = "force-dynamic";

const SAMPLES: Record<string, Parameters<typeof broadcast>[0]> = {
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
  // Simple auth — same secret as cron, or open if no secret configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const secret = req.nextUrl.searchParams.get("secret") ?? "";
    if (secret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized — pass ?secret=CRON_SECRET" }, { status: 401 });
    }
  }

  const type = req.nextUrl.searchParams.get("type") ?? "signal";
  const payload = SAMPLES[type];

  if (!payload) {
    return NextResponse.json({
      error: `Unknown type. Valid types: ${Object.keys(SAMPLES).join(", ")}`,
    }, { status: 400 });
  }

  await broadcast(payload);

  return NextResponse.json({
    ok:      true,
    sent:    true,
    type,
    payload,
    message: `Test "${type}" notification sent to all subscribers`,
  });
}
