import { describe, expect, it } from "vitest";
import {
  composeAboutMe,
  pillarsFor,
  quizFromAnswers,
  type OnboardingAnswers,
} from "./onboarding";
import { DEFAULT_QUEST_PILLARS } from "@/data/questPillars";

const base: OnboardingAnswers = {
  displayName: "Brian",
  season: "student",
  focusAreas: ["health", "learning"],
  reality: "Final year, broke, big dreams.",
  obstacle: "distraction",
  vibe: "blunt",
  matters: ["money", "health"],
  devotional: true,
  tastes: ["Tech & gadgets", "Football & sports"],
  tastesNote: "Into F1 too.",
  confidence: 7,
  sleep: "night",
  quit: ["games", "junkfood"],
  vision: "A disciplined engineer with paying clients.",
  incomeMin: "30000",
  incomeMax: "60000",
  incomeTarget: "2026-12-31",
};

describe("composeAboutMe", () => {
  it("weaves name, season, reality, obstacle, tastes into one persona", () => {
    const text = composeAboutMe(base);
    expect(text).toContain("Brian");
    expect(text).toContain("Student");
    expect(text).toContain("Final year, broke, big dreams.");
    expect(text).toContain("Phone & distractions");
    expect(text).toContain("Tech & gadgets");
    expect(text).toContain("Into F1 too.");
    expect(text).toContain("night owl");
    expect(text).toContain("A disciplined engineer with paying clients.");
  });
  it("skips empty answers without junk lines", () => {
    const text = composeAboutMe({ ...base, displayName: " ", reality: "", tastes: [], tastesNote: "" });
    expect(text).not.toContain("Name:");
    expect(text).not.toContain('""');
    expect(text.length).toBeGreaterThan(0);
  });
});

describe("pillarsFor", () => {
  it("maps matter keys to custom pillars, max 3", () => {
    const pillars = pillarsFor(["money", "health", "peace", "people"]);
    expect(pillars).toHaveLength(3);
    expect(pillars.map((p) => p.key)).toEqual(["money", "health", "peace"]);
  });
  it("falls back to defaults on empty/unknown", () => {
    expect(pillarsFor([])).toEqual(DEFAULT_QUEST_PILLARS);
    expect(pillarsFor(["nope"])).toEqual(DEFAULT_QUEST_PILLARS);
  });
});

describe("quizFromAnswers", () => {
  it("fills the real quiz shape", () => {
    const q = quizFromAnswers(base);
    expect(q.lifeAreas).toEqual(["health", "learning"]);
    expect(q.currentLife).toBe("student");
    expect(q.consistencyBarrier).toBe("distraction");
    expect(q.mattersMost).toContain("Tech & gadgets");
    expect(q.confidence).toBe(7);
    expect(q.challengeStyle).toBe("push"); // blunt vibe
    expect(q.sleep).toBe("night");
    expect(q.addictions).toEqual(["games", "junkfood"]);
  });
  it("clamps confidence 1-10", () => {
    expect(quizFromAnswers({ ...base, confidence: 99 }).confidence).toBe(10);
    expect(quizFromAnswers({ ...base, confidence: -3 }).confidence).toBe(1);
  });
});
