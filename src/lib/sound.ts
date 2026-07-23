import { useUIStore } from "@/store/useUIStore";

/**
 * All feedback sounds are synthesized at runtime with the Web Audio API — there
 * are no external audio files to fetch, license, or ship in the bundle. Each
 * sound is a short envelope of one or more oscillator tones.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
  const Ctor = window.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface Tone {
  freq: number;
  /** seconds from the start of the sound */
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

function playTones(tones: Tone[]) {
  const audioCtx = getCtx();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  for (const t of tones) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = t.type ?? "sine";
    osc.frequency.value = t.freq;

    const peak = t.gain ?? 0.16;
    const startAt = now + t.start;
    const endAt = startAt + t.duration;

    gainNode.gain.setValueAtTime(0, startAt);
    gainNode.gain.linearRampToValueAtTime(peak, startAt + Math.min(0.02, t.duration / 4));
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(startAt);
    osc.stop(endAt + 0.02);
  }
}

function isEnabled() {
  return useUIStore.getState().soundEnabled;
}

/** Light tap for general buttons / navigation. */
export function playTap() {
  if (!isEnabled()) return;
  playTones([{ freq: 720, start: 0, duration: 0.06, gain: 0.07, type: "sine" }]);
}

/** A single task marked done. */
export function playComplete() {
  if (!isEnabled()) return;
  playTones([
    { freq: 523.25, start: 0, duration: 0.11, gain: 0.13, type: "sine" }, // C5
    { freq: 783.99, start: 0.07, duration: 0.16, gain: 0.13, type: "sine" }, // G5
  ]);
}

/** Streak milestone reached / new milestone badge. */
export function playMilestone() {
  if (!isEnabled()) return;
  playTones([
    { freq: 523.25, start: 0, duration: 0.1, gain: 0.13, type: "triangle" }, // C5
    { freq: 659.25, start: 0.08, duration: 0.1, gain: 0.13, type: "triangle" }, // E5
    { freq: 783.99, start: 0.16, duration: 0.1, gain: 0.13, type: "triangle" }, // G5
    { freq: 1046.5, start: 0.24, duration: 0.22, gain: 0.14, type: "triangle" }, // C6
  ]);
}

/** Season rank-up / big XP milestone. */
export function playLevelUp() {
  if (!isEnabled()) return;
  playTones([
    { freq: 392.0, start: 0, duration: 0.09, gain: 0.12, type: "square" },
    { freq: 523.25, start: 0.09, duration: 0.09, gain: 0.12, type: "square" },
    { freq: 659.25, start: 0.18, duration: 0.09, gain: 0.12, type: "square" },
    { freq: 1046.5, start: 0.27, duration: 0.3, gain: 0.15, type: "sine" },
  ]);
}

/** Gentle, non-punishing tone for logging a relapse/reset — acknowledges, doesn't shame. */
export function playSoft() {
  if (!isEnabled()) return;
  playTones([
    { freq: 349.23, start: 0, duration: 0.22, gain: 0.09, type: "sine" },
    { freq: 293.66, start: 0.1, duration: 0.28, gain: 0.08, type: "sine" },
  ]);
}

/** Skip / dismiss action. */
export function playSkip() {
  if (!isEnabled()) return;
  playTones([{ freq: 300, start: 0, duration: 0.08, gain: 0.06, type: "sine" }]);
}
