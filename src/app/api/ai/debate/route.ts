import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Agent prompts ──────────────────────────────────────────────────────────────

const RESEARCHER_PROMPT = `You are a neutral Market Researcher at a trading firm. Your job is to objectively analyze market data and present the facts — no bias, no opinion. You identify key levels, market structure, macro context, and current momentum. You DO NOT make trade recommendations. You just state what the market is showing.

Respond in JSON:
{
  "summary": "2-3 sentence objective summary of current market conditions",
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "structurePhase": "Accumulation|Manipulation|Expansion|Distribution|Range",
  "macroContext": "1 sentence on macro environment",
  "riskLevel": "Low|Medium|High"
}`;

const BULL_PROMPT = `You are the Bull Advocate at a trading firm. You've seen the researcher's findings. Your job is to make the strongest possible LONG case for this trade. Be specific — point to exact levels, confluences, and why price is going higher. Challenge the bear case before it's made. Be confident but logical.

Respond in JSON:
{
  "case": "2-3 sentence bullish argument",
  "entryZone": "specific price zone to buy",
  "targetLevel": "specific price target",
  "stopLevel": "where this bull case is invalidated",
  "confluences": ["confluence 1", "confluence 2", "confluence 3"],
  "conviction": number (0-100)
}`;

const BEAR_PROMPT = `You are the Bear Advocate at a trading firm. You've seen the researcher's findings AND the bull's case. Your job is to challenge the bull argument and make the strongest SHORT or FLAT case. Be specific — point to risks, overextension, and why price could reverse or stay out. Be direct and contrarian.

Respond in JSON:
{
  "case": "2-3 sentence bearish or neutral argument",
  "mainRisk": "the single biggest risk to the bull case",
  "entryZone": "specific price zone to short (or null if flat bias)",
  "targetLevel": "specific price target (or null if flat)",
  "stopLevel": "where this bear case is invalidated (or null if flat)",
  "confluences": ["risk factor 1", "risk factor 2", "risk factor 3"],
  "conviction": number (0-100)
}`;

const ARBITRATOR_PROMPT = `You are the Risk Manager and final Decision Maker at a trading firm. You have heard the Market Researcher, the Bull Advocate, and the Bear Advocate. Your job is to weigh both sides objectively and make the FINAL trading decision. Be decisive. You must pick a side or say NO TRADE with clear reasoning.

Respond in JSON:
{
  "verdict": "TRADE READY" | "WATCHLIST" | "NO TRADE",
  "side": "LONG" | "SHORT" | "FLAT",
  "reasoning": "2-3 sentence final verdict explaining your decision",
  "winnerArgument": "BULL" | "BEAR" | "NEUTRAL",
  "finalEntry": number | null,
  "finalStop": number | null,
  "finalTP": number | null,
  "rr": number | null,
  "keyCondition": "the single most important condition that must be met before entry, or null if NO TRADE"
}`;

// ── Helper ─────────────────────────────────────────────────────────────────────

async function runAgent(
  systemPrompt: string,
  userMessage: string,
  agentName: string,
): Promise<Record<string, unknown>> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "{}";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`${agentName} returned unparseable response`);
  }
}

// ── Route ──────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const body = await req.json();
    const {
      asset, display, price, pctChange, rsi,
      high52w, low52w,
      htfBias, htfConfidence,
      ltfBias, tradeStatus,
      alignment, smcContext,
      entry, stopLoss, tp1, tp2, rrRatio,
      setupQuality, confluences,
      sessionContext, sessionNote,
      liquidityTarget,
      supportingFactors, invalidationFactors,
    } = body;

    const pos52w = (high52w > 0 && low52w > 0)
      ? (((price - low52w) / (high52w - low52w)) * 100).toFixed(0)
      : "N/A";

    const marketContext = `
ASSET: ${display} (${asset})
Price: ${price} | 24h Change: ${pctChange > 0 ? "+" : ""}${Number(pctChange).toFixed(2)}%
RSI: ${rsi ?? "N/A"} | 52w Range: ${low52w} – ${high52w} (${pos52w}% position)
HTF Bias: ${htfBias} (${htfConfidence}% confidence) | LTF: ${ltfBias}
Market Structure: ${alignment} | Phase: ${tradeStatus}
SMC Context: ${smcContext || "N/A"}
Session: ${sessionContext ?? "N/A"} — ${sessionNote ?? ""}
Key Levels → Entry: ${entry ?? "N/A"} | SL: ${stopLoss ?? "N/A"} | TP1: ${tp1 ?? "N/A"} | TP2: ${tp2 ?? "N/A"} | R:R: ${rrRatio ? `1:${rrRatio}` : "N/A"}
Liquidity Target: ${liquidityTarget ?? "N/A"}
Confluences: ${(confluences || []).join(", ") || "None"}
Supporting: ${(supportingFactors || []).join(", ") || "None"}
Invalidations: ${(invalidationFactors || []).join(", ") || "None"}
`.trim();

    // ── Round 1: Researcher ──
    const researcher = await runAgent(
      RESEARCHER_PROMPT,
      `Analyze this market data objectively:\n\n${marketContext}`,
      "Researcher",
    );

    // ── Round 2: Bull ──
    const bull = await runAgent(
      BULL_PROMPT,
      `Market data:\n${marketContext}\n\nResearcher findings:\n${JSON.stringify(researcher)}`,
      "Bull",
    );

    // ── Round 3: Bear ──
    const bear = await runAgent(
      BEAR_PROMPT,
      `Market data:\n${marketContext}\n\nResearcher findings:\n${JSON.stringify(researcher)}\n\nBull's case:\n${JSON.stringify(bull)}`,
      "Bear",
    );

    // ── Round 4: Arbitrator ──
    const arbitrator = await runAgent(
      ARBITRATOR_PROMPT,
      `Market data:\n${marketContext}\n\nResearcher:\n${JSON.stringify(researcher)}\n\nBull:\n${JSON.stringify(bull)}\n\nBear:\n${JSON.stringify(bear)}\n\nMake your final decision.`,
      "Arbitrator",
    );

    return NextResponse.json({ researcher, bull, bear, arbitrator });
  } catch (error: any) {
    console.error("Debate error:", error);
    return NextResponse.json({ error: error.message || "Debate failed" }, { status: 500 });
  }
}
