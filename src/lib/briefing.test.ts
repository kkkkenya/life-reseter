import { describe, expect, it } from "vitest";
import { buildBriefingPrompt, parseBriefing, ruleBasedBriefing, type BriefingFacts } from "./briefing";

const full: BriefingFacts = {
  bestTaskLabel: "Gym workout",
  bestTaskDays: 9,
  perfectStreak: 4,
  todBest: "morning",
  todBestRate: 0.82,
  todWorst: "evening",
  todWorstRate: 0.31,
  topPattern: "You lift more on days you sleep early.",
  openDeadlines: 2,
  nearestDeadline: "Lab report · 2026-09-10",
  checkinAvg: 6.5,
  weeklyFocus: "Ship the billing fix",
};

describe("ruleBasedBriefing", () => {
  it("leads with the anchor habit and time-of-day gap", () => {
    const b = ruleBasedBriefing(full);
    expect(b.keep).toContain("Gym workout");
    expect(b.change).toContain("evening");
    expect(b.change).toContain("morning");
    expect(b.watch).toContain("Lab report");
  });
  it("falls back gracefully with no data", () => {
    const b = ruleBasedBriefing({
      bestTaskLabel: null,
      bestTaskDays: 0,
      perfectStreak: 0,
      todBest: null,
      todBestRate: null,
      todWorst: null,
      todWorstRate: null,
      topPattern: null,
      openDeadlines: 0,
      nearestDeadline: null,
      checkinAvg: null,
      weeklyFocus: null,
    });
    expect(b.keep.length).toBeGreaterThan(10);
    expect(b.change.length).toBeGreaterThan(10);
    expect(b.watch.length).toBeGreaterThan(10);
  });
  it("uses the pattern when no time-of-day gap exists", () => {
    const b = ruleBasedBriefing({ ...full, todBest: null, todWorst: null, todBestRate: null, todWorstRate: null });
    expect(b.change).toBe("You lift more on days you sleep early.");
  });
});

describe("parseBriefing", () => {
  it("parses labeled lines", () => {
    expect(
      parseBriefing("KEEP: mornings are sacred\nCHANGE: kill the 11pm scrolling\nWATCH: lab report Friday")
    ).toEqual({
      keep: "mornings are sacred",
      change: "kill the 11pm scrolling",
      watch: "lab report Friday",
    });
  });
  it("accepts dashes and casing", () => {
    expect(parseBriefing("keep - rest\nchange - less phone\nwatch - deadline")?.watch).toBe("deadline");
  });
  it("returns null when labels are missing", () => {
    expect(parseBriefing("Just some free text about the week.")).toBeNull();
  });
});

describe("buildBriefingPrompt", () => {
  it("names the friend and demands the format", () => {
    const p = buildBriefingPrompt("Tasks: 5 done.", "Brian");
    expect(p).toContain("Brian");
    expect(p).toContain("KEEP:");
    expect(p).toContain("WATCH:");
  });
});
