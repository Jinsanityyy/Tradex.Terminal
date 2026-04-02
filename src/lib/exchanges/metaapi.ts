/**
 * MT5 adapter via MetaApi cloud
 * User needs:
 *   1. MetaApi account → https://app.metaapi.cloud
 *   2. Connect their MT5 broker account in MetaApi dashboard
 *   3. Copy the MetaApi Token + Account ID
 * Docs: https://metaapi.cloud/docs/client/
 */
import type { NormalizedTrade } from "./types";

const BASE = "https://mt-client-api-v1.new-york.agiliumtrade.ai";

interface MetaDeal {
  id: string;
  type: string;      // DEAL_TYPE_BUY | DEAL_TYPE_SELL | etc.
  entryType: string; // DEAL_ENTRY_IN | DEAL_ENTRY_OUT | DEAL_ENTRY_INOUT
  symbol: string;
  profit: number;
  commission: number;
  swap: number;
  time: string; // ISO string
  positionId: string;
  volume: number;
}

export async function fetchMT5Trades(
  token: string,
  accountId: string,
  startTime?: number
): Promise<NormalizedTrade[]> {
  const from = startTime
    ? new Date(startTime).toISOString()
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days
  const to = new Date().toISOString();

  const url = `${BASE}/users/current/accounts/${accountId}/history-deals/time/${encodeURIComponent(from)}/${encodeURIComponent(to)}`;

  const res = await fetch(url, {
    headers: {
      "auth-token": token,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MetaApi error ${res.status}: ${err}`);
  }

  const deals: MetaDeal[] = await res.json();

  // Only count closing deals (DEAL_ENTRY_OUT or DEAL_ENTRY_INOUT)
  return deals
    .filter((d) =>
      d.entryType === "DEAL_ENTRY_OUT" ||
      d.entryType === "DEAL_ENTRY_INOUT"
    )
    .map((d) => ({
      tradeId: d.id,
      symbol: d.symbol,
      side: d.type === "DEAL_TYPE_BUY" ? "long" : "short",
      pnl: (d.profit ?? 0) + (d.swap ?? 0),
      fee: Math.abs(d.commission ?? 0),
      closedAt: new Date(d.time),
    }));
}
