import { useEffect, useState } from "react";
import { Plus, X, Sparkles } from "lucide-react";
import { PrimaryButton, GhostButton } from "@/components/ui";
import { IconFor } from "@/components/IconFor";
import { TASK_CATALOG } from "@/data/taskCatalog";
import { LIFE_AREAS } from "@/data/lifeAreas";
import { distributeWeekdays } from "@/lib/planGenerator";
import { timeOfDayInsight } from "@/lib/habitAnalytics";
import { useAppStore } from "@/store/useAppStore";
import type { PlannedTask, TimeOfDay, TaskPriority, RecurrenceRule, RecurrenceType, TaskDefinition, LifeAreaKey } from "@/types";

function slugify(label: string): string {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `custom-${base || "task"}-${Date.now().toString(36)}`;
}

const TIME_OF_DAY_OPTIONS: { key: TimeOfDay; label: string }[] = [
  { key: "anytime", label: "Anytime" },
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
];

const PRIORITY_OPTIONS: { key: TaskPriority; label: string; color: string }[] = [
  { key: "P1", label: "P1 · Must do", color: "var(--color-bad)" },
  { key: "P2", label: "P2 · Should do", color: "var(--color-ember)" },
  { key: "P3", label: "P3 · Nice to have", color: "var(--color-ink-dim)" },
];

