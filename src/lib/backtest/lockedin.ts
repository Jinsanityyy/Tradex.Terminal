/**
 * Replay of the "Jinsanityyy Lockedin" TradingView indicator (JJ-style fair
 * value model), ported line by line from its Pine source, on 1-minute bars:
 *
 *   windows  NY AM 09:30–11:00, NY PM 14:00–15:00, London 03:00–04:30 (New York time)
 *   FV       the open of the window's first bar
 *   phase    CONT for the first 15 minutes, MREV after; the first 3 minutes skipped
 *   DISP     a candle whose counter-wick is at most 20% of its body, body larger
 *            than the previous one
 *   MSB      close through the last unbroken 5/5 swing pivot
 *   signal   CONT: DISP away from FV (bull DISP above FV = long);
 *            MREV: DISP back toward FV (bull DISP below FV = long);
 *            A+ with MSB in the same direction, A without
 *   entry    the signal candle's close
 *   stop     2 × ATR(14); target 1.5R; closed at market after 120 bars
 *   tracking one setup at a time, resolved from the next bar, stop first
 *
 * Everything is computed from closed bars only, as the indicator does
 * (ta.pivothigh confirms a pivot five bars after it, and that is when it is
 * used here too). The daily setup cap and account blocks only change the
 * indicator's label, not its tracking; `maxPerDay` models skipping them.
 */

import { tradingDay, tradingMinute, type V2Candle } from "@/lib/agents/core-v2";
import type { V2Trade } from "./engine-v2";

export interface LockedinOptions {
  windows?: { am?: boolean; pm?: boolean; london?: boolean };
  takeCont?: boolean;
  takeMrev?: boolean;
  takeAplus?: boolean;
  takeA?: boolean;
  /** Setups taken per trading day; later ones are skipped (the indicator's default cap is 3) */
  maxPerDay?: number;
  contMins?: number;
  skipOpenMins?: number;
  wickMaxPct?: number;
  bigBody?: boolean;
  swingLB?: number;
  atrLen?: number;
  atrMult?: number;
  rr?: number;
  maxBars?: number;
}

const WINDOWS = [
  { key: "am" as const, name: "NY AM", from: 570, to: 660 },      // 09:30–11:00 ET
  { key: "pm" as const, name: "NY PM", from: 840, to: 900 },      // 14:00–15:00 ET
  { key: "london" as const, name: "London", from: 180, to: 270 }, // 03:00–04:30 ET
];

/** Minutes since midnight New York time. */
const nyMinute = (ts: number) => (tradingMinute(ts) + 1080) % 1440;
const iso = (t: number) => new Date(t * 1000).toISOString();

