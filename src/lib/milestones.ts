import type { UserProfile, Milestone } from "@/types";
import { programDayFromDate } from "@/lib/planGenerator";

interface MilestoneDef {
  id: string;
  label: string;
  description: string;
  check: (p: UserProfile, todayProgramDay: number) => boolean;
}

function totalTasksDone(p: UserProfile): number {
  return Object.values(p.days).reduce(
    (sum, d) => sum + Object.values(d.tasks).filter((s) => s === "done").length,
    0
  );
}

const MILESTONE_DEFS: MilestoneDef[] = [
  {
    id: "day_1",
    label: "Day one, done",
    description: "You showed up for day one. That's the whole game — repeat it.",
    check: (_p, day) => day >= 1,
  },
  {
    id: "day_7",
    label: "One week in",
    description: "Seven days of showing up. The novelty is gone — this is where it counts.",
    check: (_p, day) => day >= 7,
  },
  {
    id: "day_33",
    label: "One month in",
    description: "A month of showing up. Look back at week one — you're not the same person who started this.",
    check: (_p, day) => day >= 33,
  },
  {
    id: "day_66",
    label: "66 days complete",
    description: "66 days of showing up. Most people quit long before this — you didn't.",
    check: (_p, day) => day >= 66,
  },
  {
    id: "day_100",
    label: "100 days",
    description: "Triple digits on the odometer. This is who you are now, not a phase.",
    check: (_p, day) => day >= 100,
  },
  {
    id: "day_180",
    label: "Half a year",
    description: "180 days. Whatever this was when you started, it's a system now.",
    check: (_p, day) => day >= 180,
  },
  {
    id: "day_365",
    label: "One full year",
    description: "365 days of behavior tracking. Look at day one and tell yourself that was a different person.",
    check: (_p, day) => day >= 365,
  },
  {
    id: "tasks_25",
    label: "25 tasks completed",
    description: "A quarter-century of small wins stacked up.",
    check: (p) => totalTasksDone(p) >= 25,
  },
  {
    id: "tasks_100",
    label: "100 tasks completed",
    description: "Triple digits. This is no longer an experiment — it's a system.",
    check: (p) => totalTasksDone(p) >= 100,
  },
  {
    id: "first_income",
    label: "First income logged",
    description: "First shilling tracked toward your freedom number.",
    check: (p) => p.income.length >= 1,
  },
  {
    id: "income_goal_month",
    label: "Hit your monthly income floor",
    description: "You cleared the floor of your target range in a single month.",
    check: (p) => {
      const byMonth: Record<string, number> = {};
      p.income.forEach((e) => {
        const key = e.date.slice(0, 7);
        byMonth[key] = (byMonth[key] ?? 0) + e.amountKES;
      });
      return Object.values(byMonth).some((total) => total >= p.incomeGoal.min);
    },
  },
  {
    id: "journal_7",
    label: "7 journal entries",
    description: "A week of honest daily reflection. That's the habit that makes the rest stick.",
    check: (p) => Object.keys(p.journal).length >= 7,
  },
];

export function evaluateMilestones(profile: UserProfile): Milestone[] {
  const todayProgramDay = profile.startDate
    ? programDayFromDate(profile.startDate, new Date().toISOString().slice(0, 10))
    : 0;
  const achievedIds = new Set(profile.milestones.map((m) => m.id));
  const newOnes: Milestone[] = [];

  for (const def of MILESTONE_DEFS) {
    if (achievedIds.has(def.id)) continue;
    if (def.check(profile, todayProgramDay)) {
      newOnes.push({
        id: def.id,
        achievedAt: new Date().toISOString(),
        label: def.label,
        description: def.description,
      });
    }
  }
  return newOnes;
}
