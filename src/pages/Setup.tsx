import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import { resolveIcon } from "@/components/iconMap";
import { TASK_CATALOG, DEFAULT_STARTER_TASK_IDS, findTaskDef } from "@/data/taskCatalog";
import { LIFE_AREAS } from "@/data/lifeAreas";
import { Card, GhostButton, PrimaryButton, ScreenShell, TopProgress } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import {
  MATTER_OPTIONS,
  OBSTACLE_OPTIONS,
  QUIT_OPTIONS,
  SEASON_OPTIONS,
  SLEEP_OPTIONS,
  TASTE_OPTIONS,
  VIBE_OPTIONS,
  composeAboutMe,
  pillarsFor,
  quizFromAnswers,
  type OnboardingAnswers,
} from "@/lib/onboarding";
import type { CoachTone, LifeAreaKey } from "@/types";

function IconFor({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  const Cmp = resolveIcon(name);
  return <Cmp size={size} color={color} />;
}

const STEPS = [
  "welcome",
  "name",
  "season",
  "focus",
  "reality",
  "obstacle",
  "confidence",
  "vibe",
  "matters",
  "tastes",
  "devotional",
  "rhythm",
  "quit",
  "vision",
  "income",
  "tasks",
  "start",
] as const;
type Step = (typeof STEPS)[number];

function StepHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
        {kicker}
      </p>
      <h1 className="font-display mt-1 text-2xl font-semibold">{title}</h1>
      {sub && (
        <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
          {sub}
        </p>
      )}
    </>
  );
}

function OptionCard({
  selected,
  onClick,
  title,
  blurb,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  blurb?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="tactile w-full rounded-2xl border px-4 py-3 text-left"
      style={{
        borderColor: selected ? "var(--color-ember)" : "var(--color-line)",
        background: selected ? "var(--color-ember-soft)" : "var(--color-surface)",
        boxShadow: "var(--shadow-flush)",
      }}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        {selected && <Check size={15} color="var(--color-ember)" />}
      </span>
      {blurb && (
        <span className="mt-0.5 block text-xs" style={{ color: "var(--color-ink-dim)" }}>
          {blurb}
        </span>
      )}
    </button>
  );
}

