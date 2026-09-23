import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  MAX_DEALS_PER_REQUEST,
  describeAccount,
  extractToken,
  hashWebhookToken,
  normalizeDeal,
  withoutDetails,
  type Mt5TradeRow,
} from "@/lib/mt5/webhook";

export const dynamic = "force-dynamic";

/**
 * POST /api/mt5/webhook  -  called by the TradexJournal EA, not the browser.
 *
 * Auth: `Authorization: Bearer tdx_mt5_...` (the token shown once on connect).
 * Body:
 *   { "type": "ping",  "account": { "login": 123, "server": "Broker-Demo" } }
 *   { "type": "deals", "account": {...}, "deals": [Mt5Deal, ...] }
 *
 * Deals are upserted by (connection_id, deal ticket), so the EA can resend
 * freely: backfill on every start and retries after a failed request are safe.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const token = extractToken(req.headers, body);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const db = getServiceClient();
  if (!db) {
    console.error("[mt5/webhook] SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const { data: conn, error: connErr } = await db
    .from("exchange_connections")
    .select("id, user_id, is_active")
    .eq("webhook_token_hash", hashWebhookToken(token))
    .eq("exchange", "mt5")
    .maybeSingle();

  if (connErr) {
    console.error("[mt5/webhook] lookup failed:", connErr.message);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!conn || !conn.is_active) {
    return NextResponse.json({ error: "Invalid or revoked token" }, { status: 401 });
  }

  const type = (body as { type?: unknown }).type ?? "deals";
  const rawDeals = (body as { deals?: unknown }).deals;

  if (type !== "ping" && type !== "deals") {
    return NextResponse.json({ error: "type must be ping or deals" }, { status: 400 });
  }
  if (type === "deals" && !Array.isArray(rawDeals)) {
    return NextResponse.json({ error: "deals must be an array" }, { status: 400 });
  }
  if (Array.isArray(rawDeals) && rawDeals.length > MAX_DEALS_PER_REQUEST) {
    return NextResponse.json(
      { error: `At most ${MAX_DEALS_PER_REQUEST} deals per request` },
      { status: 413 },
    );
  }

  const rows: Mt5TradeRow[] = [];
  const rejected: string[] = [];
  for (const raw of (type === "deals" ? (rawDeals as unknown[]) : [])) {
    const r = normalizeDeal(raw);
    if (typeof r === "string") rejected.push(r);
    else rows.push(r);
  }

  if (rows.length > 0) {
    const payload = rows.map((r) => ({ ...r, user_id: conn.user_id, connection_id: conn.id, exchange: "mt5" }));
    // Merge, not ignore: a resend from a newer EA fills in details on trades we
    // already have. Only the columns sent are written, so the trader's own
    // setup/tags/notes on the row are left alone.
    const upsert = (p: typeof payload) =>
      db.from("trades").upsert(p, { onConflict: "connection_id,trade_id" });
    let { error } = await upsert(payload);
    // Database without the detail columns yet: keep journaling the essentials.
    if (error && /column .* does not exist|Could not find the '.*' column/i.test(error.message)) {
      ({ error } = await upsert(payload.map(withoutDetails)));
    }
    if (error) {
      console.error("[mt5/webhook] upsert failed:", error.message);
      // 5xx so the EA keeps the deals queued and retries.
      return NextResponse.json({ error: "Could not save deals" }, { status: 500 });
    }
  }

  // Every contact counts as a sync: the calendar uses this to show the EA is live.
  const account = describeAccount((body as { account?: unknown }).account);
  await db
    .from("exchange_connections")
    .update({ last_synced_at: new Date().toISOString(), ...(account ? { mt5_account: account } : {}) })
    .eq("id", conn.id);

  return NextResponse.json({ ok: true, received: rows.length, rejected });
}
