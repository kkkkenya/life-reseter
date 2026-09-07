import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  buildWeekPlan,
  classesOn,
  upcomingDeadlines,
  weekdayOfISO,
} from "./school";
import type { ClassSession } from "@/types";

const cls = (over: Partial<ClassSession> & { weekday: number; startTime: string }): ClassSession => ({
  id: `c-${over.weekday}-${over.startTime}`,
  course: "EMT 101",
  endTime: "10:00",
  ...over,
});

describe("addDaysISO", () => {
  it("adds across month boundaries", () => {
    expect(addDaysISO("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDaysISO("2026-09-07", 6)).toBe("2026-09-13");
    expect(addDaysISO("2026-09-07", -1)).toBe("2026-09-06");
  });
});

describe("weekdayOfISO", () => {
  it("maps known dates (2026-09-07 is a Monday)", () => {
    expect(weekdayOfISO("2026-09-07")).toBe(1);
    expect(weekdayOfISO("2026-09-13")).toBe(0);
  });
});

describe("classesOn", () => {
  it("filters by weekday and sorts by start", () => {
    const list = [cls({ weekday: 1, startTime: "11:00" }), cls({ weekday: 2, startTime: "08:00" }), cls({ weekday: 1, startTime: "08:00" })];
    expect(classesOn(list, 1).map((c) => c.startTime)).toEqual(["08:00", "11:00"]);
    expect(classesOn(list, 3)).toEqual([]);
  });
});

describe("buildWeekPlan", () => {
  it("merges classes, blocks, and open deadlines per day", () => {
    const plan = buildWeekPlan(
      "2026-09-07",
      2,
      [cls({ weekday: 1, startTime: "08:00" })],
      { "2026-09-08": [{ id: "b", startTime: "18:00", endTime: "19:00", label: "Gym", lifeArea: "health" }] },
      [
        { id: "d1", title: "Lab report", dueDate: "2026-09-07", done: false, createdAt: "" },
        { id: "d2", title: "Done already", dueDate: "2026-09-07", done: true, createdAt: "" },
      ]
    );
    expect(plan).toHaveLength(2);
    expect(plan[0].classes).toHaveLength(1);
    expect(plan[0].deadlines.map((d) => d.id)).toEqual(["d1"]);
    expect(plan[1].blocks.map((b) => b.id)).toEqual(["b"]);
    expect(plan[1].classes).toEqual([]);
  });
});

describe("upcomingDeadlines", () => {
  it("filters done, past, and far-future, soonest first", () => {
    const list = [
      { id: "past", title: "P", dueDate: "2026-09-01", done: false, createdAt: "" },
      { id: "done", title: "D", dueDate: "2026-09-09", done: true, createdAt: "" },
      { id: "far", title: "F", dueDate: "2026-12-01", done: false, createdAt: "" },
      { id: "b", title: "B", dueDate: "2026-09-10", dueTime: "09:00", done: false, createdAt: "" },
      { id: "a", title: "A", dueDate: "2026-09-08", done: false, createdAt: "" },
    ];
    expect(upcomingDeadlines(list, "2026-09-07").map((d) => d.id)).toEqual(["a", "b"]);
  });
});
