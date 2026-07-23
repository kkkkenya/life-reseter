import { askGemini, isGeminiConfigured } from "./gemini";
import { coachVoice } from "@/data/coachTones";
import type { CoachTone, DailyQuest, IncomeGoal, LifeAreaKey, QuestPillar } from "@/types";

/**
 * Picks 2 pillars for a given date, rotating fairly through however many
 * pillars the user has defined (was a hardcoded 3-way rotation, now works
 * for any N >= 1 custom pillars).
 *
 * When pinnedFocusArea is set, pillars tagged with that lifeArea get ~2x
 * pick-weight in the rotation — built by duplicating matching pillars in the
 * seed list before the same deterministic day-of-year rotation runs, so nothing
 * here uses Math.random() and the same date always produces the same pair.
 * With pinnedFocusArea null (or no pillar tagged with it), the duplicated list
 * equals the original list, so this reproduces today's exact behavior — a
 * guaranteed no-op for anyone who hasn't pinned anything.
 */
export function focusPairForDate(
  date: Date,
  pillars: QuestPillar[],
  pinnedFocusArea: LifeAreaKey | null = null
): [QuestPillar, QuestPillar] {
  if (pillars.length === 0) throw new Error("No quest pillars configured");
  if (pillars.length === 1) return [pillars[0], pillars[0]];

  // Weighted seed list: pillars matching the pinned area appear twice, everyone
  // else once. Order preserved so the rotation math below stays deterministic.
  const weighted: QuestPillar[] = [];
  pillars.forEach((p) => {
    weighted.push(p);
    if (pinnedFocusArea && p.lifeArea === pinnedFocusArea) weighted.push(p);
  });

  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  const n = weighted.length;

  const i0 = dayOfYear % n;
  let i1 = (dayOfYear + 1 + Math.floor(dayOfYear / n)) % n;

  // Walk forward until we land on a genuinely different pillar (by key) — the
  // simple "+1 if equal index" trick from before isn't enough once duplicate
  // entries exist, since i0 and i1 can point at two copies of the same pillar.
  let guard = 0;
  while (weighted[i1].key === weighted[i0].key && guard < n) {
    i1 = (i1 + 1) % n;
    guard++;
  }

  return [weighted[i0], weighted[i1]];
}

const QUEST_XP_BASE = 40;

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Curated offline fallback pool for the original 3 default pillars — used when Gemini isn't configured. */
const CURATED_FALLBACK_POOL: Record<string, { title: string; description: string }[]> = {
  income: [
    { title: "Quote a job today", description: "Turn one idea into an actual priced quote or proposal and send it to a real person." },
    { title: "Chase 3 leads", description: "Message 3 potential clients or buyers — no vague check-ins, ask for the sale or the meeting." },
    { title: "Bill 90 minutes", description: "Spend 90 focused minutes on a task that is directly billable or sellable." },
    { title: "List something for sale", description: "Put one skill, service, or product up for sale somewhere today — status, marketplace, LinkedIn, a group chat." },
    { title: "Revive a cold lead", description: "Find one lead that went quiet and send a direct, specific follow-up today." },
    { title: "Fix your pricing", description: "Review what you charge for one service and either raise it or write down why it's right — then quote a real client at that price." },
  ],
  friendship: [
    { title: "Call, don't text", description: "Call one friend you haven't spoken to in 2+ weeks. Voice, not text." },
    { title: "Lock in a plan", description: "Invite a specific friend to something specific — pick the date and send the invite today, not 'sometime soon'." },
    { title: "Show up uninvited", description: "Help a friend with something concrete without being asked first." },
    { title: "One real conversation", description: "Have one distraction-free, phone-down conversation with someone close to you today." },
  ],
  exposure: [
    { title: "Find the room", description: "Find one event, meetup, or workshop happening this week in your field and commit to attending — book it, don't just bookmark it." },
    { title: "Post the real thing", description: "Post something honest about what you're building or working on — not polished, just real." },
    { title: "Cold-introduce yourself", description: "Introduce yourself to one new person in your field or industry today." },
    { title: "Message someone you admire", description: "Send one genuine message to someone whose work you respect — no pitch, just real interest." },
  ],
};

/** Generic fallback for custom pillars with no curated pool — built from the pillar's own description. */
function genericFallback(pillar: QuestPillar): { title: string; description: string } {
  return {
    title: `Take action: ${pillar.label}`,
    description: `Do one concrete, specific thing today toward: ${pillar.description}.`,
  };
}

function pickFallback(pillar: QuestPillar, seed: number): { title: string; description: string } {
  const pool = CURATED_FALLBACK_POOL[pillar.key];
  if (pool && pool.length > 0) return pool[seed % pool.length];
  return genericFallback(pillar);
}

function buildFallbackQuests(dateKey: string, pillars: [QuestPillar, QuestPillar]): DailyQuest[] {
  const daySeed = new Date(dateKey).getDate();
  return pillars.map((pillar, i) => {
    const pick = pickFallback(pillar, daySeed + i * 7);
    return {
      id: randomId(),
      dateKey,
      title: pick.title,
      description: pick.description,
      focus: pillar.key,
      xpBonus: QUEST_XP_BASE,
      status: "pending" as const,
      source: "fallback" as const,
    };
  });
}

interface GeminiQuestRaw {
  title?: string;
  description?: string;
  focus?: string;
}

