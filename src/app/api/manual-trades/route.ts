import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";

export const dynamic = "force-dynamic";

export interface ManualTradeRow {
  id: string;
  date: string;       // YYYY-MM-DD
  symbol: string;
  direction: "long" | "short";
  pnl: number;
  fees: number;
  notes: string | null;
  created_at: string;
}

// GET /api/manual-trades — fetch all manual trades for the user
export async function GET(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json([] as ManualTradeRow[]);

    const { data, error } = await supabase
      .from("manual_trades")
      .select("id, date, symbol, direction, pnl, fees, notes, created_at")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) throw error;
    return NextResponse.json((data ?? []) as ManualTradeRow[]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/manual-trades — log a new manual trade
export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { date, symbol, direction, pnl, fees, notes } = body;

    if (!date || !symbol || !direction || pnl == null) {
      return NextResponse.json({ error: "date, symbol, direction, pnl are required" }, { status: 400 });
    }
    if (!["long", "short"].includes(direction)) {
      return NextResponse.json({ error: "direction must be long or short" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("manual_trades")
      .insert({
        user_id: user.id,
        date,
        symbol,
        direction,
        pnl: parseFloat(parseFloat(pnl).toFixed(2)),
        fees: parseFloat(parseFloat(fees ?? 0).toFixed(2)),
        notes: notes?.trim() || null,
      })
      .select("id, date, symbol, direction, pnl, fees, notes, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json(data as ManualTradeRow);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/manual-trades?id=<uuid> — delete a manual trade
export async function DELETE(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const { error } = await supabase
      .from("manual_trades")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);   // RLS double-check

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
