import type { UserProfile, LifeAreaKey, StatKey } from "@/types";
import { LIFE_AREAS } from "@/data/lifeAreas";

export function lifeAreaXP(profile: UserProfile): Record<LifeAreaKey, number> {
  const totals: Record<LifeAreaKey, number> = {
    health: 0,
    learning: 0,
    productivity: 0,
    business: 0,
    finances: 0,
    relationships: 0,
    mindset: 0,
  };

  const taskByUid = new Map(profile.tasks.map((t) => [t.uid, t]));

  Object.values(profile.days).forEach((day) => {
    Object.entries(day.tasks).forEach(([uid, status]) => {
      if (status !== "done") return;
      const task = taskByUid.get(uid);
      if (!task) return;
      totals[task.lifeArea] += 10;
    });
  });

  return totals;
}

export function lifeAreaChartData(profile: UserProfile) {
  const xp = lifeAreaXP(profile);
  return LIFE_AREAS.map((a) => ({
    area: a.shortLabel,
    xp: xp[a.key],
    fill: a.color,
  }));
}

export interface MoodCompletionPoint {
  day: number;
  mood: number;
  completionPct: number;
}

export function moodVsCompletion(profile: UserProfile): MoodCompletionPoint[] {
  return Object.values(profile.journal)
    .map((entry) => {
      const dayRec = profile.days[entry.day];
      if (!dayRec) return null;
      const statuses = Object.values(dayRec.tasks);
      const total = statuses.length;
      const done = statuses.filter((s) => s === "done").length;
      const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { day: entry.day, mood: entry.mood, completionPct };
    })
    .filter((x): x is MoodCompletionPoint => x !== null)
    .sort((a, b) => a.day - b.day);
}

export function pearsonCorrelation(points: MoodCompletionPoint[]): number | null {
  if (points.length < 4) return null;
  const n = points.length;
  const xs = points.map((p) => p.completionPct);
  const ys = points.map((p) => p.mood);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return null;
  return num / Math.sqrt(denX * denY);
}

export function monthlyIncomeTotal(profile: UserProfile, yearMonth: string): number {
  return profile.income
    .filter((e) => e.date.slice(0, 7) === yearMonth)
    .reduce((sum, e) => sum + e.amountKES, 0);
}

export interface LifeAreaCompletion {
  key: LifeAreaKey;
  done: number;
  total: number;
  pct: number;
}

export function lifeAreaCompletion(profile: UserProfile): Record<LifeAreaKey, LifeAreaCompletion> {
  const counts: Record<LifeAreaKey, { done: number; total: number }> = {
    health: { done: 0, total: 0 },
    learning: { done: 0, total: 0 },
    productivity: { done: 0, total: 0 },
    business: { done: 0, total: 0 },
    finances: { done: 0, total: 0 },
    relationships: { done: 0, total: 0 },
    mindset: { done: 0, total: 0 },
  };
  const taskByUid = new Map(profile.tasks.map((t) => [t.uid, t]));

  Object.values(profile.days).forEach((day) => {
    Object.entries(day.tasks).forEach(([uid, status]) => {
      const task = taskByUid.get(uid);
      if (!task) return;
      if (status === "done" || status === "skipped") {
        counts[task.lifeArea].total += 1;
        if (status === "done") counts[task.lifeArea].done += 1;
      }
    });
  });

  const out = {} as Record<LifeAreaKey, LifeAreaCompletion>;
  (Object.keys(counts) as LifeAreaKey[]).forEach((key) => {
    const c = counts[key];
    out[key] = { key, done: c.done, total: c.total, pct: c.total > 0 ? c.done / c.total : 0 };
  });
  return out;
}

/** Fraction (0-1) of the 5 goal-horizon fields (daily/weekly/monthly/6mo/yearly) that have real text in them, per area. */
export function goalFillRate(profile: UserProfile): Record<LifeAreaKey, number> {
  const out = {} as Record<LifeAreaKey, number>;
  (Object.keys(profile.goals) as LifeAreaKey[]).forEach((key) => {
    const g = profile.goals[key];
    const fields = [g.daily, g.weekly, g.monthly, g.sixMonth, g.yearly];
    const filled = fields.filter((f) => f.trim().length > 0).length;
    out[key] = filled / fields.length;
  });
  return out;
}
/**
 * Behavior-derived stats — replaces the old quiz-personality guesses. These move
 * only as real tasks get completed, so they reflect what you've actually done.
 */
export function computeBehaviorStats(profile: UserProfile): Record<StatKey, number> {
  const c = lifeAreaCompletion(profile);
  const toStat = (pct: number) => Math.round(40 + pct * 40);
  return {
    strength: toStat(c.health.pct),
    wisdom: toStat(c.learning.pct),
    focus: toStat((c.productivity.pct + c.business.pct) / 2),
    confidence: toStat(c.relationships.pct),
    discipline: toStat(c.mindset.pct),
  };
}
