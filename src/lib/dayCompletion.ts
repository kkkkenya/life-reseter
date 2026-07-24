import type { DayRecord, UserProfile } from "@/types";

export interface DayCompletionInfo {
  total: number;
  done: number;
  pending: number;
  skipped: number;
  /** True once nothing is left pending and at least one task was actually done. */
  complete: boolean;
}

export function dayCompletionInfo(rec: DayRecord | undefined): DayCompletionInfo {
  if (!rec) return { total: 0, done: 0, pending: 0, skipped: 0, complete: false };
  const statuses = Object.values(rec.tasks);
  const total = statuses.length;
  const done = statuses.filter((s) => s === "done").length;
  const pending = statuses.filter((s) => s === "pending").length;
  const skipped = statuses.filter((s) => s === "skipped").length;
  return { total, done, pending, skipped, complete: total > 0 && pending === 0 && done > 0 };
}

/**
 * Consecutive fully-completed days, counting backward from `fromProgramDay` (inclusive).
 * `days` is keyed by program day, and program days map 1:1 to consecutive calendar
 * dates from the user's start date, so walking the integer index backward is
 * equivalent to walking calendar days backward — no date math needed.
 */
export function computeDayStreak(profile: UserProfile, fromProgramDay: number): number {
  let streak = 0;
  for (let day = fromProgramDay; day >= 1; day--) {
    if (!dayCompletionInfo(profile.days[day]).complete) break;
    streak++;
  }
  return streak;
}
