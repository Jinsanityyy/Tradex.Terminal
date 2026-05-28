import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ── POST /api/trade-approval — create pending approval when signal arms ────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, signalKey, symbol, timeframe, direction, entry, stopLoss, tp1, tp2, rrRatio, grade } = body;
    if (!userId || !signalKey || !symbol || !direction || !entry || !stopLoss || !tp1) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await sb().from("trade_approvals").upsert({
      user_id:    userId,
      signal_key: signalKey,
      symbol,
      timeframe,
      direction,
      entry,
      stop_loss:  stopLoss,
      tp1,
      tp2:        tp2 ?? null,
      rr_ratio:   rrRatio ?? null,
      grade:      grade ?? null,
      status:     "pending",
      created_at: new Date().toISOString(),
    }, { onConflict: "user_id,signal_key", ignoreDuplicates: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── PATCH /api/trade-approval — approve or reject ─────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, signalKey, status } = body;
    if (!userId || !signalKey || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { error } = await sb()
      .from("trade_approvals")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("signal_key", signalKey)
      .eq("status", "pending");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── GET /api/trade-approval — bot polls this for approved trades ──────────────
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const { data, error } = await sb()
      .from("trade_approvals")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "approved")
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── PUT /api/trade-approval — bot marks trade as executed or failed ───────────
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, signalKey, status, executedPrice, lotSize, errorMessage } = body;
    if (!userId || !signalKey || !["executed", "failed"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { error } = await sb()
      .from("trade_approvals")
      .update({
        status,
        executed_price: executedPrice ?? null,
        lot_size:       lotSize ?? null,
        error_message:  errorMessage ?? null,
        executed_at:    new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("signal_key", signalKey);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
