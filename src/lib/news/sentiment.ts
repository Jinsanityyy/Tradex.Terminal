/**
 * Headline classification shared by the news, catalysts and session feeds.
 *
 * This lived as five near-identical copies across the API routes, each with its
 * own hand-maintained word list, and each carrying the same two defects:
 *
 *  1. Bare substring matching. "stronger dollar" scored as the bullish token
 *     "strong", while "loses" was missing from some bearish lists entirely, so
 *     "Gold loses shine as rate hike bets foster a stronger dollar" came out
 *     BULLISH for gold  -  the exact opposite of the headline.
 *
 *  2. Treating risk sentiment as a proxy for policy stance. "Is this good news"
 *     and "which way is policy moving" are different questions, and for gold
 *     they frequently point opposite ways. A hawkish Fed is bearish gold no
 *     matter how the market feels about it.
 *
 * Direction words are matched on word boundaries, stance is read straight from
 * the text, and a headline that states gold's own direction outranks both.
 */

export type Bias = "bullish" | "bearish" | "neutral";

// "strong" is deliberately absent  -  "stronger dollar" is bearish for gold.
const BULL_RE = /\b(surges?|surged|rall(?:y|ies|ied)|gains?|gained|rises?|rose|jumps?|jumped|boosts?|soars?|soared|climbs?|advances?|beats?|record highs?|upgrades?|recovers?|recovery|positive|deal|agreement|peace)\b/;
const BEAR_RE = /\b(drops?|dropped|falls?|fell|declines?|crashe?s?|crashed|plunges?|threatens?|threats?|wars?|sanctions?|fears?|weakens?|weaker|misses?|missed|slumps?|concerns?|warnings?|downgrades?|bans?|blocks?|loses?|lost|losses|slides?|sinks?|tumbles?|retreats?|selloffs?|pressured?|negative)\b/;

const HAWKISH_RE = /\b(rate hikes?|hike bets?|higher[- ]for[- ]longer|hawkish|tighten(?:ing|s|ed)?|stronger dollar|dollar strength|firmer dollar|dollar rally|yields? (?:rise|rises|rising|surge|jump|climb|higher))\b/;
const DOVISH_RE  = /\b(rate cuts?|cut bets?|dovish|pivots?|eas(?:e|es|ing)|weaker dollar|dollar weakness|softer dollar|yields? (?:fall|falls|falling|drop|dip|decline|lower))\b/;

// A negated cut is hawkish, but it still contains "rate cuts", so it trips the
// dovish pattern too and the two cancel out. These have to win outright.
const HAWKISH_OVERRIDE_RE = /\b(?:no (?:rate )?cuts?|fewer cuts?|rules? out (?:a )?(?:rate )?cuts?|no urgency to cut|delay(?:ed|s)? (?:rate )?cuts?|pushe?s? back (?:on )?(?:rate )?cuts?|cuts? off the table)\b/;

const GOLD_DOWN_RE = /\bgold\b[^.!?]{0,60}?\b(?:loses? shine|loses?|lost|falls?|fell|drops?|slips?|sinks?|slides?|retreats?|tumbles?|weakens?|pressured?|lower)\b|\b(?:weighs? on|pressures?|drags? on|dents?) gold\b/;
const GOLD_UP_RE   = /\bgold\b[^.!?]{0,60}?\b(?:rises?|rose|gains?|climbs?|jumps?|surges?|rall(?:y|ies)|soars?|advances?|shines?|higher|supported)\b|\b(?:supports?|boosts?|lifts?|underpins?) gold\b/;

/** Policy stance read straight from the text, or null when the headline is silent. */
export function derivePolicyStance(headline: string): "hawkish" | "dovish" | null {
  const h = headline.toLowerCase();
  if (HAWKISH_OVERRIDE_RE.test(h)) return "hawkish";
  const hawk = HAWKISH_RE.test(h);
  const dove = DOVISH_RE.test(h);
  if (hawk === dove) return null;   // both or neither  -  no clean read
  return hawk ? "hawkish" : "dovish";
}

/** Gold's direction when the headline states it outright, else null. */
export function deriveGoldDirection(headline: string): Bias | null {
  const h = headline.toLowerCase();
  const down = GOLD_DOWN_RE.test(h);
  const up   = GOLD_UP_RE.test(h);
  if (down === up) return null;
  return down ? "bearish" : "bullish";
}

/** Broad risk sentiment  -  drives crypto and equities, NOT gold or USD. */
export function deriveSentiment(headline: string): Bias {
  const h = headline.toLowerCase();
  const b = BULL_RE.test(h) ? 1 : 0;
  const s = BEAR_RE.test(h) ? 1 : 0;
  return b > s ? "bullish" : s > b ? "bearish" : "neutral";
}

/**
 * The stance to price a monetary-policy headline off, in priority order:
 * what it says about gold, then its policy wording, then risk sentiment as a
 * last resort.
 */
export function resolveStance(headline: string, sentiment: Bias): "hawkish" | "dovish" {
  const stated = deriveGoldDirection(headline);
  if (stated === "bearish") return "hawkish";
  if (stated === "bullish") return "dovish";
  return derivePolicyStance(headline) ?? (sentiment === "bearish" ? "hawkish" : "dovish");
}
