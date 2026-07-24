<<<<<<< HEAD
import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Bell, BellOff } from "lucide-react";
import { Card, Switch, PrimaryButton, GhostButton } from "@/components/ui";
import { IconFor } from "@/components/IconFor";
import { useAppStore } from "@/store/useAppStore";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  streakRemindersAvailable,
  isPushSupported,
  hasActiveSubscription,
  subscribeToStreakReminders,
  updateReminderHour,
  unsubscribeFromStreakReminders,
} from "@/lib/pushNotifications";
=======
import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Card, Switch, PrimaryButton, GhostButton } from "@/components/ui";
import { IconFor } from "@/components/IconFor";
import { useAppStore } from "@/store/useAppStore";
>>>>>>> 2cbfdcef78ad01192da598ce6a87ce9ba4536bfc
import { DEFAULT_QUEST_PILLARS, PILLAR_COLOR_PRESETS, PILLAR_ICON_PRESETS, randomPillarKey } from "@/data/questPillars";
import { LIFE_AREAS } from "@/data/lifeAreas";
import { COACH_TONES } from "@/data/coachTones";
import type { QuestPillar } from "@/types";

<<<<<<< HEAD
const REMINDER_HOURS = [
  { hour: 12, label: "12pm" },
  { hour: 17, label: "5pm" },
  { hour: 19, label: "7pm" },
  { hour: 20, label: "8pm" },
  { hour: 21, label: "9pm" },
];

