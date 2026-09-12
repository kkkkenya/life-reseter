import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Camera, Check, Loader2, X } from "lucide-react";
import { resolveIcon } from "@/components/iconMap";
import { TASK_CATALOG, findTaskDef } from "@/data/taskCatalog";
import { LIFE_AREAS } from "@/data/lifeAreas";
import { GhostButton, PrimaryButton, ScreenShell, TopProgress } from "@/components/ui";
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
  stepCopy,
  suggestTasks,
} from "@/lib/onboarding";
import { WEEKDAY_SHORT } from "@/lib/school";
import type { CoachTone, LifeAreaKey } from "@/types";

function IconFor({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  const Cmp = resolveIcon(name);
  return <Cmp size={size} color={color} />;
}

const BASE_STEPS = [
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
  "dream",
  "nightmare",
  "income",
  "tasks",
] as const;

interface WizardAnswers {
  displayName: string;
  season: string;
  focusAreas: LifeAreaKey[];
  reality: string;
  obstacle: string;
  confidence: number;
  vibe: CoachTone | null;
  matters: string[];
  devotional: boolean;
  tastes: string[];
  tastesNote: string;
  sleep: string;
  quit: string[];
  vision: string;
  dream: string;
  nightmare: string;
  incomeMin: string;
  incomeMax: string;
  incomeTarget: string;
  timetableAdded: number; // sessions already committed via the import step
}

const EMPTY_ANSWERS: WizardAnswers = {
  displayName: "",
  season: "",
  focusAreas: [],
  reality: "",
  obstacle: "",
  confidence: 6,
  vibe: null,
  matters: [],
  devotional: true,
  tastes: [],
  tastesNote: "",
  sleep: "",
  quit: [],
  vision: "",
  dream: "",
  nightmare: "",
  incomeMin: "30000",
  incomeMax: "60000",
  incomeTarget: `${new Date().getFullYear()}-12-31`,
  timetableAdded: 0,
};

/** The wizard is long by design — resume where you left off instead of
 *  re-answering everything because the app got closed. */
const WIZARD_KEY = "life-reset-onboarding-v2";

function loadWizard(): { stepIdx: number; ans: WizardAnswers } | null {
  try {
    const raw = localStorage.getItem(WIZARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { stepIdx?: number; ans?: Partial<WizardAnswers> };
    if (!parsed?.ans) return null;
    return {
      stepIdx: typeof parsed.stepIdx === "number" ? Math.max(0, parsed.stepIdx) : 0,
      ans: { ...EMPTY_ANSWERS, ...parsed.ans, focusAreas: parsed.ans.focusAreas ?? [] },
    };
  } catch {
    return null;
  }
}

interface ScannedClass {
  course: string;
  weekday: number;
  startTime: string;
  endTime: string;
  venue: string | null;
  lecturer: string | null;
}

export default function Setup() {
  const addTask = useAppStore((s) => s.addTask);
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
  const setDream = useAppStore((s) => s.setDream);
  const setVowAntiVision = useAppStore((s) => s.setVowAntiVision);
  const addClassSession = useAppStore((s) => s.addClassSession);
  const devotionalMode = useAppStore((s) => s.profile.devotional.mode);

  const saved = useMemo(() => loadWizard(), []);
  const [stepIdx, setStepIdx] = useState(() => saved?.stepIdx ?? 0);

  // Collected answers (committed on Begin) — each resumable.
  const [displayName, setDisplayNameLocal] = useState(() => saved?.ans.displayName ?? "");
  const [season, setSeason] = useState(() => saved?.ans.season ?? "");
  const [focusAreas, setFocusAreas] = useState<LifeAreaKey[]>(() => saved?.ans.focusAreas ?? []);
  const [reality, setReality] = useState(() => saved?.ans.reality ?? "");
  const [obstacle, setObstacle] = useState(() => saved?.ans.obstacle ?? "");
  const [confidence, setConfidence] = useState(() => saved?.ans.confidence ?? 6);
  const [vibe, setVibe] = useState<CoachTone | null>(() => saved?.ans.vibe ?? null);
  const [matters, setMatters] = useState<string[]>(() => saved?.ans.matters ?? []);
  const [devotional, setDevotional] = useState(() => saved?.ans.devotional ?? true);
  const [tastes, setTastes] = useState<string[]>(() => saved?.ans.tastes ?? []);
  const [tastesNote, setTastesNote] = useState(() => saved?.ans.tastesNote ?? "");
  const [sleep, setSleep] = useState(() => saved?.ans.sleep ?? "");
  const [quit, setQuit] = useState<string[]>(() => saved?.ans.quit ?? []);
  const [vision, setVision] = useState(() => saved?.ans.vision ?? "");
  const [dream, setDreamLocal] = useState(() => saved?.ans.dream ?? "");
  const [nightmare, setNightmare] = useState(() => saved?.ans.nightmare ?? "");
  const [incomeMin, setIncomeMin] = useState(() => saved?.ans.incomeMin ?? "30000");
  const [incomeMax, setIncomeMax] = useState(() => saved?.ans.incomeMax ?? "60000");
  const [incomeTarget, setIncomeTarget] = useState(
    () => saved?.ans.incomeTarget ?? `${new Date().getFullYear()}-12-31`
  );
  const [timetableAdded, setTimetableAdded] = useState(() => saved?.ans.timetableAdded ?? 0);

  // Students get an optional timetable-import step; everyone else goes straight to the finish.
  const STEPS: string[] = [...BASE_STEPS, ...(season === "student" ? ["timetable"] : []), "start"];
  const step: string = STEPS[Math.min(stepIdx, STEPS.length - 1)];
  const next = () => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  const back = () => setStepIdx((i) => Math.max(i - 1, 0));

  useEffect(() => {
    try {
      localStorage.setItem(
        WIZARD_KEY,
        JSON.stringify({
          stepIdx,
          ans: {
            displayName,
            season,
            focusAreas,
            reality,
            obstacle,
            confidence,
            vibe,
            matters,
            devotional,
            tastes,
            tastesNote,
            sleep,
            quit,
            vision,
            dream,
            nightmare,
            incomeMin,
            incomeMax,
            incomeTarget,
            timetableAdded,
          },
        })
      );
    } catch {
      /* storage blocked — the wizard just won't resume */
    }
  }, [stepIdx, displayName, season, focusAreas, reality, obstacle, confidence, vibe, matters, devotional, tastes, tastesNote, sleep, quit, vision, dream, nightmare, incomeMin, incomeMax, incomeTarget, timetableAdded]);

  // After the vibe step, every question speaks in the chosen voice — the tone
  // is demonstrated live, not just described.
  const vibeIdx = STEPS.indexOf("vibe");
  const tone: CoachTone | null = stepIdx > vibeIdx ? vibe : null;
  const copy = (key: string, fallback: { title: string; sub: string }) => stepCopy(key, tone, fallback);

  // Task picker: 20 curated suggestions, pick 3+, per-task frequency.
  const suggestions = useMemo(() => suggestTasks(focusAreas, 20), [focusAreas]);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const pickedCount = Object.keys(picked).length;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [freq, setFreq] = useState(5);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  // Contract step: the composed persona, editable before committing.
  const composed = useMemo(
    () =>
      composeAboutMe({
        displayName,
        season,
        focusAreas,
        reality,
        obstacle,
        vibe: vibe ?? "gentle",
        matters,
        devotional,
        tastes,
        tastesNote,
        confidence,
        sleep,
        quit,
        vision,
        dream,
        nightmare,
        incomeMin,
        incomeMax,
        incomeTarget,
      }),
    [displayName, season, focusAreas, reality, obstacle, vibe, matters, devotional, tastes, tastesNote, confidence, sleep, quit, vision, dream, nightmare, incomeMin, incomeMax, incomeTarget]
  );
  const [aboutOverride, setAboutOverride] = useState<string | null>(null);
  useEffect(() => {
    setAboutOverride(null); // answers changed — re-derive the contract unless edited after
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composed]);
  const aboutText = aboutOverride ?? composed;

  // Timetable import (student branch)
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<ScannedClass[] | null>(null);

  function togglePick(taskId: string, defaultFreq: number) {
    setPicked((prev) => {
      if (prev[taskId] !== undefined) {
        const nextMap = { ...prev };
        delete nextMap[taskId];
        return nextMap;
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

  function toggle<T>(list: T[], v: T, max: number): T[] {
    if (list.includes(v)) return list.filter((x) => x !== v);
    if (list.length >= max) return list;
    return [...list, v];
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

  async function handleTimetableScan(file: File | undefined) {
    if (!file) return;
    setScanError(null);
    setScanned(null);
    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const parts = typeof reader.result === "string" ? reader.result.split(",") : [];
          if (parts[1]) resolve(parts[1]);
          else reject(new Error("Couldn't read that image."));
        };
        reader.onerror = () => reject(new Error("Couldn't read that image."));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/parse-timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type || "image/jpeg" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't read that timetable.");
      const sessions: ScannedClass[] = Array.isArray(data?.sessions) ? data.sessions : [];
      if (sessions.length === 0) throw new Error("No class rows found — try a clearer, straight-on photo.");
      setScanned(sessions);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }

  function addAllScanned() {
    if (!scanned) return;
    for (const s of scanned) {
      addClassSession({
        course: s.course,
        weekday: s.weekday,
        startTime: s.startTime,
        endTime: s.endTime,
        venue: s.venue ?? undefined,
        lecturer: s.lecturer ?? undefined,
      });
    }
    setTimetableAdded((n) => n + scanned.length);
    setScanned(null);
  }

  function begin() {
    if (displayName.trim()) setDisplayName(displayName);
    setQuiz(
      quizFromAnswers({
        displayName,
        season,
        focusAreas,
        reality,
        obstacle,
        vibe: vibe ?? "gentle",
        matters,
        devotional,
        tastes,
        tastesNote,
        confidence,
        sleep,
        quit,
        vision,
        dream,
        nightmare,
        incomeMin,
        incomeMax,
        incomeTarget,
      })
    );
    if (aboutText.trim()) setAboutMe(aboutText.trim().slice(0, 1500));
    setCoachTone(vibe ?? "gentle");
    setQuestPillars(pillarsFor(matters));
    setDevotionalSettings({ enabled: devotional, mode: devotionalMode });
    setPinnedFocusArea(focusAreas[0] ?? null);
    if (quit.length > 0) seedStreaksFromSelection(quit);
    if (vision.trim() && focusAreas[0]) setGoalWhy(focusAreas[0], vision.trim().slice(0, 280));
    if (dream.trim()) setDream(dream);
    if (nightmare.trim()) setVowAntiVision(nightmare.trim().slice(0, 500));
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
    for (const [taskId, frequency] of Object.entries(picked)) {
      const def = findTaskDef(taskId);
      if (!def) continue;
      addTask(def.id, def.label, def.icon, def.category, def.lifeArea, frequency, true, 1);
    }
    try {
      localStorage.removeItem(WIZARD_KEY);
    } catch {
      /* nothing to clean up */
    }
    startProgram(startDate);
    markOnboarded();
  }

  const firstName = displayName.trim().split(/\s+/)[0] || "friend";
  const quitPreview = quit.map((v) => QUIT_OPTIONS.find((q) => q.value === v)?.label ?? v).join(" · ");

  function ToneHead({ kicker, stepKey, fallback }: { kicker: string; stepKey: string; fallback: { title: string; sub: string } }) {
    const c = copy(stepKey, fallback);
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
          {kicker}
        </p>
        <h1 className="font-display mt-1 text-2xl font-semibold">{c.title}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
          {c.sub}
        </p>
      </>
    );
  }

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
          Step {stepIdx + 1} of {STEPS.length} · take your time — the wizard resumes if you close the app
          {tone ? " · speaking your chosen voice" : ""}
        </p>
      </div>

      <div className="mt-4 flex-1">
        {step === "welcome" && (
          <div>
            <StepHead
              kicker="Welcome to RESET"
              title="Hey. Let's build your best self."
              sub="This is long because personalization can't be rushed — everything you share here shapes your quests, your reviews, and your streaks. Everything is skippable, and the wizard resumes wherever you stop."
            />
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Let's do this</PrimaryButton>
            </div>
          </div>
        )}

        {step === "name" && (
          <div>
            <StepHead
              kicker="First things first"
              title="What should I call you?"
              sub="Friends use names. So will the app — in greetings, reviews, everywhere."
            />
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
            <StepHead
              kicker="Your world"
              title={`${firstName}, what season of life is this?`}
              sub="No wrong answers — just where you actually are. (Students get an optional timetable-import step later.)"
            />
            <div className="mt-6 space-y-2.5">
              {SEASON_OPTIONS.map((s) => (
                <OptionCard key={s.value} selected={season === s.value} onClick={() => setSeason(s.value)} title={s.label} blurb={s.blurb} />
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
            <StepHead
              kicker="What matters"
              title="Pick up to 3 areas to grow"
              sub="These shape your goals, your stats, and what the app nudges you about — the task list re-ranks the moment you pick."
            />
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
            <StepHead
              kicker="Real talk"
              title="Where are you, in one sentence?"
              sub="Messy is fine. Honest beats impressive — this stays between us, and it feeds everything personalized later."
            />
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
            <StepHead
              kicker="The honest part"
              title="What usually gets in your way?"
              sub="Pick the one that stings a little. The weekly review plans around it, not around judging it."
            />
            <div className="mt-6 space-y-2.5">
              {OBSTACLE_OPTIONS.map((o) => (
                <OptionCard key={o.value} selected={obstacle === o.value} onClick={() => setObstacle(o.value)} title={o.label} blurb={o.blurb} />
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
            <StepHead
              kicker="Belief check"
              title="How much do you believe you can change?"
              sub="1 = barely, 10 = absolutely. Wherever you are is a fine starting line."
            />
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
              {confidence <= 3
                ? "Low fuel is okay. The app builds proof, one day at a time."
                : confidence <= 7
                  ? "Good — enough spark to start a fire."
                  : "Love that energy. Hold yourself to it."}
            </p>
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
            </div>
          </div>
        )}

        {step === "vibe" && (
          <div>
            <StepHead
              kicker="Ground rules"
              title="How should the app talk to you?"
              sub="Always in your corner — but pick the voice that actually moves you. Every question after this one speaks in it, so you'll feel it before you commit."
            />
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
            <ToneHead
              kicker="Daily fuel"
              stepKey="matters"
              fallback={{ title: "What do you want more of, daily?", sub: "Pick up to 3 — they become your two daily quests: small wins, every day." }}
            />
            <div className="mt-6 space-y-2.5">
              {MATTER_OPTIONS.map((m) => (
                <OptionCard key={m.key} selected={matters.includes(m.key)} onClick={() => setMatters(toggle(matters, m.key, 3))} title={m.label} blurb={m.blurb} />
              ))}
            </div>
            {matters.length > 0 && (
              <p className="mt-3 text-xs" style={{ color: "var(--color-good)" }}>
                Your quest pillars: {matters.map((k) => MATTER_OPTIONS.find((m) => m.key === k)?.label ?? k).join(" · ")}
              </p>
            )}
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "tastes" && (
          <div>
            <ToneHead
              kicker="The fun part"
              stepKey="tastes"
              fallback={{ title: "What are you into?", sub: "This is how your quests stop feeling generic — tell me what genuinely interests you." }}
            />
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
            <ToneHead
              kicker="Daily bread"
              stepKey="devotional"
              fallback={{ title: "Want a Gospel verse each morning?", sub: "Short KJV verse with your day. You can switch it off anytime in Settings." }}
            />
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
            <ToneHead
              kicker="Your wiring"
              stepKey="rhythm"
              fallback={{ title: "When do you come alive?", sub: "I'll lean your hardest work into your sharpest hours." }}
            />
            <div className="mt-6 space-y-2.5">
              {SLEEP_OPTIONS.map((s) => (
                <OptionCard key={s.value} selected={sleep === s.value} onClick={() => setSleep(s.value)} title={s.label} blurb={s.blurb} />
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
            <ToneHead
              kicker="Shedding weight"
              stepKey="quit"
              fallback={{ title: "Anything you're quitting?", sub: "Tap all that apply. Each gets its own counter from Day 1 — no shame, just tracking." }}
            />
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
            {quit.length > 0 && (
              <p className="mt-3 rounded-xl px-3 py-2 text-xs" style={{ background: "var(--color-ember-soft)", color: "var(--color-ember)" }}>
                Day-0 clocks start for: {quitPreview}
              </p>
            )}
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>{quit.length > 0 ? `Continue (${quit.length} tracked)` : "None — continue"}</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "vision" && (
          <div>
            <ToneHead
              kicker="The horizon"
              stepKey="vision"
              fallback={{ title: "One year from now — who are you?", sub: "Paint it like it's already true. This becomes the why pinned to your top focus area." }}
            />
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

        {step === "dream" && (
          <div>
            <ToneHead
              kicker="No limits"
              stepKey="dream"
              fallback={{ title: "Ten years. Anything possible. What?", sub: "Forget realistic. This is the dream that makes the discipline worth it — your North Star." }}
            />
            <textarea
              value={dream}
              onChange={(e) => setDreamLocal(e.target.value)}
              placeholder="e.g. Running my own engineering firm, building things that outlive me…"
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

        {step === "nightmare" && (
          <div>
            <ToneHead
              kicker="The other side"
              stepKey="nightmare"
              fallback={{ title: "And if nothing changes for 5 years?", sub: "Look at it once, honestly. Then we make sure it never happens." }}
            />
            <textarea
              value={nightmare}
              onChange={(e) => setNightmare(e.target.value)}
              placeholder="e.g. Same room, same habits, watching everyone else move…"
              rows={4}
              maxLength={500}
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
            <ToneHead
              kicker="Money moves"
              stepKey="income"
              fallback={{ title: "What monthly income are we normalizing?", sub: "Your daily quests will quietly pull toward this number. KES, monthly." }}
            />
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
            <p className="mt-3 text-xs" style={{ color: "var(--color-good)" }}>
              Your 2 daily quests will quietly pull toward KES {Number(incomeMin || 0).toLocaleString()}–
              {Number(incomeMax || 0).toLocaleString()}/month.
            </p>
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
              <GhostButton onClick={next}>Skip</GhostButton>
            </div>
          </div>
        )}

        {step === "tasks" && (
          <div>
            <ToneHead
              kicker="The work"
              stepKey="tasks"
              fallback={{
                title: `${firstName}, build your lineup`,
                sub: `I picked 20 for you${focusAreas.length > 0 ? " from your focus areas" : ""}. Take as many as you want — minimum 3. Tap a picked one to set days per week.`,
              }}
            />
            <p className="mt-3 text-xs font-semibold" style={{ color: pickedCount >= 3 ? "var(--color-good)" : "var(--color-ember)" }}>
              {pickedCount} selected{pickedCount < 3 ? ` — ${3 - pickedCount} more to go` : " — looking strong"}
            </p>
            <div className="mt-3 space-y-2">
              {suggestions.map(({ def, suggestedFreq, reason }) => {
                const taskFreq = picked[def.id];
                const selected = taskFreq !== undefined;
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
                          {taskFreq}x / week
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
              <PrimaryButton disabled={pickedCount < 3} onClick={next}>
                {pickedCount < 3 ? `Pick ${3 - pickedCount} more` : `Continue with ${pickedCount}`}
              </PrimaryButton>
            </div>
          </div>
        )}

        {step === "timetable" && (
          <div>
            <StepHead
              kicker="Student bonus"
              title="Import your class timetable?"
              sub="One photo — every class shows up in Today's 'Coming Up' all semester. Skippable; you can also do it later in Settings."
            />
            {scanning ? (
              <p className="mt-6 flex items-center justify-center gap-2 py-6 text-sm" style={{ color: "var(--color-ink-dim)" }}>
                <Loader2 size={15} className="animate-spin" /> Reading your timetable…
              </p>
            ) : (
              <label
                className="mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed py-6 text-sm font-medium"
                style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)" }}
              >
                <Camera size={16} /> Upload a timetable photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    void handleTimetableScan(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            {scanError && (
              <p className="mt-2 text-xs" style={{ color: "var(--color-bad)" }}>
                {scanError}
              </p>
            )}
            {scanned && (
              <div className="mt-3 space-y-2 rounded-2xl border p-3" style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}>
                {scanned.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-mono text-xs" style={{ color: "var(--color-ember)" }}>
                      {WEEKDAY_SHORT[s.weekday]} {s.startTime}–{s.endTime}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s.course}{s.venue ? ` · ${s.venue}` : ""}</span>
                    <button onClick={() => setScanned(scanned.filter((_, idx) => idx !== i))} aria-label="Drop this session">
                      <X size={14} color="var(--color-ink-faint)" />
                    </button>
                  </div>
                ))}
                <PrimaryButton onClick={addAllScanned}>Add all {scanned.length}</PrimaryButton>
              </div>
            )}
            {timetableAdded > 0 && (
              <p className="mt-3 text-xs" style={{ color: "var(--color-good)" }}>
                {timetableAdded} sessions added to your weekly timetable.
              </p>
            )}
            <div className="mt-6 space-y-2">
              <PrimaryButton onClick={next}>{timetableAdded > 0 ? "Continue" : "Skip for now"}</PrimaryButton>
            </div>
          </div>
        )}

        {step === "start" && (
          <div>
            <ToneHead
              kicker="Day zero"
              stepKey="start"
              fallback={{
                title: displayName.trim() ? `Ready when you are, ${firstName}.` : "Ready when you are.",
                sub: "Pick a start date. Then we begin — one day at a time.",
              }}
            />

            <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--color-ember)", background: "var(--color-ember-soft)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
                The contract — this is who RESET holds you to
              </p>
              <textarea
                value={aboutText}
                onChange={(e) => setAboutOverride(e.target.value)}
                rows={7}
                maxLength={1500}
                className="mt-2 w-full resize-none rounded-xl border p-3 text-xs leading-relaxed outline-none"
                style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
              />
              <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                Edit anything — this text feeds your quests and weekly reviews. Update it later in Settings.
              </p>
            </div>

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
            <div className="mt-6 space-y-2">
              <PrimaryButton disabled={pickedCount < 3} onClick={begin}>
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
