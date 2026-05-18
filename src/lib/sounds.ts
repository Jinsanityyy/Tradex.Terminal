/**
 * TradeX sound effects.
 *
 * MP3 sounds (App Open, Order Filled):
 *   - On Android (Capacitor): @capacitor-community/native-audio → Android MediaPlayer
 *     Completely bypasses WebView autoplay restrictions.
 *   - On desktop/browser: oscillator beep fallback.
 *
 * Synthesised beeps (High Impact, Signal Armed, Chat Ping, etc.):
 *   - Always use AudioContext oscillators — works everywhere.
 */

// ─── Native Audio (Capacitor Android) ────────────────────────────────────────

let _nativeReady = false;
let _nativeInitPromise: Promise<void> | null = null;

async function isCapacitorNative(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch { return false; }
}

async function initNativeAudio(): Promise<void> {
  if (_nativeReady) return;
  if (_nativeInitPromise) return _nativeInitPromise;

  _nativeInitPromise = (async () => {
    const native = await isCapacitorNative();
    if (!native) return;
    try {
      const { NativeAudio } = await import("@capacitor-community/native-audio");
      await Promise.all([
        NativeAudio.preload({ assetId: "appTone",      assetPath: "sounds/app-open-tone.mp3",       audioChannelNum: 1, isUrl: false }),
        NativeAudio.preload({ assetId: "appVoice",     assetPath: "sounds/app-open-voice.mp3",      audioChannelNum: 1, isUrl: false }),
        NativeAudio.preload({ assetId: "orderFilled",  assetPath: "sounds/order-filled-voice.mp3",  audioChannelNum: 1, isUrl: false }),
      ]);
      _nativeReady = true;
    } catch {}
  })();

  return _nativeInitPromise;
}

async function playNative(assetId: string): Promise<void> {
  try {
    const { NativeAudio } = await import("@capacitor-community/native-audio");
    await NativeAudio.play({ assetId });
  } catch {}
}

// ─── Singleton AudioContext (for beeps + desktop fallback) ───────────────────

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
 * Call on first user gesture. Kicks off native audio preload + resumes
 * AudioContext so beeps work immediately.
 */
export function unlockAudio(): void {
  initNativeAudio();
  const c = getCtx();
  if (c?.state === "suspended") c.resume().catch(() => {});
}

/** @deprecated no-op kept for backward compat */
export async function preloadSounds(): Promise<void> {}

// ── MP3 sounds (native on Android, beep fallback on desktop) ─────────────────

/** Two-tone chime → ElevenLabs voice greeting on app open / login. */
export function playAppOpen(): void {
  initNativeAudio().then(async () => {
    if (_nativeReady) {
      await playNative("appTone");
      await playNative("appVoice");
    } else {
      // Desktop fallback — ascending chime
      beep(523,  0.18, 0.13, "sine", 0.00);
      beep(659,  0.18, 0.13, "sine", 0.16);
      beep(784,  0.18, 0.13, "sine", 0.32);
      beep(1047, 0.35, 0.16, "sine", 0.48);
    }
  }).catch(() => {});
}

/** ElevenLabs voice confirmation when an order fills. */
export function playOrderFilled(): void {
  initNativeAudio().then(async () => {
    if (_nativeReady) {
      await playNative("orderFilled");
    } else {
      // Desktop fallback — rising two-tone
      beep(659, 0.14, 0.18, "triangle", 0.00);
      beep(988, 0.28, 0.20, "triangle", 0.12);
    }
  }).catch(() => {});
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
  beep(880,  0.22, 0.14, "sine", 0.00);
  beep(1108, 0.18, 0.10, "sine", 0.14);
}

/** Single ping — generic notification. */
export function playNotificationPing(): void {
  beep(880,  0.22, 0.14, "sine", 0.00);
  beep(1108, 0.18, 0.10, "sine", 0.14);
}
