/** Pure helpers for candle bars (no server imports, so they are unit-testable). */

export interface Bar { t: number; o: number; h: number; l: number; c: number; v?: number }

/** Largest futures-to-spot shift we accept, as a fraction of price. */
export const MAX_BASIS = 0.03;

/** Shift every price by -basis (futures minus spot), so the series lines up with spot. */
export function shiftBars(bars: Bar[], basis: number): Bar[] {
  return bars.map((b) => ({ ...b, o: b.o - basis, h: b.h - basis, l: b.l - basis, c: b.c - basis }));
}

/** futures last close minus spot reference; null when it is missing or implausible. */
export function basisOf(futuresLastClose: number | undefined, spotRef: number | null | undefined): number | null {
  if (!futuresLastClose || !spotRef || !(spotRef > 0)) return null;
  const basis = futuresLastClose - spotRef;
  return Math.abs(basis) / spotRef <= MAX_BASIS ? basis : null;
}
