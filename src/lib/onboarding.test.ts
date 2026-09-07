import { describe, expect, it } from "vitest";
import {
  checkInInsights,
  composeAboutMe,
  obstacleLabel,
  pillarsFor,
  quizFromAnswers,
  suggestTasks,
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
  dream: "Running my own firm.",
  nightmare: "Same room, same habits.",
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
    expect(text).toContain("Running my own firm.");
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

describe("suggestTasks", () => {
  it("returns 20 deterministic suggestions, focus matches first", () => {
    const first = suggestTasks(["health", "learning"]);
    const second = suggestTasks(["health", "learning"]);
    expect(first).toHaveLength(20);
    expect(first.map((s) => s.def.id)).toEqual(second.map((s) => s.def.id));
    const ids = new Set(first.map((s) => s.def.id));
    expect(ids.size).toBe(20);
    expect(first[0].def.lifeArea).toBe("health");
    for (const s of first) {
      expect(s.suggestedFreq).toBeGreaterThanOrEqual(1);
      expect(s.suggestedFreq).toBeLessThanOrEqual(7);
      expect(s.reason.length).toBeGreaterThan(0);
    }
  });
  it("works with no focus areas", () => {
    expect(suggestTasks([])).toHaveLength(20);
  });
});

describe("checkInInsights", () => {
  const rec = (weekKey: string, score: number, obstacleHit = "none") => ({
    weekKey,
    score,
    wins: "",
    miss: "",
    obstacleHit,
    tweak: "",
    focusNext: "",
    createdAt: "",
  });
  it("handles empty history", () => {
    expect(checkInInsights([])).toEqual({ count: 0, avgScore: 0, trend: "early", topObstacle: null, latestWeekKey: null });
  });
  it("computes trend and recurring villain", () => {
    const r = checkInInsights([
      rec("2026-W30", 5, "distraction"),
      rec("2026-W31", 6, "distraction"),
      rec("2026-W32", 8, "none"),
    ]);
    expect(r.count).toBe(3);
    expect(r.trend).toBe("up");
    expect(r.topObstacle).toBe("distraction");
    expect(r.latestWeekKey).toBe("2026-W32");
  });
  it("detects slides and clean streaks", () => {
    expect(checkInInsights([rec("2026-W30", 8), rec("2026-W31", 5)]).trend).toBe("down");
    expect(checkInInsights([rec("2026-W30", 7), rec("2026-W31", 7)]).trend).toBe("flat");
    expect(checkInInsights([rec("2026-W30", 7)]).topObstacle).toBeNull();
  });
});

describe("obstacleLabel", () => {
  it("labels none and known values", () => {
    expect(obstacleLabel("none")).toContain("clean");
    expect(obstacleLabel("distraction")).toBe("Phone & distractions");
    expect(obstacleLabel("mystery")).toBe("mystery");
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
