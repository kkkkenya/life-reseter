/** Best-friend briefing: KEEP / CHANGE / WATCH from the week's real numbers.
 *  AI version when Gemini is configured, deterministic rule-based version
 *  always (offline, new users, key missing). */

export interface QuickTake {
  keep: string;
  change: string;
  watch: string;
}

export interface BriefingFacts {
  bestTaskLabel: string | null;
  bestTaskDays: number;
  perfectStreak: number;
  todBest: string | null;
  todBestRate: number | null; // 0-1
  todWorst: string | null;
  todWorstRate: number | null; // 0-1
  topPattern: string | null; // plain sentence, e.g. from correlationPredictsSentence
  openDeadlines: number;
  nearestDeadline: string | null; // "Lab report · 2026-09-10"
  checkinAvg: number | null;
  weeklyFocus: string | null;
}

const pct = (r: number) => `${Math.round(r * 100)}%`;

export function ruleBasedBriefing(f: BriefingFacts): QuickTake {
  const keep = f.bestTaskLabel
    ? `"${f.bestTaskLabel}" is your anchor — ${f.bestTaskDays} day${f.bestTaskDays === 1 ? "" : "s"} done. Protect it first, everything else is bonus.`
    : f.perfectStreak > 0
      ? `${f.perfectStreak}-day perfect run alive. Don't break the chain over something small.`
      : "Nothing to keep yet — finish one full day this week and we'll build from there.";

  let change = "Pick the single task you skip most and either shrink it or drop it — a smaller list you finish beats a big one you don't.";
  if (f.todBest && f.todWorst && f.todBestRate !== null && f.todWorstRate !== null && f.todBest !== f.todWorst) {
    change = `Your ${f.todWorst} converts at ${pct(f.todWorstRate)} vs ${pct(f.todBestRate)} in the ${f.todBest}. Move one habit into the ${f.todBest} and watch what happens.`;
  } else if (f.topPattern) {
    change = f.topPattern;
  } else if (f.openDeadlines > 0) {
    change = `${f.openDeadlines} deadline${f.openDeadlines === 1 ? " is" : "s are"} open — put the nearest one on tomorrow's MIT.`;
  }

  let watch = "Watch your evenings — that's where streaks usually leak.";
  if (f.nearestDeadline) {
    watch = `Nearest deadline: ${f.nearestDeadline}. Work backwards from it, not towards it.`;
  } else if (f.checkinAvg !== null) {
    watch = `Check-ins averaging ${f.checkinAvg}/10 — if that number slips two weeks running, something structural needs to change.`;
  } else if (f.weeklyFocus) {
    watch = `This week's focus: "${f.weeklyFocus}". If Friday arrives and it didn't move, the focus was decoration.`;
  }

  return { keep, change, watch };
}

/** Wraps the weekly data context with best-friend briefing instructions. */
export function buildBriefingPrompt(weeklyContext: string, firstName: string): string {
  return `You're briefing ${firstName || "a friend"} on their week like a best friend who refuses to let them settle — warm, direct, zero fluff.\n\n${weeklyContext}\n\nReply with EXACTLY three short lines (one sentence each), labeled exactly:\nKEEP: <what's working — protect it>\nCHANGE: <the one highest-leverage fix>\nWATCH: <the risk or deadline to keep an eye on>`;
}

/** Parse the AI reply's KEEP:/CHANGE:/WATCH: lines. Null when unparseable
 *  (caller then shows the raw text instead of dropping it). */
export function parseBriefing(text: string): QuickTake | null {
  const pick = (label: string): string | null => {
    const m = text.match(new RegExp(`^\\s*${label}\\s*[:\\-–]\\s*(.+)$`, "im"));
    return m?.[1]?.trim() || null;
  };
  const keep = pick("KEEP");
  const change = pick("CHANGE");
  const watch = pick("WATCH");
  if (!keep || !change || !watch) return null;
  return { keep, change, watch };
}
