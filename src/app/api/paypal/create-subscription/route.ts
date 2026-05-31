import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Replaced by Paddle — use /api/paddle/create-checkout
export async function POST() {
  return NextResponse.json(
    { error: "PayPal checkout is no longer supported. Use /api/paddle/create-checkout." },
    { status: 410 }
  );
}
