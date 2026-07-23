import type { TaskPriority, TimeOfDay, UserProfile } from "@/types";
import { programDayFromDate } from "@/lib/planGenerator";

export interface PerfectDayStats {
  current: number;
  longest: number;
}

/** A "perfect day" = every scheduled task that day was completed (none skipped/pending), and at least 1 task was scheduled. */
export function computePerfectDayStreak(profile: UserProfile): PerfectDayStats {
  if (!profile.startDate) return { current: 0, longest: 0 };
  const todayDay = programDayFromDate(profile.startDate, new Date().toISOString().slice(0, 10));

  const isPerfect = (day: number): boolean | null => {
    const rec = profile.days[day];
    if (!rec) return null; // no data — don't count, don't break
    const statuses = Object.values(rec.tasks);
    if (statuses.length === 0) return null;
    return statuses.every((s) => s === "done");
  };

  let current = 0;
  for (let d = todayDay; d >= 1; d--) {
    const p = isPerfect(d);
    if (p === null) continue; // skip days with no scheduled tasks, don't break the streak on them
    if (p) current++;
    else break;
  }

  let longest = current;
  let running = 0;
  const dayNumbers = Object.keys(profile.days).map(Number).sort((a, b) => a - b);
  for (const d of dayNumbers) {
    const p = isPerfect(d);
    if (p === null) continue;
    if (p) {
      running++;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  return { current, longest };
}

export interface CorrelationInsight {
  taskA: string;
  taskB: string;
  withRate: number; // completion rate of A on days B was also done
  withoutRate: number; // completion rate of A on days B was not done
  overlapDays: number;
}

interface DaySignal {
  label: string;
  /** day -> whether this signal was "on" (task done, sleep logged, journal written) that day. Only include days where the signal was resolvable/scheduled. */
  byDay: Map<number, boolean>;
}

/** Builds day-indexed signals for every task (done vs not-done, only on days it was scheduled) plus two lifestyle signals — a sleep log existing that day, and a journal entry existing that day — so correlations can surface cross-domain patterns, not just task-vs-task. */
function buildDaySignals(profile: UserProfile): DaySignal[] {
  const signals: DaySignal[] = [];

  for (const task of profile.tasks) {
    const byDay = new Map<number, boolean>();
    Object.values(profile.days).forEach((rec) => {
      const status = rec.tasks[task.uid];
      if (status === undefined || status === "pending") return;
      byDay.set(rec.day, status === "done");
    });
    if (byDay.size > 0) signals.push({ label: task.label, byDay });
  }

  // Map calendar dates -> program day so lifestyle logs (which are date-keyed, not day-keyed) line up with task signals.
  const dayByDate = new Map<string, number>();
  Object.values(profile.days).forEach((rec) => dayByDate.set(rec.date, rec.day));

  const sleepByDay = new Map<number, boolean>();
  Object.values(profile.days).forEach((rec) => sleepByDay.set(rec.day, false));
  profile.sleepLogs.forEach((log) => {
    const day = dayByDate.get(log.date);
    if (day !== undefined) sleepByDay.set(day, true);
  });
  if (sleepByDay.size > 0) signals.push({ label: "logging your sleep", byDay: sleepByDay });

  const journalByDay = new Map<number, boolean>();
  Object.values(profile.days).forEach((rec) => journalByDay.set(rec.day, false));
  Object.keys(profile.journal).forEach((dayKey) => {
    const day = Number(dayKey);
    if (profile.days[day]) journalByDay.set(day, true);
  });
  if (journalByDay.size > 0) signals.push({ label: "journaling", byDay: journalByDay });

  return signals;
}

/** Finds the strongest pairwise "you do X more/less often on days you also do Y" relationships — across tasks and lifestyle signals (sleep logging, journaling), not just task-vs-task. */
export function computeHabitCorrelations(profile: UserProfile, minOverlap = 8, maxResults = 2): CorrelationInsight[] {
  const signals = buildDaySignals(profile);
  const results: CorrelationInsight[] = [];

  for (let i = 0; i < signals.length; i++) {
    for (let j = 0; j < signals.length; j++) {
      if (i === j) continue;
      const a = signals[i];
      const b = signals[j];

      let bothScheduled = 0;
      let aDoneWhenBDone = 0;
      let bDoneCount = 0;
      let aDoneWhenBNotDone = 0;
      let bNotDoneCount = 0;

      for (const [day, aDone] of a.byDay) {
        if (!b.byDay.has(day)) continue;
        const bDone = b.byDay.get(day)!;
        bothScheduled++;
        if (bDone) {
          bDoneCount++;
          if (aDone) aDoneWhenBDone++;
        } else {
          bNotDoneCount++;
          if (aDone) aDoneWhenBNotDone++;
        }
      }

      if (bothScheduled < minOverlap || bDoneCount < 3 || bNotDoneCount < 3) continue;

      const withRate = aDoneWhenBDone / bDoneCount;
      const withoutRate = aDoneWhenBNotDone / bNotDoneCount;
      if (Math.abs(withRate - withoutRate) < 0.25) continue; // not a meaningful gap

      results.push({ taskA: a.label, taskB: b.label, withRate, withoutRate, overlapDays: bothScheduled });
    }
  }

  results.sort((x, y) => Math.abs(y.withRate - y.withoutRate) - Math.abs(x.withRate - x.withoutRate));
  // dedupe reversed pairs (A-given-B and B-given-A can both pass; keep the stronger one)
  const seen = new Set<string>();
  const deduped: CorrelationInsight[] = [];
  for (const r of results) {
    const key = [r.taskA, r.taskB].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }
  return deduped.slice(0, maxResults);
}

export function correlationSentence(c: CorrelationInsight): string {
  const pctPoints = Math.round(Math.abs(c.withRate - c.withoutRate) * 100);
  if (c.withRate > c.withoutRate) {
    return `You complete "${c.taskA}" ${pctPoints} points more often on days you also do "${c.taskB}".`;
  }
  return `You complete "${c.taskA}" ${pctPoints} points less often on days you also do "${c.taskB}".`;
}

/** "Predicts" framing for the weekly snapshot — same data, phrased as a standing pattern rather than a point-in-time stat. */
export function correlationPredictsSentence(c: CorrelationInsight): string {
  const pct = Math.round(Math.max(c.withRate, c.withoutRate) * 100);
  if (c.withRate > c.withoutRate) {
    return `Days you do "${c.taskB}" predict ${pct}% of your "${c.taskA}" completions.`;
  }
  return `Days you skip "${c.taskB}" predict ${pct}% of your missed "${c.taskA}".`;
}


export interface HeatmapDay {
  date: string;
  status: "done" | "skipped" | "pending" | "none";
}

/** Builds a day-by-day series for a single task, for heatmap rendering. */
export function taskHeatmapSeries(taskUid: string, profile: UserProfile, weeksBack = 12): HeatmapDay[] {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - weeksBack * 7);

  const byDate = new Map<string, "done" | "skipped" | "pending">();
  Object.values(profile.days).forEach((d) => {
    const status = d.tasks[taskUid];
    if (status) byDate.set(d.date, status);
  });

  const out: HeatmapDay[] = [];
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, status: byDate.get(iso) ?? "none" });
  }
  return out;
}

