/** Sweet, encouraging words — time-aware greeting + daily-rotating note. */

export function getTimeGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 22) return "Good evening";
  return "Good night";
}

const SWEET_NOTES = [
  "You are doing great.",
  "Proud of you for showing up.",
  "One small step still counts.",
  "Keep going — gently.",
  "You matter, and so does today.",
  "Breathe. Begin again.",
  "Small wins build big change.",
  "You are stronger than yesterday.",
  "Be kind to yourself today.",
  "Progress, not perfection.",
  "Your future self says thank you.",
  "One day at a time — you've got this.",
  "Showing up is already winning.",
  "You are loved, keep shining.",
  "Take it slow, take it steady.",
  "Today is a fresh page.",
  "You are growing, even now.",
  "Rest is productive too.",
];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Deterministic per day so the message is stable within a day, fresh tomorrow. */
export function pickSweetNote(seed: string = new Date().toISOString().slice(0, 10)): string {
  return SWEET_NOTES[hashSeed(seed) % SWEET_NOTES.length];
}

export function getSweetGreeting(
  now: Date = new Date(),
  seed: string = now.toISOString().slice(0, 10)
): { greeting: string; note: string } {
  return { greeting: getTimeGreeting(now), note: pickSweetNote(seed) };
}
