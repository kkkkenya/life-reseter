import { describe, expect, it } from "vitest";
import { asDate, asTime, pickDetailYear, stripFences } from "./eventPipeline";

describe("stripFences", () => {
  it("passes bare JSON through", () => {
    expect(stripFences('[{"a":1}]')).toBe('[{"a":1}]');
  });
  it("strips ```json fences", () => {
    expect(stripFences('```json\n[{"a":1}]\n```')).toBe('[{"a":1}]');
  });
  it("strips bare ``` fences and stray whitespace", () => {
    expect(stripFences('```\n  {"a":1}  \n```')).toBe('{"a":1}');
  });
  it("leaves non-fenced text alone", () => {
    expect(stripFences("just text")).toBe("just text");
  });
});

describe("asDate", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(asDate("2026-09-17")).toBe("2026-09-17");
    expect(asDate("  2026-09-17T18:00:00Z  ")).toBe("2026-09-17");
  });
  it("rejects junk and non-strings", () => {
    expect(asDate("17/09/2026")).toBeNull();
    expect(asDate("2026-9-17")).toBeNull();
    expect(asDate(42)).toBeNull();
    expect(asDate(null)).toBeNull();
  });
});

describe("asTime", () => {
  it("accepts HH:MM 24-hour times", () => {
    expect(asTime("09:30")).toBe("09:30");
    expect(asTime("23:59")).toBe("23:59");
  });
  it("rejects impossible times", () => {
    expect(asTime("24:00")).toBeNull();
    expect(asTime("09:60")).toBeNull();
    expect(asTime("9am")).toBeNull();
    expect(asTime(undefined)).toBeNull();
  });
});

describe("pickDetailYear", () => {
  it("keeps the fallback year when the date already lands in-week", () => {
    expect(pickDetailYear(1, 6, "2027-01-04", "2027-01-10", 2027)).toBe(2027);
    expect(pickDetailYear(12, 29, "2026-12-28", "2027-01-03", 2026)).toBe(2026);
  });
  it("shifts to the next year for a January date seen during a December week", () => {
    expect(pickDetailYear(1, 2, "2026-12-28", "2027-01-03", 2026)).toBe(2027);
  });
  it("falls back to the given year when no candidate lands in-range", () => {
    expect(pickDetailYear(6, 15, "2027-01-04", "2027-01-10", 2027)).toBe(2027);
  });
});
