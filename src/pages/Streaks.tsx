import { useEffect, useRef, useState } from "react";
import { Plus, X, Check, Palette, Pencil, ShieldCheck, Gauge } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Card, PrimaryButton, GhostButton, BackButton } from "@/components/ui";
import { IconFor } from "@/components/IconFor";
import { useFeedback } from "@/hooks/useFeedback";
import {
  currentStreakDuration,
  currentPositiveStreakDays,
  nextMilestone,
  achievedMilestones,
  relapsePatternInsight,
  detoxStreakDuration,
  detoxTodayCount,
} from "@/lib/streaks";
import { programDayFromDate } from "@/lib/planGenerator";
import { CUSTOM_STREAK_ICONS, STREAK_COLOR_THEMES } from "@/data/streakDefaults";
import type { DetoxHabit, DetoxHabitType, StreakHabit, UserProfile } from "@/types";

function StreakCard({ habit, profile }: { habit: StreakHabit; profile: UserProfile }) {
  const logRelapse = useAppStore((s) => s.logRelapse);
  const updateStreakColor = useAppStore((s) => s.updateStreakColor);
  const updateStreakStart = useAppStore((s) => s.updateStreakStart);
  const feedback = useFeedback();
  const [, forceTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [note, setNote] = useState("");
  const [pickingColor, setPickingColor] = useState(false);
  const [editingStart, setEditingStart] = useState(false);
  const [daysAgoDraft, setDaysAgoDraft] = useState("0");
  const cardRef = useRef<HTMLDivElement>(null);
  const lastAchievedCount = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 60000);
    return () => window.clearInterval(id);
  }, []);

  const isPositive = habit.mode === "positive";
  const accent = habit.color ?? "var(--color-ember)";
  const todayDay = profile.startDate ? programDayFromDate(profile.startDate, new Date().toISOString().slice(0, 10)) : 1;
  const positiveDays = isPositive && habit.linkedTaskUid
    ? currentPositiveStreakDays(habit.linkedTaskUid, profile.days, todayDay)
    : 0;
  const dur = currentStreakDuration(habit);
  const days = isPositive ? positiveDays : dur.days;
  const next = nextMilestone(days);
  const achieved = achievedMilestones(days);
  const insight = !isPositive ? relapsePatternInsight(habit) : null;
  const linkedTask = habit.linkedTaskUid ? profile.tasks.find((t) => t.uid === habit.linkedTaskUid) : null;

  // Celebrate the moment a new milestone is actually crossed (not on every render/mount).
  useEffect(() => {
    if (lastAchievedCount.current !== null && achieved.length > lastAchievedCount.current) {
      feedback.milestone(cardRef.current);
    }
    lastAchievedCount.current = achieved.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achieved.length]);

  return (
    <Card ref={cardRef} spineColor={accent}>
      <button className="flex w-full items-center justify-between text-left" onClick={() => setExpanded((e) => !e)}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)` }}
          >
            <IconFor name={habit.icon} size={20} color={accent} />
          </div>
          <div>
            <p className="text-sm font-semibold">{habit.label}</p>
            <p className="font-mono text-xs" style={{ color: "var(--color-ink-dim)" }}>
              {isPositive ? `${days}d consecutive` : `${dur.days}d ${dur.hours}h ${dur.minutes}m`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-bold" style={{ color: accent }}>
            {days}
          </p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            days
          </p>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: "var(--color-line)" }}>
          {isPositive && linkedTask && (
            <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
              Auto-tracked from "{linkedTask.label}" — completes/misses drive this automatically.
            </p>
          )}
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: "var(--color-ink-dim)" }}>Best streak</span>
            <span className="font-mono">{Math.max(habit.bestStreakDays, days)} days</span>
          </div>
          {next && (
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--color-ink-dim)" }}>Next milestone</span>
              <span className="font-mono" style={{ color: accent }}>
                {next - days} days to go
              </span>
            </div>
          )}
          {achieved.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {achieved.map((m) => (
                <span
                  key={m}
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent }}
                >
                  {m}d
                </span>
              ))}
            </div>
          )}
          {insight && (
            <p className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: "var(--color-surface-raised)", color: "var(--color-ink-dim)" }}>
              {insight}
            </p>
          )}

          {/* Theme + retroactive editing */}
          <div className="flex gap-2">
            <button
              onClick={() => setPickingColor((v) => !v)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold"
              style={{ background: "var(--color-surface-raised)", color: "var(--color-ink-dim)" }}
            >
              <Palette size={12} /> Color
            </button>
            {!isPositive && (
              <button
                onClick={() => {
                  setEditingStart((v) => !v);
                  setDaysAgoDraft(String(days));
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold"
                style={{ background: "var(--color-surface-raised)", color: "var(--color-ink-dim)" }}
              >
                <Pencil size={12} /> Correct start
              </button>
            )}
          </div>

          {pickingColor && (
            <div className="flex flex-wrap gap-2 pt-1">
              {STREAK_COLOR_THEMES.map((c) => (
                <button
                  key={c.value}
                  aria-label={c.name}
                  onClick={() => {
                    updateStreakColor(habit.id, c.value);
                    setPickingColor(false);
                  }}
                  className="h-8 w-8 rounded-full border-2"
                  style={{
                    background: c.value,
                    borderColor: habit.color === c.value ? "var(--color-ink)" : "transparent",
                  }}
                />
              ))}
            </div>
          )}

          {editingStart && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min={0}
                value={daysAgoDraft}
                onChange={(e) => setDaysAgoDraft(e.target.value)}
                className="w-20 rounded-xl border px-3 py-2 text-xs outline-none"
                style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
              />
              <span className="text-xs" style={{ color: "var(--color-ink-dim)" }}>days ago it actually started</span>
              <button
                onClick={() => {
                  const n = Math.max(0, Number(daysAgoDraft) || 0);
                  updateStreakStart(habit.id, new Date(Date.now() - n * 86400000).toISOString());
                  setEditingStart(false);
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: accent }}
              >
                <Check size={14} color="#fbf3e7" />
              </button>
            </div>
          )}

          {!isPositive && (
            !confirmingReset ? (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setConfirmingReset(true)}
                  className="flex-1 rounded-xl py-2.5 text-xs font-semibold"
                  style={{ background: "var(--color-bad)", color: "#fbf3e7" }}
                >
                  Log a reset
                </button>
              </div>
            ) : (
              <div className="pt-1">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional: what triggered it? (private, only visible to you)"
                  className="h-20 w-full rounded-xl border p-3 text-xs outline-none"
                  style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
                />
                <div className="mt-2 flex gap-2">
                  <GhostButton className="py-2.5 text-xs" onClick={() => setConfirmingReset(false)}>
                    Cancel
                  </GhostButton>
                  <button
                    onClick={() => {
                      feedback.soft();
                      logRelapse(habit.id, note);
                      setNote("");
                      setConfirmingReset(false);
                    }}
                    className="flex-1 rounded-2xl py-2.5 text-xs font-semibold"
                    style={{ background: "var(--color-bad)", color: "#fbf3e7" }}
                  >
                    Confirm reset
                  </button>
                </div>
              </div>
            )
          )}

          {!isPositive && habit.relapses.length > 0 && (
            <details className="pt-1">
              <summary className="cursor-pointer text-xs" style={{ color: "var(--color-ink-dim)" }}>
                History ({habit.relapses.length})
              </summary>
              <div className="mt-2 space-y-1.5">
                {habit.relapses.slice(0, 10).map((r) => (
                  <div key={r.id} className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
                    {new Date(r.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    {r.note ? ` — ${r.note}` : ""}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </Card>
  );
}

const DETOX_TYPE_LABEL: Record<DetoxHabitType, string> = {
  avoid: "Quit / avoid entirely",
  quantityLimit: "Daily limit",
  abstainOnly: "Clean days only",
};

const DETOX_TYPE_HINT: Record<DetoxHabitType, string> = {
  avoid: "Any slip resets the clock. For things you're cutting out completely.",
  quantityLimit: "Allowed, but capped per day. Log a count — going over resets the clock, staying under keeps it running.",
  abstainOnly: "Simple clean/not-clean per day, no counts, lower pressure than a strict streak.",
};

/** A detox habit: daily-limit or clean-day tracking with its own clock. */
function DetoxCard({ habit }: { habit: DetoxHabit }) {
  const logDetoxEntry = useAppStore((s) => s.logDetoxEntry);
  const removeDetoxHabit = useAppStore((s) => s.removeDetoxHabit);
  const feedback = useFeedback();
  const [, forceTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [confirmingSlip, setConfirmingSlip] = useState(false);
  const [countDraft, setCountDraft] = useState("1");
  const [note, setNote] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const lastAchievedCount = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 60000);
    return () => window.clearInterval(id);
  }, []);

  const accent = habit.color;
  const dur = detoxStreakDuration(habit.currentStreakStart);
  const todayCount = habit.type === "quantityLimit" ? detoxTodayCount(habit.logs) : 0;
  const overLimit = habit.type === "quantityLimit" && habit.dailyLimit !== undefined && todayCount > habit.dailyLimit;
  const next = nextMilestone(dur.days);
  const achieved = achievedMilestones(dur.days);

  useEffect(() => {
    if (lastAchievedCount.current !== null && achieved.length > lastAchievedCount.current) {
      feedback.milestone(cardRef.current);
    }
    lastAchievedCount.current = achieved.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achieved.length]);

  function logClean() {
    if (habit.type === "quantityLimit") {
      const n = Math.max(0, Number(countDraft) || 0);
      const projected = todayCount + n;
      const isClean = habit.dailyLimit === undefined || projected <= habit.dailyLimit;
      logDetoxEntry(habit.id, isClean, n);
      setCountDraft("1");
    } else {
      logDetoxEntry(habit.id, true);
    }
  }

  function logSlip() {
    logDetoxEntry(habit.id, false, undefined, note.trim() || undefined);
    setNote("");
    setConfirmingSlip(false);
  }

  return (
    <Card ref={cardRef} spineColor={accent}>
      <button className="flex w-full items-center justify-between text-left" onClick={() => setExpanded((e) => !e)}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)` }}
          >
            <IconFor name={habit.icon} size={20} color={accent} />
          </div>
          <div>
            <p className="text-sm font-semibold">{habit.label}</p>
            <p className="font-mono text-xs" style={{ color: "var(--color-ink-dim)" }}>
              {habit.type === "quantityLimit"
                ? `${todayCount}/${habit.dailyLimit ?? "∞"} today`
                : `${dur.days}d ${dur.hours}h clean`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-bold" style={{ color: overLimit ? "var(--color-bad)" : accent }}>
            {dur.days}
          </p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            days
          </p>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: "var(--color-line)" }}>
          <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
            {DETOX_TYPE_HINT[habit.type]}
          </p>

          {next && (
            <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
              Best streak: <span className="font-mono font-semibold" style={{ color: accent }}>{habit.bestStreakDays}d</span> · next milestone{" "}
              <span className="font-mono font-semibold" style={{ color: accent }}>{next}d</span>
            </p>
          )}

          {habit.type === "quantityLimit" ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={countDraft}
                onChange={(e) => setCountDraft(e.target.value)}
                className="w-20 rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
              />
              <div className="flex-1">
                <PrimaryButton onClick={logClean}>Log today's count</PrimaryButton>
              </div>
            </div>
          ) : !confirmingSlip ? (
            <div className="flex gap-2">
              {habit.type === "abstainOnly" && (
                <div className="flex-1">
                  <PrimaryButton onClick={logClean}>
                    <span className="flex items-center justify-center gap-1.5">
                      <Check size={15} /> Mark today clean
                    </span>
                  </PrimaryButton>
                </div>
              )}
              <div className="flex-1">
                <GhostButton onClick={() => setConfirmingSlip(true)}>
                  {habit.type === "avoid" ? "Log a slip" : "Mark not clean"}
                </GhostButton>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What happened? (optional)"
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <GhostButton onClick={() => setConfirmingSlip(false)}>Cancel</GhostButton>
                </div>
                <div className="flex-1">
                  <PrimaryButton onClick={logSlip}>Confirm — resets clock</PrimaryButton>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => removeDetoxHabit(habit.id)}
            className="w-full pt-1 text-center text-xs"
            style={{ color: "var(--color-ink-faint)" }}
          >
            Remove tracker
          </button>
        </div>
      )}
    </Card>
  );
}

