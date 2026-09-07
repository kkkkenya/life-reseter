import type { ChallengeStyle, CheckInRecord, CoachTone, LifeAreaKey, QuestPillar, QuizAnswers, TaskDefinition } from "@/types";
import { DEFAULT_QUEST_PILLARS } from "@/data/questPillars";
import { TASK_CATALOG } from "@/data/taskCatalog";

/** Answers collected by the best-friend onboarding wizard (Setup). */
export interface OnboardingAnswers {
  displayName: string;
  season: string;
  focusAreas: LifeAreaKey[];
  reality: string;
  obstacle: string;
  vibe: CoachTone;
  matters: string[]; // quest pillar keys, up to 3
  devotional: boolean;
  tastes: string[];
  tastesNote: string;
  confidence: number; // 1-10
  sleep: string; // chronotype value
  quit: string[]; // STREAK_TEMPLATES addictionValues to seed as streaks
  vision: string; // best-self one year out -> goal "why"
  dream: string; // no-limits 10-year dream -> North Star
  nightmare: string; // 5-year cost of nothing changing -> anti-vision
  incomeMin: string; // raw form input, parsed on commit
  incomeMax: string;
  incomeTarget: string; // YYYY-MM-DD
}

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

export const VIBE_OPTIONS: { tone: CoachTone; label: string; blurb: string }[] = [
  { tone: "blunt", label: "Straight with me", blurb: "No sugarcoating. Tell me the truth." },
  { tone: "gentle", label: "Easy with me", blurb: "Warm, patient, still honest." },
  { tone: "drill", label: "Push me hard", blurb: "No excuses. Demand my best." },
  { tone: "stoic", label: "Calm and wise", blurb: "Perspective over pressure." },
];

export interface MatterOption {
  key: string;
  label: string;
  blurb: string;
  pillar: QuestPillar;
}

export const MATTER_OPTIONS: MatterOption[] = [
  {
    key: "money",
    label: "Money moves",
    blurb: "Income, clients, real earning",
    pillar: { key: "money", label: "Money moves", description: "a concrete, doable-today action that moves real income forward — a client, a quote, a sale, a lead, a piece of billable work", color: "#ff5f2e", icon: "TrendingUp", lifeArea: "finances" },
  },
  {
    key: "people",
    label: "People who matter",
    blurb: "Friendship, family, showing up",
    pillar: { key: "people", label: "People who matter", description: "a concrete action that maintains or deepens one specific existing relationship — not generic 'be social', an actual specific move", color: "#e85c9e", icon: "Users", lifeArea: "relationships" },
  },
  {
    key: "health",
    label: "Body & energy",
    blurb: "Strength, sleep, stamina",
    pillar: { key: "health", label: "Body & energy", description: "a concrete physical action doable today — movement, fuel, rest, or recovery", color: "#46d17a", icon: "HeartPulse", lifeArea: "health" },
  },
  {
    key: "learning",
    label: "Learning",
    blurb: "Skills, school, mastery",
    pillar: { key: "learning", label: "Learning", description: "a concrete learning rep doable today — study block, practice set, or teaching someone else", color: "#5cb8e8", icon: "BookOpen", lifeArea: "learning" },
  },
  {
    key: "peace",
    label: "Peace of mind",
    blurb: "Faith, calm, headspace",
    pillar: { key: "peace", label: "Peace of mind", description: "a concrete restorative action doable today — prayer, stillness, journaling, or time offline", color: "#9e5ce8", icon: "Brain", lifeArea: "mindset" },
  },
  {
    key: "building",
    label: "Building something",
    blurb: "Projects, prototypes, ventures",
    pillar: { key: "building", label: "Building something", description: "a concrete builder rep doable today — design, prototype, ship, or fix something real", color: "#e8b85c", icon: "Rocket", lifeArea: "business" },
  },
];

export const TASTE_OPTIONS = [
  "Tech & gadgets",
  "Engineering & machines",
  "Music",
  "Football & sports",
  "Faith",
  "Reading",
  "Gaming",
  "Fashion & style",
  "Cooking",
  "Outdoors",
];

export const SLEEP_OPTIONS = [
  { value: "early", label: "Early bird", blurb: "Up before the noise, sharpest before noon" },
  { value: "standard", label: "Standard rhythm", blurb: "Normal hours, steady energy" },
  { value: "night", label: "Night owl", blurb: "Alive after dark, slow mornings" },
] as const;

export const QUIT_OPTIONS = [
  { value: "porn", label: "PMO", blurb: "Porn / masturbation" },
  { value: "smoking", label: "Smoking / vaping", blurb: "Cigarettes, shisha, vapes" },
  { value: "alcohol", label: "Alcohol", blurb: "Drinking" },
  { value: "games", label: "Excessive gaming", blurb: "Hours that disappear" },
  { value: "junkfood", label: "Junk food", blurb: "Sugar, fast food, binges" },
] as const;

const VIBE_TO_CHALLENGE: Record<CoachTone, ChallengeStyle> = {
  gentle: "gentle",
  stoic: "steady",
  blunt: "push",
  drill: "allin",
};

/** Custom daily-quest pillars from what matters most (max 3, else defaults). */
export function pillarsFor(keys: string[]): QuestPillar[] {
  const picked = keys
    .map((k) => MATTER_OPTIONS.find((m) => m.key === k)?.pillar)
    .filter((p): p is QuestPillar => Boolean(p))
    .slice(0, 3);
  return picked.length > 0 ? picked : DEFAULT_QUEST_PILLARS;
}

/** Rich persona text feeding quest + review prompts (existing pipes). */
export function composeAboutMe(a: OnboardingAnswers): string {
  const lines: string[] = [];
  if (a.displayName.trim()) lines.push(`Name: ${a.displayName.trim()}.`);
  if (a.season) {
    const season = SEASON_OPTIONS.find((s) => s.value === a.season);
    lines.push(`Season of life: ${season ? season.label : a.season}.`);
  }
  if (a.reality.trim()) lines.push(`In their own words: "${a.reality.trim()}".`);
  if (a.obstacle) {
    const ob = OBSTACLE_OPTIONS.find((o) => o.value === a.obstacle);
    lines.push(`Biggest obstacle: ${ob ? ob.label : a.obstacle}.`);
  }
  const tastes = a.tastes.length > 0 ? ` Into: ${a.tastes.join(", ")}.` : "";
  const note = a.tastesNote.trim() ? ` ${a.tastesNote.trim()}` : "";
  if (tastes || note) lines.push(`Tastes & interests:${tastes}${note}`);
  if (a.sleep) {
    const rhythm = SLEEP_OPTIONS.find((s) => s.value === a.sleep);
    lines.push(`Rhythm: ${rhythm ? rhythm.label.toLowerCase() : a.sleep}.`);
  }
  if (a.vision.trim()) lines.push(`One-year vision: "${a.vision.trim()}".`);
  if (a.dream.trim()) lines.push(`Ten-year dream: "${a.dream.trim()}".`);
  return lines.join(" ").slice(0, 1500);
}

export function quizFromAnswers(a: OnboardingAnswers): QuizAnswers {
  return {
    lifeAreas: a.focusAreas.slice(0, 3),
    currentLife: a.season,
    copeStyle: "",
    duration: "",
    consistencyBarrier: a.obstacle,
    sleep: a.sleep,
    eating: "",
    predictability: "",
    mattersMost: a.tastes.slice(0, 10),
    addictions: a.quit.slice(0, 10),
    confidence: Math.min(10, Math.max(1, Math.round(a.confidence))),
    challengeStyle: VIBE_TO_CHALLENGE[a.vibe],
  };
}

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
