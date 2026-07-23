import type { UserProfile } from "@/types";
import { startOfWeek } from "@/lib/isoWeek";
import { LIFE_AREAS } from "@/data/lifeAreas";
import { lifeAreaCompletion, monthlyIncomeTotal } from "@/lib/lifeAreaStats";
import { currentStreakDuration } from "@/lib/streaks";

export function buildWeeklySummaryContext(profile: UserProfile): string {
  const weekStart = startOfWeek();
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  const daysThisWeek = Object.values(profile.days).filter((d) => d.date >= weekStartIso);
  let done = 0;
  let skipped = 0;
  let pending = 0;
  daysThisWeek.forEach((d) => {
    Object.values(d.tasks).forEach((s) => {
      if (s === "done") done++;
      else if (s === "skipped") skipped++;
      else pending++;
    });
  });

  const skipReasonsThisWeek = Object.entries(profile.skipReasons)
    .filter(([key]) => {
      const day = Number(key.split("-")[0]);
      const rec = profile.days[day];
      return rec && rec.date >= weekStartIso;
    })
    .map(([, reason]) => reason);

  const completion = lifeAreaCompletion(profile);
  const areaLines = LIFE_AREAS.map(
    (a) => `${a.label}: ${completion[a.key].done}/${completion[a.key].total} done`
  ).join("; ");

  const streakLines = profile.streaks
    .map((h) => {
      if (h.mode === "avoidance") {
        const dur = currentStreakDuration(h);
        return `${h.label}: ${dur.days} days clean`;
      }
      return `${h.label}: tracked habit`;
    })
    .join("; ");

  const thisMonth = new Date().toISOString().slice(0, 7);
  const incomeThisMonth = monthlyIncomeTotal(profile, thisMonth);

  const journalThisWeek = Object.values(profile.journal).filter((j) => {
    const rec = profile.days[j.day];
    return rec && rec.date >= weekStartIso;
  });
  const moods = journalThisWeek.map((j) => j.mood).filter((m) => typeof m === "number");
  const avgMood = moods.length > 0 ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : "no data";

  return `This week's data:
Tasks: ${done} done, ${skipped} skipped, ${pending} still pending.
${skipReasonsThisWeek.length > 0 ? `Reasons given for skipping: ${skipReasonsThisWeek.join(" | ")}` : "No skip reasons logged."}
Life areas: ${areaLines}
Streaks: ${streakLines || "none tracked"}
Income logged this month so far: ${incomeThisMonth} KES (target floor: 50,000 KES/month)
Average mood this week: ${avgMood}/10`;
}
