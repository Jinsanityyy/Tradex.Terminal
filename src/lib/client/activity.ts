/**
 * Is anyone actually looking at the app?
 *
 * Background polling is what costs server CPU, and a dashboard left open on a
 * monitor kept polling ~700 times an hour with nobody watching. Pollers check
 * isUserActive() before fetching and resume through onUserReturn(), so data
 * stops refreshing when the tab is hidden or the user has been idle for
 * IDLE_MS, and catches up the moment they come back. Embedded widgets that do
 * not hit our API (TradingView chart, live TV, globe animation) are unaffected.
 */

const IDLE_MS = 15 * 60_000;
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

/** Away for less than this (a quick tab switch) is not worth a full catch-up refresh. */
const CATCH_UP_AFTER_MS = 60_000;

let lastActive = Date.now();
let idle = false;
let awaySince = 0;
let started = false;
const returnListeners = new Set<() => void>();

function goIdle() {
  if (!idle) { idle = true; awaySince = Date.now(); }
}

function markActive() {
  const now = Date.now();
  // pointermove fires constantly; one update a second is plenty.
  if (!idle && now - lastActive < 1000) return;
  const inactiveFor = now - lastActive;
  lastActive = now;
  if (idle) {
    idle = false;
    // Hidden for a moment (tab switch) → polling simply resumes; idle or away
    // long enough for data to go stale → refresh everything at once.
    if (now - awaySince < CATCH_UP_AFTER_MS && inactiveFor < IDLE_MS) return;
    returnListeners.forEach((cb) => {
      try { cb(); } catch { /* a listener failing must not block the others */ }
    });
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  for (const ev of ACTIVITY_EVENTS) {
    window.addEventListener(ev, markActive, { passive: true, capture: true });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") markActive();
    else goIdle();
  });
}

/** True while the tab is visible and the user has interacted in the last 15 minutes. */
export function isUserActive(): boolean {
  if (typeof window === "undefined") return true;
  start();
  if (document.visibilityState !== "visible" || Date.now() - lastActive > IDLE_MS) {
    goIdle();
    return false;
  }
  return true;
}

/** Called once each time the user comes back after being idle or away. Returns an unsubscribe. */
export function onUserReturn(cb: () => void): () => void {
  start();
  returnListeners.add(cb);
  return () => { returnListeners.delete(cb); };
}
