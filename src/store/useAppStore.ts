import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  DailyQuest,
  DayRecord,
  IncomeEntry,
  IncomeGoal,
  ExpenseEntry,
  BudgetCategory,
  JournalEntry,
  LifeAreaKey,
  LifeAreaGoal,
  MitEntry,
  ObjectiveHorizon,
  PlannedTask,
  RecurrenceRule,
  SleepLog,
  StatKey,
  StreakHabit,
  DetoxHabit,
  DetoxHabitType,
  DetoxLogEntry,
  TaskPriority,
  TaskStatus,
  TimeBlock,
  TimeOfDay,
  UserProfile,
  VentureLog,
  QuestPillar,
  DevotionalSettings,
  CoachTone,
  CorrelationSnapshotEntry,
} from "@/types";
import { isoWeekKey } from "@/lib/isoWeek";
import { buildCalendar, distributeWeekdays, xpForTask, programDayFromDate } from "@/lib/planGenerator";
import { RANK_TIERS } from "@/types";
import { EMPTY_GOALS } from "@/data/lifeAreas";
import { STREAK_TEMPLATES } from "@/data/streakDefaults";
import { evaluateMilestones } from "@/lib/milestones";
import { DEFAULT_QUEST_PILLARS } from "@/data/questPillars";
import { DEFAULT_COACH_TONE } from "@/data/coachTones";

const todayIso = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

const DEFAULT_DEVOTIONAL: DevotionalSettings = { enabled: true, mode: "sequential" };

const DEFAULT_INCOME_GOAL: IncomeGoal = {
  min: 30000,
  max: 60000,
  currency: "KES",
  targetDate: `${new Date().getFullYear()}-12-31`,
};

const DEFAULT_BUDGET_CATEGORIES: BudgetCategory[] = [
  { name: "Business costs", capKES: 15000 },
  { name: "Food & transport", capKES: 12000 },
  { name: "Personal", capKES: 8000 },
  { name: "Savings", capKES: 10000 },
];

/** Handles the pre-fix shape ({amount, currency, targetDate}) some early saves may have. */
function migrateIncomeGoal(raw: unknown): IncomeGoal {
  if (!raw || typeof raw !== "object") return DEFAULT_INCOME_GOAL;
  const g = raw as Partial<IncomeGoal> & { amount?: number };
  if (typeof g.min === "number" && typeof g.max === "number") {
    return { min: g.min, max: g.max, currency: g.currency ?? "KES", targetDate: g.targetDate ?? DEFAULT_INCOME_GOAL.targetDate };
  }
  if (typeof g.amount === "number") {
    // old single-amount shape — treat it as the ceiling of a sensible range
    return { min: Math.round(g.amount * 0.5), max: g.amount, currency: "KES", targetDate: g.targetDate ?? DEFAULT_INCOME_GOAL.targetDate };
  }
  return DEFAULT_INCOME_GOAL;
}

/**
 * Repairs a profile blob that may be missing fields added in later app versions
 * (e.g. an old localStorage snapshot, or an older row pulled from Supabase).
 * `base` supplies safe fallbacks for anything missing/malformed in `p`.
 */
function sanitizeProfile(base: UserProfile, p: Partial<UserProfile>): UserProfile {
  return {
    ...base,
    ...p,
    tools: { ...base.tools, ...(p.tools ?? {}) },
    goals: (() => {
      const merged = { ...EMPTY_GOALS };
      (Object.keys(EMPTY_GOALS) as LifeAreaKey[]).forEach((key) => {
        const saved = (p.goals as Record<string, Partial<LifeAreaGoal>> | undefined)?.[key];
        merged[key] = { ...EMPTY_GOALS[key], ...base.goals[key], ...(saved ?? {}) };
      });
      return merged;
    })(),
    pinnedFocusArea: p.pinnedFocusArea ?? null,
    lastGoalsReviewAt: p.lastGoalsReviewAt ?? null,
    streaks: Array.isArray(p.streaks) ? p.streaks.map((h) => ({ ...h, mode: h.mode ?? "avoidance" })) : [],
    detoxHabits: Array.isArray(p.detoxHabits) ? p.detoxHabits : [],
    journal: p.journal ?? {},
    income: Array.isArray(p.income) ? p.income : [],
    expenses: Array.isArray(p.expenses) ? p.expenses : [],
    budgetCategories:
      Array.isArray(p.budgetCategories) && p.budgetCategories.length > 0 ? p.budgetCategories : DEFAULT_BUDGET_CATEGORIES,
    aboutMe: p.aboutMe ?? "",
    ventures: Array.isArray(p.ventures) && p.ventures.length > 0 ? p.ventures : ["Freelance", "Side project", "Other"],
    milestones: Array.isArray(p.milestones) ? p.milestones : [],
    tasks: Array.isArray(p.tasks)
      ? p.tasks.map((t) => ({
          ...t,
          lifeArea: t.lifeArea ?? ("productivity" as LifeAreaKey),
          timeOfDay: t.timeOfDay ?? "anytime",
          priority: t.priority ?? ("P2" as TaskPriority),
        }))
      : [],
    timeBlocks: p.timeBlocks ?? {},
    ventureLogs: Array.isArray(p.ventureLogs) ? p.ventureLogs : [],
    sleepLogs: Array.isArray(p.sleepLogs) ? p.sleepLogs : [],
    mitByDay: p.mitByDay ?? {},
    weeklyFocus: p.weeklyFocus ?? {},
    eveningPlanned: p.eveningPlanned ?? {},
<<<<<<< HEAD
    dayCompleteShown: p.dayCompleteShown ?? {},
=======
>>>>>>> 2cbfdcef78ad01192da598ce6a87ce9ba4536bfc
    skipReasons: p.skipReasons ?? {},
    dailyGospel: p.dailyGospel ?? {},
    dailyReview: p.dailyReview ?? {},
    weeklyReports: p.weeklyReports ?? {},
    quests: p.quests ?? {},
    questReroll: p.questReroll ?? { weekKey: isoWeekKey(), usedThisWeek: 0, usedToday: {} },
    incomeGoal: migrateIncomeGoal(p.incomeGoal),
    questPillars: p.questPillars && p.questPillars.length > 0 ? p.questPillars : DEFAULT_QUEST_PILLARS,
    devotional: p.devotional ?? DEFAULT_DEVOTIONAL,
    coachTone: p.coachTone ?? DEFAULT_COACH_TONE,
    correlationSnapshots: p.correlationSnapshots ?? {},
  };
}

