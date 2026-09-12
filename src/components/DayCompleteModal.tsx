import { useEffect } from "react";
import { Flame, X } from "lucide-react";
import { PrimaryButton } from "@/components/ui";
import { useCelebrationStore } from "@/store/useCelebrationStore";
import { playMilestone } from "@/lib/sound";

function streakLine(streak: number): string {
  if (streak <= 1) return "Day one, logged. Tomorrow is what makes it a streak.";
  if (streak < 7) return `${streak} days in a row. Keep the chain going.`;
  if (streak < 33) return `${streak} days straight — that's a real habit forming.`;
  if (streak < 100) return `${streak} days running. This is who you are now, not a phase.`;
  return `${streak} days. Triple digits — this is a system, not an experiment.`;
}

export function DayCompleteModal({
  streak,
  tasksDone,
  onClose,
}: {
  streak: number;
  tasksDone: number;
  onClose: () => void;
}) {
  useEffect(() => {
    playMilestone();
    useCelebrationStore.getState().fire(window.innerWidth / 2, window.innerHeight * 0.32, {
      size: "lg",
      colors: ["#e8b85c", "#ff5f2e", "#edeef0", "#46d17a"],
    });
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ background: "var(--color-bg)" }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full"
        style={{ background: "var(--color-surface)" }}
      >
        <X size={16} color="var(--color-ink-dim)" />
      </button>

      <div
        className="animate-pop flex h-24 w-24 items-center justify-center rounded-full"
        style={{ background: "var(--color-ember-soft)" }}
      >
        <Flame size={44} color="var(--color-ember)" />
      </div>

      <h1 className="animate-fade-scale-in mt-6 text-center font-display text-2xl font-semibold">
        Day complete
      </h1>
      <p className="mt-2 max-w-[26ch] text-center text-sm" style={{ color: "var(--color-ink-dim)" }}>
        {tasksDone} {tasksDone === 1 ? "task" : "tasks"} done. {streakLine(streak)}
      </p>

      <div
        className="animate-rise mt-8 flex items-center gap-2 rounded-full border px-5 py-2.5"
        style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}
      >
        <Flame size={18} color="var(--color-ember)" />
        <span className="font-display text-lg font-semibold" style={{ color: "var(--color-ember)" }}>
          {streak}
        </span>
        <span className="text-sm" style={{ color: "var(--color-ink-dim)" }}>
          day streak
        </span>
      </div>

      <div className="mt-10 w-full max-w-xs">
        <PrimaryButton onClick={onClose}>Nice</PrimaryButton>
      </div>
    </div>
  );
}
