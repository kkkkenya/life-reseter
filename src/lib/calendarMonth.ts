/**
 * calendarMonth.ts — pure helpers for the built-in Calendar tab.
 *
 * The page stays thin: it gathers the raw pieces (time blocks, classes,
 * deadlines, tech events, GCal events) and hands each day's items here for
 * merging and ordering. No store, no network — directly unit-testable.
 */

/** Weekday the app grid starts on: Monday, matching getWeekRange/isoWeek. */
export const GRID_WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;

export type CalendarItemSource = "block" | "class" | "deadline" | "event" | "gcal";

export interface CalendarItem {
  key: string;
  source: CalendarItemSource;
  /** HH:MM, or null for all-day / no-time items (rendered first). */
  time: string | null;
  endTime?: string | null;
  label: string;
  detail?: string | null;
  done?: boolean;
  /** Sources with a tap-to-complete action (blocks, deadlines). */
  toggleable?: boolean;
  href?: string | null;
  location?: string | null;
}

/** 42-cell Monday-start grid for a month; nulls pad the leading/trailing weeks. */
export function monthGrid(year: number, month: number): { cells: (string | null)[]; rows: number } {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows = Math.ceil((offset + daysInMonth) / 7);
  const cells: (string | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return { cells, rows };
}

/** Fetch window (direct-events is a week-oriented endpoint; months work as a range). */
export function monthRange(year: number, month: number): { startIso: string; endIso: string } {
  const startIso = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endIso = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;
  return { startIso, endIso };
}

/** The ISO day a GCal event falls on (dateTime form or all-day date form). */
export function gcalDateOf(ev: { start?: { dateTime?: string; date?: string } }): string | null {
  const fromDateTime = ev.start?.dateTime?.slice(0, 10);
  if (fromDateTime) return fromDateTime;
  const d = ev.start?.date;
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  return null;
}

/** Human time for a GCal event: HH:MM for timed events, null for all-day. */
export function gcalTimeOf(ev: { start?: { dateTime?: string; date?: string } }): string | null {
  const dt = ev.start?.dateTime;
  if (!dt) return null;
  const m = /T(\d{2}:\d{2})/.exec(dt);
  return m ? m[1] : null;
}

/**
 * Merge one day's items into display order: all-day / untimed items first,
 * then timed items ascending by start time. Stable within equal times.
 */
export function mergeCalendarDay(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
}

/** Completion tint for a day cell, from its task statuses (same scale as CalendarGrid). */
export function completionTint(statuses: string[]): string {
  if (statuses.length === 0) return "var(--color-surface-raised)";
  const done = statuses.filter((s) => s === "done").length;
  const pct = done / statuses.length;
  if (pct >= 1) return "var(--color-good)";
  if (pct >= 0.5) return "var(--color-ember)";
  if (pct > 0) return "var(--color-ember-dim)";
  return "var(--color-bad)";
}