const emptyProfile: UserProfile = {
  onboarded: false,
  aboutMe: "",
  quiz: null,
  resetType: null,
  stats: { wisdom: 42, confidence: 42, strength: 42, discipline: 42, focus: 42 },
  vow: { antiVision: "", vowText: "", signedAt: null },
  tasks: [],
  startDate: null,
  days: {},
  xpTotal: 0,
  season: { seasonNumber: 1, startDate: todayIso(), durationDays: 24, xpThisSeason: 0 },
  difficultyMultiplier: 1,
  tools: { workoutLog: [], meditationMinutes: 0, pomodoroSessions: 0, bookProgress: {} },
  streaks: [],
  detoxHabits: [],
  journal: {},
  income: [],
  expenses: [],
  budgetCategories: DEFAULT_BUDGET_CATEGORIES,
  ventures: ["Freelance", "Side project", "Other"],
  goals: EMPTY_GOALS,
  pinnedFocusArea: null,
  lastGoalsReviewAt: null,
  milestones: [],
  timeBlocks: {},
  ventureLogs: [],
  sleepLogs: [],
  mitByDay: {},
  weeklyFocus: {},
  eveningPlanned: {},
<<<<<<< HEAD
  dayCompleteShown: {},
=======
>>>>>>> 2cbfdcef78ad01192da598ce6a87ce9ba4536bfc
  skipReasons: {},
  dailyGospel: {},
  dailyReview: {},
  weeklyReports: {},
  quests: {},
  questReroll: { weekKey: isoWeekKey(), usedThisWeek: 0, usedToday: {} },
  incomeGoal: DEFAULT_INCOME_GOAL,
  questPillars: DEFAULT_QUEST_PILLARS,
  devotional: DEFAULT_DEVOTIONAL,
  coachTone: DEFAULT_COACH_TONE,
  correlationSnapshots: {},
};

