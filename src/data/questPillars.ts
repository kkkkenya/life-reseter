import type { QuestPillar } from "@/types";

/** Ships as the default 3 pillars — identical to the old hardcoded income/friendship/exposure set. */
export const DEFAULT_QUEST_PILLARS: QuestPillar[] = [
  {
    key: "income",
    label: "Income",
    description:
      "a concrete, doable-today action that moves real income forward — a client, a quote, a sale, a lead, a piece of billable work",
    color: "#ff5f2e",
    icon: "TrendingUp",
  },
  {
    key: "friendship",
    label: "Friendship",
    description:
      "a concrete action that maintains or deepens one specific existing friendship — not generic 'be social', an actual specific move",
    color: "#e85c9e",
    icon: "Users",
  },
  {
    key: "exposure",
    label: "Exposure",
    description: "a concrete action that puts you in front of new people or opportunities — an event, a room, a public post, a new contact",
    color: "#5cb8e8",
    icon: "Compass",
  },
];

/** Curated preset colors offered in the pillar editor. */
export const PILLAR_COLOR_PRESETS = ["#ff5f2e", "#e85c9e", "#5cb8e8", "#39b779", "#c9a227", "#8a6fd8", "#3fb8af"];

/** Curated preset icons (lucide-react names) offered in the pillar editor. */
export const PILLAR_ICON_PRESETS = [
  "TrendingUp",
  "Users",
  "Compass",
  "Heart",
  "Star",
  "Flame",
  "Target",
  "BookOpen",
  "Dumbbell",
  "Brain",
  "Home",
  "Briefcase",
  "Sparkles",
  "Sun",
  "Mountain",
];

export function randomPillarKey(label: string): string {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "pillar"}-${Date.now().toString(36)}`;
}
