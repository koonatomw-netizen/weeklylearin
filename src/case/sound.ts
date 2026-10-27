import type { Rarity } from "../shared/situations";

const MUTE_KEY = "4seas:case-muted";
const CHIME_NOTES: Record<Rarity, number[]> = {
  common: [523, 659],
  rare: [587, 740],
  epic: [659, 880],
  legendary: [784, 1047, 1319],
};

let context: AudioContext | null = null;

export function isMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export function setMuted(value: boolean): void {
  try { localStorage.setItem(MUTE_KEY, value ? "1" : "0"); } catch { /* storage unavailable: mute lasts until reload */ }
}

function audio(): AudioContext | null {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    return context.state === "closed" ? null : context;
  } catch { return null; }
}

function blip(frequency: number, startsIn: number, duration: number, type: OscillatorType, gain: number): void {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + startsIn;
  const oscillator = ctx.createOscillator();
  const volume = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  volume.gain.setValueAtTime(gain, start);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(volume).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/** Short click as a tile crosses the line. A no-op when muted or when the browser blocks audio. */
export function playTick(): void {
  if (isMuted()) return;
  blip(900, 0, 0.03, "square", 0.05);
}

/** Rising chime when the reel lands; legendary gets three notes. */
export function playChime(rarity: Rarity): void {
  if (isMuted()) return;
  CHIME_NOTES[rarity].forEach((frequency, index) => blip(frequency, index * 0.12, 0.35, "triangle", 0.12));
}
