export interface StreakTemplate {
  addictionValue: string;
  label: string;
  icon: string;
}

export const STREAK_TEMPLATES: StreakTemplate[] = [
  { addictionValue: "porn", label: "No PMO", icon: "ShieldCheck" },
  { addictionValue: "smoking", label: "No smoking / vaping", icon: "CigaretteOff" },
  { addictionValue: "alcohol", label: "No alcohol", icon: "Ban" },
  { addictionValue: "games", label: "No excessive gaming", icon: "Gamepad2" },
  { addictionValue: "junkfood", label: "No junk food", icon: "CookingPot" },
];

export const CUSTOM_STREAK_ICONS = [
  "ShieldCheck",
  "Ban",
  "CigaretteOff",
  "Gamepad2",
  "CookingPot",
  "Smartphone",
  "Wine",
  "Flame",
  "HandHeart",
  "BookOpen",
];

export const STREAK_MILESTONE_DAYS = [3, 7, 14, 30, 60, 90, 180, 365];

/** Per-habit accent colors, picked for contrast against both the light and dark surface tokens. */
export const STREAK_COLOR_THEMES = [
  { name: "Ember", value: "#ff5f2e" },
  { name: "Gold", value: "#e8b85c" },
  { name: "Mint", value: "#46d17a" },
  { name: "Sky", value: "#5cb8e8" },
  { name: "Violet", value: "#9e5ce8" },
  { name: "Rose", value: "#e85c9e" },
  { name: "Lime", value: "#a8d15c" },
  { name: "Coral", value: "#e57373" },
  { name: "Teal", value: "#4fbdad" },
  { name: "Slate", value: "#8b95a8" },
];
