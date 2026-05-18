/**
 * TradeX sound effects — mobile-first audio strategy.
 *
 * MP3 files  → HTMLAudioElement pool.  Elements are created + load()-ed on
 *               the first user gesture so Android WebView considers them
 *               "unlocked".  Subsequent play() calls work from any context.
 *
 * Synthesised → Singleton AudioContext.  resume() is called on first gesture
 *               so the context stays in "running" state for all later beeps.
 *
 * Never call new Audio() or new AudioContext() inside a play function — always
 * use the pre-created instances to avoid autoplay blocks on Android WebView.
 */

// ─── HTMLAudioElement pool ─────────────────────────────────────────────────────

const MP3S = {
  appTone:      "/sounds/app-open-tone.mp3",
  appVoice:     "/sounds/app-open-voice.mp3",
  orderVoice:   "/sounds/order-filled-voice.mp3",
  orderChime:   "/sounds/order-filled.mp3",
} as const;

type Mp3Key = keyof typeof MP3S;

const _pool: Partial<Record<Mp3Key, HTMLAudioElement>> = {};
let _poolReady = false;

function makeAudio(src: string): HTMLAudioElement {
  const a = new Audio(src);
  a.preload = "auto";
  a.volume = 0.9;
  a.load(); // unlocks the element on mobile
  return a;
}

/** Pre-create Audio elements. Must be called from a user gesture. */
function initPool(): void {
  if (_poolReady || typeof window === "undefined") return;
  _poolReady = true;
  (Object.keys(MP3S) as Mp3Key[]).forEach((k) => {
    try { _pool[k] = makeAudio(MP3S[k]); } catch {}
  });
}

function playMp3(key: Mp3Key): Promise<void> {
  return new Promise((resolve) => {
    const a = _pool[key];
    if (!a) { resolve(); return; }
    a.currentTime = 0;
    const done = () => { a.removeEventListener("ended", done); resolve(); };
    a.addEventListener("ended", done);
    a.play().catch(() => resolve());
  });
}

// ─── Singleton AudioContext (for synthesised beeps) ───────────────────────────

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch { return null; }
  }
  return _ctx;
}

function beep(
  freq: number,
  dur: number,
  vol = 0.15,
  type: OscillatorType = "sine",
  delay = 0
): void {
  const c = getCtx();
  if (!c) return;
  const go = () => {
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g);
      g.connect(c.destination);
      o.type = type;
      o.frequency.value = freq;
      const t = c.currentTime + delay;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(dur, 0.05));
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch {}
  };
  if (c.state === "suspended") {
    c.resume().then(go).catch(() => {});
  } else {
    go();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call once from the first user gesture (touchstart / click).
 * - Initialises the MP3 pool so elements are unlocked for future play()
 * - Resumes the AudioContext so beeps work
 */
export function unlockAudio(): void {
  initPool();
  const c = getCtx();
  if (c?.state === "suspended") c.resume().catch(() => {});
}

/**
 * No-op kept for backward compat (pool is now initialised in unlockAudio).
 * @deprecated
 */
export async function preloadSounds(): Promise<void> {}

// ── MP3 sounds ────────────────────────────────────────────────────────────────

/** Tone chime → voice greeting on app open / login. */
export function playAppOpen(): void {
  playMp3("appTone")
    .then(() => playMp3("appVoice"))
    .catch(() => {});
}

/** Voice confirmation when an order fills. */
export function playOrderFilled(): void {
  playMp3("orderVoice").catch(() => {});
}

// ── Synthesised beeps ─────────────────────────────────────────────────────────

/** Three urgent pulses — high-impact news / Trump post. */
export function playHighImpactAlert(): void {
  beep(880, 0.12, 0.20, "square", 0.00);
  beep(880, 0.12, 0.20, "square", 0.18);
  beep(880, 0.12, 0.20, "square", 0.36);
}

/** Ascending 3-note chime — ARMED execution signal. */
export function playSignalArmed(): void {
  beep(523, 0.15, 0.18, "sine", 0.00);
  beep(659, 0.15, 0.18, "sine", 0.12);
  beep(784, 0.30, 0.22, "sine", 0.24);
}

/** Short double-ping — incoming chat message. */
export function playChatPing(): void {
  beep(880, 0.22, 0.14, "sine", 0.00);
  beep(1108, 0.18, 0.10, "sine", 0.14);
}

/** Single ping — generic notification. */
export function playNotificationPing(): void {
  beep(880, 0.22, 0.14, "sine", 0.00);
  beep(1108, 0.18, 0.10, "sine", 0.14);
}
