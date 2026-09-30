import test from "node:test";
import assert from "node:assert/strict";
import { atr, dmi, ema, rma, sma, supertrend, trueRange } from "../indicators";
import type { Candle } from "../types";

const k = (i: number, o: number, h: number, l: number, c: number): Candle =>
  ({ time: i * 60, open: o, high: h, low: l, close: c, volume: 1 });
const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test("trueRange: first bar is high-low, then max of the three", () => {
  const tr = trueRange([k(0, 10, 12, 9, 11), k(1, 11, 12, 11, 12), k(2, 12, 20, 12, 15)]);
  assert.deepEqual(tr, [3, 1, 8]);
});

test("rma: SMA seed, then Wilder smoothing", () => {
  const r = rma([1, 2, 3, 4, 5, 6], 3);
  assert.ok(Number.isNaN(r[0]) && Number.isNaN(r[1]));
  near(r[2], 2);
  near(r[3], (2 * 2 + 4) / 3);
  near(r[4], ((2 * 2 + 4) / 3 * 2 + 5) / 3);
});

test("rma skips leading NaN", () => {
  const r = rma([NaN, 1, 2, 3, 4], 3);
  assert.ok(Number.isNaN(r[2]));
  near(r[3], 2);
});

test("atr = rma(tr)", () => {
  const c = [k(0, 10, 12, 9, 11), k(1, 11, 12, 11, 12), k(2, 12, 20, 12, 15), k(3, 15, 16, 14, 15)];
  const a = atr(c, 3);
  near(a[2], (3 + 1 + 8) / 3);
  near(a[3], (4 * 2 + 2) / 3);
});

test("ema seeds with first value; sma needs full window", () => {
  const e = ema([10, 20], 3);
  near(e[0], 10);
  near(e[1], 0.5 * 20 + 0.5 * 10);
  const s = sma([1, 2, 3, 4], 3);
  assert.ok(Number.isNaN(s[1]));
  near(s[2], 2);
  near(s[3], 3);
});

test("supertrend flips 1 -> -1 on a rally and -1 -> 1 on a crash", () => {
  const c: Candle[] = [];
  let px = 100;
  const push = (d: number) => { const o = px; px += d; c.push(k(c.length, o, Math.max(o, px) + 0.5, Math.min(o, px) - 0.5, px)); };
  for (let i = 0; i < 30; i++) push(i % 2 ? 0.3 : -0.3); // chop
  for (let i = 0; i < 25; i++) push(3);                  // rally
  for (let i = 0; i < 25; i++) push(-6);                 // crash
  const { dir, line } = supertrend(c, 2, 10);
  const flips: number[] = [];
  for (let i = 1; i < dir.length; i++) if (dir[i] !== dir[i - 1]) flips.push(dir[i]);
  assert.deepEqual(flips.slice(-2), [-1, 1]);
  assert.equal(dir[dir.length - 1], 1);
  // In an uptrend the line is the lower band: below price and never falling.
  for (let i = 1; i < c.length; i++) {
    if (dir[i] === -1 && dir[i - 1] === -1) {
      assert.ok(line[i] < c[i].close);
      assert.ok(line[i] >= line[i - 1] - 1e-12);
    }
  }
  assert.ok(Number.isNaN(line[0]));
  for (let i = 10; i < line.length; i++) assert.ok(!Number.isNaN(line[i]), `NaN at ${i}`);
  assert.equal(dir[0], 1);
});

test("dmi: a pure uptrend gives -DI 0 and ADX 100", () => {
  const c = Array.from({ length: 60 }, (_, i) => k(i, i, i + 1, i, i + 0.5));
  const { plus, minus, adx } = dmi(c, 14);
  assert.ok(Number.isNaN(plus[13]));
  assert.ok(!Number.isNaN(plus[14]));
  near(minus[40], 0);
  near(adx[59], 100, 1e-6);
});
