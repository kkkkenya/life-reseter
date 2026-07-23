import { useEffect, useRef, useState } from "react";
import { Plus, X, Check, ShieldCheck, Gauge } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Card, PrimaryButton, GhostButton, BackButton } from "@/components/ui";
import { IconFor } from "@/components/IconFor";
import { useFeedback } from "@/hooks/useFeedback";
import { detoxStreakDuration, detoxTodayCount, nextMilestone, achievedMilestones } from "@/lib/streaks";
import { CUSTOM_STREAK_ICONS, STREAK_COLOR_THEMES } from "@/data/streakDefaults";
import type { DetoxHabit, DetoxHabitType } from "@/types";

const TYPE_LABEL: Record<DetoxHabitType, string> = {
  avoid: "Quit / avoid entirely",
  quantityLimit: "Daily limit",
  abstainOnly: "Clean days only",
};

const TYPE_HINT: Record<DetoxHabitType, string> = {
  avoid: "Any slip resets the clock. For things you're cutting out completely.",
  quantityLimit: "Allowed, but capped per day. Log a count — going over resets the clock, staying under keeps it running.",
  abstainOnly: "Simple clean/not-clean per day, no counts, lower pressure than a strict streak.",
};

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
                ? `${todayCount}/${habit.dailyLimit ?? "\u221e"} today`
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
            {TYPE_HINT[habit.type]}
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

export default function Detox({ onBack }: { onBack?: () => void }) {
  const detoxHabits = useAppStore((s) => s.profile.detoxHabits);
  const addDetoxHabit = useAppStore((s) => s.addDetoxHabit);
  const [addOpen, setAddOpen] = useState(false);
  const [type, setType] = useState<DetoxHabitType>("avoid");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState(CUSTOM_STREAK_ICONS[0]);
  const [color, setColor] = useState(STREAK_COLOR_THEMES[0].value);
  const [dailyLimit, setDailyLimit] = useState("1");

  function create() {
    addDetoxHabit(label.trim(), icon, type, color, type === "quantityLimit" ? Math.max(1, Number(dailyLimit) || 1) : undefined);
    setLabel("");
    setDailyLimit("1");
    setAddOpen(false);
  }

  const canCreate = label.trim().length > 0;

  return (
    <div className="mx-auto max-w-md px-5 pb-28 pt-14">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && <BackButton onClick={onBack} />}
          <h1 className="font-display text-2xl font-semibold">Detox</h1>
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
        Track what you're cutting down or cutting out — quit-cold-turkey, daily-limit, or simple clean days.
      </p>

      <div className="mt-6 space-y-3">
        {detoxHabits.length === 0 && (
          <Card>
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} color="var(--color-ink-dim)" />
              <p className="text-sm" style={{ color: "var(--color-ink-dim)" }}>
                Nothing tracked yet. Add something you're quitting, cutting down, or trying to keep clean days on.
              </p>
            </div>
          </Card>
        )}
        {detoxHabits.map((h) => (
          <DetoxCard key={h.id} habit={h} />
        ))}
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={() => setAddOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-6"
            style={{ background: "var(--color-surface-raised)", boxShadow: "var(--shadow-modal)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">New tracker</h2>
              <button onClick={() => setAddOpen(false)}>
                <X size={18} color="var(--color-ink-dim)" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {(Object.keys(TYPE_LABEL) as DetoxHabitType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="w-full rounded-xl border px-3 py-2.5 text-left"
                  style={{
                    borderColor: type === t ? color : "var(--color-line)",
                    background: type === t ? `color-mix(in srgb, ${color} 10%, transparent)` : "var(--color-surface)",
                  }}
                >
                  <p className="text-sm font-semibold">{TYPE_LABEL[t]}</p>
                  <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-ink-dim)" }}>
                    {TYPE_HINT[t]}
                  </p>
                </button>
              ))}
            </div>

            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Vaping, Gaming, Social media"
              className="mt-4 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)" }}
            />

            {type === "quantityLimit" && (
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
                  onClick={() => setIcon(ic)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={{ borderColor: icon === ic ? color : "var(--color-line)", background: "var(--color-surface)" }}
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

            <div className="mt-5">
              <PrimaryButton disabled={!canCreate} onClick={create}>
                Start tracking
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
