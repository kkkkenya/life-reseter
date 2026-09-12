import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { resolveIcon } from "@/components/iconMap";
import { TASK_CATALOG, findTaskDef } from "@/data/taskCatalog";
import { LIFE_AREAS } from "@/data/lifeAreas";
import { GhostButton, PrimaryButton, ScreenShell } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { suggestTasks } from "@/lib/onboarding";
import type { LifeAreaKey } from "@/types";

function IconFor({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  const Cmp = resolveIcon(name);
  return <Cmp size={size} color={color} />;
}

/**
 * Setup — two steps, as promised: pick your tasks, pick a start date. One
 * optional free-text "why" field; everything else can be curated later in
 * Life. No quiz, no vow, no wizard.
 */
export default function Setup() {
  const addTask = useAppStore((s) => s.addTask);
  const startProgram = useAppStore((s) => s.startProgram);
  const markOnboarded = useAppStore((s) => s.markOnboarded);
  const setDisplayName = useAppStore((s) => s.setDisplayName);
  const setAboutMe = useAppStore((s) => s.setAboutMe);
  const setPinnedFocusArea = useAppStore((s) => s.setPinnedFocusArea);

  const [step, setStep] = useState<"tasks" | "start">("tasks");
  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const [focusAreas, setFocusAreas] = useState<LifeAreaKey[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  // Task picker: curated suggestions first, full catalog behind "add custom".
  const suggestions = useMemo(() => suggestTasks(focusAreas, 20), [focusAreas]);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const pickedCount = Object.keys(picked).length;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [freq, setFreq] = useState(5);

  function togglePick(taskId: string, defaultFreq: number) {
    setPicked((prev) => {
      if (prev[taskId] !== undefined) {
        const next = { ...prev };
        delete next[taskId];
        return next;
      }
      return { ...prev, [taskId]: defaultFreq };
    });
  }

  function nudgeFreq(taskId: string, delta: number) {
    setPicked((prev) => {
      const cur = prev[taskId] ?? 5;
      return { ...prev, [taskId]: Math.min(7, Math.max(1, cur + delta)) };
    });
  }

  function toggleFocus(key: LifeAreaKey) {
    setFocusAreas((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].slice(0, 3)));
  }

  function confirmAdd() {
    if (!pendingTaskId) return;
    const def = findTaskDef(pendingTaskId);
    if (!def) return;
    setPicked((prev) => (prev[def.id] !== undefined ? prev : { ...prev, [def.id]: freq }));
    setPendingTaskId(null);
    setPickerOpen(false);
    setFreq(5);
  }

  function begin() {
    if (name.trim()) setDisplayName(name);
    if (why.trim()) setAboutMe(why.trim().slice(0, 280));
    setPinnedFocusArea(focusAreas[0] ?? null);
    for (const [taskId, frequency] of Object.entries(picked)) {
      const def = findTaskDef(taskId);
      if (!def) continue;
      addTask(def.id, def.label, def.icon, def.category, def.lifeArea, frequency, true, 1);
    }
    startProgram(startDate);
    markOnboarded();
  }

  const firstName = name.trim().split(/\s+/)[0] || "friend";

  return (
    <ScreenShell>
      <div className="mt-4 flex-1">
        {step === "tasks" && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
              Welcome to RESET
            </p>
            <h1 className="font-display mt-1 text-2xl font-semibold">Pick your tasks, that's it.</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
              No quiz, no vow. Choose what you're actually tracking — minimum 3. Tap a picked one to set days per week.
            </p>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should I call you? (optional)"
              maxLength={40}
              className="mt-4 w-full rounded-2xl border p-4 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              {LIFE_AREAS.map((a) => {
                const selected = focusAreas.includes(a.key);
                return (
                  <button
                    key={a.key}
                    onClick={() => toggleFocus(a.key)}
                    className="tactile flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
                    style={{
                      borderColor: selected ? "var(--color-ember)" : "var(--color-line)",
                      background: selected ? "var(--color-ember-soft)" : "var(--color-surface)",
                    }}
                  >
                    <IconFor name={a.icon} size={15} color={selected ? "var(--color-ember)" : a.color} />
                    {a.shortLabel}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
              Optional — up to 3 focus areas shape your task suggestions.
            </p>

            <p className="mt-4 text-xs font-semibold" style={{ color: pickedCount >= 3 ? "var(--color-good)" : "var(--color-ember)" }}>
              {pickedCount} selected{pickedCount < 3 ? ` — ${3 - pickedCount} more to go` : " — looking strong"}
            </p>
            <div className="mt-3 space-y-2">
              {suggestions.map(({ def, suggestedFreq, reason }) => {
                const freq = picked[def.id];
                const selected = freq !== undefined;
                return (
                  <div
                    key={def.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => togglePick(def.id, suggestedFreq)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") togglePick(def.id, suggestedFreq);
                    }}
                    className="tactile w-full rounded-2xl border px-4 py-3"
                    style={{
                      borderColor: selected ? "var(--color-ember)" : "var(--color-line)",
                      background: selected ? "var(--color-ember-soft)" : "var(--color-surface)",
                      boxShadow: "var(--shadow-flush)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <IconFor name={def.icon} size={18} color="var(--color-ember)" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{def.label}</p>
                        <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
                          {reason}
                        </p>
                      </div>
                      {selected && <Check size={15} color="var(--color-ember)" className="shrink-0" />}
                    </div>
                    {selected && (
                      <div className="mt-2 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => nudgeFreq(def.id, -1)}
                          aria-label={`Fewer days for ${def.label}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg font-bold"
                          style={{ background: "var(--color-surface)" }}
                        >
                          −
                        </button>
                        <span className="font-mono text-xs font-semibold" style={{ color: "var(--color-ember)" }}>
                          {freq}x / week
                        </span>
                        <button
                          onClick={() => nudgeFreq(def.id, 1)}
                          aria-label={`More days for ${def.label}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg font-bold"
                          style={{ background: "var(--color-surface)" }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => setPickerOpen(true)}
                className="w-full rounded-2xl border border-dashed py-3 text-sm font-medium"
                style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)" }}
              >
                + Can't find it? Add a custom task
              </button>
            </div>
            <div className="mt-6 space-y-2">
              <PrimaryButton disabled={pickedCount < 3} onClick={() => setStep("start")}>
                {pickedCount < 3 ? `Pick ${3 - pickedCount} more` : `Continue with ${pickedCount}`}
              </PrimaryButton>
            </div>
          </div>
        )}

        {step === "start" && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
              Day zero
            </p>
            <h1 className="font-display mt-1 text-2xl font-semibold">Ready when you are, {firstName}.</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
              Pick a start date. One optional sentence about why — or leave it blank and just begin.
            </p>

            <div className="mt-5">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
                Start date
              </p>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
              />
            </div>

            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
                Why (optional)
              </p>
              <textarea
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="e.g. Graduate strong, build a real income, stop scrolling my life away…"
                rows={3}
                maxLength={280}
                className="w-full resize-none rounded-2xl border p-4 text-sm outline-none"
                style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
              />
            </div>

            <div className="mt-6 space-y-2">
              <PrimaryButton disabled={pickedCount < 3} onClick={begin}>
                Start tracking
              </PrimaryButton>
              <GhostButton onClick={() => setStep("tasks")}>Back to tasks</GhostButton>
            </div>
          </div>
        )}
      </div>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60"
          onClick={() => {
            setPickerOpen(false);
            setPendingTaskId(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[75vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6"
            style={{ background: "var(--color-surface-raised)" }}
          >
            {!pendingTaskId ? (
              <>
                <h2 className="font-display text-lg font-semibold">Add a task</h2>
                <div className="mt-4 space-y-5">
                  {TASK_CATALOG.map((cat) => {
                    const existingIds = new Set([...suggestions.map((s) => s.def.id), ...Object.keys(picked)]);
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
                              onClick={() => setPendingTaskId(t.id)}
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
                <h2 className="font-display text-lg font-semibold">How often per week?</h2>
                <input
                  type="range"
                  min={1}
                  max={7}
                  value={freq}
                  onChange={(e) => setFreq(Number(e.target.value))}
                  className="mt-4 w-full accent-[var(--color-ember)]"
                />
                <p className="mt-1 font-mono text-sm" style={{ color: "var(--color-ember)" }}>
                  {freq}x / week
                </p>
                <div className="mt-6 space-y-2">
                  <PrimaryButton onClick={confirmAdd}>Add this task</PrimaryButton>
                  <GhostButton onClick={() => setPendingTaskId(null)}>Back</GhostButton>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </ScreenShell>
  );
}
