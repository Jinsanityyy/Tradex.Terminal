/**
 * GET /api/cron/telegram-screener
 *
 * Called every 5 minutes by Vercel Cron (see vercel.json).
 * Scans recent signals for qualifying alerts and sends them to Telegram.
 *
 * Security: Vercel Cron adds Authorization: Bearer $CRON_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";
import { runTelegramScreener } from "@/lib/telegram/screener";

export const dynamic    = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const start = Date.now();

  try {
    const result = await runTelegramScreener();
    return NextResponse.json({
      ok: true,
      elapsedMs: Date.now() - start,
      ...result,
    });
  } catch (err) {
    console.error("[cron/telegram-screener] failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err), elapsedMs: Date.now() - start },
      { status: 500 }
    );
  }
}
