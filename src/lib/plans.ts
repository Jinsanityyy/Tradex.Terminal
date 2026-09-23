/**
 * TradeX sells one plan, Pro. Accounts without it still get the free surfaces
 * listed in ENTITLEMENT_EXEMPT (src/middleware.ts): their own P&L journal,
 * the economic calendar, news, Cross-Asset, Trading Sessions and Macro Events.
 * Everything else, and auto-sync of exchanges and MT5, needs Pro.
 */
export const PLANS = {
  pro: {
    name: "Pro",
    monthlyPrice: 19.99,
    annualPrice: 199,

    planId: process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID ?? "",
    annualPlanId: process.env.NEXT_PUBLIC_PAYPAL_PRO_ANNUAL_PLAN_ID ?? "",
    description: "Full access to the TradeX terminal",
    features: [
      "Trading Floor: the 7-agent market read",
      "Market Direction engine",
      "Risk Gate",
      "Insights and Market Intelligence",
      "Cross-Asset matrix",
      "Trading Sessions intelligence",
      "Macro Events feed",
      "Trump Monitor",
      "Candle Analysis",
      "Market Read history and outcome tracking",
      "P&L Tracker and trading journal",
      "Live prices, charts, news and calendar",
      "Live TV market broadcast",
      "Push alerts",
    ],
    limits: [],
  },
} as const;
