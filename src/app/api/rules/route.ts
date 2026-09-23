import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { requireUser } from "@/lib/auth/entitlement";
import { EMPTY_RULES, type TradingRules } from "@/lib/trades/risk-guard";

export const dynamic = "force-dynamic";

const MISSING_TABLE = /relation .*trading_rules.* does not exist|Could not find the table/i;

/** GET /api/rules  the trader's Risk Guard rules (empty defaults when none saved). */
export async function GET(req: NextRequest) {
  const gate = await requireUser(req);
  if (!gate.ok) return gate.response;

  const { user, supabase } = await getAuthUser(req);
  if (!user) return NextResponse.json({ rules: EMPTY_RULES });

  const { data, error } = await supabase.from("trading_rules").select("*").eq("user_id", user.id).maybeSingle();
  if (error) {
    if (MISSING_TABLE.test(error.message)) return NextResponse.json({ rules: EMPTY_RULES, needsMigration: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rules: data ? { ...EMPTY_RULES, ...pick(data) } : EMPTY_RULES });
}

/** PUT /api/rules  save the rules. Blank or non-positive numbers clear a limit. */
export async function PUT(req: NextRequest) {
  const gate = await requireUser(req);
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });

  const money = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null; };
  const count = (v: unknown) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(n, 1000) : null; };
  const start = typeof body.prop_start_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.prop_start_date)
    ? body.prop_start_date : null;

  const rules: TradingRules = {
    account_size: money(body.account_size),
    daily_loss_limit: money(body.daily_loss_limit),
    max_trades_per_day: count(body.max_trades_per_day),
    max_consecutive_losses: count(body.max_consecutive_losses),
    prop_enabled: body.prop_enabled === true,
    prop_start_date: start,
    profit_target: money(body.profit_target),
    max_drawdown: money(body.max_drawdown),
    drawdown_type: body.drawdown_type === "trailing" ? "trailing" : "static",
  };

  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("trading_rules")
      .upsert({ user_id: user.id, ...rules, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) {
      if (MISSING_TABLE.test(error.message)) {
        return NextResponse.json({ error: "Risk Guard needs the latest database update (20260924_trading_rules.sql)." }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ rules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function pick(row: Record<string, unknown>): Partial<TradingRules> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(EMPTY_RULES)) {
    const v = row[k];
    out[k] = typeof v === "string" && k !== "prop_start_date" && k !== "drawdown_type" ? Number(v) : v;
  }
  return out as Partial<TradingRules>;
}
