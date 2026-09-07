import { describe, expect, it } from "vitest";
import { isValidIsoDate, isValidTime, spokenDateToISO, spokenTimeToHHMM } from "./parseEvent";

describe("spokenTimeToHHMM", () => {
  it.each([
    ["3pm", "15:00"],
    ["starts at 3:30 pm", "15:30"],
    ["12am", "00:00"],
    ["12pm", "12:00"],
    ["15:30", "15:30"],
    ["around noon", "12:00"],
    ["midnight", "00:00"],
  ])("%s -> %s", (heard, want) => {
    expect(spokenTimeToHHMM(heard)).toBe(want);
  });
  it("returns null when no time is present", () => {
    expect(spokenTimeToHHMM("sometime later maybe")).toBeNull();
  });
});

describe("spokenDateToISO (Mon 2026-09-07, timezone-proof)", () => {
  it.each([
    ["today", "2026-09-07"],
    ["tomorrow", "2026-09-08"],
    ["friday", "2026-09-11"],
    ["monday", "2026-09-14"], // same weekday = next week, never backwards
    ["on 2026-09-20", "2026-09-20"],
  ])("%s -> %s", (heard, want) => {
    expect(spokenDateToISO(heard, "2026-09-07")).toBe(want);
  });
  it("returns null for vague input", () => {
    expect(spokenDateToISO("next sometime", "2026-09-07")).toBeNull();
  });
});

describe("isValidIsoDate (no UTC round-trip)", () => {
  it.each([
    ["2026-09-17", true],
    ["2024-02-29", true], // leap year
    ["2026-02-30", false],
    ["2025-02-29", false],
    ["2026-13-01", false],
    ["yesterday", false],
  ])("%s -> %s", (v, want) => {
    expect(isValidIsoDate(v)).toBe(want);
  });
});

describe("isValidTime", () => {
  it.each([
    ["09:00", true],
    ["23:59", true],
    ["24:00", false],
    ["9:00", false],
  ])("%s -> %s", (v, want) => {
    expect(isValidTime(v)).toBe(want);
  });
});
