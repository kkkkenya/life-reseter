import type { CheckInRecord, LifeAreaKey, TaskDefinition } from "@/types";
import { TASK_CATALOG } from "@/data/taskCatalog";

export const SEASON_OPTIONS = [
  { value: "student", label: "Student", blurb: "Classes, attachments, campus life" },
  { value: "employed", label: "Employed", blurb: "A job, a routine, little margin" },
  { value: "builder", label: "Freelancer / builder", blurb: "Clients, gigs, something of my own" },
  { value: "between", label: "Between things", blurb: "Rebuilding, figuring out what's next" },
] as const;

export const OBSTACLE_OPTIONS = [
  { value: "consistency", label: "Staying consistent", blurb: "I start strong, then fade" },
  { value: "time", label: "Finding time", blurb: "My days are already full" },
  { value: "distraction", label: "Phone & distractions", blurb: "I lose hours without noticing" },
  { value: "energy", label: "Low energy / sleep", blurb: "I'm running on empty" },
  { value: "motivation", label: "Motivation dips", blurb: "I know what to do, I just don't" },
  { value: "starting", label: "Starting", blurb: "Perfectionism keeps me frozen" },
] as const;

export interface SuggestedTask {
  def: TaskDefinition;
  suggestedFreq: number;
  reason: string;
}

// Daily non-negotiables most people should start with.
const UNIVERSAL_STARTERS = new Set(["water", "sleep", "breathe", "wakeearly", "screentime", "journaling"]);
const FREQ_7 = new Set(["water", "sleep", "makebed", "shower", "eat5meals", "protein", "vitamins", "tidyspace", "breathe", "pray"]);
const FREQ_3 = new Set(["gym", "run", "basketball", "tennis", "cycling", "freelance", "sales-outreach", "coursework"]);

/** 20 curated task suggestions: focus-area matches first, universal starters
 *  next, then the best of the rest. Deterministic so the step is stable. */
export function suggestTasks(focusAreas: LifeAreaKey[], count = 20): SuggestedTask[] {
  const all = TASK_CATALOG.flatMap((c) => c.tasks);
  const focus = new Set(focusAreas);
  const scored = all.map((def, idx) => {
    let score = 0;
    let reason = "Worth having in the mix";
    if (focus.has(def.lifeArea)) {
      score += 2;
      reason = "Matches your focus";
    }
    if (UNIVERSAL_STARTERS.has(def.id)) {
      score += 1;
      reason = focus.has(def.lifeArea) ? "Matches your focus" : "Everyone starts here";
    }
    return { def, score, idx, reason };
  });
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return scored.slice(0, count).map(({ def, reason }) => ({
    def,
    suggestedFreq: FREQ_7.has(def.id) ? 7 : FREQ_3.has(def.id) ? 3 : 5,
    reason,
  }));
}

export interface CheckInInsights {
  count: number;
  avgScore: number;
  trend: "up" | "flat" | "down" | "early";
  topObstacle: string | null; // obstacle value, null when clean weeks dominate
  latestWeekKey: string | null;
}

/** Month-one self-knowledge: trend + recurring obstacle from check-in history. */
export function checkInInsights(records: CheckInRecord[]): CheckInInsights {
  const sorted = [...records].sort((a, b) => a.weekKey.localeCompare(b.weekKey));
  if (sorted.length === 0) {
    return { count: 0, avgScore: 0, trend: "early", topObstacle: null, latestWeekKey: null };
  }
  const avgScore = sorted.reduce((s, r) => s + r.score, 0) / sorted.length;
  let trend: CheckInInsights["trend"] = "early";
  if (sorted.length >= 2) {
    const first = sorted[0].score;
    const last = sorted[sorted.length - 1].score;
    trend = last - first >= 1 ? "up" : first - last >= 1 ? "down" : "flat";
  }
  const obstacles = sorted.map((r) => r.obstacleHit).filter((o) => o && o !== "none");
  let topObstacle: string | null = null;
  if (obstacles.length > 0) {
    const counts = new Map<string, number>();
    for (const o of obstacles) counts.set(o, (counts.get(o) ?? 0) + 1);
    topObstacle = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  return {
    count: sorted.length,
    avgScore: Math.round(avgScore * 10) / 10,
    trend,
    topObstacle,
    latestWeekKey: sorted[sorted.length - 1].weekKey,
  };
}

export function obstacleLabel(value: string): string {
  if (value === "none") return "Nothing — clean week";
  return OBSTACLE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
