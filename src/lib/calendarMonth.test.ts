import { describe, expect, it } from "vitest";
import {
  completionTint,
  gcalDateOf,
  gcalTimeOf,
  mergeCalendarDay,
  monthGrid,
  monthRange,
  type CalendarItem,
} from "./calendarMonth";

describe("monthGrid", () => {
  it("is Monday-start and pads the leading week", () => {
    const { cells, rows } = monthGrid(2026, 8); // September 2026 — the 1st is a Tuesday
    expect(cells[0]).toBeNull(); // Monday pad
    expect(cells[1]).toBe("2026-09-01");
    expect(cells).toContain("2026-09-30");
    expect(cells).toHaveLength(rows * 7);
    expect(new Date(cells[1] + "T00:00:00").getDay()).toBe(2); // Tuesday
  });

  it("needs no padding when the month starts on a Monday", () => {
    const { cells } = monthGrid(2026, 7); // August 2026 — the 1st is a Saturday
    const first = cells.find((c) => c !== null);
    expect(first).toBe("2026-08-01");
    expect(cells[0]).not.toBe("2026-08-01");
  });

  it("pads the trailing week to a full row", () => {
    const { cells } = monthGrid(2026, 1); // February 2026 — 28 days, starts Sunday
    expect(cells.length % 7).toBe(0);
    expect(cells).toContain("2026-02-28");
    expect(cells[cells.length - 1]).toBeNull();
  });
});

describe("monthRange", () => {
  it("spans the first to the last day of the month", () => {
    expect(monthRange(2026, 8)).toEqual({ startIso: "2026-09-01", endIso: "2026-09-30" });
    expect(monthRange(2028, 1)).toEqual({ startIso: "2028-02-01", endIso: "2028-02-29" }); // leap year
  });
});

describe("gcal extraction", () => {
  it("reads timed and all-day events", () => {
    expect(gcalDateOf({ start: { dateTime: "2026-09-18T09:30:00+03:00" } })).toBe("2026-09-18");
    expect(gcalTimeOf({ start: { dateTime: "2026-09-18T09:30:00+03:00" } })).toBe("09:30");
    expect(gcalDateOf({ start: { date: "2026-09-19" } })).toBe("2026-09-19");
    expect(gcalTimeOf({ start: { date: "2026-09-19" } })).toBeNull();
    expect(gcalDateOf({})).toBeNull();
  });
});

describe("mergeCalendarDay", () => {
  it("puts untimed items first, then sorts by start time", () => {
    const items: CalendarItem[] = [
      { key: "b", source: "block", time: "14:00", label: "Study block" },
      { key: "d", source: "deadline", time: null, label: "Lab report", toggleable: true },
      { key: "c", source: "class", time: "09:00", label: "EMT 101" },
      { key: "e", source: "event", time: null, label: "Hackathon (all day)" },
    ];
    const merged = mergeCalendarDay(items);
    expect(merged.map((i) => i.key)).toEqual(["d", "e", "c", "b"]);
  });
});

describe("completionTint", () => {
  it("matches the CalendarGrid scale", () => {
    expect(completionTint([])).toBe("var(--color-surface-raised)");
    expect(completionTint(["done", "done"])).toBe("var(--color-good)");
    expect(completionTint(["done", "pending"])).toBe("var(--color-ember)");
    expect(completionTint(["skipped", "skipped"])).toBe("var(--color-bad)");
  });
});
