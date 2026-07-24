import { useState } from "react";
import { Check, X as XIcon, CornerDownRight } from "lucide-react";
import { Card, GhostButton } from "@/components/ui";
import { IconFor } from "@/components/IconFor";
import { getLifeArea } from "@/data/lifeAreas";
import type { PlannedTask, TaskStatus, TimeOfDay, TaskPriority } from "@/types";

export interface TaskEntry {
  uid: string;
  status: TaskStatus;
  task: PlannedTask | undefined;
}

const GROUP_ORDER: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];
const GROUP_LABEL: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  anytime: "Anytime",
};

const PRIORITY_RANK: Record<TaskPriority, number> = { P1: 0, P2: 1, P3: 2 };
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  P1: "var(--color-bad)",
  P2: "var(--color-ember)",
  P3: "var(--color-ink-faint)",
};

function TaskRow({
  entry,
  carried,
  onComplete,
  onSkip,
}: {
  entry: TaskEntry;
  carried: boolean;
  onComplete: (uid: string, el: Element | null) => void;
  onSkip: (uid: string, reason?: string) => void;
}) {
  const [skipping, setSkipping] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const { uid, status, task } = entry;
  if (!task) return null;
  const priority = task.priority ?? "P2";
  const area = getLifeArea(task.lifeArea);

  return (
    <Card className="py-3" spineColor={area.color}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="relative flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: `color-mix(in srgb, ${area.color} 16%, transparent)` }}
          >
            <IconFor name={task.icon} size={16} color={area.color} />
            {priority === "P1" && (
              <span
                className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2"
                style={{ background: PRIORITY_COLOR.P1, borderColor: "var(--color-surface)" }}
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p
                className="text-sm font-medium"
                style={{
                  textDecoration: status === "skipped" ? "line-through" : "none",
                  color: status === "done" ? "var(--color-good)" : "var(--color-ink)",
                }}
              >
                {task.label}
              </p>
              {carried && (
                <span className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: "var(--color-surface-raised)", color: "var(--color-ink-faint)" }}>
                  <CornerDownRight size={9} /> carried
                </span>
              )}
            </div>
            <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
              {task.recurrence?.type === "monthly"
                ? `Monthly, day ${task.recurrence.dayOfMonth}`
                : task.recurrence?.type === "biweekly"
                ? "Every 2 weeks"
                : `${task.frequencyPerWeek}x/week`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSkipping((v) => !v)}
            disabled={status !== "pending"}
            className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-20"
            style={{ background: "var(--color-surface-raised)" }}
            aria-label="Skip"
          >
            <XIcon size={14} color="var(--color-ink-dim)" />
          </button>
          <button
            onClick={(e) => onComplete(uid, e.currentTarget)}
            disabled={status === "done"}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-60"
            style={{ background: status === "done" ? "var(--color-good)" : "var(--color-ember)" }}
            aria-label="Complete"
          >
            <Check size={14} color="#fbf3e7" />
          </button>
        </div>
      </div>
      {skipping && (
        <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-line)" }}>
          <input
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            placeholder="Why? (optional, helps the pattern show up later)"
            className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
          />
          <div className="mt-2 flex gap-2">
            <GhostButton className="py-2 text-xs" onClick={() => setSkipping(false)}>
              Cancel
            </GhostButton>
            <button
              onClick={() => {
                onSkip(uid, skipReason.trim() || undefined);
                setSkipping(false);
                setSkipReason("");
              }}
              className="flex-1 rounded-2xl py-2 text-xs font-semibold"
              style={{ background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
            >
              Confirm skip
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function TaskList({
  entries,
  carriedOver,
  onComplete,
  onSkip,
}: {
  entries: TaskEntry[];
  carriedOver?: string[];
  onComplete: (uid: string, el: Element | null) => void;
  onSkip: (uid: string, reason?: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <Card>
        <p className="text-sm" style={{ color: "var(--color-ink-dim)" }}>
          No tasks scheduled for this day.
        </p>
      </Card>
    );
  }

  const carriedSet = new Set(carriedOver ?? []);

  const groups = new Map<TimeOfDay, TaskEntry[]>();
  for (const e of entries) {
    if (!e.task) continue;
    const key = e.task.timeOfDay ?? "anytime";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  // sort each group by priority, P1 first
  groups.forEach((list) => {
    list.sort((a, b) => PRIORITY_RANK[a.task?.priority ?? "P2"] - PRIORITY_RANK[b.task?.priority ?? "P2"]);
  });

  const usedGroups = GROUP_ORDER.filter((g) => (groups.get(g)?.length ?? 0) > 0);
  const showHeaders = usedGroups.length > 1;

  return (
    <div className="space-y-3">
      {usedGroups.map((group) => (
        <div key={group} className="space-y-3">
          {showHeaders && (
            <p className="pt-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
              {GROUP_LABEL[group]}
            </p>
          )}
          {groups.get(group)!.map((entry) => (
            <TaskRow key={entry.uid} entry={entry} carried={carriedSet.has(entry.uid)} onComplete={onComplete} onSkip={onSkip} />
          ))}
        </div>
      ))}
    </div>
  );
}
