import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";
import { decrypt, encrypt } from "@/lib/exchanges/encrypt";
import {
  syncCtraderAccount,
  refreshAccessToken,
  normalizeCtraderDeals,
} from "@/lib/ctrader/service";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env.CTRADER_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.CTRADER_CLIENT_SECRET ?? "";

/**
 * POST /api/ctrader/sync
 * Body: { connectionId?: string }   — omit to sync all cTrader connections.
 *
 * 1. Load connection(s) from Supabase
 * 2. Refresh access token if needed
 * 3. Fetch closed deals, open positions, balance from cTrader API
 * 4. Normalize and upsert into `trades` table
 * 5. Store open positions as JSON in `exchange_connections.open_positions`
 */
export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const connectionId: string | undefined = body.connectionId;

    let query = supabase
      .from("exchange_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("exchange", "ctrader")
      .eq("is_active", true);

    if (connectionId) query = query.eq("id", connectionId);

    const { data: connections, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;
    if (!connections?.length) {
      return NextResponse.json({ error: "No active cTrader connections" }, { status: 404 });
    }

    const results = [];

    for (const conn of connections) {
      try {
        let accessToken = conn.ctrader_access_token
          ? decrypt(conn.ctrader_access_token)
          : null;
        let refreshToken = conn.ctrader_refresh_token
          ? decrypt(conn.ctrader_refresh_token)
          : null;
        const ctid: string = conn.ctrader_ctid?.toString() ?? "";
        const isLive: boolean = conn.ctrader_is_live ?? true;

        if (!accessToken || !ctid) {
          results.push({ connectionId: conn.id, error: "Missing cTrader credentials" });
          continue;
        }

        // Refresh token proactively (access tokens expire in 1 hour)
        if (refreshToken && CLIENT_SECRET) {
          try {
            const refreshed = await refreshAccessToken(refreshToken, CLIENT_ID, CLIENT_SECRET);
            accessToken = refreshed.accessToken;
            refreshToken = refreshed.refreshToken;
            // Persist new tokens
            await supabase
              .from("exchange_connections")
              .update({
                ctrader_access_token: encrypt(accessToken),
                ctrader_refresh_token: encrypt(refreshToken),
              })
              .eq("id", conn.id);
          } catch {
            // If refresh fails, try with existing token anyway
          }
        }

        const lastSyncedAt = conn.last_synced_at
          ? new Date(conn.last_synced_at).getTime()
          : undefined;

        // Fetch from cTrader API
        const syncResult = await syncCtraderAccount(
          accessToken,
          ctid,
          CLIENT_ID,
          CLIENT_SECRET,
          isLive,
          lastSyncedAt
        );

        // Normalize closed deals
        const moneyDigits = 2; // default; ideally stored from initial sync
        const normalizedTrades = normalizeCtraderDeals(
          syncResult.deals,
          syncResult.symbolMap,
          moneyDigits
        );

        // Upsert trades
        if (normalizedTrades.length > 0) {
          const rows = normalizedTrades.map(t => ({
            user_id: user!.id,
            connection_id: conn.id,
            exchange: "ctrader",
            trade_id: t.tradeId,
            symbol: t.symbol,
            side: t.side,
            pnl: t.pnl,
            fee: t.fee,
            closed_at: t.closedAt.toISOString(),
          }));

          for (let i = 0; i < rows.length; i += 500) {
            await supabase
              .from("trades")
              .upsert(rows.slice(i, i + 500), {
                onConflict: "connection_id,trade_id",
                ignoreDuplicates: true,
              });
          }
        }

        // Store open positions + balance as JSON
        const openPositionsJson = syncResult.positions.map(p => ({
          positionId: p.positionId,
          symbolId: p.symbolId,
          symbol: syncResult.symbolMap.get(p.symbolId) ?? `SYM_${p.symbolId}`,
          side: p.tradeSide === "BUY" ? "long" : "short",
          volume: p.volume / 100,
          entryPrice: p.entryPrice,
          openTimestamp: p.openTimestamp,
        }));

        await supabase
          .from("exchange_connections")
          .update({
            last_synced_at: new Date().toISOString(),
            open_positions: openPositionsJson,
            balance: syncResult.balance,
            equity: syncResult.equity,
            currency: syncResult.currency,
          })
          .eq("id", conn.id);

        results.push({
          connectionId: conn.id,
          exchange: "ctrader",
          tradesUpserted: normalizedTrades.length,
          openPositions: openPositionsJson.length,
          balance: syncResult.balance,
          currency: syncResult.currency,
        });
      } catch (err: any) {
        results.push({ connectionId: conn.id, error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