const MIN_TOD_SAMPLES = 8;
const MIN_TOD_GAP = 0.15;

export interface TimeOfDayInsight {
  best: TimeOfDay;
  worst: TimeOfDay;
  bestRate: number;
  worstRate: number;
}

/**
 * Aggregate completion rate by scheduled time-of-day bucket, across every
 * task and day. Built entirely from data already tracked (task.timeOfDay +
 * day.tasks status) — no new per-completion tracking needed.
 */
export function computeTimeOfDayPerformance(profile: UserProfile): Partial<Record<TimeOfDay, { rate: number; scheduled: number }>> {
  const byBucket: Partial<Record<TimeOfDay, { done: number; scheduled: number }>> = {};
  const taskByUid = new Map(profile.tasks.map((t) => [t.uid, t]));

  Object.values(profile.days).forEach((day) => {
    Object.entries(day.tasks).forEach(([uid, status]) => {
      if (status === "pending") return; // only count resolved outcomes
      const task = taskByUid.get(uid);
      const bucket: TimeOfDay = task?.timeOfDay ?? "anytime";
      const entry = byBucket[bucket] ?? { done: 0, scheduled: 0 };
      entry.scheduled++;
      if (status === "done") entry.done++;
      byBucket[bucket] = entry;
    });
  });

  const out: Partial<Record<TimeOfDay, { rate: number; scheduled: number }>> = {};
  (Object.keys(byBucket) as TimeOfDay[]).forEach((bucket) => {
    const entry = byBucket[bucket];
    if (!entry) return;
    out[bucket] = { rate: entry.done / entry.scheduled, scheduled: entry.scheduled };
  });
  return out;
}

