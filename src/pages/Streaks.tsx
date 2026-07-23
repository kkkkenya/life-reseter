import { useEffect, useRef, useState } from "react";
import { Plus, X, Check, Palette, Pencil } from "lucide-react";
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
} from "@/lib/streaks";
import { programDayFromDate } from "@/lib/planGenerator";
import { CUSTOM_STREAK_ICONS, STREAK_COLOR_THEMES } from "@/data/streakDefaults";
import type { StreakHabit, UserProfile } from "@/types";

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

export default function Streaks({ onBack }: { onBack?: () => void }) {
  const profile = useAppStore((s) => s.profile);
  const addStreakHabit = useAppStore((s) => s.addStreakHabit);
  const [addOpen, setAddOpen] = useState(false);
  const [mode, setMode] = useState<"avoidance" | "positive">("avoidance");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState(CUSTOM_STREAK_ICONS[0]);
  const [color, setColor] = useState(STREAK_COLOR_THEMES[0].value);
  const [startedDaysAgo, setStartedDaysAgo] = useState("0");
  const [linkedTaskUid, setLinkedTaskUid] = useState<string | null>(null);

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

  const canCreate = mode === "avoidance" ? label.trim().length > 0 : Boolean(linkedTaskUid);

  return (
    <div className="mx-auto max-w-md px-5 pb-28 pt-14">
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
    </div>
  );
}
