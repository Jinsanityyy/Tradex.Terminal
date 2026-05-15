/**
 * cTrader Open API  -  high-level service.
 * Handles app auth, account auth, and data fetching.
 * All monetary values are scaled by moneyDigits (÷ 10^moneyDigits).
 */

import { CtraderClient, withCtraderClient } from "./client";
import {
  PT,
  buildAppAuthReq,
  buildAccountAuthReq,
  buildGetAccountsReq,
  buildTraderReq,
  buildReconcileReq,
  buildDealListReq,
  buildSymbolsReq,
  parseAccounts,
  parseTrader,
  parseDeals,
  parsePositions,
  parseSymbols,
} from "./proto";
import type {
  CtraderAccount,
  CtraderTrader,
  CtraderDeal,
  CtraderPosition,
  CtraderSymbol,
  CtraderSyncResult,
} from "./types";
import type { NormalizedTrade } from "@/lib/exchanges/types";

// ─── OAuth helpers ────────────────────────────────────────────────────────────

const TOKEN_URL = "https://connect.spotware.com/apps/token";

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }
  const json = await res.json();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in ?? 3600,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }
  const json = await res.json();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
  };
}

// ─── App auth ────────────────────────────────────────────────────────────────

async function appAuth(client: CtraderClient, clientId: string, clientSecret: string) {
  await client.request(
    PT.OA_APP_AUTH_REQ,
    buildAppAuthReq(clientId, clientSecret),
    PT.OA_APP_AUTH_RES
  );
}

// ─── Account operations ──────────────────────────────────────────────────────

export async function fetchAccounts(
  accessToken: string,
  clientId: string,
  clientSecret: string,
  isLive = true
): Promise<CtraderAccount[]> {
  return withCtraderClient(isLive, async (client) => {
    await appAuth(client, clientId, clientSecret);
    const res = await client.request(
      PT.OA_ACCOUNTS_REQ,
      buildGetAccountsReq(accessToken),
      PT.OA_ACCOUNTS_RES
    );
    return parseAccounts(res);
  });
}

async function accountAuth(client: CtraderClient, accessToken: string, ctid: bigint) {
  await client.request(
    PT.OA_ACCOUNT_AUTH_REQ,
    buildAccountAuthReq(ctid, accessToken),
    PT.OA_ACCOUNT_AUTH_RES
  );
}

// ─── Full sync ────────────────────────────────────────────────────────────────

export async function syncCtraderAccount(
  accessToken: string,
  ctid: string,
  clientId: string,
  clientSecret: string,
  isLive: boolean,
  fromMs?: number
): Promise<CtraderSyncResult> {
  const ctidBig = BigInt(ctid);
  const now = Date.now();
  const from = fromMs ?? now - 90 * 24 * 60 * 60 * 1000;

  return withCtraderClient(isLive, async (client) => {
    // 1. App auth
    await appAuth(client, clientId, clientSecret);

    // 2. Account auth
    await accountAuth(client, accessToken, ctidBig);

    // 3. Trader info (balance, currency)
    const traderBuf = await client.request(
      PT.OA_TRADER_REQ,
      buildTraderReq(ctidBig),
      PT.OA_TRADER_RES
    );
    const trader = parseTrader(traderBuf);
    const scale = Math.pow(10, trader.moneyDigits);

    // 4. Symbols list (for symbolId → name mapping)
    const symbolsBuf = await client.request(
      PT.OA_SYMBOLS_REQ,
      buildSymbolsReq(ctidBig),
      PT.OA_SYMBOLS_RES
    );
    const symbolMap = new Map(
      parseSymbols(symbolsBuf).map(s => [s.symbolId, s.symbolName])
    );

    // 5. Closed deals (paginated if hasMore)
    const allDeals: CtraderDeal[] = [];
    let fromCursor = BigInt(from);
    const toBig = BigInt(now);
    let attempts = 0;

    while (attempts < 20) {
      attempts++;
      const dealsBuf = await client.request(
        PT.OA_DEAL_LIST_REQ,
        buildDealListReq(ctidBig, fromCursor, toBig, 500),
        PT.OA_DEAL_LIST_RES
      );
      const { deals, hasMore } = parseDeals(dealsBuf);
      allDeals.push(...deals);
      if (!hasMore || deals.length === 0) break;
      // Advance cursor past last deal timestamp
      const lastTs = deals[deals.length - 1].executionTimestamp;
      fromCursor = BigInt(lastTs + 1);
    }

    // 6. Open positions
    const posBuf = await client.request(
      PT.OA_RECONCILE_REQ,
      buildReconcileReq(ctidBig),
      PT.OA_RECONCILE_RES
    );
    const positions = parsePositions(posBuf);

    return {
      ctid,
      balance: trader.balance / scale,
      equity: trader.equity / scale,
      currency: trader.currency,
      deals: allDeals,
      positions,
      symbolMap,
    };
  });
}

// ─── Normalization ────────────────────────────────────────────────────────────

/** Convert cTrader deals → NormalizedTrade[] (only closing deals with P&L). */
export function normalizeCtraderDeals(
  deals: CtraderDeal[],
  symbolMap: Map<number, string>,
  moneyDigits: number
): NormalizedTrade[] {
  const scale = Math.pow(10, moneyDigits);
  return deals
    .filter(d => d.isClosing && d.status === 2 && d.closeDetail !== undefined)
    .map(d => {
      const cd = d.closeDetail!;
      const grossPnl = cd.grossProfit / scale;
      const commission = (Math.abs(cd.commission) + Math.abs(d.commission)) / scale;
      const swap = cd.swap / scale;
      const netPnl = grossPnl + swap;
      return {
        tradeId: d.dealId,
        symbol: symbolMap.get(d.symbolId) ?? `SYM_${d.symbolId}`,
        side: d.tradeSide === "BUY" ? "long" as const : "short" as const,
        pnl: parseFloat(netPnl.toFixed(moneyDigits)),
        fee: parseFloat(commission.toFixed(moneyDigits)),
        closedAt: new Date(d.executionTimestamp),
      };
    });
}