interface AppState {
  profile: UserProfile;
  addTask: (
    taskId: string,
    label: string,
    icon: string,
    category: string,
    lifeArea: LifeAreaKey,
    frequencyPerWeek: number,
    applyToAllWeeks: boolean,
    currentWeek: number,
    timeOfDay?: TimeOfDay
  ) => void;
  addRecurringTask: (
    taskId: string,
    label: string,
    icon: string,
    category: string,
    lifeArea: LifeAreaKey,
    recurrence: RecurrenceRule,
    priority: TaskPriority,
    timeOfDay?: TimeOfDay
  ) => void;
  setTaskTimeOfDay: (uid: string, timeOfDay: TimeOfDay) => void;
  setTaskPriority: (uid: string, priority: TaskPriority) => void;
  removeTask: (uid: string) => void;
  updateTaskFrequency: (uid: string, freq: number) => void;
  startProgram: (startDateOverride?: string) => void;
  setDifficulty: (mult: number) => void;
  setSeasonDuration: (days: number) => void;
  setVowAntiVision: (text: string) => void;
  signVow: (vowText: string) => void;
  completeTask: (day: number, uid: string) => void;
  skipTask: (day: number, uid: string, reason?: string) => void;
  regenerateCalendar: () => void;
  resetAll: () => void;
  markOnboarded: () => void;
  logWorkoutSet: (label: string, sets: number, reps: number) => void;
  addMeditationMinutes: (mins: number) => void;
  logPomodoroSession: () => void;
  setBookProgress: (bookId: string, chapter: number) => void;
  seedStreaksFromQuiz: () => void;
  seedStreaksFromSelection: (templateValues: string[]) => void;
  addStreakHabit: (
    label: string,
    icon: string,
    mode?: "avoidance" | "positive",
    linkedTaskUid?: string,
    color?: string,
    startedDaysAgo?: number
  ) => void;
  logRelapse: (streakId: string, note: string) => void;
  removeStreakHabit: (streakId: string) => void;
  updateStreakColor: (streakId: string, color: string) => void;
  /** Retroactively correct an avoidance streak's start date/time (e.g. you started counting late). */
  updateStreakStart: (streakId: string, startedAt: string) => void;
  addDetoxHabit: (label: string, icon: string, type: DetoxHabitType, color: string, dailyLimit?: number) => void;
  removeDetoxHabit: (habitId: string) => void;
  logDetoxEntry: (habitId: string, clean: boolean, count?: number, note?: string) => void;
  saveJournalEntry: (day: number, entry: Partial<Omit<JournalEntry, "day" | "savedAt">>) => void;
  addIncomeEntry: (venture: string, amountKES: number, note?: string) => void;
  removeIncomeEntry: (id: string) => void;
  addExpenseEntry: (category: string, amountKES: number, note?: string) => void;
  removeExpenseEntry: (id: string) => void;
  setBudgetCategory: (name: string, capKES: number) => void;
  setAboutMe: (text: string) => void;
  addVenture: (name: string) => void;
  removeVenture: (name: string) => void;
  removeBudgetCategory: (name: string) => void;
  setGoal: (lifeArea: LifeAreaKey, horizon: ObjectiveHorizon, text: string) => void;
  setGoalWhy: (lifeArea: LifeAreaKey, why: string) => void;
  setGoalDailyLink: (lifeArea: LifeAreaKey, linkType: "none" | "task" | "streak", linkId: string) => void;
  setPinnedFocusArea: (area: LifeAreaKey | null) => void;
  markGoalsReviewed: () => void;
  checkMilestones: () => void;
  addMilestone: (label: string, description: string) => void;
  addTimeBlock: (date: string, block: Omit<TimeBlock, "id">) => void;
  removeTimeBlock: (date: string, id: string) => void;
  toggleTimeBlockDone: (date: string, id: string) => void;
  /** Copies an incomplete block from one date to another (used for "carry over to today"), removing it from the source. */
  moveTimeBlock: (fromDate: string, id: string, toDate: string) => void;
  setEveningPlanned: (dateKey: string, done: boolean) => void;
<<<<<<< HEAD
  /** Marks today's "all tasks done" popup as shown so it only fires once per calendar date. */
  markDayCompleteShown: (dateKey: string) => void;
=======
>>>>>>> 2cbfdcef78ad01192da598ce6a87ce9ba4536bfc
  addVentureLog: (venture: string, minutes: number) => void;
  addSleepLog: (bedtime: string, waketime: string) => void;
  setMit: (day: number, entry: MitEntry) => void;
  toggleMitDone: (day: number) => void;
  setWeeklyFocus: (weekKey: string, text: string) => void;
  setDailyGospel: (dateKey: string, ref: string, text: string, reflection?: string) => void;
  setDailyReview: (dateKey: string, text: string) => void;
  setWeeklyReport: (weekKey: string, text: string) => void;
  setQuestsForDay: (dateKey: string, quests: DailyQuest[]) => void;
  completeQuest: (dateKey: string, questId: string) => void;
  /** Applies a reroll: consumes one reroll credit (if available) and swaps in the replacement quest. Returns false if no credits remain. */
  rerollQuest: (dateKey: string, questId: string, replacement: DailyQuest) => boolean;
  rerollsRemaining: () => { thisWeek: number; today: number };
  setIncomeGoal: (goal: IncomeGoal) => void;
  setQuestPillars: (pillars: QuestPillar[]) => void;
  setDevotionalSettings: (settings: DevotionalSettings) => void;
  setCoachTone: (tone: CoachTone) => void;
  setCorrelationSnapshot: (weekKey: string, entries: CorrelationSnapshotEntry[]) => void;
  /** Adopts a profile pulled from Supabase, repairing any fields missing/stale relative to this app version. */
  hydrateFromRemote: (remote: Partial<UserProfile>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: emptyProfile,

      addTask: (taskId, label, icon, category, lifeArea, frequencyPerWeek, applyToAllWeeks, currentWeek, timeOfDay) => {
        const uid = `${taskId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const activeDays = distributeWeekdays(frequencyPerWeek);
        const newTask: PlannedTask = {
          uid,
          taskId,
          label,
          icon,
          category,
          lifeArea,
          priority: "P2",
          frequencyPerWeek,
          activeDays,
          addedOnWeek: currentWeek,
          applyToAllWeeks,
          timeOfDay: timeOfDay ?? "anytime",
        };
        set((s) => ({
          profile: { ...s.profile, tasks: [...s.profile.tasks, newTask] },
        }));
      },

      addRecurringTask: (taskId, label, icon, category, lifeArea, recurrence, priority, timeOfDay) => {
        const uid = `${taskId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const newTask: PlannedTask = {
          uid,
          taskId,
          label,
          icon,
          category,
          lifeArea,
          priority,
          frequencyPerWeek: recurrence.weekdays.length || 1,
          activeDays: recurrence.weekdays,
          addedOnWeek: 1,
          applyToAllWeeks: true,
          timeOfDay: timeOfDay ?? "anytime",
          recurrence,
        };
        set((s) => ({
          profile: { ...s.profile, tasks: [...s.profile.tasks, newTask] },
        }));
      },

      setTaskTimeOfDay: (uid, timeOfDay) => {
        set((s) => ({
          profile: {
            ...s.profile,
            tasks: s.profile.tasks.map((t) => (t.uid === uid ? { ...t, timeOfDay } : t)),
          },
        }));
      },

      setTaskPriority: (uid, priority) => {
        set((s) => ({
          profile: {
            ...s.profile,
            tasks: s.profile.tasks.map((t) => (t.uid === uid ? { ...t, priority } : t)),
          },
        }));
      },

      removeTask: (uid) => {
        set((s) => ({
          profile: { ...s.profile, tasks: s.profile.tasks.filter((t) => t.uid !== uid) },
        }));
      },

      updateTaskFrequency: (uid, freq) => {
        set((s) => ({
          profile: {
            ...s.profile,
            tasks: s.profile.tasks.map((t) =>
              t.uid === uid ? { ...t, frequencyPerWeek: freq, activeDays: distributeWeekdays(freq) } : t
            ),
          },
        }));
      },

      startProgram: (startDateOverride) => {
        const start = startDateOverride ?? todayIso();
        set((s) => {
          const days = buildCalendar(start, s.profile.tasks, {});
          return {
            profile: {
              ...s.profile,
              startDate: start,
              days,
              season: { ...s.profile.season, startDate: start },
            },
          };
        });
      },

      setDifficulty: (mult) => set((s) => ({ profile: { ...s.profile, difficultyMultiplier: mult } })),

      setSeasonDuration: (days) =>
        set((s) => ({ profile: { ...s.profile, season: { ...s.profile.season, durationDays: days } } })),

      setVowAntiVision: (text) =>
        set((s) => ({ profile: { ...s.profile, vow: { ...s.profile.vow, antiVision: text } } })),

      signVow: (vowText) =>
        set((s) => ({
          profile: {
            ...s.profile,
            vow: { ...s.profile.vow, vowText, signedAt: new Date().toISOString() },
          },
        })),

      completeTask: (day, uid) => {
        set((s) => {
          const rec: DayRecord | undefined = s.profile.days[day];
          if (!rec) return s;
          const wasStatus: TaskStatus = rec.tasks[uid];
          if (wasStatus === "done") return s;
          const xp = xpForTask();
          const updatedRec: DayRecord = {
            ...rec,
            tasks: { ...rec.tasks, [uid]: "done" },
            xpEarned: rec.xpEarned + xp,
          };
          return {
            profile: {
              ...s.profile,
              days: { ...s.profile.days, [day]: updatedRec },
              xpTotal: s.profile.xpTotal + xp,
              season: { ...s.profile.season, xpThisSeason: s.profile.season.xpThisSeason + xp },
            },
          };
        });
        get().checkMilestones();
      },

      skipTask: (day, uid, reason) => {
        set((s) => {
          const rec = s.profile.days[day];
          if (!rec) return s;
          const updatedRec: DayRecord = { ...rec, tasks: { ...rec.tasks, [uid]: "skipped" } };
          const skipReasons = reason
            ? { ...s.profile.skipReasons, [`${day}-${uid}`]: reason }
            : s.profile.skipReasons;
          return { profile: { ...s.profile, days: { ...s.profile.days, [day]: updatedRec }, skipReasons } };
        });
      },

      regenerateCalendar: () => {
        const s = get();
        if (!s.profile.startDate) return;
        const days = buildCalendar(s.profile.startDate, s.profile.tasks, s.profile.days);
        set({ profile: { ...s.profile, days } });
      },

      resetAll: () => set({ profile: emptyProfile }),

      markOnboarded: () => set((s) => ({ profile: { ...s.profile, onboarded: true } })),

      logWorkoutSet: (label, sets, reps) => {
        set((s) => ({
          profile: {
            ...s.profile,
            tools: {
              ...s.profile.tools,
              workoutLog: [
                { id: `${Date.now()}`, date: todayIso(), label, sets, reps },
                ...s.profile.tools.workoutLog,
              ].slice(0, 50),
            },
          },
        }));
      },

      addMeditationMinutes: (mins) => {
        set((s) => ({
          profile: {
            ...s.profile,
            tools: { ...s.profile.tools, meditationMinutes: s.profile.tools.meditationMinutes + mins },
          },
        }));
      },

      logPomodoroSession: () => {
        set((s) => ({
          profile: {
            ...s.profile,
            tools: { ...s.profile.tools, pomodoroSessions: s.profile.tools.pomodoroSessions + 1 },
          },
        }));
      },

      setBookProgress: (bookId, chapter) => {
        set((s) => ({
          profile: {
            ...s.profile,
            tools: {
              ...s.profile.tools,
              bookProgress: { ...s.profile.tools.bookProgress, [bookId]: chapter },
            },
          },
        }));
      },

      seedStreaksFromQuiz: () => {
        const s = get();
        const addictions = s.profile.quiz?.addictions ?? [];
        if (s.profile.streaks.length > 0) return;
        const seeded: StreakHabit[] = STREAK_TEMPLATES.filter((t) =>
          addictions.includes(t.addictionValue)
        ).map((t) => ({
          id: `${t.addictionValue}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label: t.label,
          icon: t.icon,
          mode: "avoidance" as const,
          startedAt: nowIso(),
          bestStreakDays: 0,
          relapses: [],
        }));
        if (seeded.length > 0) {
          set((st) => ({ profile: { ...st.profile, streaks: [...st.profile.streaks, ...seeded] } }));
        }
      },

      seedStreaksFromSelection: (templateValues) => {
        const seeded: StreakHabit[] = STREAK_TEMPLATES.filter((t) =>
          templateValues.includes(t.addictionValue)
        ).map((t) => ({
          id: `${t.addictionValue}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label: t.label,
          icon: t.icon,
          mode: "avoidance" as const,
          startedAt: nowIso(),
          bestStreakDays: 0,
          relapses: [],
        }));
        if (seeded.length > 0) {
          set((st) => ({ profile: { ...st.profile, streaks: [...st.profile.streaks, ...seeded] } }));
        }
      },

      addStreakHabit: (label, icon, mode = "avoidance", linkedTaskUid, color, startedDaysAgo) => {
        const startedAt =
          startedDaysAgo && startedDaysAgo > 0
            ? new Date(Date.now() - startedDaysAgo * 86400000).toISOString()
            : nowIso();
        const newHabit: StreakHabit = {
          id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label,
          icon,
          color,
          mode,
          linkedTaskUid,
          startedAt,
          bestStreakDays: 0,
          relapses: [],
        };
        set((s) => ({ profile: { ...s.profile, streaks: [...s.profile.streaks, newHabit] } }));
      },

      updateStreakColor: (streakId, color) => {
        set((s) => ({
          profile: {
            ...s.profile,
            streaks: s.profile.streaks.map((h) => (h.id === streakId ? { ...h, color } : h)),
          },
        }));
      },

      updateStreakStart: (streakId, startedAt) => {
        set((s) => ({
          profile: {
            ...s.profile,
            streaks: s.profile.streaks.map((h) => {
              if (h.id !== streakId) return h;
              const daysSoFar = Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000);
              return { ...h, startedAt, bestStreakDays: Math.max(h.bestStreakDays, daysSoFar) };
            }),
          },
        }));
      },

      logRelapse: (streakId, note) => {
        set((s) => ({
          profile: {
            ...s.profile,
            streaks: s.profile.streaks.map((h) => {
              if (h.id !== streakId) return h;
              const daysSoFar = Math.floor(
                (Date.now() - new Date(h.startedAt).getTime()) / 86400000
              );
              return {
                ...h,
                bestStreakDays: Math.max(h.bestStreakDays, daysSoFar),
                startedAt: nowIso(),
                relapses: [
                  { id: `${Date.now()}`, timestamp: nowIso(), note },
                  ...h.relapses,
                ].slice(0, 200),
              };
            }),
          },
        }));
      },

      removeStreakHabit: (streakId) => {
        set((s) => ({
          profile: { ...s.profile, streaks: s.profile.streaks.filter((h) => h.id !== streakId) },
        }));
      },

      addDetoxHabit: (label, icon, type, color, dailyLimit) => {
        const now = nowIso();
        const habit: DetoxHabit = {
          id: `detox-${Date.now()}`,
          label,
          icon,
          color,
          type,
          dailyLimit: type === "quantityLimit" ? dailyLimit : undefined,
          startedAt: now,
          currentStreakStart: now,
          bestStreakDays: 0,
          logs: [],
        };
        set((s) => ({ profile: { ...s.profile, detoxHabits: [...s.profile.detoxHabits, habit] } }));
      },

      removeDetoxHabit: (habitId) => {
        set((s) => ({
          profile: { ...s.profile, detoxHabits: s.profile.detoxHabits.filter((h) => h.id !== habitId) },
        }));
      },

      logDetoxEntry: (habitId, clean, count, note) => {
        set((s) => ({
          profile: {
            ...s.profile,
            detoxHabits: s.profile.detoxHabits.map((h) => {
              if (h.id !== habitId) return h;
              const today = new Date().toISOString().slice(0, 10);
              const entry: DetoxLogEntry = {
                id: `${Date.now()}`,
                date: today,
                count,
                clean,
                note,
                timestamp: nowIso(),
              };
              const logs = [entry, ...h.logs].slice(0, 500);

              // A slip/over-limit day resets the current streak clock; a clean log doesn't
              // move the clock (the clock already started at the last slip, or at habit creation).
              if (!clean) {
                const daysSoFar = Math.floor((Date.now() - new Date(h.currentStreakStart).getTime()) / 86400000);
                return {
                  ...h,
                  logs,
                  bestStreakDays: Math.max(h.bestStreakDays, daysSoFar),
                  currentStreakStart: nowIso(),
                };
              }
              return { ...h, logs };
            }),
          },
        }));
      },

      saveJournalEntry: (day, entry) => {
        set((s) => {
          const existing = s.profile.journal[day];
          const merged: JournalEntry = {
            day,
            wentWell: entry.wentWell ?? existing?.wentWell ?? "",
            couldImprove: entry.couldImprove ?? existing?.couldImprove ?? "",
            tomorrowWin: entry.tomorrowWin ?? existing?.tomorrowWin ?? "",
            mood: entry.mood ?? existing?.mood ?? 5,
            morningEnergy: entry.morningEnergy ?? existing?.morningEnergy,
            gratitude: entry.gratitude ?? existing?.gratitude,
            examen: entry.examen ?? existing?.examen,
            savedAt: nowIso(),
          };
          return { profile: { ...s.profile, journal: { ...s.profile.journal, [day]: merged } } };
        });
        get().checkMilestones();
      },

      addIncomeEntry: (venture, amountKES, note) => {
        const entry: IncomeEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: todayIso(),
          venture,
          amountKES,
          note,
        };
        set((s) => ({ profile: { ...s.profile, income: [entry, ...s.profile.income] } }));
        get().checkMilestones();
      },