export default function Setup() {
  const tasks = useAppStore((s) => s.profile.tasks);
  const addTask = useAppStore((s) => s.addTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const startProgram = useAppStore((s) => s.startProgram);
  const markOnboarded = useAppStore((s) => s.markOnboarded);
  const setDisplayName = useAppStore((s) => s.setDisplayName);
  const setQuiz = useAppStore((s) => s.setQuiz);
  const setAboutMe = useAppStore((s) => s.setAboutMe);
  const setCoachTone = useAppStore((s) => s.setCoachTone);
  const setQuestPillars = useAppStore((s) => s.setQuestPillars);
  const setDevotionalSettings = useAppStore((s) => s.setDevotionalSettings);
  const setPinnedFocusArea = useAppStore((s) => s.setPinnedFocusArea);
  const seedStreaksFromSelection = useAppStore((s) => s.seedStreaksFromSelection);
  const setGoalWhy = useAppStore((s) => s.setGoalWhy);
  const setIncomeGoal = useAppStore((s) => s.setIncomeGoal);
  const devotionalMode = useAppStore((s) => s.profile.devotional.mode);

  const [stepIdx, setStepIdx] = useState(0);
  const step: Step = STEPS[stepIdx];
  const next = () => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setStepIdx((i) => Math.max(i - 1, 0));

  // Collected answers (committed on Begin).
  const [displayName, setDisplayNameLocal] = useState("");
  const [season, setSeason] = useState("");
  const [focusAreas, setFocusAreas] = useState<LifeAreaKey[]>([]);
  const [reality, setReality] = useState("");
  const [obstacle, setObstacle] = useState("");
  const [confidence, setConfidence] = useState(6);
  const [vibe, setVibe] = useState<CoachTone>("gentle");
  const [matters, setMatters] = useState<string[]>([]);
  const [tastes, setTastes] = useState<string[]>([]);
  const [tastesNote, setTastesNote] = useState("");
  const [devotional, setDevotional] = useState(true);
  const [sleep, setSleep] = useState("");
  const [quit, setQuit] = useState<string[]>([]);
  const [vision, setVision] = useState("");
  const [incomeMin, setIncomeMin] = useState("30000");
  const [incomeMax, setIncomeMax] = useState("60000");
  const [incomeTarget, setIncomeTarget] = useState(`${new Date().getFullYear()}-12-31`);

  // Task picker state (carried over from the old setup).
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

  function toggle<T>(list: T[], v: T, max: number): T[] {
    if (list.includes(v)) return list.filter((x) => x !== v);
    if (list.length >= max) return list;
    return [...list, v];
  }

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
    const answers: OnboardingAnswers = {
      displayName,
      season,
      focusAreas,
      reality,
      obstacle,
      vibe,
      matters,
      devotional,
      tastes,
      tastesNote,
      confidence,
      sleep,
      quit,
      vision,
      incomeMin,
      incomeMax,
      incomeTarget,
    };
    if (displayName.trim()) setDisplayName(displayName);
    setQuiz(quizFromAnswers(answers));
    const about = composeAboutMe(answers);
    if (about) setAboutMe(about);
    setCoachTone(vibe);
    setQuestPillars(pillarsFor(matters));
    setDevotionalSettings({ enabled: devotional, mode: devotionalMode });
    setPinnedFocusArea(focusAreas[0] ?? null);
    if (quit.length > 0) seedStreaksFromSelection(quit);
    if (vision.trim() && focusAreas[0]) setGoalWhy(focusAreas[0], vision.trim().slice(0, 280));
    const min = Math.max(0, Math.round(Number(incomeMin) || 0));
    const max = Math.max(0, Math.round(Number(incomeMax) || 0));
    if (min > 0 && max > 0) {
      setIncomeGoal({
        min: Math.min(min, max),
        max: Math.max(min, max),
        currency: "KES",
        targetDate: /^\d{4}-\d{2}-\d{2}$/.test(incomeTarget) ? incomeTarget : `${new Date().getFullYear()}-12-31`,
      });
    }
    startProgram(startDate);
    markOnboarded();
  }

  const firstName = displayName.trim().split(/\s+/)[0] || "friend";

  return (
    <ScreenShell>
      <TopProgress value={((stepIdx + 1) / STEPS.length) * 100} />
      <div className="mt-4 flex items-center gap-2">
        {stepIdx > 0 && (
          <button
            onClick={back}
            aria-label="Go back"
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "var(--color-surface)" }}
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <p className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
          Step {stepIdx + 1} of {STEPS.length} · take your time, 5–10 min
        </p>
      </div>

      <div className="mt-4 flex-1">
        {step === "welcome" && (
          <div>
            <StepHead
              kicker="Welcome to RESET"
              title="Hey. Let's build your best self."
              sub="I'm going to be the friend who genuinely wants the best for you — honest when it counts, in your corner always. To do that well, I need to actually know you. This takes 5–10 minutes, and everything is skippable. Worth it, I promise."
            />
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Let's do this</PrimaryButton>
            </div>
          </div>
        )}

        {step === "name" && (
          <div>
            <StepHead kicker="First things first" title="What should I call you?" sub="Friends use names. So will I — in greetings, reviews, everywhere." />
            <input
              value={displayName}
              onChange={(e) => setDisplayNameLocal(e.target.value)}
              placeholder="e.g. Brian"
              maxLength={40}
              className="mt-6 w-full rounded-2xl border p-4 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
            />
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "season" && (
          <div>
            <StepHead kicker="Your world" title={`${firstName}, what season of life is this?`} sub="No wrong answers. Just where you actually are." />
            <div className="mt-6 space-y-2.5">
              {SEASON_OPTIONS.map((s) => (
                <OptionCard key={s.value} selected={season === s.value} onClick={() => { setSeason(s.value); }} title={s.label} blurb={s.blurb} />
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "focus" && (
          <div>
            <StepHead kicker="What matters" title="Pick up to 3 areas to grow" sub="These shape your goals, your stats, and what I nudge you about." />
            <div className="mt-6 flex flex-wrap gap-2">
              {LIFE_AREAS.map((a) => {
                const selected = focusAreas.includes(a.key);
                return (
                  <button
                    key={a.key}
                    onClick={() => setFocusAreas(toggle(focusAreas, a.key, 3))}
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
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "reality" && (
          <div>
            <StepHead kicker="Real talk" title="Where are you, in one sentence?" sub="Messy is fine. Honest beats impressive — this stays between us." />
            <textarea
              value={reality}
              onChange={(e) => setReality(e.target.value)}
              placeholder="e.g. Final year, broke, big dreams, zero routine…"
              rows={4}
              maxLength={280}
              className="mt-6 w-full resize-none rounded-2xl border p-4 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
            />
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "obstacle" && (
          <div>
            <StepHead kicker="The honest part" title="What usually gets in your way?" sub="Pick the one that stings a little. I'll plan around it, not judge it." />
            <div className="mt-6 space-y-2.5">
              {OBSTACLE_OPTIONS.map((o) => (
                <OptionCard key={o.value} selected={obstacle === o.value} onClick={() => { setObstacle(o.value); }} title={o.label} blurb={o.blurb} />
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "confidence" && (
          <div>
            <StepHead kicker="Belief check" title="How much do you believe you can change?" sub="1 = barely, 10 = absolutely. Wherever you are is a fine starting line." />
            <div className="mt-6 flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="flex-1 accent-[var(--color-ember)]"
              />
              <span className="font-mono text-lg font-bold" style={{ color: "var(--color-ember)" }}>
                {confidence}
              </span>
            </div>
            <p className="mt-2 text-sm" style={{ color: "var(--color-ink-dim)" }}>
              {confidence <= 3 ? "Low fuel is okay. We'll build proof, one day at a time." : confidence <= 7 ? "Good — enough spark to start a fire." : "Love that energy. I'll hold you to it."}
            </p>
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
            </div>
          </div>
        )}

        {step === "vibe" && (
          <div>
            <StepHead kicker="Ground rules" title="How should I talk to you?" sub="I'm always in your corner — but pick the voice that actually moves you." />
            <div className="mt-6 space-y-2.5">
              {VIBE_OPTIONS.map((v) => (
                <OptionCard key={v.tone} selected={vibe === v.tone} onClick={() => setVibe(v.tone)} title={v.label} blurb={v.blurb} />
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
            </div>
          </div>
        )}

        {step === "matters" && (
          <div>
            <StepHead kicker="Daily fuel" title="What do you want more of, daily?" sub="Pick up to 3. I'll turn them into your two daily quests — small wins, every day." />
            <div className="mt-6 space-y-2.5">
              {MATTER_OPTIONS.map((m) => {
                const selected = matters.includes(m.key);
                return (
                  <OptionCard
                    key={m.key}
                    selected={selected}
                    onClick={() => setMatters(toggle(matters, m.key, 3))}
                    title={m.label}
                    blurb={m.blurb}
                  />
                );
              })}
            </div>
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "tastes" && (
          <div>
            <StepHead kicker="The fun part" title="What are you into?" sub="Music, machines, football, faith — whatever. This is how your quests stop feeling generic." />
            <div className="mt-6 flex flex-wrap gap-2">
              {TASTE_OPTIONS.map((t) => {
                const selected = tastes.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => setTastes(toggle(tastes, t, 10))}
                    className="tactile rounded-xl border px-3 py-2 text-sm"
                    style={{
                      borderColor: selected ? "var(--color-ember)" : "var(--color-line)",
                      background: selected ? "var(--color-ember-soft)" : "var(--color-surface)",
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <input
              value={tastesNote}
              onChange={(e) => setTastesNote(e.target.value)}
              placeholder="Anything else? e.g. Into F1, learning Swahili…"
              maxLength={140}
              className="mt-3 w-full rounded-2xl border p-4 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
            />
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "devotional" && (
          <div>
            <StepHead kicker="Daily bread" title="Want a Gospel verse each morning?" sub="Short KJV verse with your day. You can switch it off anytime in Settings." />
            <div className="mt-6 space-y-2.5">
              <OptionCard selected={devotional} onClick={() => setDevotional(true)} title="Yes, please" blurb="Faith woven into the routine" />
              <OptionCard selected={!devotional} onClick={() => setDevotional(false)} title="Not for me" blurb="No verse, no fuss" />
            </div>
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
            </div>
          </div>
        )}

        {step === "rhythm" && (
          <div>
            <StepHead kicker="Your wiring" title="When do you come alive?" sub="I'll lean your hardest work into your sharpest hours." />
            <div className="mt-6 space-y-2.5">
              {SLEEP_OPTIONS.map((s) => (
                <OptionCard key={s.value} selected={sleep === s.value} onClick={() => { setSleep(s.value); }} title={s.label} blurb={s.blurb} />
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "quit" && (
          <div>
            <StepHead kicker="Shedding weight" title="Anything you're quitting?" sub="Tap all that apply. Each one gets its own streak counter from Day 1 — no shame, just tracking." />
            <div className="mt-6 space-y-2.5">
              {QUIT_OPTIONS.map((q) => (
                <OptionCard
                  key={q.value}
                  selected={quit.includes(q.value)}
                  onClick={() => setQuit(toggle(quit, q.value, 5))}
                  title={q.label}
                  blurb={q.blurb}
                />
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>{quit.length > 0 ? `Continue (${quit.length} tracked)` : "None — continue"}</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "vision" && (
          <div>
            <StepHead kicker="The horizon" title="One year from now — who are you?" sub="Paint it like it's already true. This becomes the why pinned to your top focus area." />
            <textarea
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              placeholder="e.g. A disciplined engineer with paying clients, strong body, quiet mind…"
              rows={4}
              maxLength={280}
              className="mt-6 w-full resize-none rounded-2xl border p-4 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
            />
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "income" && (
          <div>
            <StepHead kicker="Money moves" title="What monthly income are we normalizing?" sub="Your daily quests will quietly pull toward this number. KES, monthly." />
            <div className="mt-6 flex gap-2">
              <div className="w-1/2">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
                  From
                </p>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={incomeMin}
                  onChange={(e) => setIncomeMin(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
                />
              </div>
              <div className="w-1/2">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
                  To
                </p>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={incomeMax}
                  onChange={(e) => setIncomeMax(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
                />
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
                Normal by
              </p>
              <input
                type="date"
                value={incomeTarget}
                onChange={(e) => setIncomeTarget(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
              />
            </div>
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "tasks" && (
          <div>
            <StepHead kicker="The work" title={`${firstName}, what are we tracking?`} sub="Pick your tasks. No quiz, no theater — this is the last stretch." />
            <div className="mt-6 space-y-3">
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
            <div className="mt-6 space-y-2">
              <PrimaryButton disabled={tasks.length === 0} onClick={next}>
                Continue
              </PrimaryButton>
            </div>
          </div>
        )}

        {step === "start" && (
          <div>
            <StepHead
              kicker="Day zero"
              title={displayName.trim() ? `Ready when you are, ${firstName}.` : "Ready when you are."}
              sub="Pick a start date. Then we begin — one day at a time, and I've got you."
            />
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
            <div className="mt-6 space-y-2">
              <PrimaryButton disabled={tasks.length === 0} onClick={begin}>
                Start tracking
              </PrimaryButton>
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
