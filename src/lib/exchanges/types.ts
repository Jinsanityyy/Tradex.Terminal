export interface NormalizedTrade {
  tradeId: string;
  symbol: string;
  side: "buy" | "sell" | "long" | "short";
  pnl: number;   // realized P&L in account currency
  fee: number;
  closedAt: Date;
}

export interface ExchangeCredentials {
  id: string;
  exchange: "binance" | "bybit" | "okx";
  label: string;
  apiKey: string;
  apiSecret: string;
  apiPassphrase?: string; // OKX only
}

export type SyncResult = {
  exchange: string;
  connectionId: string;
  trades: NormalizedTrade[];
  error?: string;
};
