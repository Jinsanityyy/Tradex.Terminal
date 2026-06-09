/**
 * Counter-trend detection (UI-only helper)
 *
 * A signal is "counter-trend" when its trade direction opposes the Trend
 * agent's bias — e.g. a LONG taken while the daily trend reads bearish, or a
 * SHORT while it reads bullish. These are intentionally allowed by the engine
 * during kill zones (sweep reversals) but are lower win-rate, so the UI flags
 * them. Neutral/unknown bias is never counter-trend.
 *
 * Purely presentational: derived from data the signal already carries
 * (tradePlan.direction + agents.trend.bias). No agent/schema/DB involvement.
 */

export function isCounterTrend(
  direction: string | null | undefined,
  bias: string | null | undefined,
): boolean {
  if (direction !== "long" && direction !== "short") return false;
  if (bias !== "bullish" && bias !== "bearish") return false;
  return (
    (direction === "long" && bias === "bearish") ||
    (direction === "short" && bias === "bullish")
  );
}

/** Dynamic warning text built from the actual direction + bias. */
export function counterTrendNote(
  direction: "long" | "short",
  bias: "bullish" | "bearish",
): string {
  const dir = direction === "long" ? "Long" : "Short";
  return `${dir} signal against ${bias} daily bias — reversal setup. Manage risk.`;
}
