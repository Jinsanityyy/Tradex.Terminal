/**
 * TradeX sound effects.
 *
 * MP3 sounds (App Open, Order Filled):
 *   Base64-encoded audio data bundled directly in the JS — no fetch() needed.
 *   Decoded via AudioContext.decodeAudioData() + played via BufferSourceNode.
 *   Same Web Audio API path that oscillator beeps use, so no WebView autoplay block.
 *
 * Synthesised beeps (High Impact, Signal Armed, etc.):
 *   AudioContext oscillators — generated in real-time, no files at all.
 */

import { SOUND_DATA } from "./sound-data";

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

// ─── AudioBuffer cache (decoded from base64) ─────────────────────────────────

type SoundKey = keyof typeof SOUND_DATA;
const _buffers: Partial<Record<SoundKey, AudioBuffer>> = {};
let _decodePromise: Promise<void> | null = null;

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function decodeAll(): Promise<void> {
  if (_decodePromise) return _decodePromise;
  _decodePromise = (async () => {
    const c = getCtx();
    if (!c) return;
    await Promise.all(
      (Object.keys(SOUND_DATA) as SoundKey[]).map(async (k) => {
        try {
          const ab = base64ToArrayBuffer(SOUND_DATA[k]);
          _buffers[k] = await c.decodeAudioData(ab);
        } catch {}
      })
    );
  })();
  return _decodePromise;
}

function playBuffer(key: SoundKey): Promise<void> {
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
 * Call on first user gesture.
 * Resumes AudioContext + starts decoding the base64 audio data in background.
 */
export function unlockAudio(): void {
  const c = getCtx();
  if (c?.state === "suspended") {
    c.resume().then(() => decodeAll()).catch(() => {});
  } else {
    decodeAll();
  }
}

/** @deprecated no-op kept for backward compat */
export async function preloadSounds(): Promise<void> {}

// ── MP3 sounds ────────────────────────────────────────────────────────────────

/** Two-tone chime → ElevenLabs voice greeting on app open / login. */
export function playAppOpen(): void {
  decodeAll()
    .then(() => playBuffer("appTone"))
    .then(() => playBuffer("appVoice"))
    .catch(() => {});
}

/** ElevenLabs voice confirmation when an order fills. */
export function playOrderFilled(): void {
  decodeAll()
    .then(() => playBuffer("orderFilled"))
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
  beep(880,  0.22, 0.14, "sine", 0.00);
  beep(1108, 0.18, 0.10, "sine", 0.14);
}

/** Single ping — generic notification. */
export function playNotificationPing(): void {
  beep(880,  0.22, 0.14, "sine", 0.00);
  beep(1108, 0.18, 0.10, "sine", 0.14);
}
