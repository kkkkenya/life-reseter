import type { LifeAreaGoal, UserProfile } from "@/types";
import { taskCompletionRateWindowed } from "@/lib/habitAnalytics";
import { streakEvidence } from "@/lib/streaks";

/**
 * Resolves a life-area goal's daily link into concrete, real-data evidence.
 * Single source of truth for the Goals daily-link chip (Step 4) and the
 * WeeklyReview pinned-area card (Step 6) — both should render off the same
 * numbers rather than recomputing independently.
 */
export type GoalDailyEvidence =
  | { kind: "none" }
  | { kind: "missing" } // linked task/streak no longer exists (deleted since linking)
  | { kind: "task"; label: string; icon: string; done: number; scheduled: number; rate: number }
  | { kind: "streak"; label: string; icon: string; color?: string; currentDays: number; relapsesLast7Days: number };

export function goalDailyEvidence(goal: LifeAreaGoal, profile: UserProfile, windowDays = 7): GoalDailyEvidence {
  if (goal.dailyLinkType === "none") return { kind: "none" };

  if (goal.dailyLinkType === "task") {
    const task = profile.tasks.find((t) => t.uid === goal.dailyLinkId);
    if (!task) return { kind: "missing" };
    const { done, scheduled, rate } = taskCompletionRateWindowed(task.uid, profile, windowDays);
    return { kind: "task", label: task.label, icon: task.icon, done, scheduled, rate };
  }

  const habit = profile.streaks.find((s) => s.id === goal.dailyLinkId);
  if (!habit) return { kind: "missing" };
  const { currentDays, relapsesLast7Days } = streakEvidence(habit, profile);
  return { kind: "streak", label: habit.label, icon: habit.icon, color: habit.color, currentDays, relapsesLast7Days };
}

/** Short display text for an evidence chip. Returns null when there's nothing to show (no link). */
export function formatGoalEvidenceText(evidence: GoalDailyEvidence): string | null {
  switch (evidence.kind) {
    case "none":
      return null;
    case "missing":
      return "Linked item removed";
    case "task":
      return evidence.scheduled === 0
        ? "No scheduled days yet this week"
        : `${evidence.done}/${evidence.scheduled} this week`;
    case "streak": {
      const dayLabel = `${evidence.currentDays}d streak`;
      const relapseLabel =
        evidence.relapsesLast7Days > 0
          ? `${evidence.relapsesLast7Days} relapse${evidence.relapsesLast7Days === 1 ? "" : "s"} this week`
          : "clean this week";
      return `${dayLabel}, ${relapseLabel}`;
    }
  }
}
