import test from "node:test";
import assert from "node:assert/strict";
import { computeTradexTrend, type TrendSnapshot, type TradeRecord } from "../index";
import { tradexToExecutionOutput, tradexVerdict, LIVE_WITHIN_R } from "../../agents/tradex-adapter";
import type { ExecutionAgentOutput, MarketSnapshot, NewsAgentOutput, RiskAgentOutput } from "../../agents/schemas";
import { walk } from "./helpers";

const T0 = 1_700_000_000 - (1_700_000_000 % 86400);
const m5 = walk("M5", 3000, T0, 7);
const base = computeTradexTrend({ M5: m5 }, "M5", {}, m5[m5.length - 1].time + 300);
const news = { riskScore: 10, impact: "neutral" } as unknown as NewsAgentOutput;
const snap = { symbol: "XAUUSD" } as unknown as MarketSnapshot;

function withTrade(patch: Partial<TradeRecord> | null): TrendSnapshot {
  const t = base.latest!.trade!;
  return { ...base, latest: { ...base.latest!, trade: patch === null ? null : { ...t, ...patch } } };
}

test("fixture has a trade to work with", () => {
  assert.ok(base.latest?.trade);
});

test("adapter: no trade -> WAIT", () => {
  const out = tradexToExecutionOutput(withTrade(null), snap, news, Date.now());
  assert.equal(out.signalState, "WAIT");
  assert.equal(out.hasSetup, false);
  assert.equal(out.source, "tradex-trend");
});

test("adapter: open trade with price at the entry -> ARMED with the chart's levels", () => {
  const close = base.latest!.close;
  const out = tradexToExecutionOutput(withTrade({ outcome: "OPEN", entry: close }), snap, news, Date.now());
  const t = base.latest!.trade!;
  assert.equal(out.signalState, "ARMED");
  assert.equal(out.hasSetup, true);
  assert.equal(out.entry, close);
  assert.equal(out.stopLoss, t.sl);
  assert.equal(out.tp1, t.tp1);
  assert.equal(out.tp2, t.tp2);
  assert.equal(out.tp3, t.tp3);
  assert.equal(out.rrRatio, 1.5);
  assert.equal(out.direction, t.side === "BUY" ? "long" : "short");
});

test("adapter: open trade but price more than the live window away -> EXPIRED, levels kept for reference", () => {
  const t = base.latest!.trade!;
  const out = tradexToExecutionOutput(withTrade({ outcome: "OPEN", entry: base.latest!.close - (LIVE_WITHIN_R + 1) * t.r }), snap, news, Date.now());
  assert.equal(out.signalState, "EXPIRED");
  assert.equal(out.hasSetup, false);
  assert.ok(out.entry !== null && out.stopLoss !== null);
});

test("adapter: resolved trade -> EXPIRED without a live setup", () => {
  for (const outcome of ["WIN", "LOSS", "FLIP"] as const) {
    const out = tradexToExecutionOutput(withTrade({ outcome }), snap, news, Date.now());
    assert.equal(out.signalState, "EXPIRED");
    assert.equal(out.hasSetup, false);
  }
});

test("adapter: elevated macro risk puts a live setup on hold", () => {
  const hot = { riskScore: 99, impact: "bearish" } as unknown as NewsAgentOutput;
  const out = tradexToExecutionOutput(withTrade({ outcome: "OPEN", entry: base.latest!.close }), snap, hot, Date.now());
  assert.equal(out.signalState, "NO_TRADE");
});

const live = (direction: "long" | "short", grade: ExecutionAgentOutput["grade"] = "B"): ExecutionAgentOutput =>
  ({ hasSetup: true, direction, entry: 1, stopLoss: 0.9, tp1: 1.1, grade, signalStateReason: "x" } as unknown as ExecutionAgentOutput);
const okRisk = { valid: true, warnings: [] } as unknown as RiskAgentOutput;
const badRisk = { valid: false, warnings: ["closed"] } as unknown as RiskAgentOutput;

test("verdict: same-side consensus confirms, neutral keeps it with less confidence, opposite vetoes", () => {
  const conf = tradexVerdict(live("long"), okRisk, "bullish");
  const neutral = tradexVerdict(live("long"), okRisk, "no-trade");
  const veto = tradexVerdict(live("long"), okRisk, "bearish");
  assert.deepEqual([conf.go, conf.stance, conf.bias], [true, "confirmed", "bullish"]);
  assert.deepEqual([neutral.go, neutral.stance], [true, "neutral"]);
  assert.ok(conf.confidence > neutral.confidence);
  assert.deepEqual([veto.go, veto.stance, veto.bias], [false, "vetoed", "no-trade"]);
  assert.match(veto.reason ?? "", /bearish.*long|against/i);
});

test("verdict: failed risk check or no live setup means no trade", () => {
  assert.equal(tradexVerdict(live("short"), badRisk, "bearish").go, false);
  const none = { ...live("short"), hasSetup: false } as ExecutionAgentOutput;
  assert.equal(tradexVerdict(none, okRisk, "bearish").go, false);
});
