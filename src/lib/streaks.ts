import type { DayRecord, StreakHabit, UserProfile } from "@/types";
import { STREAK_MILESTONE_DAYS } from "@/data/streakDefaults";
import { programDayFromDate } from "@/lib/planGenerator";

export interface StreakDuration {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
}

export function currentStreakDuration(habit: StreakHabit, now: Date = new Date()): StreakDuration {
  const started = new Date(habit.startedAt);
  const totalMs = Math.max(0, now.getTime() - started.getTime());
  const days = Math.floor(totalMs / 86400000);
  const hours = Math.floor((totalMs % 86400000) / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  return { totalMs, days, hours, minutes };
}

/** Same duration math as currentStreakDuration, for DetoxHabit's currentStreakStart field. */
export function detoxStreakDuration(currentStreakStart: string, now: Date = new Date()): StreakDuration {
  const started = new Date(currentStreakStart);
  const totalMs = Math.max(0, now.getTime() - started.getTime());
  const days = Math.floor(totalMs / 86400000);
  const hours = Math.floor((totalMs % 86400000) / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  return { totalMs, days, hours, minutes };
}

/** Sum of counts logged today for a quantityLimit-type detox habit, to compare against its dailyLimit. */
export function detoxTodayCount(logs: { date: string; count?: number }[]): number {
  const today = new Date().toISOString().slice(0, 10);
  return logs.filter((l) => l.date === today).reduce((sum, l) => sum + (l.count ?? 0), 0);
}

/** For "positive" mode streaks linked to a task: consecutive days the task was completed, counting backward from today. */
export function currentPositiveStreakDays(
  linkedTaskUid: string,
  days: Record<number, DayRecord>,
  todayProgramDay: number
): number {
  let streak = 0;
  for (let d = todayProgramDay; d >= 1; d--) {
    const rec = days[d];
    if (!rec || !(linkedTaskUid in rec.tasks)) {
      // task wasn't scheduled that day — skip without breaking the streak
      continue;
    }
    if (rec.tasks[linkedTaskUid] === "done") {
      streak++;
    } else if (d === todayProgramDay && rec.tasks[linkedTaskUid] === "pending") {
      // today not yet completed — doesn't break streak, just not counted yet
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export function nextMilestone(days: number): number | null {
  for (const m of STREAK_MILESTONE_DAYS) {
    if (days < m) return m;
  }
  return null;
}

export function achievedMilestones(days: number): number[] {
  return STREAK_MILESTONE_DAYS.filter((m) => days >= m);
}

export interface StreakEvidence {
  currentDays: number;
  relapsesLast7Days: number;
}

/**
 * Evidence summary for a streak, used by goal-linking evidence chips (Goals daily row +
 * WeeklyReview). Branches by mode: "positive" streaks derive their day count from linked-task
 * completion history (currentPositiveStreakDays), since their `startedAt` isn't kept current the
 * way avoidance-mode streaks' is — see the "avoidance mode only" note on StreakHabit.startedAt.
 */
export function streakEvidence(habit: StreakHabit, profile: UserProfile, now: Date = new Date()): StreakEvidence {
  let currentDays: number;
  if (habit.mode === "positive" && habit.linkedTaskUid) {
    const todayProgramDay = profile.startDate
      ? programDayFromDate(profile.startDate, now.toISOString().slice(0, 10))
      : 0;
    currentDays = currentPositiveStreakDays(habit.linkedTaskUid, profile.days, todayProgramDay);
  } else {
    currentDays = currentStreakDuration(habit, now).days;
  }

  const cutoffMs = now.getTime() - 7 * 86400000;
  const relapsesLast7Days = habit.relapses.filter((r) => new Date(r.timestamp).getTime() >= cutoffMs).length;

  return { currentDays, relapsesLast7Days };
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function relapsePatternInsight(habit: StreakHabit): string | null {
  if (habit.relapses.length < 3) return null;

  const dayCounts = new Array(7).fill(0);
  const hourBuckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  habit.relapses.forEach((r) => {
    const d = new Date(r.timestamp);
    dayCounts[d.getDay()]++;
    const h = d.getHours();
    if (h >= 5 && h < 12) hourBuckets.morning++;
    else if (h >= 12 && h < 17) hourBuckets.afternoon++;
    else if (h >= 17 && h < 22) hourBuckets.evening++;
    else hourBuckets.night++;
  });

  const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
  const topBucket = (Object.entries(hourBuckets) as [string, number][]).sort((a, b) => b[1] - a[1])[0];

  return `Most relapses happen on ${DAY_NAMES[maxDayIdx]}s, usually in the ${topBucket[0]}. That's your danger window — plan around it.`;
}
