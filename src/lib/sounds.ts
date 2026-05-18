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
 * App open / login — two-tone ascending chime, then ElevenLabs voice greeting.
 * Files play sequentially: tone ends → voice starts immediately.
 */
export function playAppOpen(): void {
  try {
    const tone = new Audio("/sounds/app-open-tone.mp3");
    const voice = new Audio("/sounds/app-open-voice.mp3");
    tone.volume = 0.9;
    voice.volume = 0.9;
    tone.onended = () => { voice.play().catch(() => {}); };
    tone.play().catch(() => {});
  } catch {}
}


export function playOrderFilled(): void {
  try {
    const audio = new Audio("/sounds/order-filled.mp3");
    audio.volume = 0.8;
    audio.play().catch(() => {});
  } catch {}
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