function StreakReminders() {
  const { userId } = useSupabaseAuth();
  const [status, setStatus] = useState<"loading" | "on" | "off">("loading");
  const [hour, setHour] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    hasActiveSubscription().then((active) => {
      if (!cancelled) setStatus(active ? "on" : "off");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!streakRemindersAvailable || !isPushSupported() || !userId) return null;

  async function handleToggle(next: boolean) {
    setBusy(true);
    setError(null);
    if (next) {
      const result = await subscribeToStreakReminders(userId!, hour);
      if (result.ok) setStatus("on");
      else setError(result.error ?? "Couldn't turn on reminders.");
    } else {
      await unsubscribeFromStreakReminders(userId!);
      setStatus("off");
    }
    setBusy(false);
  }

  async function handleHourChange(nextHour: number) {
    setHour(nextHour);
    if (status === "on") await updateReminderHour(userId!, nextHour);
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        Streak reminders
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--color-ink-dim)" }}>
        A push notification if today's tasks are still open by your chosen time — only sent when you haven't already finished.
      </p>
      <Card className="mt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {status === "on" ? <Bell size={16} color="var(--color-ember)" /> : <BellOff size={16} color="var(--color-ink-faint)" />}
            <p className="text-sm font-semibold">Remind me before I lose my streak</p>
          </div>
          <Switch checked={status === "on"} onChange={handleToggle} />
        </div>

        {status === "on" && (
          <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-line)" }}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
              Remind me at
            </p>
            <div className="flex flex-wrap gap-1.5">
              {REMINDER_HOURS.map((h) => (
                <button
                  key={h.hour}
                  disabled={busy}
                  onClick={() => handleHourChange(h.hour)}
                  className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
                  style={{
                    borderColor: hour === h.hour ? "var(--color-ember)" : "var(--color-line)",
                    background: hour === h.hour ? "var(--color-ember-soft)" : "transparent",
                    color: hour === h.hour ? "var(--color-ember)" : "var(--color-ink-dim)",
                  }}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs" style={{ color: "var(--color-bad)" }}>
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}

=======
>>>>>>> 2cbfdcef78ad01192da598ce6a87ce9ba4536bfc
function PillarEditor({
  pillar,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  pillar: QuestPillar;
  index: number;
  total: number;
  onChange: (next: QuestPillar) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${pillar.color} 16%, transparent)` }}
        >
          <IconFor name={pillar.icon} size={16} color={pillar.color} fallback="Sparkles" />
        </div>
        <div className="flex-1 space-y-2">
          <input
            value={pillar.label}
            onChange={(e) => onChange({ ...pillar, label: e.target.value })}
            placeholder="Pillar name"
            className="w-full rounded-lg border px-3 py-2 text-sm font-semibold outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
          />
          <textarea
            value={pillar.description}
            onChange={(e) => onChange({ ...pillar, description: e.target.value })}
            placeholder="Describe the kind of action this pillar should produce (guides AI quest generation)"
            rows={2}
            className="w-full resize-none rounded-lg border px-3 py-2 text-xs outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink-dim)" }}
          />
          <div className="flex flex-wrap gap-1.5">
            {PILLAR_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                onClick={() => onChange({ ...pillar, color: c })}
                className="h-6 w-6 rounded-full border-2"
                style={{ background: c, borderColor: pillar.color === c ? "var(--color-ink)" : "transparent" }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PILLAR_ICON_PRESETS.map((iconName) => (
              <button
                key={iconName}
                onClick={() => onChange({ ...pillar, icon: iconName })}
                className="flex h-7 w-7 items-center justify-center rounded-lg border"
                style={{
                  borderColor: pillar.icon === iconName ? pillar.color : "var(--color-line)",
                  background: pillar.icon === iconName ? `color-mix(in srgb, ${pillar.color} 16%, transparent)` : "transparent",
                }}
              >
                <IconFor name={iconName} size={14} color={pillar.icon === iconName ? pillar.color : "var(--color-ink-faint)"} />
              </button>
            ))}
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
              Life area (biases quest rotation toward this pillar when that area is pinned as your focus)
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onChange({ ...pillar, lifeArea: undefined })}
                className="rounded-lg border px-2 py-1 text-[11px] font-medium"
                style={{
                  borderColor: !pillar.lifeArea ? "var(--color-ink)" : "var(--color-line)",
                  background: !pillar.lifeArea ? "var(--color-surface-raised)" : "transparent",
                  color: !pillar.lifeArea ? "var(--color-ink)" : "var(--color-ink-faint)",
                }}
              >
                None
              </button>
              {LIFE_AREAS.map((area) => (
                <button
                  key={area.key}
                  onClick={() => onChange({ ...pillar, lifeArea: area.key })}
                  className="rounded-lg border px-2 py-1 text-[11px] font-medium"
                  style={{
                    borderColor: pillar.lifeArea === area.key ? area.color : "var(--color-line)",
                    background: pillar.lifeArea === area.key ? `color-mix(in srgb, ${area.color} 16%, transparent)` : "transparent",
                    color: pillar.lifeArea === area.key ? area.color : "var(--color-ink-faint)",
                  }}
                >
                  {area.shortLabel}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--color-line)" }}>
        <div className="flex gap-1">
          <button
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg disabled:opacity-25"
            style={{ background: "var(--color-surface-raised)" }}
          >
            <ChevronUp size={13} color="var(--color-ink-dim)" />
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg disabled:opacity-25"
            style={{ background: "var(--color-surface-raised)" }}
          >
            <ChevronDown size={13} color="var(--color-ink-dim)" />
          </button>
        </div>
        <button
          disabled={total <= 1}
          onClick={onRemove}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium disabled:opacity-25"
          style={{ color: "var(--color-bad)" }}
        >
          <Trash2 size={12} /> Remove
        </button>
      </div>
    </Card>
  );
}

export default function Settings() {
  const devotional = useAppStore((s) => s.profile.devotional);
  const setDevotionalSettings = useAppStore((s) => s.setDevotionalSettings);
  const questPillars = useAppStore((s) => s.profile.questPillars);
  const setQuestPillars = useAppStore((s) => s.setQuestPillars);
  const coachTone = useAppStore((s) => s.profile.coachTone);
  const setCoachTone = useAppStore((s) => s.setCoachTone);
  const aboutMe = useAppStore((s) => s.profile.aboutMe);
  const setAboutMe = useAppStore((s) => s.setAboutMe);
  const [aboutDraft, setAboutDraft] = useState(aboutMe);
  const aboutDirty = aboutDraft !== aboutMe;

  const [draftPillars, setDraftPillars] = useState<QuestPillar[]>(questPillars);
  const dirty = JSON.stringify(draftPillars) !== JSON.stringify(questPillars);

  function updatePillar(i: number, next: QuestPillar) {
    setDraftPillars((prev) => prev.map((p, idx) => (idx === i ? next : p)));
  }

  function removePillar(i: number) {
    setDraftPillars((prev) => prev.filter((_, idx) => idx !== i));
  }

  function movePillar(i: number, dir: -1 | 1) {
    setDraftPillars((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function addPillar() {
    setDraftPillars((prev) => [
      ...prev,
      {
        key: randomPillarKey("new pillar"),
        label: "New pillar",
        description: "Describe the kind of action this pillar should reward.",
        color: PILLAR_COLOR_PRESETS[prev.length % PILLAR_COLOR_PRESETS.length],
        icon: PILLAR_ICON_PRESETS[prev.length % PILLAR_ICON_PRESETS.length],
      },
    ]);
  }

  return (
    <div className="space-y-6">
<<<<<<< HEAD
      <StreakReminders />

=======
>>>>>>> 2cbfdcef78ad01192da598ce6a87ce9ba4536bfc
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
          About you
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--color-ink-dim)" }}>
          What you do, what you're working on, your interests. The more detail here, the better the AI can tailor quests to you specifically.
        </p>
        <Card className="mt-2">
          <textarea
            value={aboutDraft}
            onChange={(e) => setAboutDraft(e.target.value)}
            placeholder="e.g. I'm a final-year computer science student, freelance as a web developer on the side, into gym and chess..."
            rows={6}
            className="w-full resize-none rounded-xl border p-3 text-sm outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
          />
          {aboutDirty && (
            <div className="mt-2">
              <PrimaryButton onClick={() => setAboutMe(aboutDraft)}>Save</PrimaryButton>
            </div>
          )}
        </Card>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
          AI coach voice
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--color-ink-dim)" }}>
          Sets the tone for daily reviews, weekly reports, journal reflections, and quest generation.
        </p>
        <Card className="mt-2">
          <div className="space-y-2">
            {COACH_TONES.map((t) => (
              <button
                key={t.key}
                onClick={() => setCoachTone(t.key)}
                className="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left"
                style={{
                  borderColor: coachTone === t.key ? "var(--color-ember)" : "var(--color-line)",
                  background: coachTone === t.key ? "var(--color-ember-soft)" : "transparent",
                }}
              >
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: coachTone === t.key ? "var(--color-ember)" : "var(--color-ink)" }}
                  >
                    {t.label}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-dim)" }}>
                    {t.tagline}
                  </p>
                </div>
                {coachTone === t.key && (
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: "var(--color-ember)" }}
                  />
                )}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
          Devotional
        </p>
        <Card className="mt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Daily Gospel verse</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-dim)" }}>
                Show a verse + reflection each day in Examen
              </p>
            </div>
            <Switch checked={devotional.enabled} onChange={(v) => setDevotionalSettings({ ...devotional, enabled: v })} />
          </div>

          {devotional.enabled && (
            <div className="mt-3 flex gap-2 border-t pt-3" style={{ borderColor: "var(--color-line)" }}>
              {(["sequential", "random"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDevotionalSettings({ ...devotional, mode })}
                  className="flex-1 rounded-xl border px-3 py-2 text-xs font-semibold capitalize"
                  style={{
                    borderColor: devotional.mode === mode ? "var(--color-ember)" : "var(--color-line)",
                    background: devotional.mode === mode ? "var(--color-ember-soft)" : "transparent",
                    color: devotional.mode === mode ? "var(--color-ember)" : "var(--color-ink-dim)",
                  }}
                >
                  {mode === "sequential" ? "Daily rotation" : "Shuffled"}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            Quest pillars
          </p>
          {draftPillars.length !== 3 || JSON.stringify(draftPillars.map((p) => p.key)) !== JSON.stringify(DEFAULT_QUEST_PILLARS.map((p) => p.key)) ? (
            <button onClick={() => setDraftPillars(DEFAULT_QUEST_PILLARS)} className="text-[11px] font-medium" style={{ color: "var(--color-ink-faint)" }}>
              Reset to default
            </button>
          ) : null}
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--color-ink-dim)" }}>
          Your daily quests rotate through these. Add, remove, reorder, or rewrite them entirely.
        </p>

        <div className="mt-3 space-y-3">
          {draftPillars.map((p, i) => (
            <PillarEditor
              key={p.key}
              pillar={p}
              index={i}
              total={draftPillars.length}
              onChange={(next) => updatePillar(i, next)}
              onRemove={() => removePillar(i)}
              onMove={(dir) => movePillar(i, dir)}
            />
          ))}
        </div>

        <button
          onClick={addPillar}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium"
          style={{ borderColor: "var(--color-ember)", color: "var(--color-ember)" }}
        >
          <Plus size={15} /> Add pillar
        </button>

        {dirty && (
          <div className="mt-3 flex gap-2">
            <PrimaryButton
              onClick={() => {
                const cleaned = draftPillars.filter((p) => p.label.trim().length > 0);
                if (cleaned.length === 0) return;
                setQuestPillars(cleaned);
                setDraftPillars(cleaned);
              }}
            >
              Save changes
            </PrimaryButton>
            <GhostButton onClick={() => setDraftPillars(questPillars)}>Discard</GhostButton>
          </div>
        )}
      </div>
    </div>
  );
}
