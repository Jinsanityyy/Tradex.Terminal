import type { Catalyst, EconomicEvent } from "@/types";

export const AGENT_SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD"] as const;
export type AgentSymbol = (typeof AGENT_SYMBOLS)[number];

export interface SymbolMeta {
  label: string;
  short: string;
  group: string;
  agentSupported: boolean;
}

export const SYMBOL_META: Record<string, SymbolMeta> = {
  XAUUSD: { label: "Gold",    short: "XAU/USD", group: "Metals",       agentSupported: true  },
  EURUSD: { label: "Euro",    short: "EUR/USD", group: "Forex Majors", agentSupported: true  },
  GBPUSD: { label: "Pound",   short: "GBP/USD", group: "Forex Majors", agentSupported: true  },
  BTCUSD: { label: "Bitcoin", short: "BTC/USD", group: "Crypto",       agentSupported: true  },
  XAGUSD: { label: "Silver",  short: "XAG/USD", group: "Metals",       agentSupported: false },
  XPTUSD: { label: "Platinum",short: "XPT/USD", group: "Metals",       agentSupported: false },
  USDJPY: { label: "Yen",     short: "USD/JPY", group: "Forex Majors", agentSupported: false },
  USDCHF: { label: "Swissy",  short: "USD/CHF", group: "Forex Majors", agentSupported: false },
  USDCAD: { label: "Loonie",  short: "USD/CAD", group: "Forex Majors", agentSupported: false },
  AUDUSD: { label: "Aussie",  short: "AUD/USD", group: "Forex Majors", agentSupported: false },
  NZDUSD: { label: "Kiwi",    short: "NZD/USD", group: "Forex Majors", agentSupported: false },
  ETHUSD: { label: "Ethereum",short: "ETH/USD", group: "Crypto",       agentSupported: false },
  US500:  { label: "S&P 500", short: "US500",   group: "Indices",      agentSupported: false },
  US100:  { label: "NASDAQ",  short: "US100",   group: "Indices",      agentSupported: false },
  US30:   { label: "Dow",     short: "US30",    group: "Indices",      agentSupported: false },
  USOIL:  { label: "WTI Oil", short: "WTI",     group: "Commodities",  agentSupported: false },
};

export function getSymbolLabel(symbol: string): string {
  return SYMBOL_META[symbol]?.label ?? symbol;
}

export function getSymbolShort(symbol: string): string {
  return SYMBOL_META[symbol]?.short ?? symbol;
}

export function isAgentSupported(symbol: string): symbol is AgentSymbol {
  return AGENT_SYMBOLS.includes(symbol as AgentSymbol);
}

type ImpactBias = "bullish" | "bearish" | "neutral";
export type ImpactResult = { impact: ImpactBias; reasoning: string };

function invert(b: ImpactBias): ImpactBias {
  return b === "bullish" ? "bearish" : b === "bearish" ? "bullish" : "neutral";
}

type ImpactSource = {
  goldImpact?: ImpactBias;
  goldReasoning?: string;
  usdImpact?: ImpactBias;
  usdReasoning?: string;
  sentimentTag?: ImpactBias;
  marketImplication?: string;
  analysis?: { assets?: { name: string; ticker: string; bias: string; context: string }[] } | null;
};

function fromAIAssets(
  assets: { name: string; ticker: string; bias: string; context: string }[] | undefined,
  symbol: string
): ImpactResult | null {
  if (!assets) return null;
  const match = assets.find(
    (a) => a.ticker === symbol || a.ticker?.replace("/", "") === symbol
  );
  if (!match) return null;
  const b = match.bias?.toLowerCase();
  const impact: ImpactBias = b === "bullish" ? "bullish" : b === "bearish" ? "bearish" : "neutral";
  return { impact, reasoning: match.context ?? "" };
}

