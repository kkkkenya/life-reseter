import type { AssignmentDeadline, ClassSession, TimeBlock } from "@/types";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local-calendar ISO math (no toISOString — exact in every timezone). */
export function addDaysISO(iso: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 0=Sun..6=Sat for an ISO date, computed locally. */
export function weekdayOfISO(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return new Date().getDay();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
}

export function classesOn(classes: ClassSession[], weekday: number): ClassSession[] {
  return classes
    .filter((c) => c.weekday === weekday)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  weekday: number;
  classes: ClassSession[];
  blocks: TimeBlock[];
  deadlines: AssignmentDeadline[]; // open ones due this date (done shown separately)
}

/** Merge timetable + time blocks + deadlines into per-day plans. */
export function buildWeekPlan(
  startISO: string,
  days: number,
  classes: ClassSession[],
  blocksByDate: Record<string, TimeBlock[]>,
  deadlines: AssignmentDeadline[]
): DayPlan[] {
  const out: DayPlan[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysISO(startISO, i);
    const weekday = weekdayOfISO(date);
    out.push({
      date,
      weekday,
      classes: classesOn(classes, weekday),
      blocks: [...(blocksByDate[date] ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      deadlines: deadlines
        .filter((d) => d.dueDate === date && !d.done)
        .sort((a, b) => (a.dueTime ?? "").localeCompare(b.dueTime ?? "")),
    });
  }
  return out;
}

/** Open deadlines from `fromISO` through +daysAhead, soonest first. */
export function upcomingDeadlines(
  deadlines: AssignmentDeadline[],
  fromISO: string,
  daysAhead = 14
): AssignmentDeadline[] {
  const end = addDaysISO(fromISO, daysAhead);
  return deadlines
    .filter((d) => !d.done && d.dueDate >= fromISO && d.dueDate <= end)
    .sort((a, b) =>
      `${a.dueDate} ${a.dueTime ?? ""}`.localeCompare(`${b.dueDate} ${b.dueTime ?? ""}`)
    );
}

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
