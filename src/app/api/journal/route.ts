import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";

export const dynamic = "force-dynamic";

// GET /api/journal?date=2025-12-15  OR  ?month=2025-12
export async function GET(req: NextRequest) {
  const { user, supabase } = await getAuthUser(req);
  if (!user) return NextResponse.json({ data: [] });

  const { searchParams } = new URL(req.url);
  const date  = searchParams.get("date");
  const month = searchParams.get("month");

  let query = supabase.from("journal_entries").select("*").eq("user_id", user.id);
  if (date) {
    query = query.eq("date", date);
  } else if (month) {
    query = query.gte("date", `${month}-01`).lte("date", `${month}-31`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ data: [], error: error.message });
  return NextResponse.json({ data });
}

// POST /api/journal  { date, note, screenshot_urls }
export async function POST(req: NextRequest) {
  const { user, supabase } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, note, screenshot_urls } = body;
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("journal_entries")
    .upsert(
      { user_id: user.id, date, note, screenshot_urls: screenshot_urls ?? [], updated_at: new Date().toISOString() },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
