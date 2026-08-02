import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TradeX is Gumroad-only now. Purchase happens on Gumroad; see /api/gumroad/redeem.
export async function POST() {
  return NextResponse.json(
    { error: "Paddle checkout is no longer supported. Purchase TradeX Pro on Gumroad instead." },
    { status: 410 }
  );
}
