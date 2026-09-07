import type { JournalEntry } from "@/types";

/** Consecutive days with a journal entry, ending today or yesterday (today
 *  still open doesn't break the streak). Shared by Examen + Journal. */
export function examenStreak(journal: Record<number, JournalEntry>, todayDay: number): number {
  let streak = 0;
  let d = journal[todayDay] ? todayDay : todayDay - 1;
  while (d >= 1 && journal[d]) {
    streak++;
    d--;
  }
  return streak;
}
