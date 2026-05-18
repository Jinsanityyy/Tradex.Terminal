/**
 * TradeX sound effects — mobile-first audio strategy.
 *
 * Primary path for MP3s: AudioContext + decodeAudioData → BufferSourceNode.
 * Once the AudioContext is running (after first gesture), BufferSourceNode.start()
 * needs no user gesture at all — bypasses Android WebView's HTMLAudioElement
 * autoplay restrictions entirely.
 *
 * Fallback path: HTMLAudioElement pool (desktop / browsers where ctx unavailable).
 *
 * Synthesised beeps: oscillator nodes on the same AudioContext.
 */

// ─── MP3 paths ────────────────────────────────────────────────────────────────

const MP3S = {
  appTone:    "/sounds/app-open-tone.mp3",
  appVoice:   "/sounds/app-open-voice.mp3",
  orderVoice: "/sounds/order-filled-voice.mp3",
  orderChime: "/sounds/order-filled.mp3",
} as const;

type Mp3Key = keyof typeof MP3S;

// ─── Singleton AudioContext ───────────────────────────────────────────────────

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

// ─── AudioBuffer cache (decoded MP3s — primary path) ─────────────────────────

const _buffers: Partial<Record<Mp3Key, AudioBuffer>> = {};
// Store the Promise so callers can await the same in-flight load.
let _preloadPromise: Promise<void> | null = null;

function preloadBuffers(): Promise<void> {
  if (_preloadPromise) return _preloadPromise;
  _preloadPromise = (async () => {
    const c = getCtx();
    if (!c) return;
    await Promise.all(
      (Object.keys(MP3S) as Mp3Key[]).map(async (k) => {
        try {
          const res = await fetch(MP3S[k]);
          const ab  = await res.arrayBuffer();
          _buffers[k] = await c.decodeAudioData(ab);
        } catch {}
      })
    );
  })();
  return _preloadPromise;
}

function playBufferNode(key: Mp3Key): Promise<void> {
  return new Promise((resolve) => {
    const c   = getCtx();
    const buf = _buffers[key];
    if (!c || !buf) { resolve(); return; }
    try {
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = c.createGain();
      g.gain.value = 0.9;
      src.connect(g);
      g.connect(c.destination);
      src.onended = () => resolve();
      src.start(0);
    } catch { resolve(); }
  });
}

// ─── HTMLAudioElement pool (fallback) ─────────────────────────────────────────

const _pool: Partial<Record<Mp3Key, HTMLAudioElement>> = {};
let _poolReady = false;

function makeAudio(src: string): HTMLAudioElement {
  const a = new Audio(src);
  a.preload = "auto";
  a.volume  = 0.9;
  a.load();
  return a;
}

function initPool(): void {
  if (_poolReady || typeof window === "undefined") return;
  _poolReady = true;
  (Object.keys(MP3S) as Mp3Key[]).forEach((k) => {
    try { _pool[k] = makeAudio(MP3S[k]); } catch {}
  });
}

function playHtmlAudio(key: Mp3Key): Promise<void> {
  return new Promise((resolve) => {
    if (!_pool[key]) {
      try { _pool[key] = makeAudio(MP3S[key]); } catch { resolve(); return; }
    }
    const a = _pool[key]!;
    a.currentTime = 0;
    const done = () => { a.removeEventListener("ended", done); resolve(); };
    a.addEventListener("ended", done);
    a.play().catch(() => resolve());
  });
}

// Primary dispatcher: buffer → HTMLAudio fallback
function playMp3(key: Mp3Key): Promise<void> {
  if (_buffers[key]) return playBufferNode(key);
  return playHtmlAudio(key);
}

// ─── Oscillator beeps ─────────────────────────────────────────────────────────

function beep(
  freq: number,
  dur: number,
  vol   = 0.15,
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
      o.type            = type;
      o.frequency.value = freq;
      const t = c.currentTime + delay;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(dur, 0.05));
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch {}
  };
  c.state === "suspended" ? c.resume().then(go).catch(() => {}) : go();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call once from the first user gesture (touchstart / click).
 * Resumes the AudioContext and kicks off background buffer decoding
 * for all MP3s so they can be played later without any gesture requirement.
 */
export function unlockAudio(): void {
  initPool();
  const c = getCtx();
  if (c?.state === "suspended") {
    // Resume first so decodeAudioData runs on a running context,
    // then kick off the preload. The stored _preloadPromise means
    // playAppOpen() can safely await it even if called immediately after.
    c.resume().then(() => preloadBuffers()).catch(() => {});
  } else {
    preloadBuffers();
  }
}

/** @deprecated no-op kept for backward compat */
export async function preloadSounds(): Promise<void> {}

// ── MP3 sounds ────────────────────────────────────────────────────────────────

/** Ascending 4-note welcome chime — app open / login. */
export function playAppOpen(): void {
  beep(523, 0.18, 0.13, "sine", 0.00); // C5
  beep(659, 0.18, 0.13, "sine", 0.16); // E5
  beep(784, 0.18, 0.13, "sine", 0.32); // G5
  beep(1047, 0.35, 0.16, "sine", 0.48); // C6
}

/** Voice confirmation when an order fills — uses MP3 via AudioBuffer. */
export function playOrderFilled(): void {
  preloadBuffers()
    .then(() => playBufferNode("orderVoice"))
    .catch(() => {});
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
