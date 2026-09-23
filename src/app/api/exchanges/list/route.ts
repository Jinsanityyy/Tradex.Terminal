import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { requirePro } from "@/lib/auth/entitlement";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requirePro(req);
  if (!gate.ok) return gate.response;

  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ data: [] }); // return empty, not 401, so the page doesn't break

    // "*" rather than a column list so a database that hasn't run the MT5
    // migration yet (no mt5_account) still lists its connections.
    const { data, error } = await supabase
      .from("exchange_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    // Never send credentials back to the browser, not even encrypted.
    const safe = (data ?? []).map((c) => ({
      id: c.id,
      exchange: c.exchange,
      label: c.label,
      is_active: c.is_active,
      last_synced_at: c.last_synced_at,
      created_at: c.created_at,
      mt5_account: c.mt5_account ?? null,
    }));
    return NextResponse.json({ data: safe });
  } catch (err: any) {
    return NextResponse.json({ data: [], error: err.message });
  }
}
