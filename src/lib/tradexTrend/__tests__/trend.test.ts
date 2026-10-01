import test from "node:test";
import assert from "node:assert/strict";
import { checkExit, closedOnly, computeTradexTrend, sessionAt, marketState } from "../index";
import { ci95, compareColor, edgePerTrade, winRate } from "../stats";
import { walk } from "./helpers";
import type { Candle } from "../types";

const T0 = 1_700_000_000 - (1_700_000_000 % 86400);

test("tracker: SL wins a tie when one candle touches SL and TP1", () => {
  const long = { side: "BUY" as const, sl: 99, tp1: 101 };
  assert.equal(checkExit(long, { high: 102, low: 98 }), "LOSS");
  assert.equal(checkExit(long, { high: 102, low: 99.5 }), "WIN");
  assert.equal(checkExit(long, { high: 100.5, low: 99.5 }), null);
  const short = { side: "SELL" as const, sl: 101, tp1: 99 };
  assert.equal(checkExit(short, { high: 102, low: 98 }), "LOSS");
  assert.equal(checkExit(short, { high: 100.5, low: 98 }), "WIN");
});

test("CI formula, coin flip flag, edge, colours", () => {
  const a = ci95(60, 100)!;
  assert.ok(Math.abs(a.lo - (0.6 - 1.96 * Math.sqrt(0.24 / 100))) < 1e-12);
  assert.equal(a.coinFlip, false);
  assert.equal(ci95(55, 100)!.coinFlip, true);
  assert.equal(ci95(0, 0), null);
  assert.ok(Math.abs(edgePerTrade(60, 40, 0.03)! - 0.17) < 1e-12);
  assert.equal(edgePerTrade(0, 0, 0.03), null);
  assert.equal(compareColor(winRate(30, 20), winRate(20, 30)), "green");
  assert.equal(compareColor(winRate(20, 30), winRate(30, 20)), "red");
  assert.equal(compareColor(winRate(26, 24), winRate(25, 25)), "amber");
  assert.equal(compareColor(winRate(10, 5), winRate(20, 30)), "gray");
});

test("session and market state", () => {
  const at = (h: number) => T0 + h * 3600;
  assert.equal(sessionAt(at(3)), "Asia");
  assert.equal(sessionAt(at(8)), "London");
  assert.equal(sessionAt(at(14)), "London / NY");
  assert.equal(sessionAt(at(18)), "New York");
  assert.equal(sessionAt(at(22)), "Off hours");
  assert.equal(marketState(25), "Trending");
  assert.equal(marketState(20), "Ranging");
  assert.equal(marketState(10), "Dead");
});

test("closedOnly drops the forming candle", () => {
  const c = walk("M5", 10, T0);
  assert.equal(closedOnly(c, "M5", c[9].time + 299).length, 9);
  assert.equal(closedOnly(c, "M5", c[9].time + 300).length, 10);
});

function fixture(nM5 = 4000) {
  const m5 = walk("M5", nM5, T0, 7);
  const agg = (src: Candle[], per: number, sec: number): Candle[] => {
    const out: Candle[] = [];
    for (let i = 0; i + per <= src.length; i += per) {
      const ch = src.slice(i, i + per);
      out.push({
        time: ch[0].time, open: ch[0].open, close: ch[per - 1].close,
        high: Math.max(...ch.map((x) => x.high)), low: Math.min(...ch.map((x) => x.low)),
        volume: ch.reduce((s, x) => s + x.volume, 0),
      });
    }
    void sec;
    return out;
  };
  return { m5, m15: agg(m5, 3, 900), h1: agg(m5, 12, 3600), h4: agg(m5, 48, 14400), d1: agg(m5, 288, 86400) };
}

test("end to end: trade invariants hold and outcomes re-verify against the candles", () => {
  const f = fixture();
  const asOf = f.m5[f.m5.length - 1].time + 300;
  const s = computeTradexTrend({ M5: f.m5, M15: f.m15, H1: f.h1, H4: f.h4, D1: f.d1 }, "M5", {}, asOf);
  assert.ok(s.trades.length > 5, `only ${s.trades.length} trades`);
  const c = f.m5;
  for (const t of s.trades) {
    const d = t.side === "BUY" ? 1 : -1;
    assert.equal(t.entry, c[t.index].close);
    assert.ok(Math.abs(t.sl - (t.entry - d * t.r)) < 1e-9);
    assert.ok(Math.abs(t.tp3 - (t.entry + d * 3 * t.r)) < 1e-9);
    assert.ok(Math.abs(t.lots - Math.floor((500 / (t.r * 100)) * 100 + 1e-9) / 100) < 1e-12);
    // Re-derive the outcome from the candle after the signal.
    let expected: string = "OPEN";
    for (let i = t.index + 1; i < c.length; i++) {
      if (s.signals.some((g) => g.index === i)) { expected = "FLIP"; break; }
      const r = checkExit(t, c[i]);
      if (r) { expected = r; break; }
    }
    assert.equal(t.outcome, expected);
  }
  assert.equal(s.stats.wins + s.stats.losses, s.stats.n);
  assert.ok(s.latest && s.latest.mtfBias);
});