export function getImpactForSymbol(data: ImpactSource, symbol: string): ImpactResult {
  // 1. Try AI analysis assets first (most accurate)
  const fromAI = fromAIAssets(data.analysis?.assets, symbol);
  if (fromAI) return fromAI;

  // 2. Metals – safe-haven, track goldImpact
  if (["XAUUSD", "XAGUSD", "XPTUSD"].includes(symbol)) {
    return { impact: data.goldImpact ?? "neutral", reasoning: data.goldReasoning ?? "" };
  }

  // 3. USD-quoted pairs (EUR/GBP/AUD/NZD first) – inverse of USD
  if (["EURUSD", "GBPUSD", "AUDUSD", "NZDUSD"].includes(symbol)) {
    const usdBias = data.usdImpact ?? "neutral";
    const label = getSymbolLabel(symbol);
    const reasoning = data.usdReasoning
      ? `${label} inversely tracks USD: ${data.usdReasoning}`
      : "";
    return { impact: invert(usdBias), reasoning };
  }

  // 4. USD-base pairs (USD first) – same direction as USD
  if (["USDJPY", "USDCHF", "USDCAD"].includes(symbol)) {
    return { impact: data.usdImpact ?? "neutral", reasoning: data.usdReasoning ?? "" };
  }

  // 5. Crypto – follows risk sentiment; falls back to gold direction or inverse USD
  if (["BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD", "BNBUSD"].includes(symbol)) {
    const s = data.sentimentTag;
    if (s === "bearish")
      return { impact: "bearish", reasoning: "Risk-off environment typically pressures crypto as capital flows to safety." };
    if (s === "bullish")
      return { impact: "bullish", reasoning: "Risk-on sentiment supports crypto markets as appetite for speculative assets improves." };
    // No sentimentTag (e.g. economic events) — derive from gold direction first
    if (data.goldImpact && data.goldImpact !== "neutral") {
      const label = getSymbolLabel(symbol);
      return {
        impact: data.goldImpact,
        reasoning: data.goldReasoning
          ? `${label} tracks macro risk sentiment alongside gold: ${data.goldReasoning}`
          : `${label} expected to follow broad macro risk flows.`,
      };
    }
    // Last fallback: invert USD (strong dollar pressures crypto)
    if (data.usdImpact && data.usdImpact !== "neutral") {
      const impact = invert(data.usdImpact);
      const label = getSymbolLabel(symbol);
      return {
        impact,
        reasoning: data.usdReasoning
          ? `${label} inversely tracks USD strength: ${data.usdReasoning}`
          : `${label} tends to weaken when USD strengthens and vice versa.`,
      };
    }
    return { impact: "neutral", reasoning: "Mixed macro signal — crypto awaiting clearer directional catalyst." };
  }

  // 6. Equity indices – follows risk sentiment
  if (["US500", "US100", "US30", "GER40", "UK100", "JPN225", "AUS200", "HK50"].includes(symbol)) {
    const s = data.sentimentTag ?? "neutral";
    if (s === "bearish")
      return { impact: "bearish", reasoning: "Risk-off catalyst weighs on equity indices as investors reduce risk exposure." };
    if (s === "bullish")
      return { impact: "bullish", reasoning: "Positive catalyst supports equity market risk appetite and index appreciation." };
    return { impact: "neutral", reasoning: "Neutral backdrop — equity indices awaiting directional confirmation." };
  }

  // 7. Commodities
  if (["USOIL", "UKOIL", "NATGAS", "COPPER"].includes(symbol)) {
    return {
      impact: data.sentimentTag ?? "neutral",
      reasoning: data.marketImplication ?? `${getSymbolLabel(symbol)} reacting to macro catalyst via demand and growth channels.`,
    };
  }

  // 8. Fallback
  return {
    impact: data.sentimentTag ?? "neutral",
    reasoning: data.marketImplication ?? "",
  };
}

export function getEventImpactForSymbol(ev: EconomicEvent, symbol: string): ImpactResult {
  return getImpactForSymbol(
    {
      goldImpact: ev.goldImpact,
      goldReasoning: ev.goldReasoning,
      usdImpact: ev.usdImpact,
      usdReasoning: ev.usdReasoning,
      marketImplication: ev.tradeImplication,
    },
    symbol
  );
}

export function getCatalystImpactForSymbol(cat: Catalyst, symbol: string): ImpactResult {
  return getImpactForSymbol(
    {
      goldImpact: cat.goldImpact,
      goldReasoning: cat.goldReasoning,
      usdImpact: cat.usdImpact,
      usdReasoning: cat.usdReasoning,
      sentimentTag: cat.sentimentTag,
      marketImplication: cat.marketImplication,
      analysis: cat.analysis,
    },
    symbol
  );
}
