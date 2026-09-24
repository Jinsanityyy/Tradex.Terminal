/**
 * JadeCap "Silver Bullet" model, as published in its public playbook and the
 * TradingView implementations of it:
 *
 *   windows   10:00–11:00 and 14:00–15:00 New York time
 *   liquidity Asia high/low, London high/low, or the 9 AM (09:00–10:00 ET)
 *             candle's high/low must have been swept before the entry
 *   entry     the first fair value gap that completes inside a window, in the
 *             direction opposite the sweep (low swept → bullish FVG); a limit
 *             at the FVG's near edge
 *   stop      behind candle 1 of the FVG
 *   target    2R
 *
 * No break of structure is required and there is no bias filter: the sweep
 * and the FVG are the whole model. One setup per window.
 */

import {
  emptyLevels, h1Bias, tradingDay, tradingMinute, walkState,
  type V2Candle, type V2Params, type V2Result, type V2Setup, type V2LevelName, type V2KillZone,
} from "./core-v2";

const WINDOWS: { name: V2KillZone; from: number; to: number }[] = [
  { name: "SB AM", from: 960, to: 1020 },    // 10:00–11:00 ET (minutes since 18:00 ET)
  { name: "SB PM", from: 1200, to: 1260 },   // 14:00–15:00 ET
];

export function analyzeSilverBullet(candles: V2Candle[], p: V2Params): V2Result {
  const levels = emptyLevels();
  const n = candles.length;
  const base = { bias: "neutral" as const, biasSource: "none" as const, levels, diag: [] as V2Result["diag"] };
  if (n < 50) return { ...base, setup: null, note: "Not enough 5-minute history" };

  const today = tradingDay(candles[n - 1].t);
  let todayStart = n - 1;
  while (todayStart > 0 && tradingDay(candles[todayStart - 1].t) === today) todayStart--;

  // Levels, each sweepable from the candle after its range completes.
  const range: Record<string, [number, number]> = {
    Asia: [0, 480], London: [480, 780], "9AM": [900, 960],
  };
  const lv: { name: V2LevelName; price: number; high: boolean; fromIdx: number }[] = [];
  for (const [label, [a, b]] of Object.entries(range)) {
    let hi = -Infinity, lo = Infinity, end = -1;
    for (let i = todayStart; i < n; i++) {
      const m = tradingMinute(candles[i].t);
      if (m >= a && m < b) { hi = Math.max(hi, candles[i].h); lo = Math.min(lo, candles[i].l); }
      if (m >= b) { end = i; break; }
    }
    if (end < 0 || hi === -Infinity) continue;
    const hName = `${label} High` as V2LevelName, lName = `${label} Low` as V2LevelName;
    lv.push({ name: hName, price: hi, high: true, fromIdx: end }, { name: lName, price: lo, high: false, fromIdx: end });
    if (hName in levels) (levels as Record<string, number | null>)[hName] = hi;
    if (lName in levels) (levels as Record<string, number | null>)[lName] = lo;
  }

  /** Index of the first candle that traded through the level, or -1. */
  const sweptAt = (l: typeof lv[number]) => {
    for (let i = l.fromIdx; i < n; i++) if (l.high ? candles[i].h > l.price : candles[i].l < l.price) return i;
    return -1;
  };
  const sweeps = lv.map(l => ({ l, at: sweptAt(l) })).filter(x => x.at >= 0);

  let latest: V2Setup | null = null;
  const diag: V2Result["diag"] = [];
  let note = "Waiting for a Silver Bullet window (10–11 AM or 2–3 PM New York)";

  const bias = h1Bias(candles) ?? "neutral";
  const windows = WINDOWS.filter(w => !p.sbWindows || p.sbWindows === "both" || (p.sbWindows === "am") === (w.name === "SB AM"));
  for (const w of windows) {
    let found = false;
    let stage: V2Result["diag"][number]["stage"] = "no FVG in window";
    for (let j = todayStart; j + 2 < n && !found; j++) {
      const m3 = tradingMinute(candles[j + 2].t);
      if (m3 < w.from || m3 >= w.to) continue;
      for (const long of [true, false]) {
        const gap = long ? candles[j + 2].l - candles[j].h : candles[j].l - candles[j + 2].h;
        if (!(gap > p.minFvgGap)) continue;
        if (p.sbBias && bias !== (long ? "bullish" : "bearish")) continue;
        // A low must have been swept (for a bullish FVG) before the FVG began.
        const prior = sweeps.find(x => x.l.high === !long && x.at <= j);
        if (!prior) { stage = "FVG without prior sweep"; continue; }

        // First valid FVG of the window: this one decides the window either way.
        found = true;
        const edge = long ? candles[j + 2].l : candles[j + 2].h;
        const far  = long ? candles[j].h : candles[j].l;
        const entry = p.sbEntry === "mid" ? (edge + far) / 2 : edge;
        const stopLoss = long ? candles[j].l - p.slBuffer * 0.5 : candles[j].h + p.slBuffer * 0.5;
        const risk = Math.abs(entry - stopLoss);
        if (risk < p.minRisk * 0.5 || risk > p.maxRisk) { stage = "stop out of range"; break; }
        const tp1 = long ? entry + risk * p.tp1R : entry - risk * p.tp1R;
        const tp2 = long ? entry + risk * p.tp2R : entry - risk * p.tp2R;
        const ready = j + 2;
        const st = walkState(candles, ready, long, entry, stopLoss, tp1, 12);
        stage = "setup";
        const sweepCandle = candles[prior.at];
        const setup: V2Setup = {
          id: `${candles[ready].t}-SB-${long ? "L" : "S"}`,
          direction: long ? "long" : "short",
          level: prior.l.name, levelPrice: prior.l.price, killZone: w.name,
          sweepTs: sweepCandle.t, sweepExtreme: long ? sweepCandle.l : sweepCandle.h,
          bosTs: candles[j + 1].t, bosRef: entry,
          fvgHigh: long ? candles[j + 2].l : candles[j].l,
          fvgLow: long ? candles[j].h : candles[j + 2].h,
          readyTs: candles[ready].t,
          entry, stopLoss, tp1, tp2, risk,
          state: st.state, fillTs: st.fillTs, outcome: st.outcome,
        };
        if (!latest || setup.readyTs >= latest.readyTs) latest = setup;
        break;
      }
    }
    // A window with no FVG at all, or FVGs but no prior sweep on their side.
    const inOrPast = tradingMinute(candles[n - 1].t) >= w.from && tradingDay(candles[n - 1].t) === today;
    if (inOrPast) diag.push({ level: w.name, stage });
  }

  if (!latest && sweeps.length === 0) note = "No Asia, London or 9 AM level swept yet today";
  return { ...base, bias, biasSource: "H1 EMA", setup: latest, note: latest ? "" : note, diag };
}
