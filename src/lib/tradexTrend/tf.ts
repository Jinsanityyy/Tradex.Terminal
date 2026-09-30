import { TF_SECONDS, type Tf } from "./types";

const TV_TO_TF: Record<string, Tf> = {
  "1": "M1", "5": "M5", "15": "M15", "30": "M30", "60": "H1", "240": "H4", D: "D1", "1D": "D1",
};

/** TradingView interval string ("1", "60", "D") to our timeframe. Defaults to H1. */
export function tvIntervalToTf(tv: string): Tf {
  return TV_TO_TF[tv] ?? "H1";
}

export const TF_LABEL: Record<Tf, string> = {
  M1: "1m", M5: "5m", M15: "15m", M30: "30m", H1: "1H", H4: "4H", D1: "1D",
};

/** Index of the candle period `nowSec` falls in; changes exactly when a candle closes. */
export const bucketOf = (tf: Tf, nowSec: number) => Math.floor(nowSec / TF_SECONDS[tf]);
