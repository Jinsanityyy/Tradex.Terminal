import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ data: [] }); // return empty, not 401, so the page doesn't break

    const { data, error } = await supabase
      .from("exchange_connections")
      .select("id, exchange, label, is_active, last_synced_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ data: [], error: err.message });
  }
}
