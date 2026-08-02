/**
 * Presentation-layer labels for agent output.
 *
 * The agent engine still computes SignalState ("ARMED" | "PENDING" | ...) and
 * finalBias ("bullish" | "bearish" | "no-trade") exactly as before — these
 * helpers only decide how those values are *worded* for the user, reframing a
 * directive signal as a descriptive market read.
 *
 * Nothing here feeds back into the calculation layer.
 */

import type { SignalState } from "@/lib/agents/schemas";

/** Price's relationship to the level the agents flagged — descriptive, not a CTA. */
export const SIGNAL_STATE_LABEL: Record<SignalState, string> = {
  ARMED: "At Level",
  PENDING: "Approaching",
  EXPIRED: "Level Passed",
  NO_TRADE: "No Read",
  WAIT: "Forming",
};

/** Short hint that explains the state without telling the user what to do. */
export const SIGNAL_STATE_HINT: Record<SignalState, string> = {
  ARMED: "Price is at the flagged level",
  PENDING: "Price is approaching the flagged level",
  EXPIRED: "Price moved past the flagged level",
  NO_TRADE: "No directional read",
  WAIT: "Conditions still forming",
};

export function signalStateLabel(state?: string | null): string {
  if (!state) return SIGNAL_STATE_LABEL.NO_TRADE;
  return SIGNAL_STATE_LABEL[state as SignalState] ?? SIGNAL_STATE_LABEL.NO_TRADE;
}

export function signalStateHint(state?: string | null): string {
  if (!state) return SIGNAL_STATE_HINT.NO_TRADE;
  return SIGNAL_STATE_HINT[state as SignalState] ?? SIGNAL_STATE_HINT.NO_TRADE;
}

/** Headline market read, e.g. "Market Read: Bullish". */
export function marketReadLabel(finalBias?: string | null): string {
  switch (finalBias) {
    case "bullish":
      return "Market Read: Bullish";
    case "bearish":
      return "Market Read: Bearish";
    default:
      return "Market Read: No Clear Bias";
  }
}

/** Just the descriptive word, for tight badges. */
export function marketReadWord(finalBias?: string | null): string {
  switch (finalBias) {
    case "bullish":
      return "Bullish";
    case "bearish":
      return "Bearish";
    default:
      return "No Clear Bias";
  }
}

/** Sentiment snapshot phrasing, e.g. "Agent Agreement: 5/7 bullish". */
export function agentAgreementLabel(
  aligned: number,
  total: number,
  finalBias?: string | null
): string {
  const word =
    finalBias === "bullish" ? "bullish" : finalBias === "bearish" ? "bearish" : "aligned";
  return `Agent Agreement: ${aligned}/${total} ${word}`;
}
