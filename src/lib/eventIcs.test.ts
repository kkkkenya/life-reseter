import { describe, expect, it } from "vitest";
import { buildIcs, nairobiWeek } from "./eventIcs";
import type { ParsedEvent } from "./eventParsers";

function ev(over: Partial<ParsedEvent> & { title: string; date: string }): ParsedEvent {
  return {
    endDate: null,
    startTime: null,
    endTime: null,
    city: null,
    venue: null,
    isOnline: false,
    url: null,
    image: null,
    source: null,
    origin: "vabu",
    isFree: null,
    priceText: null,
    topics: [],
    ...over,
  };
}

describe("buildIcs", () => {
  it("emits a valid VCALENDAR with a timed event in local time", () => {
    const ics = buildIcs([ev({ title: "DevFest Nairobi", date: "2026-09-17", startTime: "18:00", endTime: "20:00", city: "Nairobi" })], {
      weekStart: "2026-09-14",
      weekEnd: "2026-09-20",
    });
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20260917T180000");
    expect(ics).toContain("DTEND:20260917T200000");
    expect(ics).toContain("SUMMARY:DevFest Nairobi");
    expect(ics).toContain("UID:");
    expect(ics).toContain("\r\n");
  });

  it("renders an all-day event as VALUE=DATE with an exclusive end", () => {
    const ics = buildIcs([ev({ title: "Summit", date: "2026-09-18" })], { weekStart: "2026-09-14", weekEnd: "2026-09-20" });
    expect(ics).toContain("DTSTART;VALUE=DATE:20260918");
    expect(ics).toContain("DTEND;VALUE=DATE:20260919");
  });

  it("escapes separators in text fields", () => {
    const ics = buildIcs([ev({ title: "AI, Data; Cloud", date: "2026-09-18" })], { weekStart: "2026-09-14", weekEnd: "2026-09-20" });
    expect(ics).toContain("SUMMARY:AI\\, Data\\; Cloud");
  });

  it("still produces a valid empty calendar", () => {
    const ics = buildIcs([], { weekStart: "2026-09-14", weekEnd: "2026-09-20" });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});

describe("nairobiWeek", () => {
  it("anchors on Monday and spans seven days", () => {
    const { weekStart, weekEnd } = nairobiWeek(new Date("2026-09-09T10:00:00Z")); // a Wednesday
    expect(weekStart).toBe("2026-09-07");
    expect(weekEnd).toBe("2026-09-13");
    expect(new Date(`${weekStart}T00:00:00Z`).getUTCDay()).toBe(1);
  });
});