export function runLockedin(m1: V2Candle[], opt: LockedinOptions = {}): V2Trade[] {
  const o = {
    contMins: 15, skipOpenMins: 3, wickMaxPct: 20, bigBody: true, swingLB: 5,
    atrLen: 14, atrMult: 2, rr: 1.5, maxBars: 120,
    takeCont: true, takeMrev: true, takeAplus: true, takeA: true,
    ...opt,
  };
  const win = { am: true, pm: true, london: true, ...opt.windows };
  const L = o.swingLB;
  const trades: V2Trade[] = [];

  // ATR: Wilder's RMA of true range, seeded with the simple average (ta.atr).
  let atr = NaN, trSum = 0;

  let prevWin: string | null = null;
  let sessStart = NaN, fv = NaN;
  let swHi = NaN, swLo = NaN, hiOK = false, loOK = false;
  let day = -1, setupsToday = 0;
  let open: { side: 1 | -1; entry: number; stop: number; tgt: number; risk: number; bar: number; grade: 1 | 2; tag: "CONT" | "MREV"; window: string } | null = null;

  for (let i = 0; i < m1.length; i++) {
    const c = m1[i], p = m1[i - 1];

    const tr = p ? Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)) : c.h - c.l;
    if (i < o.atrLen) { trSum += tr; if (i === o.atrLen - 1) atr = trSum / o.atrLen; }
    else atr = (atr * (o.atrLen - 1) + tr) / o.atrLen;

    // Session and phase.
    const nm = nyMinute(c.t);
    const w = WINDOWS.find(x => win[x.key] && nm >= x.from && nm < x.to) ?? null;
    if (w && prevWin !== w.name) { sessStart = c.t; fv = c.o; }
    prevWin = w?.name ?? null;
    const minsIn = w ? (c.t - sessStart) / 60 : NaN;
    const phaseCont = !!w && minsIn < o.contMins;
    const phaseRev = !!w && minsIn >= o.contMins;

    // Daily setup counter.
    const d = tradingDay(c.t);
    if (d !== day) { day = d; setupsToday = 0; }

    // DISP.
    const body = Math.abs(c.c - c.o);
    const bodyOK = !o.bigBody || (p ? body > Math.abs(p.c - p.o) : false);
    const dispUp = c.c > c.o && body > 0 && ((c.o - c.l) / body) * 100 <= o.wickMaxPct && bodyOK;
    const dispDn = c.c < c.o && body > 0 && ((c.h - c.o) / body) * 100 <= o.wickMaxPct && bodyOK;

    // Pivots confirmed on this bar (centre L bars back), then MSB.
    if (i >= 2 * L) {
      const k = i - L;
      let isHi = true, isLo = true;
      for (let j = k - L; j <= k + L && (isHi || isLo); j++) {
        if (j === k) continue;
        if (j < k ? m1[j].h >= m1[k].h : m1[j].h > m1[k].h) isHi = false;
        if (j < k ? m1[j].l <= m1[k].l : m1[j].l < m1[k].l) isLo = false;
      }
      if (isHi) { swHi = m1[k].h; hiOK = true; }
      if (isLo) { swLo = m1[k].l; loOK = true; }
    }
    const msbUp = !isNaN(swHi) && c.c > swHi && hiOK;
    const msbDn = !isNaN(swLo) && c.c < swLo && loOK;
    if (msbUp) hiOK = false;
    if (msbDn) loOK = false;

    // Resolve the tracked setup (from the bar after its entry).
    if (open && i > open.bar) {
      const t = open;
      const hitS = t.side === 1 ? c.l <= t.stop : c.h >= t.stop;
      const hitT = t.side === 1 ? c.h >= t.tgt : c.l <= t.tgt;
      const forced = i - t.bar >= o.maxBars;
      if (hitS || hitT || forced) {
        const r = hitS ? -1 : hitT ? o.rr : (t.side * (c.c - t.entry)) / t.risk;
        trades.push({
          id: `${m1[t.bar].t}-LI`, direction: t.side === 1 ? "long" : "short",
          level: `${t.tag} ${t.grade === 2 ? "A+" : "A"}`, killZone: t.window,
          readyAt: iso(m1[t.bar].t + 60), fillAt: iso(m1[t.bar].t + 60), closeAt: iso(c.t + 60),
          entry: t.entry, stopLoss: t.stop, tp1: t.tgt,
          result: hitS ? "loss" : hitT ? "win" : "timeout", r: Math.round(r * 100) / 100,
        });
        open = null;
      }
    }

    // New signal.
    if (!w || isNaN(fv) || isNaN(atr) || minsIn < o.skipOpenMins || open) continue;
    const rawL = dispUp && ((phaseCont && o.takeCont && c.c > fv) || (phaseRev && o.takeMrev && c.c < fv));
    const rawS = dispDn && ((phaseCont && o.takeCont && c.c < fv) || (phaseRev && o.takeMrev && c.c > fv));
    const grade: 0 | 1 | 2 = rawL ? (msbUp ? 2 : 1) : rawS ? (msbDn ? 2 : 1) : 0;
    if (!grade || (grade === 2 && !o.takeAplus) || (grade === 1 && !o.takeA)) continue;
    if (o.maxPerDay && setupsToday >= o.maxPerDay) continue;
    const stopPts = atr * o.atrMult;
    if (!(stopPts > 0)) continue;
    const side: 1 | -1 = rawL ? 1 : -1;
    setupsToday++;
    open = {
      side, entry: c.c, stop: c.c - side * stopPts, tgt: c.c + side * stopPts * o.rr, risk: stopPts,
      bar: i, grade, tag: phaseCont ? "CONT" : "MREV", window: w.name,
    };
  }
  return trades;
}
