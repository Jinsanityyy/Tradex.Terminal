/**
 * TradeX sound effects — singleton AudioContext, works on Android WebView.
 *
 * Mobile autoplay policy: AudioContext starts in "suspended" state until the
 * user interacts. Every play function calls resume() before scheduling audio.
 * MP3 files are loaded via fetch + decodeAudioData (bypasses <audio> autoplay
 * restrictions on Capacitor/WebView). Buffers are cached after first fetch.
 */

// ─── Singleton context ────────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;
const _buffers = new Map<string, AudioBuffer | null>();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return _ctx;
}

/** Call on first user gesture to lift the suspended-context restriction. */
export function unlockAudio(): void {
  const c = getCtx();
  if (c?.state === "suspended") c.resume().catch(() => {});
}

// ─── MP3 playback via Web Audio API (works on mobile) ────────────────────────

async function fetchBuffer(url: string): Promise<AudioBuffer | null> {
  const c = getCtx();
  if (!c) return null;
  const cached = _buffers.get(url);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    const buf = await c.decodeAudioData(ab);
    _buffers.set(url, buf);
    return buf;
  } catch {
    _buffers.set(url, null);
    return null;
  }
}

async function playBuffer(url: string): Promise<void> {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") await c.resume();
  const buf = await fetchBuffer(url);
  if (!buf) return;
  return new Promise((resolve) => {
    const src = c.createBufferSource();
    src.buffer = buf;
    const gain = c.createGain();
    gain.gain.value = 0.9;
    src.connect(gain);
    gain.connect(c.destination);
    src.onended = () => resolve();
    src.start(0);
  });
}

/**
 * Pre-fetch and decode MP3 files so the first play is instant.
 * Call this from AudioUnlocker after the user's first gesture.
 */
export async function preloadSounds(): Promise<void> {
  await Promise.allSettled([
    fetchBuffer("/sounds/app-open-tone.mp3"),
    fetchBuffer("/sounds/app-open-voice.mp3"),
    fetchBuffer("/sounds/order-filled-voice.mp3"),
    fetchBuffer("/sounds/order-filled.mp3"),
  ]);
}

// ─── Synthesised beep (no files needed) ──────────────────────────────────────

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

// ─── Public sound functions ───────────────────────────────────────────────────

/** Tone + voice greeting on app launch / login. */
export function playAppOpen(): void {
  playBuffer("/sounds/app-open-tone.mp3")
    .then(() => playBuffer("/sounds/app-open-voice.mp3"))
    .catch(() => {});
}

/** Voice + chime when an order is filled. */
export function playOrderFilled(): void {
  playBuffer("/sounds/order-filled-voice.mp3").catch(() => {
    // Fallback: synthesised chime if file missing
    beep(523, 0.14, 0.20, "sine", 0.0);
    beep(659, 0.14, 0.18, "sine", 0.12);
    beep(784, 0.28, 0.15, "sine", 0.24);
  });
}

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
