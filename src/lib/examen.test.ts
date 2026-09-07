import { describe, expect, it } from "vitest";
import { examenStreak } from "./examen";
import type { JournalEntry } from "@/types";

const entry = (day: number): JournalEntry => ({
  day,
  wentWell: "x",
  couldImprove: "",
  tomorrowWin: "",
  mood: 6,
  savedAt: "",
});

describe("examenStreak", () => {
  it("counts back consecutive days including today", () => {
    expect(examenStreak({ 5: entry(5), 6: entry(6), 7: entry(7) }, 7)).toBe(3);
  });
  it("doesn't break when today is still open", () => {
    expect(examenStreak({ 5: entry(5), 6: entry(6) }, 7)).toBe(2);
  });
  it("stops at gaps and handles emptiness", () => {
    expect(examenStreak({ 4: entry(4), 6: entry(6), 7: entry(7) }, 7)).toBe(2);
    expect(examenStreak({}, 7)).toBe(0);
  });
});
