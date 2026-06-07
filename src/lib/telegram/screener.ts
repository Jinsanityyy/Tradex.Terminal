/**
 * TradeX Telegram Alert Screener
 *
 * Scans the signals table every 5 minutes, finds qualifying signals
 * (Master score >= 75, consensus >= 5/7 agents), deduplicates per hour,
 * and sends formatted alerts to the configured Telegram channel.
 */

import { getServiceClient } from "@/lib/supabase/service";
import { getSignals } from "@/lib/signals/storage";
import { sendTelegramMessage, isTelegramConfigured } from "./bot";
import type { SignalRecord } from "@/lib/signals/types";

const MIN_SCORE    = 75;
const MIN_AGENTS   = 5;
const DEDUP_WINDOW = 60 * 60 * 1000;   // 1 hour — no re-send per pair+tf+direction
const LOOKBACK_MS  = 2 * 60 * 60 * 1000; // query signals from last 2 hours

// ─────────────────────────────────────────────────────────────────────────────
// Agent alignment counting
// ─────────────────────────────────────────────────────────────────────────────

interface AgentDetail {
  name: string;
  aligned: boolean;
  note: string;
}

function countAligned(signal: SignalRecord): { count: number; details: AgentDetail[] } {
  const { finalBias, agents, confidence } = signal;
  if (finalBias === "no-trade") return { count: 0, details: [] };

  const isBullish = finalBias === "bullish";
  const details: AgentDetail[] = [];

  // 1. Master Agent — always aligned (it IS the finalBias)
  details.push({
    name: "Master Agent",
    aligned: true,
    note: `${isBullish ? "Bullish" : "Bearish"} (${confidence}%)`,
  });

  // 2. Trend Agent — bias must match direction
  const trendOk = agents.trend.bias === finalBias;
  details.push({
    name: "Trend Agent",
    aligned: trendOk,
    note: `${cap(agents.trend.bias)} (${agents.trend.confidence}%)`,
  });

  // 3. Price Action / SMC Agent — bias must match direction
  const smcOk = agents.smc.bias === finalBias;
  details.push({
    name: "Price Action",
    aligned: smcOk,
    note: `${cap(agents.smc.bias)} (${agents.smc.confidence}%)${agents.smc.setupType !== "None" ? ` · ${agents.smc.setupType}` : ""}`,
  });

  // 4. News Agent — news.impact is the directional signal (bullish/bearish/neutral)
  const newsOk = agents.news.impact === finalBias;
  details.push({
    name: "News Agent",
    aligned: newsOk,
    note: `${cap(agents.news.impact)} (${agents.news.confidence}%)`,
  });

  // 5. Risk Gate — aligned when the gate is open (valid = true)
  details.push({
    name: "Risk Gate",
    aligned: agents.risk.valid,
    note: agents.risk.valid
      ? `Valid · Grade ${agents.risk.grade}`
      : `Blocked · Grade ${agents.risk.grade}`,
  });

  // 6. Execution Agent — aligned when it has a setup in the matching direction
  const execDir   = isBullish ? "long" : "short";
  const execOk    = agents.execution.hasSetup && agents.execution.direction === execDir;
  details.push({
    name: "Execution",
    aligned: execOk,
    note: execOk
      ? `${cap(agents.execution.direction)} setup ready`
      : agents.execution.hasSetup
        ? `${cap(agents.execution.direction)} (opposing)`
        : "No setup found",
  });

  // 7. Contrarian Agent — aligned when NOT challenging the primary thesis
  const contrOk = !agents.contrarian.challengesBias;
  details.push({
    name: "Contrarian",
    aligned: contrOk,
    note: contrOk
      ? `No trap detected (risk ${agents.contrarian.riskFactor}%)`
      : `Trap risk ${agents.contrarian.riskFactor}%`,
  });

  return { count: details.filter(d => d.aligned).length, details };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Message formatting
// ─────────────────────────────────────────────────────────────────────────────

function formatMessage(signal: SignalRecord, aligned: number, details: AgentDetail[]): string {
  const dir  = signal.finalBias === "bullish" ? "🟢 BUY" : "🔴 SELL";
  const sym  = signal.symbolDisplay ?? signal.symbol;
  const bias = signal.finalBias === "bullish" ? "Bullish" : "Bearish";
  const bar  = "━━━━━━━━━━━━━━━━━━";

  const agentLines = details
    .map(d => `  ${d.aligned ? "✅" : "⚠️"} ${d.name} — ${d.note}`)
    .join("\n");

  const lines: string[] = [
    `<b>${dir} SIGNAL — ${sym}</b>`,
    bar,
    `📊 Master Score: ${signal.confidence}/100`,
    `🤝 Consensus: ${aligned}/7 Agents`,
    `⏰ Timeframe: ${signal.timeframe}`,
    `📈 Bias: ${bias}`,
  ];

  if (signal.strategyMatch) {
    lines.push(`📐 Setup: ${signal.strategyMatch}`);
  }

  if (signal.tradePlan) {
    const p = signal.tradePlan;
    lines.push(`💰 Entry: ${p.entry} | SL: ${p.stopLoss} | TP1: ${p.tp1}${p.tp2 ? ` | TP2: ${p.tp2}` : ""} | RR: ${p.rrRatio.toFixed(1)}R`);
  }

  lines.push(
    bar,
    "🔍 Agents Aligned:",
    agentLines,
    bar,
    "⚡️ Powered by TradeX Terminal",
    "tradexterminal.online",
  );

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Deduplication (Supabase-backed, survives serverless restarts)
// ─────────────────────────────────────────────────────────────────────────────

function dedupKey(signal: SignalRecord): string {
  // Include direction so a BUY and SELL on the same pair+tf within 1h both fire
  return `${signal.symbol}_${signal.timeframe}_${signal.finalBias}`;
}

async function wasRecentlySent(key: string): Promise<boolean> {
  const db = getServiceClient();
  if (!db) return false;

  const cutoff = new Date(Date.now() - DEDUP_WINDOW).toISOString();
  const { data, error } = await db
    .from("telegram_alert_dedup")
    .select("last_sent")
    .eq("id", key)
    .gte("last_sent", cutoff)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

async function markSent(key: string, signal: SignalRecord): Promise<void> {
  const db = getServiceClient();
  if (!db) return;

  await db.from("telegram_alert_dedup").upsert(
    {
      id:        key,
      symbol:    signal.symbol,
      timeframe: signal.timeframe,
      last_sent: new Date().toISOString(),
      signal_id: signal.id,
    },
    { onConflict: "id" },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screener runner
// ─────────────────────────────────────────────────────────────────────────────

export interface ScreenerResult {
  scanned: number;
  qualified: number;
  sent: number;
  skipped: number;
  errors: number;
}

export async function runTelegramScreener(): Promise<ScreenerResult> {
  const result: ScreenerResult = { scanned: 0, qualified: 0, sent: 0, skipped: 0, errors: 0 };

  if (!isTelegramConfigured()) {
    console.warn("[telegram-screener] TELEGRAM_BOT_TOKEN / TELEGRAM_CHANNEL_ID not set — skipping");
    return result;
  }

  const since   = new Date(Date.now() - LOOKBACK_MS).toISOString();
  const signals = await getSignals({ sinceTimestamp: since, limit: 200 });

  // Only directional signals with an actionable trade plan that pass the score gate
  const candidates = signals.filter(s =>
    s.finalBias !== "no-trade" &&
    s.tradePlan !== null &&
    s.confidence >= MIN_SCORE
  );

  result.scanned = candidates.length;

  for (const signal of candidates) {
    try {
      const { count, details } = countAligned(signal);
      if (count < MIN_AGENTS) continue;

      result.qualified++;

      const key         = dedupKey(signal);
      const alreadySent = await wasRecentlySent(key);

      if (alreadySent) {
        result.skipped++;
        continue;
      }

      const message = formatMessage(signal, count, details);
      const ok      = await sendTelegramMessage(message);

      if (ok) {
        await markSent(key, signal);
        result.sent++;
        console.log(
          `[telegram-screener] sent: ${signal.symbol} ${signal.timeframe} ${signal.finalBias}` +
          ` score=${signal.confidence} consensus=${count}/7`
        );
      } else {
        result.errors++;
      }
    } catch (err) {
      console.warn(`[telegram-screener] error on signal ${signal.id}:`, err);
      result.errors++;
    }
  }

  return result;
}