const RECURRENCE_OPTIONS: { key: RecurrenceType; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Biweekly" },
  { key: "monthly", label: "Monthly" },
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AddTaskSheet({
  existingTasks,
  onClose,
  onConfirm,
}: {
  existingTasks: PlannedTask[];
  onClose: () => void;
  onConfirm: (def: TaskDefinition, recurrence: RecurrenceRule, priority: TaskPriority, timeOfDay: TimeOfDay) => void;
}) {
  const [configuring, setConfiguring] = useState<TaskDefinition | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customLifeArea, setCustomLifeArea] = useState<LifeAreaKey>("productivity");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("weekly");
  const [freq, setFreq] = useState(5);
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [priority, setPriority] = useState<TaskPriority>("P2");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("anytime");

  const profile = useAppStore((s) => s.profile);
  const todInsight = timeOfDayInsight(profile);

  // Default a freshly-opened task to your historically best-performing time slot.
  useEffect(() => {
    if (configuring && todInsight) setTimeOfDay(todInsight.best);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuring?.id]);

  function startCustomTask() {
    const label = customLabel.trim();
    if (!label) return;
    setConfiguring({
      id: slugify(label),
      label,
      icon: "Sparkles",
      category: "custom",
      lifeArea: customLifeArea,
    });
    setShowCustomForm(false);
    setCustomLabel("");
  }

  function toggleWeekday(d: number) {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  function confirm() {
    if (!configuring) return;
    const todayIso = new Date().toISOString().slice(0, 10);
    let recurrence: RecurrenceRule;
    if (recurrenceType === "weekly") {
      recurrence = { type: "weekly", weekdays: distributeWeekdays(freq), anchorDate: todayIso };
    } else if (recurrenceType === "biweekly") {
      recurrence = { type: "biweekly", weekdays: weekdays.length > 0 ? weekdays : [1], anchorDate: todayIso };
    } else {
      recurrence = { type: "monthly", weekdays: [], dayOfMonth, anchorDate: todayIso };
    }
    onConfirm(configuring, recurrence, priority, timeOfDay);
    setConfiguring(null);
    setFreq(5);
    setRecurrenceType("weekly");
    setPriority("P2");
    setTimeOfDay("anytime");
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6"
        style={{ background: "var(--color-surface-raised)" }}
      >
        {!configuring ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Add a task</h2>
              <button onClick={onClose}>
                <X size={18} color="var(--color-ink-dim)" />
              </button>
            </div>
            <div className="mt-4 space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
                  Custom
                </p>
                {!showCustomForm ? (
                  <button
                    onClick={() => setShowCustomForm(true)}
                    className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--color-ember)", color: "var(--color-ember)", background: "var(--color-surface)" }}
                  >
                    <Plus size={15} />
                    Add your own task
                  </button>
                ) : (
                  <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}>
                    <input
                      autoFocus
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="e.g. Call grandma"
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {LIFE_AREAS.map((area) => (
                        <button
                          key={area.key}
                          onClick={() => setCustomLifeArea(area.key)}
                          className="rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                          style={{
                            borderColor: customLifeArea === area.key ? area.color : "var(--color-line)",
                            background: customLifeArea === area.key ? `color-mix(in srgb, ${area.color} 16%, transparent)` : "transparent",
                            color: customLifeArea === area.key ? area.color : "var(--color-ink-dim)",
                          }}
                        >
                          {area.shortLabel}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <PrimaryButton onClick={startCustomTask}>Continue</PrimaryButton>
                      <GhostButton onClick={() => { setShowCustomForm(false); setCustomLabel(""); }}>Cancel</GhostButton>
                    </div>
                  </div>
                )}
              </div>

              {TASK_CATALOG.map((cat) => {
                const existingIds = new Set(existingTasks.map((t) => t.taskId));
                const available = cat.tasks.filter((t) => !existingIds.has(t.id));
                if (available.length === 0) return null;
                return (
                  <div key={cat.key}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
                      {cat.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {available.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setConfiguring(t)}
                          className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                          style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}
                        >
                          <IconFor name={t.icon} size={15} color="var(--color-ember)" />
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-lg font-semibold">
              How often? <span style={{ color: "var(--color-ember)" }}>{configuring.label}</span>
            </h2>
            <div className="mt-3 flex gap-2">
              {RECURRENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setRecurrenceType(opt.key)}
                  className="flex-1 rounded-xl py-2 text-xs font-semibold"
                  style={{
                    background: recurrenceType === opt.key ? "var(--color-ember)" : "var(--color-surface)",
                    color: recurrenceType === opt.key ? "#fbf3e7" : "var(--color-ink-dim)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {recurrenceType === "weekly" && (
              <>
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={freq}
                  onChange={(e) => setFreq(Number(e.target.value))}
                  className="mt-4 w-full accent-[var(--color-ember)]"
                />
                <p className="mt-1 font-mono text-sm" style={{ color: "var(--color-ember)" }}>
                  {freq}x / week, starting today
                </p>
              </>
            )}

            {recurrenceType === "biweekly" && (
              <>
                <p className="mt-4 text-xs" style={{ color: "var(--color-ink-dim)" }}>
                  Which days, every other week?
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEEKDAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => toggleWeekday(i)}
                      className="flex h-9 w-11 items-center justify-center rounded-lg text-xs font-semibold"
                      style={{
                        background: weekdays.includes(i) ? "var(--color-ember)" : "var(--color-surface)",
                        color: weekdays.includes(i) ? "#fbf3e7" : "var(--color-ink-dim)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                  Starts this week, skips next, repeats.
                </p>
              </>
            )}

            {recurrenceType === "monthly" && (
              <>
                <p className="mt-4 text-xs" style={{ color: "var(--color-ink-dim)" }}>
                  Which day of the month?
                </p>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(Math.max(1, Math.min(28, Number(e.target.value))))}
                  className="mt-2 w-24 rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
                />
                <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                  Capped at 28 so it works every month.
                </p>
              </>
            )}

            <p className="mt-5 text-sm font-semibold">Priority</p>
            <div className="mt-2 flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPriority(opt.key)}
                  className="flex-1 rounded-xl border py-2 text-xs font-semibold"
                  style={{
                    borderColor: priority === opt.key ? opt.color : "var(--color-line)",
                    background: priority === opt.key ? "var(--color-surface)" : "transparent",
                    color: priority === opt.key ? opt.color : "var(--color-ink-dim)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm font-semibold">When during the day?</p>
            {todInsight && (
              <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
                <Sparkles size={12} className="mt-0.5 shrink-0" color="var(--color-ember)" />
                You complete {Math.round(todInsight.bestRate * 100)}% of your <span className="capitalize">{todInsight.best}</span> tasks vs{" "}
                {Math.round(todInsight.worstRate * 100)}% in the <span className="capitalize">{todInsight.worst}</span> — defaulted to{" "}
                {todInsight.best}.
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {TIME_OF_DAY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setTimeOfDay(opt.key)}
                  className="rounded-xl border px-3 py-2 text-xs font-medium"
                  style={{
                    borderColor: timeOfDay === opt.key ? "var(--color-ember)" : "var(--color-line)",
                    background: timeOfDay === opt.key ? "var(--color-ember-soft)" : "var(--color-surface)",
                    color: timeOfDay === opt.key ? "var(--color-ember)" : "var(--color-ink-dim)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={confirm}>Add this task</PrimaryButton>
              <GhostButton onClick={() => setConfiguring(null)}>Back</GhostButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
