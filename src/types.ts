export type StatKey = "wisdom" | "confidence" | "strength" | "discipline" | "focus";

export type LifeAreaKey =
  | "health"
  | "learning"
  | "productivity"
  | "business"
  | "finances"
  | "relationships"
  | "mindset";

export type ResetType = "fighter" | "rebuilder" | "seeker" | "optimizer" | "disciplined";

export interface ResetTypeInfo {
  key: ResetType;
  name: string;
  tagline: string;
  description: string;
  primaryStats: StatKey[];
}

export type ChallengeStyle = "gentle" | "steady" | "push" | "allin";

export interface QuizAnswers {
  lifeAreas: string[]; // up to 3
  currentLife: string;
  copeStyle: string;
  duration: string;
  consistencyBarrier: string;
  sleep: string;
  eating: string;
  predictability: string;
  mattersMost: string[]; // up to 3
  addictions: string[];
  confidence: number; // 1-10
  challengeStyle: ChallengeStyle;
}

export interface TaskDefinition {
  id: string;
  label: string;
  icon: string; // lucide icon name
  category: string;
  lifeArea: LifeAreaKey;
}

export type TaskFrequency = number; // times per week

/** Habitify-style grouping bucket. "anytime" tasks show in their own bucket, not pinned to a time. */
export type TimeOfDay = "morning" | "afternoon" | "evening" | "anytime";

export type TaskPriority = "P1" | "P2" | "P3";

export type RecurrenceType = "weekly" | "biweekly" | "monthly";

export interface RecurrenceRule {
  type: RecurrenceType;
  weekdays: number[]; // 0=Sun..6=Sat — used by weekly & biweekly
  dayOfMonth?: number; // 1-28 — used by monthly (kept <=28 to dodge month-length edge cases)
  anchorDate: string; // ISO date — "week 0" reference point for biweekly parity
}

export interface PlannedTask {
  uid: string; // unique instance id
  taskId: string;
  label: string;
  icon: string;
  category: string;
  lifeArea: LifeAreaKey;
  color?: string;
  priority: TaskPriority;
  frequencyPerWeek: TaskFrequency;
  activeDays: number[]; // 0=Sun..6=Sat, length === frequencyPerWeek (approx) — used when recurrence is absent/weekly
  addedOnWeek: number;
  applyToAllWeeks: boolean;
  timeOfDay?: TimeOfDay;
  recurrence?: RecurrenceRule; // present + non-weekly overrides the simple weekly matching below
}

export type TaskStatus = "pending" | "done" | "skipped";

export interface DayRecord {
  day: number; // lifetime odometer, no upper bound
  date: string; // ISO date
  tasks: Record<string, TaskStatus>; // uid -> status
  carriedOver?: string[]; // uids present here only because they rolled over incomplete from a prior day
  xpEarned: number;
}

export interface VowRecord {
  antiVision: string;
  vowText: string;
  signedAt: string | null;
}

export interface SeasonState {
  seasonNumber: number;
  startDate: string;
  durationDays: number;
  xpThisSeason: number;
}

export const RANK_TIERS: { name: string; min: number }[] = [
  { name: "Bronze V", min: 0 },
  { name: "Bronze I", min: 300 },
  { name: "Silver V", min: 800 },
  { name: "Silver I", min: 1600 },
  { name: "Gold V", min: 2800 },
  { name: "Gold I", min: 4200 },
  { name: "Platinum", min: 6000 },
  { name: "Diamond", min: 9000 },
];

export interface WorkoutEntry {
  id: string;
  date: string;
  label: string;
  sets: number;
  reps: number;
}

export interface ToolsData {
  workoutLog: WorkoutEntry[];
  meditationMinutes: number;
  pomodoroSessions: number;
  bookProgress: Record<string, number>; // bookId -> chapter index
}

export interface StreakRelapse {
  id: string;
  timestamp: string; // ISO datetime
  note: string;
}

