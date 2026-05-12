/**
 * Plays a multi-tone alert using the Web Audio API.
 * No audio files required — tones are synthesized on-the-fly.
 *
 * Pattern: 3 ascending beeps (like a trading terminal armed alert).
 */
export function playEntryAlarm() {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();

    const tones = [
      { freq: 880, start: 0.0, duration: 0.12 },
      { freq: 1100, start: 0.18, duration: 0.12 },
      { freq: 1320, start: 0.36, duration: 0.22 },
    ];

    tones.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.value = freq;

      const t = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.01);
      gain.gain.linearRampToValueAtTime(0, t + duration);

      osc.start(t);
      osc.stop(t + duration + 0.05);
    });

    // Close context after last tone finishes
    setTimeout(() => ctx.close(), 900);
  } catch {
    // Silently ignore — audio is non-critical
  }
}
