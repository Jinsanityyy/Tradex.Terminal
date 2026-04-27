/**
 * Agent 7 — Master Decision Agent (LLM-Powered + Rule-Based)
 *
 * Reads all agent outputs, computes weighted consensus,
 * and produces the final trade decision + plan.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  MarketSnapshot,
  TrendAgentOutput,
  SMCAgentOutput,
  NewsAgentOutput,
  RiskAgentOutput,
  ExecutionAgentOutput,
  ContrarianAgentOutput,
  MasterDecisionOutput,
  TradePlan,
  ScoringWeights,
  DebateEntry,
} from "./schemas";
import { DEFAULT_WEIGHTS } from "./schemas";
import { computeConsensus, matchStrategy } from "./scoring";

// ─────────────────────────────────────────────────────────────────────────────
// LLM Synthesis Prompt
// ─────────────────────────────────────────────────────────────────────────────

const MASTER_SYSTEM = `You are the Master Decision Agent in a professional multi-agent trading system. You are the final adjudicator. Six specialist agents have completed their independent analysis AND conducted a structured debate where they challenged each other.

Your role:
1. Read the full agent debate — understand who agreed, who challenged, and WHY
2. Weigh the weighted consensus score against the debate arguments
3. Make the FINAL call: "bullish", "bearish", or "no-trade"
4. Write 3-5 SUPPORTS (strongest arguments for your final bias)
5. Write 3-4 INVALIDATIONS (what would prove you wrong)
6. Confirm or adjust the execution plan

You think like a senior portfolio manager who has just chaired a committee debate. The debate happened — now you decide.

ADJUDICATION RULES:
- If risk agent is invalid → always "no-trade" (non-negotiable)
- If consensus score is within ±20 → "no-trade" unless one agent has >85% confidence
- If contrarian agent's challenge is well-reasoned and riskFactor > 60 → reduce confidence by 15-25%
- Strong challenges from multiple agents (>2) against majority = reduce confidence or flip to no-trade
- Weight the QUALITY of the debate arguments, not just the count
- Be terse and tactical. This is a live trade decision.

Return ONLY valid JSON:
{
  "finalBias": "bullish" | "bearish" | "no-trade",
  "confidence": 0-100,
  "supports": ["support 1", "support 2", "support 3"],
  "invalidations": ["invalidation 1", "invalidation 2", "invalidation 3"],
  "noTradeReason": "string or null",
  "strategyMatch": "named strategy or null"
}`;

async function runLLMMaster(
  client: Anthropic,
  snapshot: MarketSnapshot,
  trend: TrendAgentOutput,
  smc: SMCAgentOutput,
  news: NewsAgentOutput,
  risk: RiskAgentOutput,
  execution: ExecutionAgentOutput,
  contrarian: ContrarianAgentOutput,
  consensusScore: number,
  preliminaryBias: string,
  debate?: DebateEntry[]
): Promise<{ finalBias: string; confidence: number; supports: string[]; invalidations: string[]; noTradeReason?: string; strategyMatch?: string }> {
  const debateSection = debate && debate.length > 0
    ? `\nAGENT DEBATE (read carefully before deciding):\n${debate.map(d =>
        `[${d.displayName.toUpperCase()}] ${d.stance.toUpperCase()} @ ${d.confidence}%\n  Position: ${d.position}${d.challenge ? `\n  CHALLENGE: ${d.challenge}` : ""}`
      ).join("\n\n")}`
    : "\n(No debate data — decide based on agent signals only)";

  const msg = `
MASTER DECISION — ${snapshot.symbolDisplay} (${snapshot.timeframe})
Current price: ${snapshot.price.current} | Session: ${snapshot.indicators.session}

CONSENSUS SCORE: ${consensusScore.toFixed(1)} → preliminary bias: ${preliminaryBias.toUpperCase()}

AGENT SIGNALS:
[TREND] ${trend.bias.toUpperCase()} @ ${trend.confidence}% | Phase: ${trend.marketPhase} | TF aligned: ${trend.timeframeBias.aligned}
[PA] ${smc.bias.toUpperCase()} @ ${smc.confidence}% | Setup: ${smc.setupType} | Break: ${smc.bosDetected} | Sweep: ${smc.liquiditySweepDetected}
[NEWS] ${news.impact.toUpperCase()} @ ${news.confidence}% | Regime: ${news.regime} | Risk: ${news.riskScore}/100
[RISK] ${risk.valid ? "VALID" : "INVALID"} | Grade: ${risk.grade} | Session: ${risk.sessionScore}/100 | Vol: ${risk.volatilityScore}/100
[EXECUTION] ${execution.hasSetup ? execution.direction.toUpperCase() : "NO SETUP"} | Entry: ${execution.entry ?? "none"} | SL: ${execution.stopLoss ?? "none"} | TP1: ${execution.tp1 ?? "none"} | RR: ${execution.rrRatio ?? "N/A"}
[CONTRARIAN] Challenges: ${contrarian.challengesBias} | Trap: ${contrarian.trapType ?? "none"} | Risk: ${contrarian.riskFactor}/100
${debateSection}

NEWS CATALYSTS:
${news.catalysts.slice(0, 3).map(c => `• [${c.impact.toUpperCase()}] ${c.headline}`).join("\n")}

You have read the debate. Adjudicate. Return JSON only.`.trim();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 700,
    system: MASTER_SYSTEM,
    messages: [{ role: "user", content: msg }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule-Based Synthesis (fallback)
// ─────────────────────────────────────────────────────────────────────────────

function buildSupports(
  trend: TrendAgentOutput,
  smc: SMCAgentOutput,
  news: NewsAgentOutput,
  execution: ExecutionAgentOutput,
  finalBias: string
): string[] {
  const supports: string[] = [];
  const isNoTrade = finalBias === "no-trade";
  const isBull = finalBias === "bullish";

  // ── No-trade: show what each agent is actually seeing ──────────────────
  if (isNoTrade) {
    if (trend.reasons.length > 0) {
      supports.push(`Trend (${trend.bias.toUpperCase()} ${trend.confidence}%): ${trend.reasons[0]}`);
    } else {
      supports.push(`Trend Agent sees ${trend.bias.toUpperCase()} at ${trend.confidence}% — phase: ${trend.marketPhase}`);
    }

    if (smc.reasons.length > 0) {
      supports.push(`Price Action (${smc.bias.toUpperCase()} ${smc.confidence}%): ${smc.reasons[0]}`);
    } else {
      supports.push(`PA Agent: ${smc.setupType} setup — ${smc.premiumDiscount} zone`);
    }

    if (news.reasons.length > 0) {
      supports.push(`News/Macro (${news.impact.toUpperCase()} ${news.confidence}%): ${news.reasons[0]}`);
    } else {
      supports.push(`Macro: ${news.dominantCatalyst.slice(0, 90)}`);
    }

    supports.push(`Market phase: ${trend.marketPhase} — ${trend.momentumDirection} momentum, ${smc.premiumDiscount} zone`);
    return supports.slice(0, 4);
  }

  // ── Directional: original logic ────────────────────────────────────────
  if (trend.bias === finalBias && trend.confidence >= 55) {
    supports.push(`Trend Agent ${trend.confidence}%: ${trend.reasons[0] ?? "momentum confirmed"}`);
  }

  if (smc.bias === finalBias && smc.setupPresent) {
    supports.push(`PA Agent ${smc.confidence}%: ${smc.setupType} setup ${smc.bosDetected ? "— structure break confirmed" : smc.liquiditySweepDetected ? "— sweep executed" : "— structure present"}`);
  }

  if (news.impact === finalBias && news.confidence >= 40) {
    supports.push(`News Agent ${news.confidence}%: ${news.dominantCatalyst.slice(0, 80)}`);
  }

  if (execution.hasSetup && ((execution.direction === "long" && isBull) || (execution.direction === "short" && !isBull))) {
    supports.push(`Execution Agent: clean setup — entry ${execution.entry?.toFixed(4)}, RR ${execution.rrRatio?.toFixed(1) ?? "N/A"}:1, trigger: ${execution.trigger}`);
  }

  if (smc.premiumDiscount === "DISCOUNT" && isBull) {
    supports.push("Price at DISCOUNT zone — institutional buy pressure zone, optimal long entry territory");
  }
  if (smc.premiumDiscount === "PREMIUM" && !isBull) {
    supports.push("Price at PREMIUM zone — institutional sell pressure zone, optimal short entry territory");
  }

  // Fallback: always include at least the dominant trend reason
  if (supports.length === 0 && trend.reasons.length > 0) {
    supports.push(`Trend Agent ${trend.confidence}%: ${trend.reasons[0]}`);
  }

  return supports.slice(0, 5);
}

function buildInvalidations(
  trend: TrendAgentOutput,
  smc: SMCAgentOutput,
  risk: RiskAgentOutput,
  contrarian: ContrarianAgentOutput,
  execution: ExecutionAgentOutput
): string[] {
  const invalidations: string[] = [];

  if (contrarian.failureReasons.length > 0) {
    invalidations.push(contrarian.failureReasons[0]);
  }

  if (risk.warnings.length > 0) {
    invalidations.push(`Risk warning: ${risk.warnings[0]}`);
  }

  if (smc.invalidationLevel !== null) {
    invalidations.push(`PA invalidation: break/close through ${smc.invalidationLevel.toFixed(4)} negates ${smc.bias} structure`);
  }

  if (execution.stopLoss !== null) {
    invalidations.push(`Execution SL at ${execution.stopLoss.toFixed(4)} — ${execution.slZone}`);
  }

  if (trend.invalidationLevel !== null) {
    invalidations.push(`Trend invalidation: ${trend.invalidationLevel.toFixed(4)} — HTF bias shifts on close through this level`);
  }

  return invalidations.slice(0, 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Master Agent
// ─────────────────────────────────────────────────────────────────────────────

export async function runMasterAgent(
  snapshot: MarketSnapshot,
  trend: TrendAgentOutput,
  smc: SMCAgentOutput,
  news: NewsAgentOutput,
  risk: RiskAgentOutput,
  execution: ExecutionAgentOutput,
  contrarian: ContrarianAgentOutput,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  anthropicApiKey?: string,
  debate?: DebateEntry[]
): Promise<MasterDecisionOutput> {
  const start = Date.now();

  try {
    // ── Compute consensus ────────────────────────────────────────────────
    const { consensusScore, finalBias, confidence, agentConsensus, noTradeReason } =
      computeConsensus(trend, smc, news, risk, execution, contrarian, weights);

    // ── LLM synthesis (optional enhancement) ─────────────────────────────
    let llmResult: { finalBias: string; confidence: number; supports: string[]; invalidations: string[]; noTradeReason?: string; strategyMatch?: string } | null = null;

    if (anthropicApiKey) {
      try {
        const client = new Anthropic({ apiKey: anthropicApiKey });
        llmResult = await runLLMMaster(
          client, snapshot, trend, smc, news, risk, execution, contrarian,
          consensusScore, finalBias, debate
        );
      } catch (err) {
        console.warn("Master LLM fallback:", err);
      }
    }

    // ── Final decision ────────────────────────────────────────────────────
    const resolvedBias = (llmResult?.finalBias ?? finalBias) as "bullish" | "bearish" | "no-trade";
    const resolvedConf = llmResult?.confidence ?? confidence;

    // ── Trade Plan ────────────────────────────────────────────────────────
    let tradePlan: TradePlan | null = null;

    if (resolvedBias !== "no-trade" && execution.hasSetup && risk.valid &&
        execution.entry !== null && execution.stopLoss !== null && execution.tp1 !== null) {
      tradePlan = {
        direction: execution.direction === "long" ? "long" : "short",
        entry: execution.entry,
        stopLoss: execution.stopLoss,
        tp1: execution.tp1,
        tp2: execution.tp2,
        rrRatio: execution.rrRatio ?? 2,
        maxRiskPercent: risk.maxRiskPercent,
        trigger: execution.trigger,
        triggerCondition: execution.triggerCondition,
        entryZone: execution.entryZone,
        slZone: execution.slZone,
        tp1Zone: execution.tp1Zone,
        managementNotes: execution.managementNotes,
      };
    }

    // ── Supports / Invalidations ──────────────────────────────────────────
    const supports = llmResult?.supports?.length
      ? llmResult.supports
      : buildSupports(trend, smc, news, execution, resolvedBias);

    const invalidations = llmResult?.invalidations?.length
      ? llmResult.invalidations
      : buildInvalidations(trend, smc, risk, contrarian, execution);

    // ── Strategy match ────────────────────────────────────────────────────
    const strategyMatch = llmResult?.strategyMatch ?? matchStrategy(smc, trend, news);

    return {
      agentId: "master",
      finalBias: resolvedBias,
      confidence: resolvedConf,
      consensusScore,
      tradePlan,
      supports,
      invalidations,
      agentConsensus,
      noTradeReason: resolvedBias === "no-trade"
        ? (llmResult?.noTradeReason ?? noTradeReason)
        : undefined,
      strategyMatch,
      processingTime: Date.now() - start,
    };
  } catch (err) {
    return {
      agentId: "master",
      finalBias: "no-trade",
      confidence: 0,
      consensusScore: 0,
      tradePlan: null,
      supports: [],
      invalidations: ["Master agent failed to process"],
      agentConsensus: [],
      noTradeReason: "Master agent error — standing aside",
      processingTime: Date.now() - start,
      error: String(err),
    };
  }
}
