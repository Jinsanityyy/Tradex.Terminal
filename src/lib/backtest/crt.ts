/**
 * Candle Range Theory (CRT), as commonly published:
 *
 *   range   a 4H candle (New York-aligned: 17:00, 21:00, 01:00, 05:00, 09:00,
 *           13:00 ET), its high and low
 *   sweep   the next 4H candle trades through one side and closes back inside
 *           the range (and does not take both sides)
 *   entry   at that candle's close
 *   stop    beyond the sweep wick
 *   target  the opposite end of the range
 *
 * Resolved on 5-minute bars after the entry, stop first when a bar touches
 * both; unresolved after three 4H candles, closed at market. Replayed on
 * closed candles only: nothing is known before the sweep candle closes.
 */

import { tradingDay, tradingMinute, type V2Candle } from "@/lib/agents/core-v2";
import type { V2Trade } from "./engine-v2";

type H4 = { t: number; o: number; h: number; l: number; c: number; startMin: number; firstIdx: number; lastIdx: number };

export interface CrtOptions {
  /** Only 4H candles starting at 01:00 and 05:00 ET as the range */
  refs1am5am?: boolean;
  /** Only in the direction of the daily trend (previous close vs 20-day average) */
  dailyTrend?: boolean;
  /** Skip setups whose target is closer than the stop (reward < 1R) */
  minOneR?: boolean;
  /** Stop buffer beyond the wick, in price */
  buffer: number;
}

/** 4H candles aligned to 17:00 ET (the trading day's start), from 5m bars. */
function toH4(m5: V2Candle[]): H4[] {
  const out: H4[] = [];
  let key = "";
  m5.forEach((c, i) => {
    const m = tradingMinute(c.t);
    const k = `${tradingDay(c.t)}-${Math.floor((m + 60) / 240)}`; // 18:00 start → shift to 17:00 buckets
    if (k !== key) {
      out.push({ t: c.t, o: c.o, h: c.h, l: c.l, c: c.c, startMin: Math.floor((m + 60) / 240) * 240 - 60, firstIdx: i, lastIdx: i });
      key = k;
    } else {
      const b = out[out.length - 1];
      b.h = Math.max(b.h, c.h); b.l = Math.min(b.l, c.l); b.c = c.c; b.lastIdx = i;
    }
  });
  return out;
}

function dailyTrendAt(m5: V2Candle[], idx: number): "bullish" | "bearish" | null {
  // Daily closes of completed trading days before idx.
  const closes: number[] = [];
  let day = tradingDay(m5[idx].t);
  for (let i = idx - 1; i >= 0 && closes.length < 21; i--) {
    const d = tradingDay(m5[i].t);
    if (d !== day) { closes.push(m5[i].c); day = d; }
  }
  if (closes.length < 21) return null;
  const last = closes[0];
  const sma = closes.slice(1, 21).reduce((a, b) => a + b, 0) / 20;
  return last > sma ? "bullish" : last < sma ? "bearish" : null;
}

const iso = (t: number) => new Date(t * 1000).toISOString();

export function runCrt(m5: V2Candle[], opt: CrtOptions): V2Trade[] {
  const h4 = toH4(m5);
  const trades: V2Trade[] = [];
  // startMin is minutes since 18:00 ET; 01:00 ET = 420, 05:00 ET = 660.
  const isRef = (b: H4) => !opt.refs1am5am || b.startMin === 420 || b.startMin === 660;

  for (let i = 0; i + 1 < h4.length; i++) {
    const r = h4[i], n = h4[i + 1];
    if (!isRef(r)) continue;
    // Consecutive candles only (not across a weekend or a gap).
    if (n.t - r.t > 4 * 3600 + 300) continue;
    const tookLow = n.l < r.l, tookHigh = n.h > r.h;
    if (tookLow === tookHigh) continue;                       // neither, or both sides
    const insideClose = n.c > r.l && n.c < r.h;
    if (!insideClose) continue;
    const long = tookLow;

    if (opt.dailyTrend) {
      const trend = dailyTrendAt(m5, n.lastIdx);
      if (trend !== (long ? "bullish" : "bearish")) continue;
    }

    const entry = n.c;
    const stop = long ? n.l - opt.buffer : n.h + opt.buffer;
    const target = long ? r.h : r.l;
    const risk = Math.abs(entry - stop);
    const reward = Math.abs(target - entry);
    if (risk <= 0 || reward <= 0) continue;
    if (opt.minOneR && reward < risk) continue;

    // Walk 5m bars after the sweep candle closed, for up to three 4H candles.
    const from = n.lastIdx + 1;
    const until = Math.min(m5.length - 1, from + 3 * 48);
    let result: V2Trade["result"] = "timeout", closeIdx = until, rMult = 0;
    for (let k = from; k <= until; k++) {
      const c = m5[k];
      if (long ? c.l <= stop : c.h >= stop) { result = "loss"; closeIdx = k; rMult = -1; break; }
      if (long ? c.h >= target : c.l <= target) { result = "win"; closeIdx = k; rMult = reward / risk; break; }
    }
    if (from > until) continue;
    if (result === "timeout") rMult = (long ? m5[until].c - entry : entry - m5[until].c) / risk;

    trades.push({
      id: `${n.t}-CRT`, direction: long ? "long" : "short",
      level: long ? "4H range low" : "4H range high",
      killZone: `4H ${String(((r.startMin / 60 + 18) % 24)).padStart(2, "0")}:00 ET range`,
      readyAt: iso(m5[n.lastIdx].t), fillAt: iso(m5[n.lastIdx].t), closeAt: iso(m5[closeIdx].t),
      entry, stopLoss: stop, tp1: target, result, r: Math.round(rMult * 100) / 100,
    });
    i++; // the sweep candle cannot also be the next range
  }
  return trades;
}
