/**
 * LLM API Circuit Breaker
 *
 * Opens after MAX_FAILURES within FAILURE_WINDOW.
 * Stays open for OPEN_DURATION then half-opens to allow a retry.
 * Also enforces a per-request timeout so no single LLM call can
 * exceed the orchestrator's 55-second Vercel limit.
 *
 * The actual provider (Gemini when free, Anthropic when keyed) is resolved by
 * `llm-provider`. The `client` argument is accepted for backwards compatibility
 * but is no longer used — provider selection is env-driven.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { llmCreate } from "./llm-provider";

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

/** Extract a plain-string prompt from Anthropic-style message content. */
function asText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => (b && typeof b === "object" && "text" in b ? String((b as { text: unknown }).text ?? "") : ""))
      .join("");
  }
  return "";
}

export async function anthropicCreate(
  _client: Anthropic | null,
  params: CreateParams
): Promise<Anthropic.Message> {
  if (isCircuitOpen()) {
    throw new Error("LLM circuit open  -  rule-based fallback");
  }
  try {
    const result = await llmCreate(
      {
        model: String(params.model),
        max_tokens: params.max_tokens,
        system: typeof params.system === "string" ? params.system : asText(params.system),
        messages: (params.messages ?? []).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: asText(m.content),
        })),
        temperature: params.temperature,
      },
      API_TIMEOUT
    );
    failures = [];                 // reset on success
    return result as unknown as Anthropic.Message;
  } catch (err) {
    failures.push(Date.now());    // record failure toward circuit trip
    throw err;
  }
}
