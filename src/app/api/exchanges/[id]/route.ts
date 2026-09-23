import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/exchanges/:id
 *   ?keepTrades=1  Disconnect: stop syncing and wipe the credentials, but keep
 *                  every trade it journaled. The default the UI offers.
 *   (no param)     Delete the connection. Its trades cascade with it.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const keepTrades = req.nextUrl.searchParams.get("keepTrades") === "1";

    if (keepTrades) {
      // "*" keeps this working whether or not the MT5/cTrader columns exist.
      const { data: conn, error: readErr } = await supabase
        .from("exchange_connections")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (readErr) throw readErr;
      if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

      // Blank every secret the row has, so a disconnected row holds nothing usable.
      const wipe: Record<string, unknown> = { is_active: false, api_key: "", api_secret: "" };
      for (const col of ["api_passphrase", "ctrader_access_token", "ctrader_refresh_token", "webhook_token_hash"]) {
        if (col in conn) wipe[col] = null;
      }
      const { error } = await supabase
        .from("exchange_connections")
        .update(wipe)
        .eq("id", params.id)
        .eq("user_id", user.id);
      if (error) throw error;
      return NextResponse.json({ success: true, disconnected: true });
    }

    const { error } = await supabase
      .from("exchange_connections")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
