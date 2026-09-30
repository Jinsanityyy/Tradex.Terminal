/** TradeX Trend System: types. Port of docs/reference/TradeX_TrendSystem_v1_7.pine */

export interface Candle {
  /** Open time, unix seconds UTC. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Tf = "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1";

export const TF_SECONDS: Record<Tf, number> = {
  M1: 60, M5: 300, M15: 900, M30: 1800, H1: 3600, H4: 14400, D1: 86400,
};

/** The five timeframes of the multi-timeframe trend (Pine: 5, 15, 60, 240, D). */
export const MTF_TFS = ["M5", "M15", "H1", "H4", "D1"] as const;
export type MtfTf = (typeof MTF_TFS)[number];

export type CandlesByTf = Partial<Record<Tf, Candle[]>>;

export interface TrendParams {
  stFactor: number;
  atrLen: number;
  emaLen: number;
  slAtrMult: number;
  cloudLen: number;
  cloudMult: number;
  adxLen: number;
  adxThreshold: number;
  riskUsd: number;
  /** oz per 1 lot (gold = 100). */
  contractSize: number;
  /** True when the quote currency is USD (EUR/USD, XAU/USD). False for USD/JPY, USD/CHF, USD/CAD: P&L is in the quote currency. */
  quoteUsd: boolean;
  /** Estimated trading cost per trade, in R. */
  costR: number;
  /** Pine "Smart signals only". */
  smartOnly: boolean;
}

export const DEFAULT_PARAMS: TrendParams = {
  stFactor: 4,
  atrLen: 10,
  emaLen: 200,
  slAtrMult: 1.5,
  cloudLen: 34,
  cloudMult: 1.5,
  adxLen: 14,
  adxThreshold: 25,
  riskUsd: 500,
  contractSize: 100,
  quoteUsd: true,
  costR: 0.03,
  smartOnly: false,
};

/** 1 = downtrend, -1 = uptrend (TradingView convention). */
export type StDir = 1 | -1;
/** +1 up, -1 down, 0 unknown. */
export type Trend = 1 | -1 | 0;

export type Side = "BUY" | "SELL";
export type Outcome = "WIN" | "LOSS" | "FLIP" | "OPEN";
export type Grade = "A" | "B" | "C";

export const FACTOR_NAMES = [
  "Trending (ADX 25+)",
  "MTF agrees (5m-1D)",
  "1H + 4H agree",
  "With EMA 200 (Smart)",
  "London / NY hours",
] as const;

export interface TradeRecord {
  /** Index into series arrays. */
  index: number;
  time: number;
  side: Side;
  smart: boolean;
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  /** Risk distance R in price units. */
  r: number;
  lots: number;
  riskUsd: number;
  /** The five setup factors at the signal. */
  factors: [boolean, boolean, boolean, boolean, boolean];
  score: number;
  grade: Grade;
  outcome: Outcome;
  exitIndex: number | null;
  exitTime: number | null;
}

export interface Series {
  time: number[];
  /** SuperTrend line; null while ATR is not yet defined. */
  stLine: (number | null)[];
  stDir: StDir[];
  ema: (number | null)[];
  cloudTop: (number | null)[];
  cloudBottom: (number | null)[];
  atr: (number | null)[];
  adx: (number | null)[];
}

export interface WinRate {
  wins: number;
  losses: number;
  n: number;
  /** 0..1, null when n = 0. */
  winPct: number | null;
}

export interface Ci95 {
  lo: number;
  hi: number;
  /** Range includes 50%. */
  coinFlip: boolean;
}

export type StatColor = "green" | "red" | "amber" | "gray";

export interface FactorStat {
  name: string;
  /** Present at the latest signal (null if no signal yet). */
  presentNow: boolean | null;
  with: WinRate;
  without: WinRate;
  color: StatColor;
}

export interface Stats {
  wins: number;
  losses: number;
  flips: number;
  n: number;
  winPct: number | null;
  ci95: Ci95 | null;
  /** (wins - losses) / n - costR, in R. null when n = 0. */
  edgeR: number | null;
  factors: FactorStat[];
  grades: Record<Grade, WinRate & { color: StatColor }>;
}

export type MarketState = "Trending" | "Ranging" | "Dead";
export type SessionName = "London" | "London / NY" | "New York" | "Asia" | "Off hours";

export interface LatestState {
  /** Last closed chart-TF candle. */
  time: number;
  close: number;
  bullish: boolean;
  atr: number | null;
  adx: number | null;
  market: MarketState | null;
  /** ATR / SMA(ATR, 100). */
  volRatio: number | null;
  session: SessionName;
  mtf: Record<MtfTf, Trend>;
  mtfSum: number;
  mtfBias: "Bullish" | "Bearish" | "Mixed";
  /** Last closed candle volume above its 20-bar average; null if no volume data. */
  volHigh: boolean | null;
  lastSignal: { side: Side; smart: boolean; barsAgo: number; time: number } | null;
  /** Trade of the latest signal (open or resolved). */
  trade: TradeRecord | null;
}

export interface TrendSnapshot {
  chartTf: Tf;
  params: TrendParams;
  /** Unix seconds the closed/forming cut was made at. */
  asOf: number;
  series: Series;
  signals: { index: number; time: number; side: Side; smart: boolean }[];
  trades: TradeRecord[];
  stats: Stats;
  latest: LatestState | null;
}