export interface StreakHabit {
  id: string;
  label: string;
  icon: string;
  color?: string; // hex accent, e.g. "#ff5f2e" — Streaks-app-style per-habit theming
  mode: "avoidance" | "positive";
  linkedTaskUid?: string; // for "positive" mode: computed from task completion history
  startedAt: string; // ISO datetime of current streak start (avoidance mode only)
  bestStreakDays: number;
  relapses: StreakRelapse[];
}

/**
 * "avoid" — classic quit-cold-turkey habit; a slip resets the streak clock (e.g. smoking, alcohol).
 * "quantityLimit" — allowed but capped per day (e.g. "max 1hr gaming", "max 2 sodas"); logging a
 *   count that stays at/under the daily target keeps that day "clean", going over doesn't reset
 *   history but does mark the day over-limit.
 * "abstainOnly" — simple binary per day: either you stayed clean or you didn't, no counts, no
 *   "current streak resets on slip" framing — just a clean/not-clean calendar (lower pressure,
 *   better fit for things where all-or-nothing framing backfires).
 */
export type DetoxHabitType = "avoid" | "quantityLimit" | "abstainOnly";

export interface DetoxLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  /** For "avoid": always a slip (count ignored). For "quantityLimit": the count logged that day.
   *  For "abstainOnly": presence of an entry with clean=false marks the day as not clean. */
  count?: number;
  clean: boolean; // false = slip / over-limit / not-clean day
  note?: string;
  timestamp: string; // ISO datetime, for same-day multiple logs
}

export interface DetoxHabit {
  id: string;
  label: string;
  icon: string;
  color: string; // hex accent
  type: DetoxHabitType;
  dailyLimit?: number; // required for "quantityLimit" type — the target ceiling per day
  startedAt: string; // ISO datetime the habit was created / tracking began
  currentStreakStart: string; // ISO datetime current clean streak began (resets on slip for "avoid" and over-limit for "quantityLimit")
  bestStreakDays: number;
  logs: DetoxLogEntry[];
}

export interface ExamenEntry {
  noticedGod: string;
  fellShort: string;
  gratefulFor: string;
}

export interface JournalEntry {
  day: number;
  wentWell: string;
  couldImprove: string;
  tomorrowWin: string;
  mood: number; // 1-10, evening mood
  morningEnergy?: number; // 1-5, captured separately in the morning
  gratitude?: string; // 10-second quick tap
  examen?: ExamenEntry;
  savedAt: string;
}

export interface IncomeEntry {
  id: string;
  date: string; // ISO date
  venture: string;
  amountKES: number;
  note?: string;
}

export interface ExpenseEntry {
  id: string;
  date: string; // ISO date
  category: string;
  amountKES: number;
  note?: string;
}

export interface BudgetCategory {
  name: string;
  capKES: number;
}

export type ObjectiveHorizon = "daily" | "weekly" | "monthly" | "sixMonth" | "yearly";

export interface LifeAreaGoal {
  why: string;
  daily: string;
  dailyLinkType: "none" | "task" | "streak";
  dailyLinkId: string; // taskUid or streak id; "" when linkType is "none"
  weekly: string;
  monthly: string;
  sixMonth: string;
  yearly: string;
}

export interface Milestone {
  id: string;
  achievedAt: string;
  label: string;
  description: string;
}

export interface TimeBlock {
  id: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  label: string;
  lifeArea: LifeAreaKey;
  done?: boolean;
  autoScheduled?: boolean; // true if generated by the auto-fill scheduler, for subtle styling
}

export interface VentureLog {
  id: string;
  date: string;
  venture: string;
  minutes: number;
}

export interface SleepLog {
  id: string;
  date: string;
  bedtime: string; // "HH:MM"
  waketime: string; // "HH:MM"
  hours: number;
}

export interface MitEntry {
  label: string;
  taskUid?: string;
  done: boolean;
}

