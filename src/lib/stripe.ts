import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
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
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
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
    ],
    limits: [],
  },
  elite: {
    name: "Elite",
    price: 99,
    priceId: process.env.STRIPE_ELITE_PRICE_ID,
    description: "Maximum edge for professional traders",
    features: [
      "Everything in Pro",
      "Priority data feeds",
      "Advanced AI analysis",
      "Asset Matrix",
      "Custom alerts",
      "Mobile APK access",
      "Priority support",
      "Early access to new features",
    ],
    limits: [],
  },
} as const;
