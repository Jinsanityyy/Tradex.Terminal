import { NextResponse } from "next/server";
import { requirePro } from "@/lib/auth/entitlement";

/**
 * GET /api/ws/token
 *
 * Hands the Finnhub websocket key to an entitled client so the key does not
 * have to ship in the browser bundle.
 *
 * useWebSocketPrices has always called this endpoint, but the route did not
 * exist — the fetch 404'd every time and the hook silently fell back to
 * NEXT_PUBLIC_FINNHUB_API_KEY, which put the key in the bundle for anyone to
 * read. This is the missing half of that design.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requirePro(req);
  if (!gate.ok) return gate.response;

  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    return NextResponse.json({ error: "Live price feed is not configured." }, { status: 503 });
  }

  return NextResponse.json(
    { token },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
