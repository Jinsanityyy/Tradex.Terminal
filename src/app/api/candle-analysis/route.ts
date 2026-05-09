import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// AI analysis has been removed from the candle analysis tab.
// All analysis is now performed client-side using rule-based pattern detection
// and macro news filtering from /api/market/news.

export async function POST() {
  return NextResponse.json(
    { error: "AI candle analysis is disabled. Analysis runs client-side." },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "AI candle analysis disabled — client-side only." });
}