/** Best/worst-performing time-of-day bucket, or null if there isn't enough data to say anything meaningful yet. */
export function timeOfDayInsight(profile: UserProfile): TimeOfDayInsight | null {
  const perf = computeTimeOfDayPerformance(profile);
  const entries = (Object.entries(perf) as [TimeOfDay, { rate: number; scheduled: number }][]).filter(
    ([bucket, v]) => bucket !== "anytime" && v.scheduled >= MIN_TOD_SAMPLES
  );
  if (entries.length < 2) return null;

  entries.sort((a, b) => b[1].rate - a[1].rate);
  const [bestBucket, bestVal] = entries[0];
  const [worstBucket, worstVal] = entries[entries.length - 1];
  if (bestVal.rate - worstVal.rate < MIN_TOD_GAP) return null; // not a meaningful gap

  return { best: bestBucket, worst: worstBucket, bestRate: bestVal.rate, worstRate: worstVal.rate };
}

const MIN_TASK_SAMPLES = 10;
const PRIORITY_ORDER: TaskPriority[] = ["P1", "P2", "P3"];

export interface PrioritySuggestion {
  uid: string;
  label: string;
  currentPriority: TaskPriority;
  suggestedPriority: TaskPriority;
  rate: number;
  scheduled: number;
  direction: "upgrade" | "downgrade";
}

function taskCompletionRate(profile: UserProfile, uid: string): { rate: number; scheduled: number } | null {
  let done = 0;
  let scheduled = 0;
  Object.values(profile.days).forEach((day) => {
    const status = day.tasks[uid];
    if (status === undefined || status === "pending") return;
    scheduled++;
    if (status === "done") done++;
  });
  if (scheduled === 0) return null;
  return { rate: done / scheduled, scheduled };
}

/**
 * Flags tasks whose actual completion rate doesn't match their stated
 * priority — e.g. a P1 that's consistently skipped, or a P3 that's basically
 * never missed — and suggests the adjacent tier. Uses only data already
 * tracked per task (priority + day-by-day status).
 */
export function priorityRebalanceSuggestions(profile: UserProfile, maxResults = 3): PrioritySuggestion[] {
  const results: PrioritySuggestion[] = [];

  for (const task of profile.tasks) {
    const perf = taskCompletionRate(profile, task.uid);
    if (!perf || perf.scheduled < MIN_TASK_SAMPLES) continue;

    let suggested: TaskPriority | null = null;
    if (task.priority === "P1" && perf.rate < 0.45) suggested = "P2";
    else if (task.priority === "P2" && perf.rate < 0.35) suggested = "P3";
    else if (task.priority === "P3" && perf.rate > 0.9) suggested = "P2";
    else if (task.priority === "P2" && perf.rate > 0.9) suggested = "P1";
    if (!suggested) continue;

    const direction: "upgrade" | "downgrade" =
      PRIORITY_ORDER.indexOf(suggested) < PRIORITY_ORDER.indexOf(task.priority) ? "upgrade" : "downgrade";

    results.push({
      uid: task.uid,
      label: task.label,
      currentPriority: task.priority,
      suggestedPriority: suggested,
      rate: perf.rate,
      scheduled: perf.scheduled,
      direction,
    });
  }

  // More samples = more reliable suggestion; show the most confident ones first.
  results.sort((a, b) => b.scheduled - a.scheduled);
  return results.slice(0, maxResults);
}

const MIN_FREQ_SAMPLES = 10;
const FREQ_MISS_THRESHOLD = 0.5; // completion rate below this triggers a pacing suggestion
const RECENT_WINDOW_DAYS = 21; // only look at recent behavior — old history shouldn't hold a suggestion hostage

export interface FrequencySuggestion {
  uid: string;
  label: string;
  currentFrequency: number;
  suggestedFrequency: number;
  rate: number;
  scheduled: number;
  missedRecently: number;
}

/**
 * Flags tasks that are being missed often enough at their current weekly
 * frequency that the frequency itself — not just willpower — looks like the
 * problem, and suggests stepping it down by one. Only looks at the most
 * recent window so a rough patch from months ago doesn't linger as a nag,
 * and only ever suggests down (never auto-raises frequency — a task going
 * well is left alone rather than pushed harder).
 */
export interface TaskCompletionRate {
  done: number;
  scheduled: number;
  rate: number; // 0-1, NaN-safe (0 when nothing scheduled)
}

