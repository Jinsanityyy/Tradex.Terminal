/**
 * TradeX Signal History — Type Definitions
 *
 * Tracks every MASTER decision and its outcome for transparency and track-record.
 */

import type { Symbol, Timeframe, FinalBias } from "@/lib/agents/schemas";

export type SignalStatus =
  | "open"            // still tracking for outcome
  | "win_tp1"         // hit first take-profit
  | "win_tp2"         // hit second take-profit
  | "loss_sl"         // hit stop-loss
  | "invalidated"     // setup became invalid before entry triggered (bias flip or pullback missed)
  | "expired"         // open > 24h, never resolved
  | "informational";  // no-trade signal, closed after 4h

export interface SignalTradePlan {
  direction: "long" | "short";
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number | null;
  rrRatio: number;
}

export interface SignalOutcome {
  resolvedAt: string;              // ISO timestamp
  priceAtResolution: number;
  pnlPercent: number;              // e.g., +2.4 or -1.0
  pnlR: number;                    // e.g., +2.4 or -1.0 (in R multiples)
}

export interface SignalRecord {
  id: string;                      // unique: `${timestamp}_${symbol}_${timeframe}`
  timestamp: string;                // ISO when signal was generated
  symbol: Symbol;
  symbolDisplay: string;
  timeframe: Timeframe;

  // Master decision
  finalBias: FinalBias;
  confidence: number;
  consensusScore: number;
  strategyMatch: string | null;
  noTradeReason: string | null;

  // Price context
  priceAtSignal: number;

  // Trade plan (null if no-trade)
  tradePlan: SignalTradePlan | null;

  // Outcome tracking
  status: SignalStatus;
  outcome: SignalOutcome | null;

  // Reasoning for transparency
  supports: string[];
  invalidations: string[];

  // Notification flags
  entryZoneNotified?: boolean;

  // Per-agent snapshot (compact)
  agents: {
    trend:       { bias: string; confidence: number };
    smc:         { bias: string; confidence: number; setupType: string };
    news:        { impact: string; confidence: number; regime: string };
    risk:        { valid: boolean; grade: string };
    execution:   { hasSetup: boolean; direction: string };
    contrarian:  { challengesBias: boolean; riskFactor: number };
  };
}

export interface SignalStats {
  symbol: Symbol | "ALL";
  period: "24h" | "7d" | "30d" | "all";

  totalSignals: number;
  directionalSignals: number;      // excludes no-trade
  armedSignals: number;             // had trade plan

  // Resolved directional only
  wins: number;                     // win_tp1 + win_tp2
  losses: number;                   // loss_sl
  breakeven: number;                // expired near entry (±0.3R)
  stillOpen: number;

  hitRate: number;                  // wins / (wins + losses), 0–100
  avgRR: number;                    // avg RR of armed signals
  totalPnlR: number;                // cumulative R gained (wins count +R, losses -1R)

  bySymbol?: Record<string, {
    total: number;
    wins: number;
    losses: number;
    hitRate: number;
  }>;
}
