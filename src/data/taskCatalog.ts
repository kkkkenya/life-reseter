import type { TaskDefinition } from "@/types";

export interface TaskCategory {
  key: string;
  label: string;
  icon: string;
  tasks: TaskDefinition[];
}

export const TASK_CATALOG: TaskCategory[] = [
  {
    key: "physical",
    label: "Physical exercise",
    icon: "Dumbbell",
    tasks: [
      { id: "basketball", label: "Basketball practice", icon: "CircleDot", category: "physical", lifeArea: "health" },
      { id: "gym", label: "Gym workout", icon: "Dumbbell", category: "physical", lifeArea: "health" },
      { id: "protein", label: "Protein intake", icon: "Beef", category: "physical", lifeArea: "health" },
      { id: "pushups", label: "Push-ups", icon: "Activity", category: "physical", lifeArea: "health" },
      { id: "run", label: "Run", icon: "PersonStanding", category: "physical", lifeArea: "health" },
      { id: "situps", label: "Sit-ups", icon: "Activity", category: "physical", lifeArea: "health" },
      { id: "tennis", label: "Tennis practice", icon: "CircleDot", category: "physical", lifeArea: "health" },
      { id: "vitamins", label: "Vitamins intake", icon: "Pill", category: "physical", lifeArea: "health" },
      { id: "coldshower", label: "Cold shower", icon: "Droplets", category: "physical", lifeArea: "health" },
      { id: "water", label: "Drink 2L water", icon: "GlassWater", category: "physical", lifeArea: "health" },
      { id: "sleep", label: "Sleep 7+ hours", icon: "Moon", category: "physical", lifeArea: "health" },
      { id: "cycling", label: "Cycling", icon: "Bike", category: "physical", lifeArea: "health" },
    ],
  },
  {
    key: "ventures",
    label: "Business & side projects",
    icon: "Rocket",
    tasks: [
      { id: "freelance", label: "Freelance / client work", icon: "Briefcase", category: "ventures", lifeArea: "business" },
      { id: "side-project-dev", label: "Side project dev session", icon: "Code2", category: "ventures", lifeArea: "business" },
      { id: "content-admin", label: "Content / community admin", icon: "Layout", category: "ventures", lifeArea: "business" },
      { id: "inventory-orders", label: "Inventory / order management", icon: "ShoppingBag", category: "ventures", lifeArea: "business" },
      { id: "sales-outreach", label: "Sales outreach", icon: "TrendingUp", category: "ventures", lifeArea: "business" },
    ],
  },
  {
    key: "learning",
    label: "Learning and reflection",
    icon: "BookOpen",
    tasks: [
      { id: "reading", label: "Read 10 pages", icon: "BookOpen", category: "learning", lifeArea: "learning" },
      { id: "coursework", label: "Coursework / study block", icon: "GraduationCap", category: "learning", lifeArea: "learning" },
      { id: "language", label: "Language practice", icon: "Languages", category: "learning", lifeArea: "learning" },
      { id: "music", label: "Music practice", icon: "Music", category: "learning", lifeArea: "learning" },
      { id: "coldemail", label: "Cold-email a professor", icon: "Mail", category: "learning", lifeArea: "learning" },
    ],
  },
  {
    key: "productivity",
    label: "Productivity & focus",
    icon: "Target",
    tasks: [
      { id: "sideproject", label: "Side project", icon: "Rocket", category: "productivity", lifeArea: "productivity" },
      { id: "wakeearly", label: "Wake up early", icon: "Sunrise", category: "productivity", lifeArea: "productivity" },
      { id: "screentime", label: "Screentime < 4hr", icon: "Smartphone", category: "productivity", lifeArea: "productivity" },
      { id: "blockscreens", label: "Block screens", icon: "SmartphoneNfc", category: "productivity", lifeArea: "productivity" },
      { id: "deepwork", label: "Deep work block", icon: "Timer", category: "productivity", lifeArea: "productivity" },
      { id: "inboxzero", label: "Inbox/DMs to zero (all ventures)", icon: "Inbox", category: "productivity", lifeArea: "productivity" },
      { id: "plantomorrow", label: "Plan tomorrow's top 3", icon: "ListChecks", category: "productivity", lifeArea: "productivity" },
    ],
  },
  {
    key: "finances",
    label: "Finances",
    icon: "Wallet",
    tasks: [
      { id: "logexpenses", label: "Log today's expenses", icon: "Receipt", category: "finances", lifeArea: "finances" },
      { id: "reviewbudget", label: "Review budget", icon: "Wallet", category: "finances", lifeArea: "finances" },
      { id: "checkrevenue", label: "Check venture revenue", icon: "TrendingUp", category: "finances", lifeArea: "finances" },
      { id: "saveamount", label: "Save a fixed amount", icon: "PiggyBank", category: "finances", lifeArea: "finances" },
    ],
  },
  {
    key: "relationships",
    label: "Relationships & networking",
    icon: "Users",
    tasks: [
      { id: "callfriend", label: "Call or text a friend", icon: "Phone", category: "relationships", lifeArea: "relationships" },
      { id: "networkcontact", label: "Reach out to a new contact", icon: "UserPlus", category: "relationships", lifeArea: "relationships" },
      { id: "familytime", label: "Quality time with family", icon: "Home", category: "relationships", lifeArea: "relationships" },
      { id: "classrep", label: "Class rep duties check", icon: "ClipboardList", category: "relationships", lifeArea: "relationships" },
      { id: "club-engagement", label: "Club / org engagement", icon: "Handshake", category: "relationships", lifeArea: "relationships" },
    ],
  },
  {
    key: "mindset",
    label: "Mindset & self-control",
    icon: "Brain",
    tasks: [
      { id: "journaling", label: "Journaling", icon: "NotebookPen", category: "mindset", lifeArea: "mindset" },
      { id: "meditate", label: "Meditate 10 minutes", icon: "Flower2", category: "mindset", lifeArea: "mindset" },
      { id: "breathe", label: "2 deep breaths", icon: "Wind", category: "mindset", lifeArea: "mindset" },
      { id: "noalcohol", label: "No alcohol", icon: "Ban", category: "mindset", lifeArea: "mindset" },
      { id: "nosmoking", label: "No smoking", icon: "CigaretteOff", category: "mindset", lifeArea: "mindset" },
      { id: "nopmo", label: "No PMO", icon: "ShieldCheck", category: "mindset", lifeArea: "mindset" },
      { id: "pray", label: "Pray / quiet reflection", icon: "HandHeart", category: "mindset", lifeArea: "mindset" },
    ],
  },
  {
    key: "mechanical",
    label: "Mechanical engineering projects",
    icon: "Cog",
    tasks: [
      { id: "cad-design", label: "CAD design session", icon: "Ruler", category: "mechanical", lifeArea: "business" },
      { id: "prototype-build", label: "Prototype build / fabrication", icon: "Hammer", category: "mechanical", lifeArea: "business" },
      { id: "technical-drawing", label: "Technical drawings / GD&T", icon: "PenTool", category: "mechanical", lifeArea: "business" },
      { id: "workshop-time", label: "Workshop / machining time", icon: "Wrench", category: "mechanical", lifeArea: "business" },
      { id: "testing-iteration", label: "Testing & iteration on a build", icon: "FlaskConical", category: "mechanical", lifeArea: "business" },
      { id: "materials-sourcing", label: "Materials / supplier sourcing", icon: "Boxes", category: "mechanical", lifeArea: "business" },
      { id: "client-quote", label: "Quote or spec a client job", icon: "FileText", category: "mechanical", lifeArea: "business" },
      { id: "eng-portfolio", label: "Update engineering portfolio", icon: "FolderOpen", category: "mechanical", lifeArea: "learning" },
    ],
  },
  {
    key: "personal",
    label: "Daily basics",
    icon: "Home",
    tasks: [
      { id: "makebed", label: "Make your bed", icon: "BedDouble", category: "personal", lifeArea: "productivity" },
      { id: "eat5meals", label: "Eat 5 meals", icon: "UtensilsCrossed", category: "personal", lifeArea: "health" },
      { id: "shower", label: "Shower / hygiene", icon: "ShowerHead", category: "personal", lifeArea: "health" },
      { id: "tidyspace", label: "Tidy your space", icon: "Sparkles", category: "personal", lifeArea: "productivity" },
      { id: "laundry", label: "Laundry check", icon: "Shirt", category: "personal", lifeArea: "productivity" },
      { id: "dishes", label: "Do the dishes", icon: "Trash2", category: "personal", lifeArea: "productivity" },
    ],
  },
];

export const DEFAULT_STARTER_TASK_IDS = ["breathe", "water", "screentime"];

export function findTaskDef(taskId: string): TaskDefinition | undefined {
  for (const cat of TASK_CATALOG) {
    const t = cat.tasks.find((x) => x.id === taskId);
    if (t) return t;
  }
  return undefined;
}
