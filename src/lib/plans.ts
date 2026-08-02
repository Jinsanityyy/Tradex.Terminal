/**
 * TradeX is a single paid product. There is no free tier — an account with no
 * active plan can reach sign-in, pricing and settings, and nothing else.
 *
 * The `free` entry that used to live here described a tier that no longer
 * exists and contradicted the pricing page, so it has been removed rather than
 * left as a second, wrong source of truth.
 */
export const PLANS = {
  pro: {
    name: "Pro",
    monthlyPrice: 39,
    annualPrice: 399,
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
      "Telegram and push alerts",
    ],
    limits: [],
  },
} as const;
