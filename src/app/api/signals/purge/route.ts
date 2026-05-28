import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Temporary one-shot endpoint: deletes the stale mock signal at ~3305
// Will be removed after use.
export async function GET() {
  try {
    const { getServiceClient } = await import("@/lib/supabase/service");
    const db = getServiceClient();
    if (!db) return NextResponse.json({ error: "No DB client" }, { status: 500 });

    const { error, count } = await db
      .from("signals")
      .delete()
      .eq("symbol", "XAUUSD")
      .gte("entry_price", 3300)
      .lte("entry_price", 3315);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: count ?? 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
