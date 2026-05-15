export type CtraderTradeSide = "BUY" | "SELL";

export interface CtraderAccount {
  ctid: string;           // ctidTraderAccountId as string (bigint-safe)
  isLive: boolean;
  traderLogin: number;
  brokerTitle?: string;
}

export interface CtraderTrader {
  ctid: string;
  balance: number;        // raw int64 from API (monetary units)
  equity: number;         // raw int64
  moneyDigits: number;    // decimal places (usually 2)
  currency: string;
  traderLogin: number;
}

export interface CtraderCloseDetail {
  entryPrice: number;
  closedVolume: number;   // in centilots
  grossProfit: number;    // raw monetary units
  swap: number;
  commission: number;
}

export interface CtraderDeal {
  dealId: string;
  orderId: string;
  positionId: string;
  symbolId: number;
  tradeSide: CtraderTradeSide;
  volume: number;         // centilots
  filledVolume: number;
  executionPrice: number;
  executionTimestamp: number; // epoch ms
  commission: number;     // raw monetary units
  status: number;         // 2=filled, 3=partial, etc.
  isClosing: boolean;
  closeDetail?: CtraderCloseDetail;
}

export interface CtraderPosition {
  positionId: string;
  symbolId: number;
  tradeSide: CtraderTradeSide;
  volume: number;         // centilots
  entryPrice: number;
  commission: number;
  swap: number;
  openTimestamp: number;  // epoch ms
  unrealizedPnl?: number;
}

export interface CtraderSymbol {
  symbolId: number;
  symbolName: string;
}

export interface CtraderSyncResult {
  ctid: string;
  balance: number;        // in account currency (e.g. USD)
  equity: number;
  currency: string;
  deals: CtraderDeal[];
  positions: CtraderPosition[];
  symbolMap: Map<number, string>;
  error?: string;
}