/** Completion rate for one specific task over the last `windowDays` program-days (default 7, for weekly-review use). */
export function taskCompletionRateWindowed(taskUid: string, profile: UserProfile, windowDays = 7): TaskCompletionRate {
  if (!profile.startDate) return { done: 0, scheduled: 0, rate: 0 };
  const todayProgramDay = programDayFromDate(profile.startDate, new Date().toISOString().slice(0, 10));
  const windowStart = todayProgramDay - windowDays + 1;

  let done = 0;
  let scheduled = 0;
  for (let d = Math.max(1, windowStart); d <= todayProgramDay; d++) {
    const status = profile.days[d]?.tasks[taskUid];
    if (status === undefined || status === "pending") continue;
    scheduled++;
    if (status === "done") done++;
  }

  return { done, scheduled, rate: scheduled > 0 ? done / scheduled : 0 };
}

export function frequencyRebalanceSuggestions(profile: UserProfile, maxResults = 3): FrequencySuggestion[] {
  if (!profile.startDate) return [];
  const todayProgramDay = programDayFromDate(profile.startDate, new Date().toISOString().slice(0, 10));
  const windowStart = todayProgramDay - RECENT_WINDOW_DAYS;

  const results: FrequencySuggestion[] = [];

  for (const task of profile.tasks) {
    if (task.frequencyPerWeek <= 1) continue; // already at the floor

    let done = 0;
    let scheduled = 0;
    let missed = 0;
    for (let d = Math.max(1, windowStart); d <= todayProgramDay; d++) {
      const status = profile.days[d]?.tasks[task.uid];
      if (status === undefined || status === "pending") continue;
      scheduled++;
      if (status === "done") done++;
      else missed++;
    }

    if (scheduled < MIN_FREQ_SAMPLES) continue;
    const rate = done / scheduled;
    if (rate >= FREQ_MISS_THRESHOLD) continue;

    results.push({
      uid: task.uid,
      label: task.label,
      currentFrequency: task.frequencyPerWeek,
      suggestedFrequency: task.frequencyPerWeek - 1,
      rate,
      scheduled,
      missedRecently: missed,
    });
  }

  // Worst completion rate first — the clearest case for easing up.
  results.sort((a, b) => a.rate - b.rate);
  return results.slice(0, maxResults);
}

const SEASON_MIN_DAYS = 14;
const SEASON_MAX_DAYS = 40;
const SEASON_BASE_DAYS = 24;
const SEASON_MIN_SAMPLES = 7; // don't re-pace off less than a week of data

export interface SeasonPacing {
  suggestedDurationDays: number;
  rate: number;
  scheduled: number;
  pace: "ahead" | "on-pace" | "behind";
}

/**
 * Paces the current season's length off the player's own recent completion
 * rate instead of a fixed curve: a high completion rate shortens the season
 * (momentum — let them hit the finish line and start the next one), a low
 * rate lengthens it (room to actually complete the arc instead of resetting
 * on a loss). Bounded so a single great or bad week can't send it to an
 * extreme.
 */
export function computeSeasonPacing(profile: UserProfile): SeasonPacing | null {
  if (!profile.startDate) return null;
  const todayProgramDay = programDayFromDate(profile.startDate, new Date().toISOString().slice(0, 10));
  const seasonStartDay = programDayFromDate(profile.startDate, profile.season.startDate);

  let done = 0;
  let scheduled = 0;
  for (let d = Math.max(1, seasonStartDay); d <= todayProgramDay; d++) {
    const rec = profile.days[d];
    if (!rec) continue;
    Object.values(rec.tasks).forEach((status) => {
      if (status === "pending") return;
      scheduled++;
      if (status === "done") done++;
    });
  }

  if (scheduled < SEASON_MIN_SAMPLES) return null;
  const rate = done / scheduled;

  // Linear scale: 100% completion -> SEASON_MIN_DAYS, 0% -> SEASON_MAX_DAYS,
  // anchored so ~65% completion lands close to the original fixed 24-day baseline.
  const raw = SEASON_MAX_DAYS - rate * (SEASON_MAX_DAYS - SEASON_MIN_DAYS);
  const suggestedDurationDays = Math.round(Math.min(SEASON_MAX_DAYS, Math.max(SEASON_MIN_DAYS, raw)));

  const pace: SeasonPacing["pace"] =
    suggestedDurationDays < SEASON_BASE_DAYS - 2 ? "ahead" : suggestedDurationDays > SEASON_BASE_DAYS + 2 ? "behind" : "on-pace";

  return { suggestedDurationDays, rate, scheduled, pace };
}
