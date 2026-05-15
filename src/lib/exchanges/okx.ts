/**
 * OKX adapter  -  Perpetual SWAP fills history
 * Endpoint: /api/v5/trade/fills-history (returns realized pnl per fill)
 * Docs: https://www.okx.com/docs-v5/en/#trading-account-rest-api-get-bills-details-last-3-months
 */
import crypto from "crypto";
import type { NormalizedTrade } from "./types";

const BASE = "https://www.okx.com";

function sign(
  timestamp: string,
  method: string,
  path: string,
  body: string,
  secret: string
): string {
  const prehash = `${timestamp}${method}${path}${body}`;
  return crypto.createHmac("sha256", secret).update(prehash).digest("base64");
}

function isoTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

interface OKXFill {
  instId: string;
  side: string;       // "buy" | "sell"
  fillPx: string;
  fillSz: string;
  fee: string;        // negative = cost
  fillTime: string;   // Unix ms as string
  pnl: string;        // realized pnl (can be "" for entry fills)
  tradeId: string;
  billId: string;
}

interface OKXResponse {
  code: string;
  msg: string;
  data: OKXFill[];
}

async function fetchPage(
  apiKey: string,
  apiSecret: string,
  passphrase: string,
  after?: string
): Promise<OKXFill[]> {
  const timestamp = isoTimestamp();
  let path = "/api/v5/trade/fills-history?instType=SWAP&limit=100";
  if (after) path += `&after=${after}`;

  const sig = sign(timestamp, "GET", path, "", apiSecret);

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": sig,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": passphrase,
      "x-simulated-trading": "0",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`OKX API error ${res.status}`);
  const data: OKXResponse = await res.json();
  if (data.code !== "0") throw new Error(`OKX: ${data.msg}`);
  return data.data ?? [];
}

export async function fetchOKXTrades(
  apiKey: string,
  apiSecret: string,
  passphrase: string,
  startTime?: number
): Promise<NormalizedTrade[]> {
  const trades: NormalizedTrade[] = [];
  let after: string | undefined;

  while (true) {
    const fills = await fetchPage(apiKey, apiSecret, passphrase, after);
    if (!fills.length) break;

    for (const f of fills) {
      const ts = parseInt(f.fillTime);
      if (startTime && ts < startTime) {
        return trades; // past our window
      }
      const pnl = parseFloat(f.pnl);
      if (!isNaN(pnl) && pnl !== 0) {
        trades.push({
          tradeId: f.billId || f.tradeId,
          symbol: f.instId,
          side: f.side === "buy" ? "long" : "short",
          pnl,
          fee: Math.abs(parseFloat(f.fee) || 0),
          closedAt: new Date(ts),
        });
      }
    }

    after = fills[fills.length - 1]?.billId;
    if (fills.length < 100) break;
  }

  return trades;
}