export default function Streaks({ onBack }: { onBack?: () => void }) {
  const profile = useAppStore((s) => s.profile);
  const addStreakHabit = useAppStore((s) => s.addStreakHabit);
  const addDetoxHabit = useAppStore((s) => s.addDetoxHabit);
  const [addOpen, setAddOpen] = useState(false);
  const [mode, setMode] = useState<"avoidance" | "positive">("avoidance");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState(CUSTOM_STREAK_ICONS[0]);
  const [color, setColor] = useState(STREAK_COLOR_THEMES[0].value);
  const [startedDaysAgo, setStartedDaysAgo] = useState("0");
  const [linkedTaskUid, setLinkedTaskUid] = useState<string | null>(null);

  // Detox trackers ("cutting down") — separate add sheet, same page.
  const [detoxAddOpen, setDetoxAddOpen] = useState(false);
  const [detoxType, setDetoxType] = useState<DetoxHabitType>("avoid");
  const [detoxLabel, setDetoxLabel] = useState("");
  const [detoxIcon, setDetoxIcon] = useState(CUSTOM_STREAK_ICONS[0]);
  const [detoxColor, setDetoxColor] = useState(STREAK_COLOR_THEMES[0].value);
  const [dailyLimit, setDailyLimit] = useState("1");

  function create() {
    if (mode === "positive" && linkedTaskUid) {
      const task = profile.tasks.find((t) => t.uid === linkedTaskUid);
      if (!task) return;
      addStreakHabit(task.label, task.icon, "positive", linkedTaskUid, color);
    } else {
      addStreakHabit(label.trim(), icon, "avoidance", undefined, color, Math.max(0, Number(startedDaysAgo) || 0));
    }
    setLabel("");
    setLinkedTaskUid(null);
    setStartedDaysAgo("0");
    setAddOpen(false);
  }

  function createDetox() {
    addDetoxHabit(detoxLabel.trim(), detoxIcon, detoxType, detoxColor, detoxType === "quantityLimit" ? Math.max(1, Number(dailyLimit) || 1) : undefined);
    setDetoxLabel("");
    setDailyLimit("1");
    setDetoxAddOpen(false);
  }

  const canCreate = mode === "avoidance" ? label.trim().length > 0 : Boolean(linkedTaskUid);
  const canCreateDetox = detoxLabel.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-28 pt-14 lg:max-w-3xl lg:px-10 lg:pb-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && <BackButton onClick={onBack} />}
          <h1 className="font-display text-2xl font-semibold">Streaks</h1>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
          style={{ background: "var(--color-ember-soft)", color: "var(--color-ember)" }}
        >
          <Plus size={13} /> New
        </button>
      </div>
      <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
        Not a checkbox — a running clock. Tap a card for details.
      </p>

      <div className="mt-6 space-y-3">
        {profile.streaks.length === 0 && (
          <Card>
            <p className="text-sm" style={{ color: "var(--color-ink-dim)" }}>
              No streaks yet. Add an avoidance streak (sobriety, no PMO) or link a positive
              habit (like prayer) to an existing task and track it automatically.
            </p>
          </Card>
        )}
        {profile.streaks.map((h) => (
          <StreakCard key={h.id} habit={h} profile={profile} />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Cutting down</h2>
        <button
          onClick={() => setDetoxAddOpen(true)}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
          style={{ background: "var(--color-surface)", color: "var(--color-ink-dim)" }}
        >
          <Plus size={13} /> New tracker
        </button>
      </div>
      <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
        Quit cold turkey, cap a daily count, or just keep clean days.
      </p>

      <div className="mt-4 space-y-3">
        {profile.detoxHabits.length === 0 && (
          <Card>
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} color="var(--color-ink-dim)" />
              <p className="text-sm" style={{ color: "var(--color-ink-dim)" }}>
                Nothing here yet — for habits that are counts, not clocks.
              </p>
            </div>
          </Card>
        )}
        {profile.detoxHabits.map((h) => (
          <DetoxCard key={h.id} habit={h} />
        ))}
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={() => setAddOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6"
            style={{ background: "var(--color-surface-raised)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">New streak</h2>
              <button onClick={() => setAddOpen(false)}>
                <X size={18} color="var(--color-ink-dim)" />
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setMode("avoidance")}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                style={{
                  background: mode === "avoidance" ? "var(--color-ember)" : "var(--color-surface)",
                  color: mode === "avoidance" ? "#fbf3e7" : "var(--color-ink-dim)",
                }}
              >
                Avoidance
              </button>
              <button
                onClick={() => setMode("positive")}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                style={{
                  background: mode === "positive" ? "var(--color-ember)" : "var(--color-surface)",
                  color: mode === "positive" ? "#fbf3e7" : "var(--color-ink-dim)",
                }}
              >
                Linked to a task
              </button>
            </div>

            {mode === "avoidance" ? (
              <>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. No junk food"
                  className="mt-4 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {CUSTOM_STREAK_ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setIcon(ic)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border"
                      style={{
                        borderColor: icon === ic ? color : "var(--color-line)",
                        background: "var(--color-surface)",
                      }}
                    >
                      <IconFor name={ic} size={16} color={icon === ic ? color : "var(--color-ink-dim)"} />
                    </button>
                  ))}
                </div>
                <p className="mt-4 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
                  Color
                </p>
                <div className="flex flex-wrap gap-2">
                  {STREAK_COLOR_THEMES.map((c) => (
                    <button
                      key={c.value}
                      aria-label={c.name}
                      onClick={() => setColor(c.value)}
                      className="h-8 w-8 rounded-full border-2"
                      style={{ background: c.value, borderColor: color === c.value ? "var(--color-ink)" : "transparent" }}
                    />
                  ))}
                </div>
                <p className="mt-4 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
                  Already going?
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={startedDaysAgo}
                    onChange={(e) => setStartedDaysAgo(e.target.value)}
                    className="w-20 rounded-xl border px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
                  />
                  <span className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
                    days ago it started (0 = starting today)
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
                  Pick an existing task — its consecutive-day completion becomes the streak.
                </p>
                {profile.tasks
                  .filter((t) => !profile.streaks.some((s) => s.linkedTaskUid === t.uid))
                  .map((t) => (
                    <button
                      key={t.uid}
                      onClick={() => setLinkedTaskUid(t.uid)}
                      className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left"
                      style={{
                        borderColor: linkedTaskUid === t.uid ? "var(--color-ember)" : "var(--color-line)",
                        background: "var(--color-surface)",
                      }}
                    >
                      <IconFor name={t.icon} size={16} color="var(--color-ember)" />
                      <span className="text-sm">{t.label}</span>
                    </button>
                  ))}
              </div>
            )}

            <div className="mt-5">
              <PrimaryButton disabled={!canCreate} onClick={create}>
                Start this streak
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {detoxAddOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={() => setDetoxAddOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6"
            style={{ background: "var(--color-surface-raised)", boxShadow: "var(--shadow-modal)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">New tracker</h2>
              <button onClick={() => setDetoxAddOpen(false)}>
                <X size={18} color="var(--color-ink-dim)" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {(Object.keys(DETOX_TYPE_LABEL) as DetoxHabitType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDetoxType(t)}
                  className="w-full rounded-xl border px-3 py-2.5 text-left"
                  style={{
                    borderColor: detoxType === t ? detoxColor : "var(--color-line)",
                    background: detoxType === t ? `color-mix(in srgb, ${detoxColor} 10%, transparent)` : "var(--color-surface)",
                  }}
                >
                  <p className="text-sm font-semibold">{DETOX_TYPE_LABEL[t]}</p>
                  <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-ink-dim)" }}>
                    {DETOX_TYPE_HINT[t]}
                  </p>
                </button>
              ))}
            </div>

            <input
              value={detoxLabel}
              onChange={(e) => setDetoxLabel(e.target.value)}
              placeholder="e.g. Vaping, Gaming, Social media"
              className="mt-4 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
            />

            {detoxType === "quantityLimit" && (
              <div className="mt-3 flex items-center gap-2">
                <Gauge size={15} color="var(--color-ink-dim)" />
                <input
                  type="number"
                  min={1}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  className="w-20 rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
                />
                <span className="text-xs" style={{ color: "var(--color-ink-dim)" }}>per day target</span>
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {CUSTOM_STREAK_ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setDetoxIcon(ic)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={{ borderColor: detoxIcon === ic ? detoxColor : "var(--color-line)", background: "var(--color-surface)" }}
                >
                  <IconFor name={ic} size={16} color={detoxIcon === ic ? detoxColor : "var(--color-ink-dim)"} />
                </button>
              ))}
            </div>

            <p className="mt-4 mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
              Color
            </p>
            <div className="flex flex-wrap gap-2">
              {STREAK_COLOR_THEMES.map((c) => (
                <button
                  key={c.value}
                  aria-label={c.name}
                  onClick={() => setDetoxColor(c.value)}
                  className="h-8 w-8 rounded-full border-2"
                  style={{ background: c.value, borderColor: detoxColor === c.value ? "var(--color-ink)" : "transparent" }}
                />
              ))}
            </div>

            <div className="mt-5">
              <PrimaryButton disabled={!canCreateDetox} onClick={createDetox}>
                Start tracking
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
