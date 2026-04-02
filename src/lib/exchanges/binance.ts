/**
 * Binance USDT-M Futures adapter
 * Endpoint: /fapi/v1/income?incomeType=REALIZED_PNL
 * Docs: https://binance-docs.github.io/apidocs/futures/en/#get-income-history-user_data
 */
import crypto from "crypto";
import type { NormalizedTrade } from "./types";

const BASE = "https://fapi.binance.com";

function sign(queryString: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
}

interface BinanceIncome {
  symbol: string;
  incomeType: string;
  income: string;
  asset: string;
  time: number;
  info: string;
  tranId: string;
  tradeId: string;
}

export async function fetchBinanceTrades(
  apiKey: string,
  apiSecret: string,
  startTime?: number,
  endTime?: number
): Promise<NormalizedTrade[]> {
  const timestamp = Date.now();
  const params: Record<string, string | number> = {
    incomeType: "REALIZED_PNL",
    limit: 1000,
    timestamp,
    recvWindow: 10000,
  };
  if (startTime) params.startTime = startTime;
  if (endTime) params.endTime = endTime;

  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const signature = sign(qs, apiSecret);
  const url = `${BASE}/fapi/v1/income?${qs}&signature=${signature}`;

  const res = await fetch(url, {
    headers: { "X-MBX-APIKEY": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Binance API error ${res.status}: ${err}`);
  }

  const data: BinanceIncome[] = await res.json();

  return data
    .filter((d) => d.incomeType === "REALIZED_PNL" && d.income !== "0")
    .map((d) => ({
      tradeId: d.tranId || d.tradeId || `${d.time}-${d.symbol}`,
      symbol: d.symbol,
      side: parseFloat(d.income) >= 0 ? "long" : "short",
      pnl: parseFloat(d.income),
      fee: 0, // Binance returns fee separately as COMMISSION income type
      closedAt: new Date(d.time),
    }));
}
