/**
 * Session Liquidity core (v2)
 *
 * One deterministic model, no LLM anywhere in the decision:
 *
 *   1. Bias      H1 trend from the same 5-minute candles: close above EMA50 with
 *                EMA20 above EMA50 is bullish, the mirror is bearish, anything
 *                else is no bias and no trade. Falls back to the previous
 *                trading day's direction when there is not enough history.
 *   2. Levels    Asia range (18:00–02:00 ET), London range (02:00–07:00 ET), and
 *                the previous trading day's high and low.
 *   3. Sweep     Inside a kill zone (London 02:00–05:00 ET, New York 08:30–11:30
 *                ET) a candle trades through a level that has not been taken
 *                yet today and closes back inside it. Only sweeps in the
 *                direction of the bias count: lows in a bullish bias, highs in a
 *                bearish one.
 *   4. BOS       Within the next hour a displacement candle (body at least half
 *                its range) closes beyond the swing that led into the sweep,
 *                before price trades back through the sweep extreme.
 *   5. FVG       A three-candle imbalance in the displacement leg. Entry is a
 *                limit at its midpoint.
 *   6. Plan      Stop just beyond the sweep extreme; TP1 at 2R, TP2 at 3R. The
 *                stop has to fall inside a per-instrument range or there is no
 *                trade.
 *
 * Times are New York time with daylight saving, which is how these sessions
 * are defined. The function only reads the candles it is given, so the live
 * app and the backtest run exactly the same code on the same inputs.
 */

export interface V2Candle { t: number; o: number; h: number; l: number; c: number }

export type V2Direction = "long" | "short";
export type V2Bias = "bullish" | "bearish" | "neutral";
export type V2LevelName = "Asia High" | "Asia Low" | "London High" | "London Low" | "PDH" | "PDL";
export type V2KillZone = "London" | "New York";
/** pending: limit not filled yet · active: filled, running · done: hit TP1 or SL · expired: never filled */
export type V2State = "pending" | "active" | "done" | "expired";

export interface V2Params {
  /** How far past the level the wick must reach */
  minSweep: number;
  minFvgGap: number;
  /** Stop distance beyond the sweep extreme */
  slBuffer: number;
  minRisk: number;
  maxRisk: number;
  tp1R: number;
  tp2R: number;
  /** Candles after the sweep in which the BOS must print */
  bosWindow: number;
  /** Candles after the FVG completes in which the limit must fill */
  fillWindow: number;
}

export interface V2Setup {
  id: string;
  direction: V2Direction;
  level: V2LevelName;
  levelPrice: number;
  killZone: V2KillZone;
  sweepTs: number;
  sweepExtreme: number;
  bosTs: number;
  bosRef: number;
  fvgHigh: number;
  fvgLow: number;
  /** Timestamp of the candle that completed the FVG — when the setup became known */
  readyTs: number;
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  risk: number;
  state: V2State;
  fillTs: number | null;
  /** Set once the trade is done */
  outcome: "tp1" | "sl" | null;
}

export interface V2Result {
  bias: V2Bias;
  biasSource: "H1 EMA" | "previous day" | "none";
  levels: Record<V2LevelName, number | null>;
  /** Most recent setup of the current trading day, in any state */
  setup: V2Setup | null;
  /** Why there is no setup, when there is none */
  note: string;
}

// ── Instrument parameters ─────────────────────────────────────────────────────

const METALS = new Set(["XAUUSD", "XAGUSD", "XPTUSD"]);
const CRYPTO = new Set(["BTCUSD", "ETHUSD"]);

export function v2ParamsFor(symbol: string, price: number): V2Params {
  const base = { tp1R: 2, tp2R: 3, bosWindow: 12, fillWindow: 24 };
  if (symbol === "XAUUSD") {
    return { ...base, minSweep: 1, minFvgGap: 0.5, slBuffer: 1, minRisk: 2, maxRisk: 12 };
  }
  if (METALS.has(symbol)) {
    return { ...base, minSweep: price * 0.0003, minFvgGap: price * 0.0002, slBuffer: price * 0.0003, minRisk: price * 0.0008, maxRisk: price * 0.006 };
  }
  if (CRYPTO.has(symbol)) {
    return { ...base, minSweep: price * 0.0008, minFvgGap: price * 0.0005, slBuffer: price * 0.0005, minRisk: price * 0.0015, maxRisk: price * 0.012 };
  }
  // Forex and indices
  return { ...base, minSweep: price * 0.0001, minFvgGap: price * 0.00008, slBuffer: price * 0.0001, minRisk: price * 0.0003, maxRisk: price * 0.004 };
}