export interface DailyGospelEntry {
  ref: string;
  text: string;
  reflection?: string;
}

/** The rotating emphases for daily quests — now user-defined pillars, not a fixed set. */
export type QuestFocus = string; // matches a QuestPillar.key

export interface QuestPillar {
  key: string;
  label: string;
  /** Guides AI quest generation — describe the kind of action this pillar should produce. */
  description: string;
  color: string;
  /** lucide-react icon name, rendered via IconFor */
  icon: string;
  lifeArea?: LifeAreaKey; // optional tag; untagged pillars are unaffected by pinning
}

export interface DevotionalSettings {
  enabled: boolean;
  /** sequential = same deterministic daily rotation as before; random = deterministic-but-shuffled per day */
  mode: "sequential" | "random";
}

export type CoachTone = "blunt" | "gentle" | "drill" | "stoic";

export interface DailyQuest {
  id: string;
  dateKey: string; // ISO date this quest is for
  title: string;
  description: string;
  focus: QuestFocus;
  xpBonus: number;
  status: "pending" | "done";
  source: "gemini" | "fallback";
}

export interface QuestRerollLedger {
  weekKey: string; // ISO week this ledger's counters apply to
  usedThisWeek: number; // 0-5, resets when weekKey rolls over
  usedToday: Record<string, number>; // ISO date -> count used that day, capped at 2
}

export interface IncomeGoal {
  min: number;
  max: number;
  currency: string;
  targetDate: string; // ISO date — this monthly range should be the norm by this date
}

export interface UserProfile {
  onboarded: boolean;
  aboutMe: string; // free-text "who you are / what you do / interests" — used to personalize AI-generated quests
  quiz: QuizAnswers | null;
  resetType: ResetType | null;
  stats: Record<StatKey, number>;
  vow: VowRecord;
  tasks: PlannedTask[];
  startDate: string | null;
  days: Record<number, DayRecord>;
  xpTotal: number;
  season: SeasonState;
  difficultyMultiplier: number; // 1 = normal, 1.25 = pushed harder, 0.75 = reduced
  tools: ToolsData;
  streaks: StreakHabit[];
  detoxHabits: DetoxHabit[];
  journal: Record<number, JournalEntry>;
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
  budgetCategories: BudgetCategory[];
  ventures: string[]; // user-managed venture/income-source names, shown as quick-pick options when logging income
  goals: Record<LifeAreaKey, LifeAreaGoal>;
  pinnedFocusArea: LifeAreaKey | null;
  lastGoalsReviewAt: string | null; // ISO datetime, null = never reviewed
  milestones: Milestone[];
  timeBlocks: Record<string, TimeBlock[]>; // ISO date -> blocks
  ventureLogs: VentureLog[];
  sleepLogs: SleepLog[];
  mitByDay: Record<number, MitEntry>; // program day -> MIT
  weeklyFocus: Record<string, string>; // ISO week key -> focus text
  eveningPlanned: Record<string, boolean>; // ISO date (the evening it was shown) -> ritual completed/dismissed
  skipReasons: Record<string, string>; // "day-uid" -> reason
  dailyGospel: Record<string, DailyGospelEntry>; // ISO date -> verse+reflection
  dailyReview: Record<string, string>; // ISO date -> Gemini review text
  weeklyReports: Record<string, string>; // ISO week key -> Gemini report text
  quests: Record<string, DailyQuest[]>; // ISO date -> that day's quest(s)
  questReroll: QuestRerollLedger;
  incomeGoal: IncomeGoal;
  questPillars: QuestPillar[];
  devotional: DevotionalSettings;
  coachTone: CoachTone;
  correlationSnapshots: Record<string, CorrelationSnapshotEntry[]>; // ISO week key -> that week's top correlations
}

export interface CorrelationSnapshotEntry {
  taskA: string;
  taskB: string;
  withRate: number;
  withoutRate: number;
  overlapDays: number;
}
