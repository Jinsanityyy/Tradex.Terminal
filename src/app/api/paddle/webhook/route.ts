import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TradeX is Gumroad-only now. This no longer grants or updates access —
// see /api/gumroad/webhook for the live entitlement path.
export async function POST() {
  return NextResponse.json(
    { error: "Paddle webhook is no longer active. Use /api/gumroad/webhook." },
    { status: 410 }
  );
}