// ── New York time ─────────────────────────────────────────────────────────────

const etOffsetByDay = new Map<number, number>();
let etFormatter: Intl.DateTimeFormat | null = null;

/** Minutes to add to UTC to get New York time, for the UTC day containing `ts`. */
function etOffsetMin(ts: number): number {
  const day = Math.floor(ts / 86_400);
  const hit = etOffsetByDay.get(day);
  if (hit !== undefined) return hit;
  etFormatter ??= new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const noon = day * 86_400 + 12 * 3600;
  const parts = etFormatter.formatToParts(new Date(noon * 1000));
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0);
  const localSec = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) / 1000;
  const offset = Math.round((localSec - noon) / 60);
  etOffsetByDay.set(day, offset);
  return offset;
}

/** Trading day starts 18:00 ET: shift by 6h so it lines up with a calendar day. */
function tradingDay(ts: number): number {
  return Math.floor((ts + etOffsetMin(ts) * 60 + 6 * 3600) / 86_400);
}

/** Minutes since 18:00 ET (the start of the trading day). */
function tradingMinute(ts: number): number {
  const m = Math.floor((ts + etOffsetMin(ts) * 60 + 6 * 3600) / 60) % 1440;
  return m < 0 ? m + 1440 : m;
}

const ASIA_END    = 480;   // 02:00 ET
const LONDON_END  = 780;   // 07:00 ET
const LONDON_KZ   = [480, 660] as const;   // 02:00–05:00 ET
const NY_KZ       = [870, 1050] as const;  // 08:30–11:30 ET

function killZoneOf(ts: number): V2KillZone | null {
  const m = tradingMinute(ts);
  if (m >= LONDON_KZ[0] && m < LONDON_KZ[1]) return "London";
  if (m >= NY_KZ[0] && m < NY_KZ[1]) return "New York";
  return null;
}

// ── Bias ──────────────────────────────────────────────────────────────────────

