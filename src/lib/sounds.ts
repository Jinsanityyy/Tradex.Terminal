/**
 * TradeX sound effects  -  Web Audio API, no external files.
 * All tones are generated programmatically so there's nothing to load.
 * Silently no-ops if autoplay is blocked or the API is unavailable.
 */

function ctx(): AudioContext | null {
  try {
    return new AudioContext();
  } catch {
    return null;
  }
}

function note(
  ac: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  gain: number,
  type: OscillatorType = "sine"
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.connect(g);
  g.connect(ac.destination);
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, startAt);
  g.gain.linearRampToValueAtTime(gain, startAt + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

/**
 * Order filled — rising two-note chime (E5 → B5).
 * Plays when a trade is confirmed via Take Trade.
 */
export function playOrderFilled(): void {
  const ac = ctx();
  if (!ac) return;
  const t = ac.currentTime;
  note(ac, 659,  t,        0.35, 0.25); // E5
  note(ac, 987,  t + 0.18, 0.50, 0.22); // B5
  note(ac, 1319, t + 0.34, 0.60, 0.18); // E6 (soft tail)
  setTimeout(() => ac.close(), 1500);
}

/**
 * High-impact alert — three quick pulses at an urgent pitch.
 * Plays when a high-importance catalyst or Trump post fires.
 */
export function playHighImpactAlert(): void {
  const ac = ctx();
  if (!ac) return;
  const t = ac.currentTime;
  const pulseFreq = 880; // A5
  for (let i = 0; i < 3; i++) {
    note(ac, pulseFreq, t + i * 0.18, 0.12, 0.20, "square");
  }
  setTimeout(() => ac.close(), 1000);
}

/**
 * Signal armed — single ascending sweep.
 * Plays when an ARMED execution signal fires.
 */
export function playSignalArmed(): void {
  const ac = ctx();
  if (!ac) return;
  const t = ac.currentTime;
  note(ac, 523, t,        0.15, 0.18); // C5
  note(ac, 659, t + 0.12, 0.15, 0.18); // E5
  note(ac, 784, t + 0.24, 0.30, 0.22); // G5
  setTimeout(() => ac.close(), 1000);
}
