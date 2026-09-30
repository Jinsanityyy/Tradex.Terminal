import type { Candle, Tf } from "../types";
import { TF_SECONDS } from "../types";

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Trending random walk with regime changes, so SuperTrend actually flips. */
export function walk(tf: Tf, count: number, start: number, seed = 1, base = 4000): Candle[] {
  const r = rng(seed);
  const sec = TF_SECONDS[tf];
  const out: Candle[] = [];
  let px = base;
  let drift = 0;
  for (let i = 0; i < count; i++) {
    if (i % 150 === 0) drift = (r() - 0.5) * 2.4;
    const o = px;
    const c = o + drift + (r() - 0.5) * 6;
    const h = Math.max(o, c) + r() * 3;
    const l = Math.min(o, c) - r() * 3;
    out.push({ time: start + i * sec, open: o, high: h, low: l, close: c, volume: 100 + Math.floor(r() * 900) });
    px = c;
  }
  return out;
}
