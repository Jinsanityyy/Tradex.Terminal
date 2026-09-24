/**
 * LLM Provider abstraction
 *
 * Lets the agents + AI routes run on a FREE provider (Google Gemini) when an
 * Anthropic key is not available, while keeping Anthropic as an option.
 *
 * Selection (first match wins):
 *   1. GEMINI_API_KEY  (or GOOGLE_GENERATIVE_AI_API_KEY)  → Google Gemini (free tier)
 *   2. ANTHROPIC_API_KEY                                  → Anthropic (paid)
 *   3. none                                               → llmAvailable() === false
 *
 * Every caller passes Anthropic-shaped params and gets an Anthropic-shaped
 * response ({ content: [{ type: "text", text }] }) so existing agent code that
 * reads `response.content[0].text` keeps working unchanged.
 *
 * Optional env:
 *   GEMINI_MODEL  - override the Gemini model (default: gemini-2.0-flash)
 */

import Anthropic from "@anthropic-ai/sdk";

export type LLMMessage = { role: "user" | "assistant"; content: string };

export interface LLMParams {
  model: string;
  max_tokens: number;
  system?: string;
  messages: LLMMessage[];
  temperature?: number;
  jsonMode?: boolean; // default true; set false for conversational (non-JSON) responses
}

export interface LLMResult {
  content: { type: "text"; text: string }[];
}

const geminiKey = () =>
  process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const anthropicKey = () => process.env.ANTHROPIC_API_KEY || "";

export type Provider = "gemini" | "anthropic" | null;

export function activeProvider(): Provider {
  if (geminiKey()) return "gemini";
  if (anthropicKey()) return "anthropic";
  return null;
}

/** True when at least one LLM provider is configured. */
export function llmAvailable(): boolean {
  return activeProvider() !== null;
}

function geminiModel(): string {
  // gemini-2.5-flash is on the free tier and handles JSON-mode well.
  // (gemini-2.0-flash returns 429 "limit: 0" on free-tier keys.)
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

// ── Gemini ───────────────────────────────────────────────────────────────────

async function geminiCreate(params: LLMParams, timeoutMs: number): Promise<LLMResult> {
  const key = geminiKey();
  const model = geminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const contents = params.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const useJson = params.jsonMode !== false;
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: params.max_tokens,
      temperature: params.temperature ?? 0.5,
      ...(useJson ? { responseMimeType: "application/json" } : {}),
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (params.system) body.systemInstruction = { parts: [{ text: params.system }] };
  // News about wars, threats and attacks is routine market input here; the
  // default filters blocked whole summaries (an empty reply) over a headline
  // like "Trump warns he could annihilate Iran". Only high-probability harm
  // is blocked.
  body.safetySettings = [
    "HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH",
    "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT",
  ].map(category => ({ category, threshold: "BLOCK_ONLY_HIGH" }));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    // An empty reply is a failure, not an answer: say why, so callers fall
    // back instead of parsing "" and logs show the cause.
    if (!text.trim()) {
      throw new Error(`Gemini returned no text (${data.promptFeedback?.blockReason ?? data.candidates?.[0]?.finishReason ?? "no candidates"})`);
    }
    return { content: [{ type: "text", text }] };
  } finally {
    clearTimeout(timer);
  }
}

// ── Anthropic ──────────────────────────────────────────────────────────────────

async function anthropicCreateImpl(params: LLMParams, timeoutMs: number): Promise<LLMResult> {
  const client = new Anthropic({ apiKey: anthropicKey() });
  const msg = await client.messages.create(
    {
      model: params.model,
      max_tokens: params.max_tokens,
      ...(params.system ? { system: params.system } : {}),
      ...(params.temperature != null ? { temperature: params.temperature } : {}),
      messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
    },
    { timeout: timeoutMs },
  );
  const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  return { content: [{ type: "text", text }] };
}

// ── Public entry point ──────────────────────────────────────────────────────────

// Appended to every model call, so no route can forget it. The app is an
// informational terminal: models describe implications and levels, and must
// not hand a reader personal trade instructions — the wording the Play
// financial services policy scrutinises. Hand-written copy follows the same rule.
const ADVICE_GUARD =
  "This text is shown in an informational market-analysis app, not given as personal financial advice. " +
  "Describe market implications (for example 'gold-negative', 'USD-positive', 'bounces have tended to fade'), " +
  "key levels, and what would confirm or invalidate a read. Never instruct the reader to buy, sell, enter, exit, " +
  "go long or short, scale in or out, move a stop, or choose a position size.";

export async function llmCreate(params: LLMParams, timeoutMs = 25_000): Promise<LLMResult> {
  params = { ...params, system: params.system ? `${params.system}\n\n${ADVICE_GUARD}` : ADVICE_GUARD };
  const provider = activeProvider();
  if (provider === "gemini") {
    try {
      return await geminiCreate(params, timeoutMs);
    } catch (err) {
      // Free-tier quota or a blocked reply: use Anthropic when it is configured.
      if (!anthropicKey()) throw err;
      console.warn("[llm] Gemini failed, falling back to Anthropic:", (err as Error)?.message ?? err);
      return anthropicCreateImpl(params, timeoutMs);
    }
  }
  if (provider === "anthropic") return anthropicCreateImpl(params, timeoutMs);
  throw new Error("No LLM provider configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY)");
}
