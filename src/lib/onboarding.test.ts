import { describe, expect, it } from "vitest";
import { checkInInsights, obstacleLabel, suggestTasks } from "./onboarding";

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
