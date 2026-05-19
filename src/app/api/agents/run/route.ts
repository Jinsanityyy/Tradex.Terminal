/**
 * TradeX Multi-Agent Terminal  -  Run API
 *
 * POST /api/agents/run
 * Body: { symbol: "XAUUSD" | "EURUSD" | "GBPUSD" | "BTCUSD", timeframe: "M5" | "M15" | "H1" | "H4", forceRefresh?: boolean }
 *
 * GET /api/agents/run?symbol=XAUUSD&timeframe=H1
 */

import { NextRequest, NextResponse } from "next/server";
import type { Symbol, Timeframe } from "@/lib/agents/schemas";
import { runAgentOrchestrator } from "@/lib/agents/orchestrator";
import { logSignal } from "@/lib/signals/logger";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { getAgentCache } from "@/lib/agents/agent-cache-store";

export const dynamic = "force-dynamic";
export const maxDuration = 55; // Vercel Pro: 60s max  -  keep 5s buffer for cleanup

const VALID_SYMBOLS: Symbol[] = ["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD"];
const VALID_TIMEFRAMES: Timeframe[] = ["M5", "M15", "H1", "H4"];

function validateParams(symbol: unknown, timeframe: unknown): { symbol: Symbol; timeframe: Timeframe } | { error: string } {
  if (!VALID_SYMBOLS.includes(symbol as Symbol)) {
    return { error: `Invalid symbol. Must be one of: ${VALID_SYMBOLS.join(", ")}` };
  }
  if (!VALID_TIMEFRAMES.includes(timeframe as Timeframe)) {
    return { error: `Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(", ")}` };
  }
  return { symbol: symbol as Symbol, timeframe: timeframe as Timeframe };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol    = searchParams.get("symbol")    ?? "XAUUSD";
  const timeframe = searchParams.get("timeframe") ?? "H1";

  const validated = validateParams(symbol, timeframe);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const result = await runAgentOrchestrator(validated.symbol, validated.timeframe);
    // Log directional signals on GET too  -  dedup in logger (1-min bucket + ignoreDuplicates)
    // prevents spamming from auto-refreshes; only new signals per minute are persisted.
    if (result.agents.master.finalBias !== "no-trade" && result.agents.master.tradePlan) {
      logSignal(result).catch(() => {});
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent run error:", error);
    return NextResponse.json(
      { error: "Agent orchestrator failed", details: String(error) },
      { status: 500 }
    );
  }
}

async function serveCachedOrDeny(symbol: Symbol, timeframe: Timeframe) {
  const cached = await getAgentCache(symbol, timeframe);
  if (cached) return NextResponse.json(cached);
  return NextResponse.json(
    { error: "free_tier_no_cache", message: "Upgrade to Pro to run fresh analysis." },
    { status: 402 }
  );
}

export async function POST(req: NextRequest) {
  let body: { symbol?: unknown; timeframe?: unknown; forceRefresh?: boolean };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validateParams(body.symbol, body.timeframe);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const wantsForceRefresh = body.forceRefresh === true;

  // ── Subscription gate: only pro/elite/trial users may force a fresh run ──
  if (wantsForceRefresh) {
    try {
      const { user, supabase } = await getAuthUser(req);
      if (!user) return serveCachedOrDeny(validated.symbol, validated.timeframe);

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status, trial_ends_at")
        .eq("user_id", user.id)
        .maybeSingle();

      const isTrialing = sub?.trial_ends_at
        ? new Date() < new Date(sub.trial_ends_at) && sub?.plan === "free"
        : false;
      const isPaid = sub?.status === "active" && (sub?.plan === "pro" || sub?.plan === "elite");

      if (!isPaid && !isTrialing) {
        return serveCachedOrDeny(validated.symbol, validated.timeframe);
      }
    } catch {
      return serveCachedOrDeny(validated.symbol, validated.timeframe);
    }
  }

  try {
    const result = await runAgentOrchestrator(
      validated.symbol,
      validated.timeframe,
      undefined,
      wantsForceRefresh
    );

    logSignal(result).catch(() => {});
    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent run POST error:", error);
    return NextResponse.json(
      { error: "Agent orchestrator failed", details: String(error) },
      { status: 500 }
    );
  }
}
