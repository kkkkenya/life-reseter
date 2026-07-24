import { useState } from "react";
import { X } from "lucide-react";
import { IconFor } from "@/components/IconFor";
import type { PlannedTask, StreakHabit } from "@/types";

export type GoalLinkPick = { type: "task"; uid: string } | { type: "streak"; id: string };

function TagChip({ label }: { label: string }) {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
      style={{ color: "var(--color-ink-faint)", border: "1px solid var(--color-line)" }}
    >
      {label}
    </span>
  );
}

/** Scrollable/searchable sheet combining tasks + streaks into one linkable list, per the daily-goal-linking spec. */
export function GoalLinkPickerSheet({
  tasks,
  streaks,
  onPick,
  onClear,
  onClose,
}: {
  tasks: PlannedTask[];
  streaks: StreakHabit[];
  onPick: (pick: GoalLinkPick) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filteredTasks = q ? tasks.filter((t) => t.label.toLowerCase().includes(q)) : tasks;
  const filteredStreaks = q ? streaks.filter((s) => s.label.toLowerCase().includes(q)) : streaks;
  const nothingFound = filteredTasks.length === 0 && filteredStreaks.length === 0;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[75vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6"
        style={{ background: "var(--color-surface-raised)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Link a daily task or streak</h2>
          <button onClick={onClose} aria-label="Close" className="tactile rounded-full p-1">
            <X size={18} color="var(--color-ink-dim)" />
          </button>
        </div>

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="mt-4 w-full rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
        />

        <button
          onClick={onClear}
          className="tactile mt-3 flex w-full items-center rounded-xl border px-4 py-3 text-left text-sm font-medium"
          style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink-dim)" }}
        >
          No link
        </button>

        <div className="mt-3 space-y-2">
          {filteredTasks.map((t) => (
            <button
              key={`task-${t.uid}`}
              onClick={() => onPick({ type: "task", uid: t.uid })}
              className="tactile flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}
            >
              <IconFor name={t.icon} size={16} color={t.color ?? "var(--color-ember)"} />
              <span className="flex-1 truncate text-sm">{t.label}</span>
              <TagChip label="Task" />
            </button>
          ))}
          {filteredStreaks.map((s) => (
            <button
              key={`streak-${s.id}`}
              onClick={() => onPick({ type: "streak", id: s.id })}
              className="tactile flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}
            >
              <IconFor name={s.icon} size={16} color={s.color ?? "var(--color-ember)"} />
              <span className="flex-1 truncate text-sm">{s.label}</span>
              <TagChip label="Streak" />
            </button>
          ))}
          {nothingFound && (
            <p className="py-6 text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
              Nothing matches "{query}".
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
