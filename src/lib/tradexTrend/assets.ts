import type { TrendParams } from "./types";

export interface TrendAsset {
  /** App symbol id, also the `symbol` of /api/market/candles and the quotes feed. */
  id: string;
  label: string;
  /** Price decimals for axis, labels and levels. */
  decimals: number;
  /** Units per 1 lot, used for the lot-size estimate. */
  contractSize: number;
  quoteUsd: boolean;
}

/** Assets the candle API can serve (TwelveData / Dukascopy / Finnhub / Yahoo). */
export const TREND_ASSETS: TrendAsset[] = [
  { id: "XAUUSD", label: "XAU/USD", decimals: 2, contractSize: 100, quoteUsd: true },
  { id: "XAGUSD", label: "XAG/USD", decimals: 3, contractSize: 5000, quoteUsd: true },
  { id: "EURUSD", label: "EUR/USD", decimals: 5, contractSize: 100_000, quoteUsd: true },
  { id: "GBPUSD", label: "GBP/USD", decimals: 5, contractSize: 100_000, quoteUsd: true },
  { id: "AUDUSD", label: "AUD/USD", decimals: 5, contractSize: 100_000, quoteUsd: true },
  { id: "NZDUSD", label: "NZD/USD", decimals: 5, contractSize: 100_000, quoteUsd: true },
  { id: "USDJPY", label: "USD/JPY", decimals: 3, contractSize: 100_000, quoteUsd: false },
  { id: "USDCHF", label: "USD/CHF", decimals: 5, contractSize: 100_000, quoteUsd: false },
  { id: "USDCAD", label: "USD/CAD", decimals: 5, contractSize: 100_000, quoteUsd: false },
  { id: "BTCUSD", label: "BTC/USD", decimals: 2, contractSize: 1, quoteUsd: true },
  { id: "ETHUSD", label: "ETH/USD", decimals: 2, contractSize: 1, quoteUsd: true },
  { id: "USOIL", label: "WTI Oil", decimals: 2, contractSize: 1000, quoteUsd: true },
];

const BY_ID = new Map(TREND_ASSETS.map((a) => [a.id, a]));

export const isTrendAsset = (id: string) => BY_ID.has(id);
export const trendAsset = (id: string): TrendAsset => BY_ID.get(id) ?? TREND_ASSETS[0];

/** Per-asset compute params (lot size maths). */
export const paramsFor = (id: string): Partial<TrendParams> => {
  const a = trendAsset(id);
  return { contractSize: a.contractSize, quoteUsd: a.quoteUsd };
};
