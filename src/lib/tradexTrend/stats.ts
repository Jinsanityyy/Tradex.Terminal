import {
  FACTOR_NAMES, type Ci95, type FactorStat, type Grade, type StatColor, type Stats, type TradeRecord, type WinRate,
} from "./types";

/** Minimum trades before a colour other than gray is shown. */
export const MIN_N = 20;
/** Percentage points that count as clearly better / worse. */
export const EDGE_PTS = 10;

export function winRate(wins: number, losses: number): WinRate {
  const n = wins + losses;
  return { wins, losses, n, winPct: n > 0 ? wins / n : null };
}

/** 95% normal-approximation range: p +/- 1.96 * sqrt(p(1-p)/n), clamped to 0..1. */
export function ci95(wins: number, n: number): Ci95 | null {
  if (n <= 0) return null;
  const p = wins / n;
  const half = 1.96 * Math.sqrt((p * (1 - p)) / n);
  const lo = Math.max(0, p - half);
  const hi = Math.min(1, p + half);
  return { lo, hi, coinFlip: p - half <= 0.5 && p + half >= 0.5 };
}

/** Edge per trade in R after cost: (wins - losses) / n - costR. */
export function edgePerTrade(wins: number, losses: number, costR: number): number | null {
  const n = wins + losses;
  return n > 0 ? (wins - losses) / n - costR : null;
}

/** Green/red when 10+ points better/worse and both n >= 20; amber between; gray if either n < 20. */
export function compareColor(a: WinRate, b: WinRate): StatColor {
  if (a.n < MIN_N || b.n < MIN_N || a.winPct === null || b.winPct === null) return "gray";
  const d = (a.winPct - b.winPct) * 100;
  return d >= EDGE_PTS ? "green" : d <= -EDGE_PTS ? "red" : "amber";
}

/** Grade vs overall win%: needs n >= 20 for the grade and for the total. */
function gradeColor(g: WinRate, overall: WinRate): StatColor {
  return compareColor(g, overall);
}

const gradeOf = (score: number): Grade => (score >= 4 ? "A" : score === 3 ? "B" : "C");
export { gradeOf };

export function computeStats(trades: TradeRecord[], costR: number): Stats {
  const done = trades.filter((t) => t.outcome === "WIN" || t.outcome === "LOSS");
  const wins = done.filter((t) => t.outcome === "WIN").length;
  const losses = done.length - wins;
  const flips = trades.filter((t) => t.outcome === "FLIP").length;
  const overall = winRate(wins, losses);
  const last = trades.length ? trades[trades.length - 1] : null;

  const factors: FactorStat[] = FACTOR_NAMES.map((name, i) => {
    const w = (present: boolean) => {
      const sub = done.filter((t) => t.factors[i] === present);
      const sw = sub.filter((t) => t.outcome === "WIN").length;
      return winRate(sw, sub.length - sw);
    };
    const withF = w(true);
    const withoutF = w(false);
    return {
      name,
      presentNow: last ? last.factors[i] : null,
      with: withF,
      without: withoutF,
      color: compareColor(withF, withoutF),
    };
  });

  const grade = (g: Grade) => {
    const sub = done.filter((t) => t.grade === g);
    const sw = sub.filter((t) => t.outcome === "WIN").length;
    const wr = winRate(sw, sub.length - sw);
    return { ...wr, color: gradeColor(wr, overall) };
  };

  return {
    wins, losses, flips, n: done.length,
    winPct: overall.winPct,
    ci95: ci95(wins, done.length),
    edgeR: edgePerTrade(wins, losses, costR),
    factors,
    grades: { A: grade("A"), B: grade("B"), C: grade("C") },
  };
}
