/**
 * Anthropic API Circuit Breaker
 *
 * Opens after MAX_FAILURES within FAILURE_WINDOW.
 * Stays open for OPEN_DURATION then half-opens to allow a retry.
 * Also enforces a per-request timeout so no single LLM call can
 * exceed the orchestrator's 55-second Vercel limit.
 */

import Anthropic from "@anthropic-ai/sdk";

const MAX_FAILURES   = 3;
const FAILURE_WINDOW = 60_000;   // count failures within this rolling window (ms)
const OPEN_DURATION  = 120_000;  // stay open for 2 min before retrying
export const API_TIMEOUT = 25_000; // 25s per LLM call (well under 55s orchestrator cap)

let failures: number[] = [];
let openUntil = 0;

export function isCircuitOpen(): boolean {
  if (Date.now() < openUntil) return true;
  const now = Date.now();
  failures = failures.filter(t => now - t < FAILURE_WINDOW);
  if (failures.length >= MAX_FAILURES) {
    openUntil = now + OPEN_DURATION;
    console.warn(
      `[circuit-breaker] Anthropic API OPEN  -  ${failures.length} failures in ${FAILURE_WINDOW / 1000}s. ` +
      `Rule-based fallback active for ${OPEN_DURATION / 1000}s.`
    );
    return true;
  }
  return false;
}

type CreateParams = Parameters<Anthropic["messages"]["create"]>[0];

export async function anthropicCreate(
  client: Anthropic,
  params: CreateParams
): Promise<Anthropic.Message> {
  if (isCircuitOpen()) {
    throw new Error("Anthropic circuit open  -  rule-based fallback");
  }
  try {
    const result = await client.messages.create(params, { timeout: API_TIMEOUT });
    failures = [];                 // reset on success
    return result as Anthropic.Message;
  } catch (err) {
    failures.push(Date.now());    // record failure toward circuit trip
    throw err;
  }
}
