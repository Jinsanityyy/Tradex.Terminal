export interface TakenSignal {
  id: string;
  signalId?: string;
  symbol: string;
  symbolDisplay: string;
  direction: "BUY" | "SELL";
  timeframe?: string;
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2?: number | null;
  rrRatio: number;
  grade?: string;
  lotSize: number;
  riskAmount: number;
  takenAt: string;
  status: "open" | "closed";
  exitPrice?: number;
  closedAt?: string;
  pnlDollar?: number;
  pnlR?: number;
  result?: "win" | "loss" | "be";
  notes?: string;
}

const KEY = "tradex-taken-signals-v1";

function pointValue(symbol: string): number {
  if (symbol === "BTCUSD" || symbol === "ETHUSD") return 1;
  if (symbol === "XAUUSD") return 100;
  return 100_000;
}

export function loadTradeLog(): TakenSignal[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

function save(trades: TakenSignal[]): void {
  localStorage.setItem(KEY, JSON.stringify(trades));
}

export function calcPnLDollar(
  symbol: string,
  direction: "BUY" | "SELL",
  entry: number,
  exitPrice: number,
  lotSize: number
): number {
  const diff = direction === "BUY" ? exitPrice - entry : entry - exitPrice;
  return parseFloat((diff * lotSize * pointValue(symbol)).toFixed(2));
}

export function suggestLotSize(
  symbol: string,
  entry: number,
  stopLoss: number,
  accountBalance: number,
  riskPct: number
): number {
  const riskAmount = accountBalance * (riskPct / 100);
  const slDist = Math.abs(entry - stopLoss);
  if (slDist === 0) return 0.01;
  const raw = riskAmount / (slDist * pointValue(symbol));
  if (symbol === "BTCUSD" || symbol === "ETHUSD") return parseFloat(raw.toFixed(4));
  return parseFloat(raw.toFixed(2));
}

export function takeTrade(params: Omit<TakenSignal, "id" | "status" | "takenAt">): TakenSignal {
  const trade: TakenSignal = {
    ...params,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "open",
    takenAt: new Date().toISOString(),
  };
  const trades = loadTradeLog();
  save([trade, ...trades]);
  return trade;
}

export function closeTrade(
  id: string,
  exitPrice: number,
  notes?: string
): TakenSignal | null {
  const trades = loadTradeLog();
  const idx = trades.findIndex(t => t.id === id);
  if (idx === -1) return null;
  const t = trades[idx];
  const riskDist = Math.abs(t.entry - t.stopLoss);
  const pnlDollar = calcPnLDollar(t.symbol, t.direction, t.entry, exitPrice, t.lotSize);
  const rawR = riskDist > 0
    ? (t.direction === "BUY" ? exitPrice - t.entry : t.entry - exitPrice) / riskDist
    : 0;
  const pnlR = parseFloat(rawR.toFixed(2));
  const result: TakenSignal["result"] = pnlDollar > 0 ? "win" : pnlDollar < 0 ? "loss" : "be";
  const closed: TakenSignal = {
    ...t,
    status: "closed",
    exitPrice,
    closedAt: new Date().toISOString(),
    pnlDollar,
    pnlR,
    result,
    notes: notes?.trim() || t.notes,
  };
  trades[idx] = closed;
  save(trades);
  return closed;
}

export function findOpenBySetup(
  symbol: string,
  entry: number,
  stopLoss: number
): TakenSignal | undefined {
  return loadTradeLog().find(
    t =>
      t.status === "open" &&
      t.symbol === symbol &&
      Math.abs(t.entry - entry) < 0.01 &&
      Math.abs(t.stopLoss - stopLoss) < 0.01
  );
}