      removeIncomeEntry: (id) => {
        set((s) => ({
          profile: { ...s.profile, income: s.profile.income.filter((e) => e.id !== id) },
        }));
      },

      addExpenseEntry: (category, amountKES, note) => {
        const entry: ExpenseEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: todayIso(),
          category,
          amountKES,
          note,
        };
        set((s) => ({ profile: { ...s.profile, expenses: [entry, ...s.profile.expenses] } }));
      },

      removeExpenseEntry: (id) => {
        set((s) => ({
          profile: { ...s.profile, expenses: s.profile.expenses.filter((e) => e.id !== id) },
        }));
      },

      setBudgetCategory: (name, capKES) => {
        set((s) => {
          const exists = s.profile.budgetCategories.some((c) => c.name === name);
          const budgetCategories = exists
            ? s.profile.budgetCategories.map((c) => (c.name === name ? { ...c, capKES } : c))
            : [...s.profile.budgetCategories, { name, capKES }];
          return { profile: { ...s.profile, budgetCategories } };
        });
      },

      removeBudgetCategory: (name) => {
        set((s) => ({
          profile: { ...s.profile, budgetCategories: s.profile.budgetCategories.filter((c) => c.name !== name) },
        }));
      },

      setAboutMe: (text) => {
        set((s) => ({ profile: { ...s.profile, aboutMe: text } }));
      },

      addVenture: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => (s.profile.ventures.includes(trimmed) ? s : { profile: { ...s.profile, ventures: [...s.profile.ventures, trimmed] } }));
      },

      removeVenture: (name) => {
        set((s) => ({ profile: { ...s.profile, ventures: s.profile.ventures.filter((v) => v !== name) } }));
      },

      setGoal: (lifeArea, horizon, text) => {
        set((s) => ({
          profile: {
            ...s.profile,
            goals: {
              ...s.profile.goals,
              [lifeArea]: { ...s.profile.goals[lifeArea], [horizon]: text },
            },
          },
        }));
      },

      setGoalWhy: (lifeArea, why) => {
        set((s) => ({
          profile: {
            ...s.profile,
            goals: { ...s.profile.goals, [lifeArea]: { ...s.profile.goals[lifeArea], why } },
          },
        }));
      },

      setGoalDailyLink: (lifeArea, linkType, linkId) => {
        set((s) => ({
          profile: {
            ...s.profile,
            goals: {
              ...s.profile.goals,
              [lifeArea]: { ...s.profile.goals[lifeArea], dailyLinkType: linkType, dailyLinkId: linkId },
            },
          },
        }));
      },

      setPinnedFocusArea: (area) => {
        set((s) => ({ profile: { ...s.profile, pinnedFocusArea: area } }));
      },

      markGoalsReviewed: () => {
        set((s) => ({ profile: { ...s.profile, lastGoalsReviewAt: nowIso() } }));
      },

      checkMilestones: () => {
        const s = get();
        const newOnes = evaluateMilestones(s.profile);
        if (newOnes.length > 0) {
          set((st) => ({ profile: { ...st.profile, milestones: [...st.profile.milestones, ...newOnes] } }));
        }
      },

      addMilestone: (label, description) => {
        set((s) => ({
          profile: {
            ...s.profile,
            milestones: [
              ...s.profile.milestones,
              { id: `manual-${Date.now()}`, achievedAt: nowIso(), label, description },
            ],
          },
        }));
      },

      addTimeBlock: (date, block) => {
        const newBlock: TimeBlock = { ...block, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
        set((s) => ({
          profile: {
            ...s.profile,
            timeBlocks: {
              ...s.profile.timeBlocks,
              [date]: [...(s.profile.timeBlocks[date] ?? []), newBlock].sort((a, b) =>
                a.startTime.localeCompare(b.startTime)
              ),
            },
          },
        }));
      },

      removeTimeBlock: (date, id) => {
        set((s) => ({
          profile: {
            ...s.profile,
            timeBlocks: {
              ...s.profile.timeBlocks,
              [date]: (s.profile.timeBlocks[date] ?? []).filter((b) => b.id !== id),
            },
          },
        }));
      },

      toggleTimeBlockDone: (date, id) => {
        set((s) => ({
          profile: {
            ...s.profile,
            timeBlocks: {
              ...s.profile.timeBlocks,
              [date]: (s.profile.timeBlocks[date] ?? []).map((b) =>
                b.id === id ? { ...b, done: !b.done } : b
              ),
            },
          },
        }));
      },

      moveTimeBlock: (fromDate, id, toDate) => {
        set((s) => {
          const source = s.profile.timeBlocks[fromDate] ?? [];
          const block = source.find((b) => b.id === id);
          if (!block) return s;
          const moved: TimeBlock = { ...block, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, done: false };
          return {
            profile: {
              ...s.profile,
              timeBlocks: {
                ...s.profile.timeBlocks,
                [fromDate]: source.filter((b) => b.id !== id),
                [toDate]: [...(s.profile.timeBlocks[toDate] ?? []), moved].sort((a, b) =>
                  a.startTime.localeCompare(b.startTime)
                ),
              },
            },
          };
        });
      },

      setEveningPlanned: (dateKey, done) => {
        set((s) => ({
          profile: { ...s.profile, eveningPlanned: { ...s.profile.eveningPlanned, [dateKey]: done } },
        }));
      },

<<<<<<< HEAD
      markDayCompleteShown: (dateKey) => {
        set((s) => ({
          profile: { ...s.profile, dayCompleteShown: { ...s.profile.dayCompleteShown, [dateKey]: true } },
        }));
      },

=======
>>>>>>> 2cbfdcef78ad01192da598ce6a87ce9ba4536bfc
      addVentureLog: (venture, minutes) => {
        const entry: VentureLog = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: todayIso(),
          venture,
          minutes,
        };
        set((s) => ({ profile: { ...s.profile, ventureLogs: [entry, ...s.profile.ventureLogs].slice(0, 500) } }));
      },

      addSleepLog: (bedtime, waketime) => {
        const [bh, bm] = bedtime.split(":").map(Number);
        const [wh, wm] = waketime.split(":").map(Number);
        let hours = wh + wm / 60 - (bh + bm / 60);
        if (hours <= 0) hours += 24;
        const entry: SleepLog = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: todayIso(),
          bedtime,
          waketime,
          hours: Math.round(hours * 10) / 10,
        };
        set((s) => ({ profile: { ...s.profile, sleepLogs: [entry, ...s.profile.sleepLogs].slice(0, 200) } }));
      },

      setMit: (day, entry) => {
        set((s) => ({ profile: { ...s.profile, mitByDay: { ...s.profile.mitByDay, [day]: entry } } }));
      },

      toggleMitDone: (day) => {
        set((s) => {
          const existing = s.profile.mitByDay[day];
          if (!existing) return s;
          return {
            profile: {
              ...s.profile,
              mitByDay: { ...s.profile.mitByDay, [day]: { ...existing, done: !existing.done } },
            },
          };
        });
      },

      setWeeklyFocus: (weekKey, text) => {
        set((s) => ({ profile: { ...s.profile, weeklyFocus: { ...s.profile.weeklyFocus, [weekKey]: text } } }));
      },

      setDailyGospel: (dateKey, ref, text, reflection) => {
        set((s) => ({
          profile: {
            ...s.profile,
            dailyGospel: { ...s.profile.dailyGospel, [dateKey]: { ref, text, reflection } },
          },
        }));
      },

      setDailyReview: (dateKey, text) => {
        set((s) => ({ profile: { ...s.profile, dailyReview: { ...s.profile.dailyReview, [dateKey]: text } } }));
      },

      setWeeklyReport: (weekKey, text) => {
        set((s) => ({ profile: { ...s.profile, weeklyReports: { ...s.profile.weeklyReports, [weekKey]: text } } }));
      },

      setQuestsForDay: (dateKey, quests) => {
        set((s) => ({ profile: { ...s.profile, quests: { ...s.profile.quests, [dateKey]: quests } } }));
      },

      completeQuest: (dateKey, questId) => {
        set((s) => {
          const dayQuests = s.profile.quests[dateKey];
          if (!dayQuests) return s;
          const quest = dayQuests.find((q) => q.id === questId);
          if (!quest || quest.status === "done") return s;
          const updated = dayQuests.map((q) => (q.id === questId ? { ...q, status: "done" as const } : q));
          const day = s.profile.startDate ? programDayFromDate(s.profile.startDate, dateKey) : null;
          const days =
            day && s.profile.days[day]
              ? { ...s.profile.days, [day]: { ...s.profile.days[day], xpEarned: s.profile.days[day].xpEarned + quest.xpBonus } }
              : s.profile.days;
          return {
            profile: {
              ...s.profile,
              quests: { ...s.profile.quests, [dateKey]: updated },
              days,
              xpTotal: s.profile.xpTotal + quest.xpBonus,
              season: { ...s.profile.season, xpThisSeason: s.profile.season.xpThisSeason + quest.xpBonus },
            },
          };
        });
        get().checkMilestones();
      },

      rerollQuest: (dateKey, questId, replacement) => {
        let succeeded = false;
        set((s) => {
          const wk = isoWeekKey();
          const ledger =
            s.profile.questReroll.weekKey === wk ? s.profile.questReroll : { weekKey: wk, usedThisWeek: 0, usedToday: {} };
          const usedToday = ledger.usedToday[dateKey] ?? 0;
          if (ledger.usedThisWeek >= 5 || usedToday >= 2) {
            // Persist a week-rollover reset even when this specific reroll is denied.
            return ledger === s.profile.questReroll ? s : { profile: { ...s.profile, questReroll: ledger } };
          }
          succeeded = true;
          const dayQuests = s.profile.quests[dateKey] ?? [];
          const updatedQuests = dayQuests.map((q) => (q.id === questId ? replacement : q));
          return {
            profile: {
              ...s.profile,
              quests: { ...s.profile.quests, [dateKey]: updatedQuests },
              questReroll: {
                weekKey: wk,
                usedThisWeek: ledger.usedThisWeek + 1,
                usedToday: { ...ledger.usedToday, [dateKey]: usedToday + 1 },
              },
            },
          };
        });
        return succeeded;
      },

      rerollsRemaining: () => {
        const s = get();
        const wk = isoWeekKey();
        const key = todayIso();
        const ledger =
          s.profile.questReroll.weekKey === wk ? s.profile.questReroll : { weekKey: wk, usedThisWeek: 0, usedToday: {} };
        return {
          thisWeek: Math.max(0, 5 - ledger.usedThisWeek),
          today: Math.max(0, 2 - (ledger.usedToday[key] ?? 0)),
        };
      },

      setIncomeGoal: (goal) => {
        set((s) => ({ profile: { ...s.profile, incomeGoal: goal } }));
      },

      setQuestPillars: (pillars) => {
        set((s) => ({ profile: { ...s.profile, questPillars: pillars.length > 0 ? pillars : s.profile.questPillars } }));
      },

      setDevotionalSettings: (settings) => {
        set((s) => ({ profile: { ...s.profile, devotional: settings } }));
      },

      setCoachTone: (tone) => {
        set((s) => ({ profile: { ...s.profile, coachTone: tone } }));
      },

      setCorrelationSnapshot: (weekKey, entries) => {
        set((s) => ({
          profile: { ...s.profile, correlationSnapshots: { ...s.profile.correlationSnapshots, [weekKey]: entries } },
        }));
      },
      hydrateFromRemote: (remote) => {
        set((s) => ({ profile: sanitizeProfile(s.profile, remote) }));
      },
    }),
    {
      name: "life-reset-storage",
      merge: (persisted, current) => {
        const p = (persisted as { profile?: Partial<UserProfile> } | undefined)?.profile ?? {};
        return { ...current, profile: sanitizeProfile(current.profile, p) };
      },
    }
  )
);

export function currentRankTier(xpThisSeason: number) {
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) {
    if (xpThisSeason >= t.min) tier = t;
  }
  return tier;
}

export function nextRankTier(xpThisSeason: number) {
  for (const t of RANK_TIERS) {
    if (xpThisSeason < t.min) return t;
  }
  return null;
}

export function todayProgramDay(profile: UserProfile): number {
  if (!profile.startDate) return 1;
  return programDayFromDate(profile.startDate, new Date().toISOString().slice(0, 10));
}

export type { StatKey };