function emaLast(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

function h1Bias(candles: V2Candle[]): V2Bias | null {
  const closes: number[] = [];
  let hour = -1;
  for (const c of candles) {
    const h = Math.floor(c.t / 3600);
    if (h !== hour) { closes.push(c.c); hour = h; } else closes[closes.length - 1] = c.c;
  }
  const ema20 = emaLast(closes, 20);
  const ema50 = emaLast(closes, 50);
  if (ema20 === null || ema50 === null) return null;
  const last = closes[closes.length - 1];
  if (last > ema50 && ema20 > ema50) return "bullish";
  if (last < ema50 && ema20 < ema50) return "bearish";
  return "neutral";
}

// ── Main ──────────────────────────────────────────────────────────────────────

const LEVEL_NAMES: V2LevelName[] = ["Asia High", "Asia Low", "London High", "London Low", "PDH", "PDL"];

function emptyLevels(): Record<V2LevelName, number | null> {
  return Object.fromEntries(LEVEL_NAMES.map(n => [n, null])) as Record<V2LevelName, number | null>;
}

/**
 * Reads the setup as of the last candle. Candles must be 5-minute bars in time
 * order; roughly three trading days (≈ 900) are enough for the bias and the
 * previous day's range.
 */
export function analyzeSessionLiquidity(candles: V2Candle[], p: V2Params): V2Result {
  const levels = emptyLevels();
  const none = (bias: V2Bias, biasSource: V2Result["biasSource"], note: string): V2Result =>
    ({ bias, biasSource, levels, setup: null, note });

  if (candles.length < 50) return none("neutral", "none", "Not enough 5-minute history");

  const n = candles.length;
  const today = tradingDay(candles[n - 1].t);

  // Index where today's trading day starts, and the previous trading day's range.
  let todayStart = n - 1;
  while (todayStart > 0 && tradingDay(candles[todayStart - 1].t) === today) todayStart--;
  let prevHigh: number | null = null, prevLow: number | null = null;
  let prevOpen: number | null = null, prevClose: number | null = null;
  if (todayStart > 0) {
    const prevDay = tradingDay(candles[todayStart - 1].t);
    for (let i = todayStart - 1; i >= 0 && tradingDay(candles[i].t) === prevDay; i--) {
      const c = candles[i];
      prevHigh = prevHigh === null ? c.h : Math.max(prevHigh, c.h);
      prevLow  = prevLow  === null ? c.l : Math.min(prevLow, c.l);
      prevOpen = c.o;                        // walking backwards: ends on the first candle
      prevClose ??= c.c;
    }
  }
  levels.PDH = prevHigh;
  levels.PDL = prevLow;

  // Session ranges for today.
  for (let i = todayStart; i < n; i++) {
    const c = candles[i];
    const m = tradingMinute(c.t);
    if (m < ASIA_END) {
      levels["Asia High"] = Math.max(levels["Asia High"] ?? -Infinity, c.h);
      levels["Asia Low"]  = Math.min(levels["Asia Low"]  ??  Infinity, c.l);
    } else if (m < LONDON_END) {
      levels["London High"] = Math.max(levels["London High"] ?? -Infinity, c.h);
      levels["London Low"]  = Math.min(levels["London Low"]  ??  Infinity, c.l);
    }
  }

  // Bias.
  let bias: V2Bias;
  let biasSource: V2Result["biasSource"];
  const fromH1 = h1Bias(candles);
  if (fromH1 !== null) { bias = fromH1; biasSource = "H1 EMA"; }
  else if (prevOpen !== null && prevClose !== null && prevClose !== prevOpen) {
    bias = prevClose > prevOpen ? "bullish" : "bearish"; biasSource = "previous day";
  } else { bias = "neutral"; biasSource = "none"; }
  if (bias === "neutral") return none(bias, biasSource, "No trend bias on H1 — no trade");

  const long = bias === "bullish";
  const targets: { name: V2LevelName; price: number; usableFrom: number }[] = [];
  const add = (name: V2LevelName, usableFrom: number) => {
    const price = levels[name];
    if (price !== null) targets.push({ name, price, usableFrom });
  };
  // Only the side the bias trades from: lows for longs, highs for shorts.
  if (long) { add("Asia Low", ASIA_END); add("London Low", LONDON_END); add("PDL", 0); }
  else      { add("Asia High", ASIA_END); add("London High", LONDON_END); add("PDH", 0); }

  let latest: V2Setup | null = null;
  let note = `Waiting for a ${long ? "low" : "high"} to be swept in a kill zone`;

  for (const tgt of targets) {
    // A level holds liquidity until the first candle trades through it, so only
    // that candle can be the sweep. If it closes beyond the level, or lands
    // outside a kill zone, the liquidity is gone and the level is done for today.
    let s = -1;
    for (let i = todayStart; i < n; i++) {
      if (tradingMinute(candles[i].t) < tgt.usableFrom) continue;
      if (long ? candles[i].l < tgt.price : candles[i].h > tgt.price) { s = i; break; }
    }
    if (s < 6) continue;
    const sc = candles[s];
    const kz = killZoneOf(sc.t);
    if (!kz) continue;
    const swept = long
      ? sc.l < tgt.price - p.minSweep && sc.c > tgt.price
      : sc.h > tgt.price + p.minSweep && sc.c < tgt.price;
    if (!swept) continue;

    const setup = buildSetup(candles, s, long, tgt.name, tgt.price, kz, p);
    if (setup === "no-bos") { note = `${tgt.name} swept, no break of structure yet`; continue; }
    if (setup === "no-fvg") { note = `${tgt.name} swept with a break of structure, but no imbalance to enter from`; continue; }
    if (setup === "bad-risk") { note = `${tgt.name} setup found, but the stop would be outside the allowed range`; continue; }
    if (!latest || setup.readyTs >= latest.readyTs) latest = setup;
  }

  return { bias, biasSource, levels, setup: latest, note: latest ? "" : note };
}

function buildSetup(
  candles: V2Candle[], s: number, long: boolean,
  level: V2LevelName, levelPrice: number, killZone: V2KillZone, p: V2Params,
): V2Setup | "no-bos" | "no-fvg" | "bad-risk" {
  const n = candles.length;
  const sc = candles[s];
  const extreme = long ? sc.l : sc.h;

  // Swing that led into the sweep: its break is the BOS.
  let ref = long ? -Infinity : Infinity;
  for (let i = s - 6; i < s; i++) ref = long ? Math.max(ref, candles[i].h) : Math.min(ref, candles[i].l);

  let k = -1;
  for (let i = s + 1; i < n && i <= s + p.bosWindow; i++) {
    const c = candles[i];
    if (long ? c.l < extreme : c.h > extreme) break;            // swept again: idea failed
    const range = c.h - c.l;
    const body = Math.abs(c.c - c.o);
    const displaced = range > 0 && body >= range * 0.5;
    if (displaced && (long ? c.c > ref && c.c > c.o : c.c < ref && c.c < c.o)) { k = i; break; }
  }
  if (k < 0) return "no-bos";

  // Imbalance in the displacement leg, nearest to the break. Only trios whose
  // middle candle is at or before the break count, and the setup waits for the
  // candle after the break so that set is final: otherwise the entry would move
  // as new candles print, and what the app showed would not be what was traded.
  if (k + 1 >= n) return "no-fvg";
  let j = -1;
  for (let i = s; i + 2 < n && i <= k - 1; i++) {
    const gap = long ? candles[i + 2].l - candles[i].h : candles[i].l - candles[i + 2].h;
    if (gap > p.minFvgGap) j = i;
  }
  if (j < 0) return "no-fvg";

  const fvgHigh = long ? candles[j + 2].l : candles[j].l;
  const fvgLow  = long ? candles[j].h     : candles[j + 2].h;
  const entry = (fvgHigh + fvgLow) / 2;
  const stopLoss = long ? extreme - p.slBuffer : extreme + p.slBuffer;
  const risk = Math.abs(entry - stopLoss);
  if (risk < p.minRisk || risk > p.maxRisk) return "bad-risk";
  const tp1 = long ? entry + risk * p.tp1R : entry - risk * p.tp1R;
  const tp2 = long ? entry + risk * p.tp2R : entry - risk * p.tp2R;

  // Walk forward from the candle that completed the imbalance to today's state.
  const ready = j + 2;
  let state: V2State = "pending";
  let fillTs: number | null = null;
  let outcome: V2Setup["outcome"] = null;
  for (let i = ready + 1; i < n; i++) {
    const c = candles[i];
    if (state === "pending") {
      const filled = long ? c.l <= entry : c.h >= entry;
      if (filled) {
        state = "active"; fillTs = c.t;
        // Same candle through the stop: count it as stopped (the worse case).
        if (long ? c.l <= stopLoss : c.h >= stopLoss) { state = "done"; outcome = "sl"; break; }
        continue;
      }
      if (long ? c.h >= tp1 : c.l <= tp1) { state = "expired"; break; }   // ran without us
      if (i - ready > p.fillWindow) { state = "expired"; break; }
    } else {
      if (long ? c.l <= stopLoss : c.h >= stopLoss) { state = "done"; outcome = "sl"; break; }
      if (long ? c.h >= tp1 : c.l <= tp1) { state = "done"; outcome = "tp1"; break; }
    }
  }

  return {
    id: `${sc.t}-${level}`,
    direction: long ? "long" : "short",
    level, levelPrice, killZone,
    sweepTs: sc.t, sweepExtreme: extreme,
    bosTs: candles[k].t, bosRef: ref,
    fvgHigh, fvgLow, readyTs: candles[ready].t,
    entry, stopLoss, tp1, tp2, risk,
    state, fillTs, outcome,
  };
}
