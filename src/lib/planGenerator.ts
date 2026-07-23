import type { DayRecord, PlannedTask, RecurrenceRule } from "@/types";

/** Evenly distribute N active days across a 7-day week (0=Sun..6=Sat). */
export function distributeWeekdays(frequency: number): number[] {
  const freq = Math.max(1, Math.min(7, frequency));
  if (freq === 7) return [0, 1, 2, 3, 4, 5, 6];
  const step = 7 / freq;
  const days = new Set<number>();
  for (let i = 0; i < freq; i++) {
    days.add(Math.round(i * step) % 7);
  }
  // ensure exact count in case of rounding collisions
  let d = 1;
  while (days.size < freq && d < 7) {
    days.add(d);
    d++;
  }
  return Array.from(days).sort((a, b) => a - b);
}

export function weekOfDay(day: number): number {
  return Math.ceil(day / 7);
}

/** Lifetime day counter — no upper bound. Day 1 is startDate itself. */
export function programDayFromDate(startDate: string, todayIso: string): number {
  const start = new Date(startDate + "T00:00:00");
  const today = new Date(todayIso + "T00:00:00");
  const diff = Math.round((today.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

/** Reverse of programDayFromDate — the calendar date (YYYY-MM-DD) a given program day falls on. */
export function dateFromProgramDay(startDate: string, day: number): string {
  const start = new Date(startDate + "T00:00:00");
  start.setDate(start.getDate() + (day - 1));
  return start.toISOString().slice(0, 10);
}

/** Short, friendly date label for UI display, e.g. "Jul 23" — locale-aware but compact. */
export function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function recurrenceMatchesDate(rule: RecurrenceRule, date: Date): boolean {
  const weekday = date.getDay();
  if (rule.type === "monthly") {
    return date.getDate() === (rule.dayOfMonth ?? 1);
  }
  if (!rule.weekdays.includes(weekday)) return false;
  if (rule.type === "weekly") return true;
  // biweekly — parity check against the anchor date
  const anchor = new Date(rule.anchorDate + "T00:00:00");
  const daysSince = Math.floor((date.getTime() - anchor.getTime()) / 86400000);
  const weeksSince = Math.floor(daysSince / 7);
  return weeksSince >= 0 && weeksSince % 2 === 0;
}

function taskActiveOnDate(task: PlannedTask, date: Date, week: number): boolean {
  if (task.recurrence && task.recurrence.type !== "weekly") {
    return recurrenceMatchesDate(task.recurrence, date);
  }
  // default / simple-weekly path — unchanged from the original week-number based matching
  const activeThisWeek = task.applyToAllWeeks ? week >= task.addedOnWeek : week === task.addedOnWeek;
  if (!activeThisWeek) return false;
  return task.activeDays.includes(date.getDay());
}

/**
 * Builds a rolling window of days around "today" rather than a fixed 1..66 range,
 * so the calendar can run indefinitely without regenerating (or storing) the
 * entire history on every task edit. windowDays controls the total span; the
 * default of 45 splits as 14 days back / 30 days forward from today.
 *
 * Days outside the window that already exist in existingDays are preserved
 * as-is (not deleted, not regenerated) — only the window itself is (re)computed.
 */
export function buildCalendar(
  startDate: string,
  tasks: PlannedTask[],
  existingDays: Record<number, DayRecord>,
  windowDays: number = 45
): Record<number, DayRecord> {
  const start = new Date(startDate + "T00:00:00");
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayProgramDay = programDayFromDate(startDate, todayIso);

  const backDays = Math.min(14, windowDays - 1);
  const forwardDays = Math.max(0, windowDays - backDays - 1);
  const rangeStart = Math.max(1, todayProgramDay - backDays);
  const rangeEnd = todayProgramDay + forwardDays;

  const out: Record<number, DayRecord> = { ...existingDays };

  for (let day = rangeStart; day <= rangeEnd; day++) {
    const date = new Date(start);
    date.setDate(start.getDate() + (day - 1));
    const week = weekOfDay(day);
    const isoDate = date.toISOString().slice(0, 10);

    const existing = existingDays[day];
    const taskStatuses: Record<string, "pending" | "done" | "skipped"> = {};

    for (const t of tasks) {
      if (!taskActiveOnDate(t, date, week)) continue;
      taskStatuses[t.uid] = existing?.tasks[t.uid] ?? "pending";
    }

    out[day] = {
      day,
      date: isoDate,
      tasks: taskStatuses,
      carriedOver: existing?.carriedOver,
      xpEarned: existing?.xpEarned ?? 0,
    };
  }

  // Bounded carry-over: pull yesterday's still-pending tasks into today, once,
  // rather than chaining indefinitely into the future.
  if (todayProgramDay > 1) {
    const yesterday = out[todayProgramDay - 1];
    const todayRec = out[todayProgramDay];
    if (yesterday && todayRec && yesterday.date < todayIso) {
      const carried: string[] = [];
      Object.entries(yesterday.tasks).forEach(([uid, status]) => {
        if (status !== "pending") return;
        if (uid in todayRec.tasks) return; // already naturally scheduled today
        todayRec.tasks[uid] = "pending";
        carried.push(uid);
      });
      if (carried.length > 0) {
        todayRec.carriedOver = Array.from(new Set([...(todayRec.carriedOver ?? []), ...carried]));
      }
    }
  }

  return out;
}

export function xpForTask(): number {
  return 10;
}

export const CALENDAR_WINDOW_DAYS = 45;
