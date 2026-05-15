/**
 * Bybit Unified v5 adapter  -  Linear perpetuals (USDT)
 * Endpoint: /v5/position/closed-pnl
 * Docs: https://bybit-exchange.github.io/docs/v5/position/close-pnl
 */
import crypto from "crypto";
import type { NormalizedTrade } from "./types";

const BASE = "https://api.bybit.com";
const RECV_WINDOW = "10000";

function sign(timestamp: string, apiKey: string, body: string, secret: string): string {
  const str = `${timestamp}${apiKey}${RECV_WINDOW}${body}`;
  return crypto.createHmac("sha256", secret).update(str).digest("hex");
}

interface BybitClosedPnl {
  symbol: string;
  side: string;         // "Buy" | "Sell"
  qty: string;
  entryPrice: string;
  exitPrice: string;
  closedPnl: string;    // realized P&L
  cumEntryValue: string;
  cumExitValue: string;
  fillCount: string;
  leverage: string;
  createdTime: string;  // Unix ms as string
  updatedTime: string;
}

interface BybitResponse {
  retCode: number;
  retMsg: string;
  result: {
    list: BybitClosedPnl[];
    nextPageCursor: string;
  };
}

export async function fetchBybitTrades(
  apiKey: string,
  apiSecret: string,
  startTime?: number,
  endTime?: number
): Promise<NormalizedTrade[]> {
  const trades: NormalizedTrade[] = [];
  let cursor = "";

  while (true) {
    const timestamp = Date.now().toString();
    const params: Record<string, string> = {
      category: "linear",
      limit: "200",
    };
    if (startTime) params.startTime = startTime.toString();
    if (endTime) params.endTime = endTime.toString();
    if (cursor) params.cursor = cursor;

    const qs = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");

    const signature = sign(timestamp, apiKey, qs, apiSecret);

    const res = await fetch(`${BASE}/v5/position/closed-pnl?${qs}`, {
      headers: {
        "X-BAPI-API-KEY": apiKey,
        "X-BAPI-SIGN": signature,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": RECV_WINDOW,
      },
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`Bybit API error ${res.status}`);
    const data: BybitResponse = await res.json();
    if (data.retCode !== 0) throw new Error(`Bybit: ${data.retMsg}`);

    const list = data.result?.list ?? [];
    list.forEach((d) => {
      const pnl = parseFloat(d.closedPnl);
      if (isNaN(pnl)) return;
      trades.push({
        tradeId: `bybit-${d.createdTime}-${d.symbol}`,
        symbol: d.symbol,
        side: d.side === "Buy" ? "long" : "short",
        pnl,
        fee: 0,
        closedAt: new Date(parseInt(d.updatedTime || d.createdTime)),
      });
    });

    cursor = data.result?.nextPageCursor ?? "";
    if (!cursor || list.length < 200) break;
  }

  return trades;
}
