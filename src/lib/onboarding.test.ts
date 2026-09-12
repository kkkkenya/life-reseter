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

describe("TONE_STEP_COPY", () => {
  it("covers every post-vibe step in all four voices", async () => {
    const { TONE_STEP_COPY } = await import("./onboarding");
    const steps = ["matters", "tastes", "devotional", "rhythm", "quit", "vision", "dream", "nightmare", "income", "tasks", "start"];
    const tones = ["blunt", "gentle", "drill", "stoic"] as const;
    for (const step of steps) {
      expect(TONE_STEP_COPY[step], `step ${step} missing`).toBeDefined();
      for (const tone of tones) {
        expect(TONE_STEP_COPY[step][tone].title.length, `${step}/${tone} title`).toBeGreaterThan(0);
        expect(TONE_STEP_COPY[step][tone].sub.length, `${step}/${tone} sub`).toBeGreaterThan(0);
      }
    }
  });
  it("stepCopy falls back before a tone is chosen", async () => {
    const { stepCopy } = await import("./onboarding");
    const fb = { title: "T", sub: "S" };
    expect(stepCopy("matters", null, fb)).toBe(fb);
    expect(stepCopy("matters", "drill", fb).title).not.toBe(fb.title);
  });
});

describe("questStreak", async () => {
  it("counts consecutive all-done days, forgiving an open today", async () => {
    const mod = await import("./quests");
    const { questStreak } = mod;
    const today = "2026-09-13";
    const q = (status: "pending" | "done") => [
      { id: "1", dateKey: today, title: "a", description: "", focus: "money", xpBonus: 40, status, source: "fallback" as const },
      { id: "2", dateKey: today, title: "b", description: "", focus: "people", xpBonus: 40, status: "done" as const, source: "fallback" as const },
    ];
    const mk = (status: "pending" | "done") => q(status);
    const quests: Record<string, Parameters<typeof questStreak>[0][string]> = {};
    // 3 fully-done days ending yesterday; today pending (open, not breaking)
    for (let i = 1; i <= 3; i++) {
      const d = new Date(2026, 8, 13 - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      quests[key] = mk("done");
    }
    quests[today] = mk("pending");
    expect(questStreak(quests, today)).toBe(3);
    // today done → streak extends
    quests[today] = mk("done");
    expect(questStreak(quests, today)).toBe(4);
  });
});
