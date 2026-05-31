import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Replaced by Paddle — webhook endpoint is now /api/paddle/webhook
export async function POST() {
  return NextResponse.json(
    { error: "PayPal webhook is no longer active. Use /api/paddle/webhook." },
    { status: 410 }
  );
}
