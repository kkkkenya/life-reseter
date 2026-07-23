import type { LifeAreaKey, LifeAreaGoal, ObjectiveHorizon } from "@/types";

export interface LifeAreaInfo {
  key: LifeAreaKey;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
}

export const LIFE_AREAS: LifeAreaInfo[] = [
  { key: "health", label: "Health & fitness", shortLabel: "Health", icon: "HeartPulse", color: "#46d17a" },
  { key: "learning", label: "Learning & skills", shortLabel: "Learning", icon: "BookOpen", color: "#5cb8e8" },
  { key: "productivity", label: "Productivity & deep work", shortLabel: "Productivity", icon: "Target", color: "#e8b85c" },
  { key: "business", label: "Business & freelancing", shortLabel: "Business", icon: "Briefcase", color: "#ff5f2e" },
  { key: "finances", label: "Finances", shortLabel: "Finances", icon: "Wallet", color: "#c8e85c" },
  { key: "relationships", label: "Relationships & networking", shortLabel: "Relationships", icon: "Users", color: "#e85c9e" },
  { key: "mindset", label: "Mindset & mental health", shortLabel: "Mindset", icon: "Brain", color: "#9e5ce8" },
];

export function getLifeArea(key: LifeAreaKey): LifeAreaInfo {
  return LIFE_AREAS.find((a) => a.key === key) ?? LIFE_AREAS[0];
}

export const OBJECTIVE_HORIZONS: { key: ObjectiveHorizon; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "1 Month" },
  { key: "sixMonth", label: "6 Months" },
  { key: "yearly", label: "1 Year" },
];

const emptyGoal: LifeAreaGoal = {
  why: "",
  daily: "",
  dailyLinkType: "none",
  dailyLinkId: "",
  weekly: "",
  monthly: "",
  sixMonth: "",
  yearly: "",
};

export const EMPTY_GOALS: Record<LifeAreaKey, LifeAreaGoal> = {
  health: { ...emptyGoal },
  learning: { ...emptyGoal },
  productivity: { ...emptyGoal },
  business: { ...emptyGoal },
  finances: { ...emptyGoal },
  relationships: { ...emptyGoal },
  mindset: { ...emptyGoal },
};
