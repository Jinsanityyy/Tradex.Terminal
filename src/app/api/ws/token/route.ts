import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Returns the Finnhub WebSocket token to authenticated users only.
// This keeps the key out of the client JS bundle (use FINNHUB_API_KEY, not NEXT_PUBLIC_).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  if (!token) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  return NextResponse.json({ token });
}
