import { fetchBinanceTrades } from "./binance";
import { fetchBybitTrades } from "./bybit";
import { fetchOKXTrades } from "./okx";
import { fetchMT5Trades } from "./metaapi";
import type { ExchangeCredentials, NormalizedTrade, SyncResult } from "./types";

export type { ExchangeCredentials, NormalizedTrade, SyncResult };

export async function syncExchange(
  creds: ExchangeCredentials,
  startTime?: number
): Promise<SyncResult> {
  try {
    let trades: NormalizedTrade[] = [];

    switch (creds.exchange) {
      case "binance":
        trades = await fetchBinanceTrades(creds.apiKey, creds.apiSecret, startTime);
        break;
      case "bybit":
        trades = await fetchBybitTrades(creds.apiKey, creds.apiSecret, startTime);
        break;
      case "okx":
        trades = await fetchOKXTrades(
          creds.apiKey,
          creds.apiSecret,
          creds.apiPassphrase ?? "",
          startTime
        );
        break;
      case "mt5":
      case "ctrader":
        trades = await fetchMT5Trades(
          creds.metaapiToken ?? "",
          creds.metaapiAccountId ?? "",
          startTime
        );
        break;
    }

    return { exchange: creds.exchange, connectionId: creds.id, trades };
  } catch (error: any) {
    return {
      exchange: creds.exchange,
      connectionId: creds.id,
      trades: [],
      error: error?.message ?? "Unknown error",
    };
  }
}
