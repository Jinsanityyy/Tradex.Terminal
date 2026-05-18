let _ctx: AudioContext | null = null;

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

export function unlockAudio(): void {
  const c = getCtx();
  if (c?.state === "suspended") c.resume().catch(() => {});
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

export function playNotificationPing(): void {
  beep(880, 0.22, 0.14);
  beep(1108, 0.18, 0.10, "sine", 0.14);
}

export function playOrderFilled(): void {
  // Ascending 3-note chime — C5, E5, G5
  beep(523, 0.14, 0.20, "sine", 0.0);
  beep(659, 0.14, 0.18, "sine", 0.12);
  beep(784, 0.28, 0.15, "sine", 0.24);
}

export function playAppOpen(): void {
  // Soft ascending sweep on first interaction
  beep(440, 0.11, 0.12, "sine", 0.0);
  beep(554, 0.13, 0.10, "sine", 0.10);
  beep(659, 0.18, 0.08, "sine", 0.20);
}

export function playChatPing(): void {
  beep(880, 0.28, 0.12);
}
