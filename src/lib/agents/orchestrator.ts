/**
 * TradeX Multi-Agent Terminal — Master Orchestrator
 *
 * Entry point for the multi-agent system.
 * Coordinates all 7 agents, handles caching, and returns the full AgentRunResult.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  AgentRunResult, Symbol, Timeframe, ScoringWeights, DebateEntry,
  TrendAgentOutput, SMCAgentOutput, NewsAgentOutput,
  RiskAgentOutput, ExecutionAgentOutput, ContrarianAgentOutput,
} from "./schemas";
import { DEFAULT_WEIGHTS } from "./schemas";
import { buildMarketSnapshot, buildMockSnapshot } from "./market-snapshot";
import { runTrendAgent }     from "./trend-agent";
import { runPriceActionAgent } from "./price-action-agent";
import { runNewsAgent }      from "./news-agent";
import { runRiskAgent }      from "./risk-agent";
import { runExecutionAgent } from "./execution-agent";
import { runContrarianAgent } from "./contrarian-agent";
import { runMasterAgent }    from "./master-agent";
import { logSignal }         from "@/lib/signals/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Cache (server-side, per symbol+timeframe)
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL = 300_000; // 5 minutes
const cache = new Map<string, { result: AgentRunResult; ts: number }>();

function cacheKey(symbol: Symbol, timeframe: Timeframe): string {
  return `${symbol}_${timeframe}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Data Fetcher
// ─────────────────────────────────────────────────────────────────────────────

const SYMBOL_TO_API: Partial<Record<Symbol, string>> = {
  XAUUSD: "XAU/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  BTCUSD: "BTC/USD",
};

async function fetchMarketData(symbol: Symbol): Promise<{
  quote: Record<string, string | { high: string; low: string }> | null;
  news: Array<{ headline: string; summary: string; datetime: number }>;
  rsi?: number;
}> {
  try {
    // Reuse the existing quotes cache
    const { ensureCacheWarm, getQuotesForSymbols } = await import("@/lib/api/quotes-cache");
    await ensureCacheWarm();
    const apiSymbol = SYMBOL_TO_API[symbol] ?? symbol;
    const quotes = getQuotesForSymbols([apiSymbol]);
    const quote = (quotes[apiSymbol] ?? null) as unknown as Record<string, string | { high: string; low: string }> | null;

    // Fetch news — try Finnhub directly, fall back to project's shared news cache
    let news: Array<{ headline: string; summary: string; datetime: number }> = [];
    const finnhubKey = process.env.FINNHUB_API_KEY;
    if (finnhubKey) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
          `https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`,
          { signal: controller.signal, cache: "no-store" }
        );
        clearTimeout(timer);
        if (res.ok) {
          const raw = await res.json();
          news = (Array.isArray(raw) ? raw : []).slice(0, 20).map((n: Record<string, unknown>) => ({
            headline: (n.headline as string) ?? "",
            summary:  (n.summary  as string) ?? "",
            datetime: (n.datetime as number) ?? 0,
          }));
        }
      } catch {
        // fall through to internal route
      }
    }

    // Fallback: use the project's own /api/market/news route (always works, no API key needed)
    if (news.length === 0) {
      try {
        // Use relative URL for internal API calls — works in both local and Vercel
        // NEXT_PUBLIC_APP_URL is optional; if missing we use the Vercel system URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL
          ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${baseUrl}/api/market/news`, {
          signal: controller.signal, cache: "no-store",
        });
        clearTimeout(timer);
        if (res.ok) {
          const raw = await res.json();
          const items = Array.isArray(raw) ? raw : (raw.data ?? raw.news ?? []);
          news = items.slice(0, 20).map((n: Record<string, unknown>) => ({
            headline: (n.headline as string) ?? (n.title as string) ?? "",
            summary:  (n.summary  as string) ?? (n.description as string) ?? "",
            datetime: (n.datetime as number | undefined)
              ?? (n.timestamp ? new Date(n.timestamp as string).getTime() / 1000 : undefined)
              ?? (n.publishedAt ? new Date(n.publishedAt as string).getTime() / 1000 : 0),
          }));
        }
      } catch {
        // no news available — agents will handle gracefully
      }
    }

    return { quote: quote as Record<string, string | { high: string; low: string }> | null, news };
  } catch {
    return { quote: null, news: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Debate Phase — agents challenge each other before Master adjudicates
// ─────────────────────────────────────────────────────────────────────────────

const DEBATE_SYSTEM = `You are the Debate Moderator in a professional multi-agent trading system. Six specialist agents have completed their independent analysis. Generate the structured debate that would occur between agents that disagree with each other.

Rules:
- Agents that AGREE with the majority bias should have challenge: null
- Agents that DISAGREE should write a pointed 1-2 sentence challenge directed at the opposing majority
- Each agent speaks in first person with their domain expertise
- The Contrarian Agent always challenges unless riskFactor < 25
- The Risk Gate challenges if invalid or grade is D/F
- Keep each position to 2-3 concise sentences maximum
- Be institutional, direct, and specific — not generic

Return ONLY a JSON array with no markdown or extra text.`;

async function runDebatePhase(
  snapshot: { symbolDisplay: string; symbol: string; timeframe: string; price: { current: number; changePercent: number } },
  trend: TrendAgentOutput,
  smc: SMCAgentOutput,
  news: NewsAgentOutput,
  risk: RiskAgentOutput,
  execution: ExecutionAgentOutput,
  contrarian: ContrarianAgentOutput,
  apiKey: string
): Promise<DebateEntry[]> {
  // Compute majority bias from 6 agents (exclude master)
  const biasVotes = [trend.bias, smc.bias, news.impact];
  const bullVotes = biasVotes.filter(b => b === "bullish").length;
  const bearVotes = biasVotes.filter(b => b === "bearish").length;
  const majorityBias = bullVotes > bearVotes ? "bullish" : bearVotes > bullVotes ? "bearish" : "neutral";

  // Pre-compute stance values to avoid nested quotes inside template literals
  const riskStance = risk.valid ? "valid" : "invalid";
  const execStance = execution.direction === "long" ? "bullish" : execution.direction === "short" ? "bearish" : "neutral";
  const execConfidence = execution.rrRatio ? Math.min(85, Math.round(execution.rrRatio * 20)) : 40;

  const client = new Anthropic({ apiKey });

  const msg = `
DEBATE: ${snapshot.symbolDisplay} (${snapshot.symbol}) | ${snapshot.timeframe}
Price: ${snapshot.price.current} | Change: ${snapshot.price.changePercent > 0 ? "+" : ""}${snapshot.price.changePercent.toFixed(2)}%
MAJORITY BIAS: ${majorityBias.toUpperCase()}

AGENT POSITIONS:
1. TREND AGENT — Bias: ${trend.bias.toUpperCase()} @ ${trend.confidence}%
   Key signal: "${trend.reasons[0] ?? "No primary signal"}"
   Phase: ${trend.marketPhase} | TF aligned: ${trend.timeframeBias.aligned}

2. PRICE ACTION AGENT — Bias: ${smc.bias.toUpperCase()} @ ${smc.confidence}%
   Key signal: "${smc.reasons[0] ?? "No primary signal"}"
   Setup: ${smc.setupType} | BOS: ${smc.bosDetected} | Sweep: ${smc.liquiditySweepDetected} | Zone: ${smc.premiumDiscount}

3. NEWS/MACRO AGENT — Impact: ${news.impact.toUpperCase()} @ ${news.confidence}%
   Key signal: "${news.reasons[0] ?? "No primary signal"}"
   Regime: ${news.regime} | Risk score: ${news.riskScore}/100

4. RISK GATE — Status: ${risk.valid ? "VALID" : "INVALID"} | Grade: ${risk.grade}
   Key signal: "${risk.reasons[0] ?? "No primary signal"}"
   Session score: ${risk.sessionScore}/100 | Vol score: ${risk.volatilityScore}/100

5. EXECUTION AGENT — Direction: ${execution.direction.toUpperCase()} | Setup: ${execution.trigger}
   Key signal: "Entry ${execution.entry != null ? execution.entry.toFixed(execution.entry > 100 ? 1 : 4) : "N/A"}, SL ${execution.stopLoss != null ? execution.stopLoss.toFixed(execution.stopLoss > 100 ? 1 : 4) : "N/A"}, RR ${execution.rrRatio?.toFixed(1) ?? "N/A"}:1"
   Signal state: ${execution.signalState}

6. CONTRARIAN AGENT — Challenges bias: ${contrarian.challengesBias} | Risk factor: ${contrarian.riskFactor}%
   Key signal: "${contrarian.failureReasons[0] ?? "No significant counter-signals"}"
   Trap type: ${contrarian.trapType ?? "none detected"}

Generate the debate. Each agent argues their position and, if they disagree with the ${majorityBias.toUpperCase()} majority, issues a direct challenge. Return this exact JSON array:
[
  {
    "agentId": "trend",
    "displayName": "Trend Agent",
    "stance": "${trend.bias}",
    "confidence": ${trend.confidence},
    "position": "2-3 sentence argument from the Trend Agent's perspective",
    "challenge": "1-2 sentence challenge if disagrees with majority, or null"
  },
  {
    "agentId": "smc",
    "displayName": "Price Action Agent",
    "stance": "${smc.bias}",
    "confidence": ${smc.confidence},
    "position": "2-3 sentence argument from the Price Action Agent's perspective",
    "challenge": "1-2 sentence challenge if disagrees with majority, or null"
  },
  {
    "agentId": "news",
    "displayName": "News Agent",
    "stance": "${news.impact}",
    "confidence": ${news.confidence},
    "position": "2-3 sentence argument from the News/Macro Agent's perspective",
    "challenge": "1-2 sentence challenge if disagrees with majority, or null"
  },
  {
    "agentId": "risk",
    "displayName": "Risk Gate",
    "stance": "${riskStance}",
    "confidence": ${risk.sessionScore},
    "position": "2-3 sentence risk assessment from the Risk Gate's perspective",
    "challenge": "1-2 sentence challenge if risk is invalid or grade is D/F, or null"
  },
  {
    "agentId": "execution",
    "displayName": "Execution Agent",
    "stance": "${execStance}",
    "confidence": ${execConfidence},
    "position": "2-3 sentence execution analysis from the Execution Agent's perspective",
    "challenge": "1-2 sentence challenge if setup quality is poor or signal is EXPIRED/NO_TRADE, or null"
  },
  {
    "agentId": "contrarian",
    "displayName": "Contrarian Agent",
    "stance": "opposing",
    "confidence": ${contrarian.trapConfidence},
    "position": "2-3 sentence contrarian argument challenging the primary thesis",
    "challenge": "1-2 sentence direct challenge to the ${majorityBias} majority, specific about the trap or failure scenario"
  }
]`.trim();

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    system: DEBATE_SYSTEM,
    messages: [{ role: "user", content: msg }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned) as DebateEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export async function runAgentOrchestrator(
  symbol: Symbol,
  timeframe: Timeframe,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  forceRefresh = false
): Promise<AgentRunResult> {
  const start = Date.now();
  const key   = cacheKey(symbol, timeframe);

  // ── Cache check ─────────────────────────────────────────────────────────
  if (!forceRefresh) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return { ...cached.result, cached: true };
    }
  }

  // ── Fetch market data ────────────────────────────────────────────────────
  const { quote, news, rsi } = await fetchMarketData(symbol);

  // ── Build normalized snapshot ────────────────────────────────────────────
  let snapshot;
  if (quote && !(quote as Record<string, unknown>).code) {
    snapshot = await buildMarketSnapshot(
      symbol, timeframe,
      quote as unknown as Parameters<typeof buildMarketSnapshot>[2],
      news,
      rsi
    );
  } else {
    // Fallback to mock data
    snapshot = buildMockSnapshot(symbol, timeframe);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ── Phase 1: Independent agents — all run with Claude when available ─────
  // Trend, News, and Price Action all run in parallel
  const [trend, newsAgent, smc] = await Promise.all([
    runTrendAgent(snapshot, apiKey),
    runNewsAgent(snapshot, apiKey),
    runPriceActionAgent(snapshot, apiKey),
  ]);

  // ── Phase 2: Risk, Execution, Contrarian depend on trend + smc ──────────
  const [risk, execution, contrarian] = await Promise.all([
    runRiskAgent(snapshot),
    runExecutionAgent(snapshot, smc),
    runContrarianAgent(snapshot, trend, smc, apiKey),
  ]);

  // ── Phase 3: Debate — agents challenge each other ────────────────────────
  let debate: DebateEntry[] | undefined;
  if (apiKey) {
    try {
      debate = await runDebatePhase(
        { symbolDisplay: snapshot.symbolDisplay, symbol, timeframe, price: snapshot.price },
        trend, smc, newsAgent, risk, execution, contrarian,
        apiKey
      );
    } catch (err) {
      console.warn("[orchestrator] debate phase failed:", err);
    }
  }

  // ── Phase 4: Master adjudicates after seeing the full debate ─────────────
  const master = await runMasterAgent(
    snapshot, trend, smc, newsAgent, risk, execution, contrarian, weights, apiKey, debate
  );

  const result: AgentRunResult = {
    symbol,
    symbolDisplay: snapshot.symbolDisplay,
    timeframe,
    timestamp: snapshot.timestamp,
    snapshot,
    agents: {
      trend,
      smc,
      news: newsAgent,
      risk,
      execution,
      contrarian,
      master,
    },
    debate,
    totalProcessingTime: Date.now() - start,
    cached: false,
  };

  // ── Cache result ─────────────────────────────────────────────────────────
  cache.set(key, { result, ts: Date.now() });

  // ── Log signal to history (fire-and-forget — never blocks the response) ──
  // The logger is idempotent (dedupes by minute+symbol+TF) so cache-hits or
  // rapid re-runs within the same minute will not create duplicate records.
  void logSignal(result).catch(err =>
    console.warn("[orchestrator] signal log failed:", err)
  );

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Symbol Batch Runner
// ─────────────────────────────────────────────────────────────────────────────

export async function runBatchOrchestrator(
  symbols: Symbol[],
  timeframe: Timeframe
): Promise<AgentRunResult[]> {
  return Promise.all(symbols.map(s => runAgentOrchestrator(s, timeframe)));
}
