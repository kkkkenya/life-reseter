import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { X } from "lucide-react";
import { TASK_CATALOG, DEFAULT_STARTER_TASK_IDS, findTaskDef } from "@/data/taskCatalog";
import { Card, GhostButton, PrimaryButton, ScreenShell } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";

function IconFor({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Cmp = (Icons as any)[name] ?? Icons.Circle;
  return <Cmp size={size} color={color} />;
}

export default function Setup() {
  const tasks = useAppStore((s) => s.profile.tasks);
  const addTask = useAppStore((s) => s.addTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const startProgram = useAppStore((s) => s.startProgram);
  const markOnboarded = useAppStore((s) => s.markOnboarded);
  const aboutMe = useAppStore((s) => s.profile.aboutMe);
  const setAboutMe = useAppStore((s) => s.setAboutMe);

  const [step, setStep] = useState<"about" | "tasks">("about");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [freq, setFreq] = useState(5);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current) return;
    if (tasks.length === 0) {
      seededRef.current = true;
      DEFAULT_STARTER_TASK_IDS.forEach((id) => {
        const def = findTaskDef(id);
        if (def) addTask(def.id, def.label, def.icon, def.category, def.lifeArea, 7, true, 1);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirmAdd() {
    if (!pendingTaskId) return;
    const def = findTaskDef(pendingTaskId);
    if (!def) return;
    addTask(def.id, def.label, def.icon, def.category, def.lifeArea, freq, true, 1);
    setPendingTaskId(null);
    setPickerOpen(false);
    setFreq(5);
  }

  function begin() {
    startProgram(startDate);
    markOnboarded();
  }

  return (
    <ScreenShell>
      {step === "about" ? (
        <>
          <h1 className="font-display text-2xl font-semibold">Tell us about you</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
            What do you do, what are you working on, what are your interests? The more you share, the better the AI can curate quests and suggestions to you specifically. Totally optional, and you can update it anytime in Settings.
          </p>

          <textarea
            value={aboutMe}
            onChange={(e) => setAboutMe(e.target.value)}
            placeholder="e.g. I'm a final-year computer science student, freelance as a web developer on the side, into gym and chess, trying to build a small SaaS product this year..."
            rows={10}
            className="mt-6 w-full flex-1 resize-none rounded-2xl border p-4 text-sm outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
          />

          <div className="mt-6 space-y-2">
            <PrimaryButton onClick={() => setStep("tasks")}>Continue</PrimaryButton>
            {!aboutMe.trim() && (
              <GhostButton onClick={() => setStep("tasks")}>Skip for now</GhostButton>
            )}
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl font-semibold">What are you tracking?</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
            Pick your tasks and a start date. No quiz, no theater.
          </p>

          <div className="mt-6">
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

          <div className="mt-6 flex-1 space-y-3 overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
              Tasks
            </p>
            {tasks.map((t) => (
              <Card key={t.uid} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <IconFor name={t.icon} size={18} color="var(--color-ember)" />
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
                      {t.frequencyPerWeek}x/week
                    </p>
                  </div>
                </div>
                <button onClick={() => removeTask(t.uid)} aria-label={`Remove ${t.label}`}>
                  <X size={16} color="var(--color-ink-faint)" />
                </button>
              </Card>
            ))}

            <button
              onClick={() => setPickerOpen(true)}
              className="w-full rounded-2xl border border-dashed py-3 text-sm font-medium"
              style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)" }}
            >
              + Add a task
            </button>
          </div>

          <div className="space-y-2">
            <PrimaryButton disabled={tasks.length === 0} onClick={begin}>
              Start tracking
            </PrimaryButton>
            <GhostButton onClick={() => setStep("about")}>Back</GhostButton>
          </div>
        </>
      )}

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
                    const existingIds = new Set(tasks.map((t) => t.taskId));
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
