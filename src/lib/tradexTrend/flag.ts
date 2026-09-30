/**
 * Feature flag. Set NEXT_PUBLIC_TRADEX_TREND=1 (Vercel env / .env.local) to enable
 * the experimental TradeX Trend widget. Off by default.
 */
export const TRADEX_TREND_ENABLED = process.env.NEXT_PUBLIC_TRADEX_TREND === "1";