function parseGeminiQuests(raw: string, dateKey: string, pillars: [QuestPillar, QuestPillar]): DailyQuest[] {
  const cleaned = raw.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned) as GeminiQuestRaw[];
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Empty quest array");

  const validKeys = new Set(pillars.map((p) => p.key));
  return parsed.slice(0, 2).map((q, i) => {
    const focus = q.focus && validKeys.has(q.focus) ? q.focus : pillars[i]?.key ?? pillars[0].key;
    return {
      id: randomId(),
      dateKey,
      title: (q.title ?? "Today's quest").slice(0, 90),
      description: (q.description ?? "").slice(0, 280),
      focus,
      xpBonus: QUEST_XP_BASE,
      status: "pending" as const,
      source: "gemini" as const,
    };
  });
}

/** Generates the 2 daily quests for a given date, tailored to the persona + income goal + user's own pillars. */
export async function generateDailyQuests(
  dateKey: string,
  incomeGoal: IncomeGoal,
  pillars: QuestPillar[],
  tone: CoachTone = "blunt",
  aboutMe = "",
  pinnedFocusArea: LifeAreaKey | null = null
): Promise<DailyQuest[]> {
  const focusPair = focusPairForDate(new Date(dateKey + "T00:00:00"), pillars, pinnedFocusArea);

  if (!isGeminiConfigured) {
    return buildFallbackQuests(dateKey, focusPair);
  }

  const daysLeft = Math.max(
    1,
    Math.round((new Date(incomeGoal.targetDate).getTime() - new Date(dateKey).getTime()) / 86400000)
  );

  const personaLine = aboutMe.trim()
    ? `Here's what this person has shared about who they are, what they do, and their interests — use it to make quests genuinely specific to them, not generic:\n"""${aboutMe.trim().slice(0, 1500)}"""`
    : "This person hasn't shared background details yet, so keep quests broadly applicable rather than assuming a specific profession or skillset.";

  const prompt = `Generate exactly 2 daily quests for today (${dateKey}) for someone working toward making ${incomeGoal.min}-${incomeGoal.max} ${incomeGoal.currency} the normal monthly income by ${incomeGoal.targetDate} (${daysLeft} days left).

${personaLine}

Quest 1 focus: "${focusPair[0].label}" — ${focusPair[0].description}
Quest 2 focus: "${focusPair[1].label}" — ${focusPair[1].description}

Make both SPECIFIC and slightly demanding — something that takes real effort today and feels like a genuine challenge, not a checklist item. Where it fits naturally, lean on whatever skills or interests they've described for income-flavored quests, but vary it — not every quest needs to draw on the same skill.

Respond with ONLY valid JSON, no markdown fences, no commentary, in exactly this shape:
[{"title":"short punchy title","description":"one or two specific sentences, imperative voice","focus":"${focusPair[0].key}"},{"title":"short punchy title","description":"one or two specific sentences, imperative voice","focus":"${focusPair[1].key}"}]`;

  try {
    const text = await askGemini(prompt, {
      systemInstruction: `${coachVoice(tone)} You never give vague advice. Output raw JSON only.`,
      temperature: 0.9,
      maxOutputTokens: 400,
    });
    return parseGeminiQuests(text, dateKey, focusPair);
  } catch {
    return buildFallbackQuests(dateKey, focusPair);
  }
}

/** Regenerates a single quest of the same pillar (used for rerolls). */
export async function generateReplacementQuest(
  dateKey: string,
  pillar: QuestPillar,
  avoidTitle: string,
  tone: CoachTone = "blunt",
  aboutMe = ""
): Promise<DailyQuest> {
  if (!isGeminiConfigured) {
    const daySeed = new Date(dateKey).getDate() + avoidTitle.length;
    const pick = pickFallback(pillar, daySeed);
    return {
      id: randomId(),
      dateKey,
      title: pick.title,
      description: pick.description,
      focus: pillar.key,
      xpBonus: QUEST_XP_BASE,
      status: "pending",
      source: "fallback",
    };
  }

  const personaLine = aboutMe.trim()
    ? ` This person's background: "${aboutMe.trim().slice(0, 500)}" — use it if it naturally fits.`
    : "";

  const prompt = `Generate exactly 1 replacement daily quest for today (${dateKey}).${personaLine} Focus: "${pillar.label}" — ${pillar.description}. It must be genuinely different from this one, which felt impossible today: "${avoidTitle}". Make it specific, doable today, and still a real challenge.

Respond with ONLY valid JSON, no markdown fences: {"title":"short punchy title","description":"one or two specific sentences, imperative voice"}`;

  try {
    const text = await askGemini(prompt, {
      systemInstruction: `${coachVoice(tone)} Output raw JSON only.`,
      temperature: 0.95,
      maxOutputTokens: 200,
    });
    const cleaned = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned) as GeminiQuestRaw;
    return {
      id: randomId(),
      dateKey,
      title: (parsed.title ?? "Today's quest").slice(0, 90),
      description: (parsed.description ?? "").slice(0, 280),
      focus: pillar.key,
      xpBonus: QUEST_XP_BASE,
      status: "pending",
      source: "gemini",
    };
  } catch {
    const daySeed = new Date(dateKey).getDate() + avoidTitle.length;
    const pick = pickFallback(pillar, daySeed);
    return {
      id: randomId(),
      dateKey,
      title: pick.title,
      description: pick.description,
      focus: pillar.key,
      xpBonus: QUEST_XP_BASE,
      status: "pending",
      source: "fallback",
    };
  }
}
