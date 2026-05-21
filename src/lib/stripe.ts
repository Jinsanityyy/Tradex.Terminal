
export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    annualPriceId: null,
    description: "Get started with basic market data",
    features: [
      "5 tracked assets",
      "Delayed prices (15 min)",
      "Basic economic calendar",
      "Limited news feed",
    ],
    limits: ["No AI Briefing", "No Trump Monitor", "No Session Intelligence"],
  },
  pro: {
    name: "Pro",
    monthlyPrice: 39,
    annualPrice: 399,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    annualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
    description: "Full terminal for serious traders",
    features: [
      "All assets (Gold, Forex, Crypto, Indices)",
      "Real-time live prices",
      "Full economic calendar + analysis",
      "AI Market Briefing",
      "Trump Monitor",
      "Session Intelligence",
      "Catalysts feed",
      "Market Bias engine",
      "Asset Matrix",
      "Mobile app access",
      "Priority support",
    ],
    limits: [],
  },
} as const;