test("no repaint: appending a candle never changes the past", () => {
  const f = fixture(3000);
  const run = (n: number) => {
    const m5 = f.m5.slice(0, n);
    const asOf = m5[n - 1].time + 300;
    return computeTradexTrend({ M5: m5, M15: f.m15, H1: f.h1, H4: f.h4, D1: f.d1 }, "M5", {}, asOf);
  };
  // Use a cut where every HTF candle known at that time is genuinely closed.
  const N = 2500;
  const a = run(N);
  const b = run(N + 1);
  assert.deepEqual(b.series.stLine.slice(0, N), a.series.stLine);
  assert.deepEqual(b.series.stDir.slice(0, N), a.series.stDir);
  assert.deepEqual(b.series.cloudTop.slice(0, N), a.series.cloudTop);
  assert.deepEqual(b.signals.slice(0, a.signals.length), a.signals);
  for (let i = 0; i < a.trades.length; i++) {
    const { outcome: oa, exitIndex: ea, exitTime: xa, ...ra } = a.trades[i];
    const { outcome: ob, exitIndex: eb, exitTime: xb, ...rb } = b.trades[i];
    assert.deepEqual(rb, ra);
    if (oa !== "OPEN") { assert.equal(ob, oa); assert.equal(eb, ea); assert.equal(xb, xa); }
  }
});

test("a still-forming candle changes nothing", () => {
  const f = fixture(2000);
  const asOf = f.m5[1499].time + 300;
  const done = computeTradexTrend({ M5: f.m5.slice(0, 1500) }, "M5", {}, asOf);
  const withForming = computeTradexTrend({ M5: f.m5.slice(0, 1501) }, "M5", {}, asOf + 10);
  assert.deepEqual(withForming.series, done.series);
  assert.deepEqual(withForming.trades, done.trades);
});

test("compute over 5 x 5000 candles stays cheap enough for the main thread", () => {
  const big = walk("M5", 5000, T0, 3);
  const t = performance.now();
  computeTradexTrend({ M5: big, M15: big, H1: big, H4: big, D1: big }, "M5", {}, big[4999].time + 300);
  const ms = performance.now() - t;
  assert.ok(ms < 500, `took ${ms.toFixed(0)}ms`);
});

test("lot size: USD-base pairs convert the quote-currency risk to USD", () => {
  const f = fixture(3000);
  const asOf = f.m5[f.m5.length - 1].time + 300;
  const by = { M5: f.m5, M15: f.m15, H1: f.h1, H4: f.h4, D1: f.d1 };
  const usd = computeTradexTrend(by, "M5", { contractSize: 100_000, quoteUsd: true }, asOf);
  const jpy = computeTradexTrend(by, "M5", { contractSize: 100_000, quoteUsd: false }, asOf);
  assert.ok(jpy.trades.length > 0 && jpy.trades.length === usd.trades.length);
  for (const t of jpy.trades) {
    const expected = Math.floor((500 / ((t.r * 100_000) / t.entry)) * 100 + 1e-9) / 100;
    assert.equal(t.lots, expected);
  }
  // Same R, so the quote-currency variant differs by exactly the entry price.
  const a = usd.trades[0], b = jpy.trades[0];
  assert.ok(Math.abs(b.lots / (a.lots || 1) - b.entry) / b.entry < 0.05 || a.lots === 0);
});

import { sanitizeCandles } from "../sanitize";

test("sanitizeCandles drops nulls/NaN, dedupes timestamps, sorts and fixes high/low", () => {
  const c = (time: number, o: number, h: number, l: number, cl: number): Candle => ({ time, open: o, high: h, low: l, close: cl, volume: 1 });
  const out = sanitizeCandles([
    c(300, 1.1, 1.2, 1.0, 1.15),
    c(60, 1, 2, 0.5, 1.5),
    c(60, 1, 3, 0.5, 1.5),                              // duplicate: later row wins
    { ...c(120, 1, 1, 1, 1), high: NaN },               // NaN
    { ...c(180, 1, 1, 1, 1), close: null as unknown as number }, // null from JSON
    c(240, 1.0, 0.9, 1.1, 1.05),                        // high/low do not cover open/close
  ]);
  assert.deepEqual(out.map((x) => x.time), [60, 240, 300]);
  assert.equal(out[0].high, 3);
  assert.equal(out[1].high, 1.05 > 1.0 ? 1.05 : 1.0);
  assert.ok(out[1].low <= 1.0 && out[1].high >= 1.05);
});

import { basisOf, shiftBars } from "../../api/bars";

test("futures-to-spot: shift keeps shape, basis is validated", () => {
  const bars = [{ t: 1, o: 4190, h: 4195, l: 4188, c: 4192 }, { t: 2, o: 4192, h: 4194, l: 4189, c: 4190 }];
  const b = basisOf(4190, 4160)!;
  assert.equal(b, 30);
  const out = shiftBars(bars, b);
  assert.deepEqual(out.map((x) => x.c), [4162, 4160]);
  assert.equal(out[0].h - out[0].l, bars[0].h - bars[0].l);   // ranges unchanged
  assert.equal(basisOf(4190, null), null);
  assert.equal(basisOf(undefined, 4160), null);
  assert.equal(basisOf(4400, 4160), null);                      // 5.8% apart: not a basis, a bad quote
});
