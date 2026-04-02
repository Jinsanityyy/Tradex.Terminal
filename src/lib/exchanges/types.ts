export interface NormalizedTrade {
  tradeId: string;
  symbol: string;
  side: "buy" | "sell" | "long" | "short";
  pnl: number;   // realized P&L in USD
  fee: number;
  closedAt: Date;
}

export interface ExchangeCredentials {
  id: string;
  exchange: "binance" | "bybit" | "okx" | "mt5";
  label: string;
  apiKey: string;
  apiSecret: string;
  apiPassphrase?: string;   // OKX
  metaapiToken?: string;    // MT5
  metaapiAccountId?: string; // MT5
}

export type SyncResult = {
  exchange: string;
  connectionId: string;
  trades: NormalizedTrade[];
  error?: string;
};
