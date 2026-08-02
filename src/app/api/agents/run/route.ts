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
import { requirePro } from "@/lib/auth/entitlement";
import { forwardAuth } from "@/lib/auth/forward";

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
  const gate = await requirePro(req);
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const symbol    = searchParams.get("symbol")    ?? "XAUUSD";
  const timeframe = searchParams.get("timeframe") ?? "H1";

  const validated = validateParams(symbol, timeframe);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const result = await runAgentOrchestrator(
      validated.symbol,
      validated.timeframe,
      undefined,
      false,
      forwardAuth(req)
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent run error:", error);
    return NextResponse.json(
      { error: "Agent orchestrator failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const gate = await requirePro(req);
  if (!gate.ok) return gate.response;

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

  // No second subscription check here: requirePro above already established
  // that the caller is entitled. The old block re-queried the table and gated
  // force-refresh on `plan === "pro"` alone, which locked out elite accounts
  // and the owner (who has no subscriptions row at all), and it still keyed
  // off the trial that no longer exists.
  const wantsForceRefresh = body.forceRefresh === true;

  try {
    const result = await runAgentOrchestrator(
      validated.symbol,
      validated.timeframe,
      undefined,
      wantsForceRefresh,
      forwardAuth(req)
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent run POST error:", error);
    return NextResponse.json(
      { error: "Agent orchestrator failed", details: String(error) },
      { status: 500 }
    );
  }
}
