import { Moon, X } from "lucide-react";
import { Card } from "@/components/ui";
import { IconFor } from "@/components/IconFor";
import type { TaskEntry } from "./TaskList";

export function EveningPlanningCard({
  tomorrowEntries,
  onPickMit,
  onDismiss,
}: {
  tomorrowEntries: TaskEntry[];
  onPickMit: (uid: string, label: string) => void;
  onDismiss: () => void;
}) {
  const pickable = tomorrowEntries.filter((e) => e.task);

  return (
    <Card className="mt-4 border-dashed">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Moon size={13} color="var(--color-ember)" />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
            Plan tomorrow
          </p>
        </div>
        <button onClick={onDismiss} aria-label="Dismiss">
          <X size={14} color="var(--color-ink-faint)" />
        </button>
      </div>
      <p className="mt-1.5 text-sm" style={{ color: "var(--color-ink-dim)" }}>
        Before you close out today — pick tomorrow's one most important task.
      </p>
      {pickable.length > 0 ? (
        <div className="mt-3 space-y-2">
          {pickable.slice(0, 6).map((e) => (
            <button
              key={e.uid}
              onClick={() => onPickMit(e.uid, e.task!.label)}
              className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}
            >
              <IconFor name={e.task!.icon} size={15} color="var(--color-ember)" />
              <span className="text-sm">{e.task!.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs" style={{ color: "var(--color-ink-faint)" }}>
          Nothing scheduled for tomorrow yet — add tasks from the Today tab first.
        </p>
      )}
    </Card>
  );
}
