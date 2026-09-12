import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Card, Switch, PrimaryButton } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { SchoolImport } from "@/pages/life/SchoolImport";
import {
  streakRemindersAvailable,
  isPushSupported,
  hasActiveSubscription,
  subscribeToStreakReminders,
  updateReminderHour,
  unsubscribeFromStreakReminders,
} from "@/lib/pushNotifications";

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

export default function Settings() {
  const devotional = useAppStore((s) => s.profile.devotional);
  const setDevotionalSettings = useAppStore((s) => s.setDevotionalSettings);
  const aboutMe = useAppStore((s) => s.profile.aboutMe);
  const setAboutMe = useAppStore((s) => s.setAboutMe);
  const [aboutDraft, setAboutDraft] = useState(aboutMe);
  const aboutDirty = aboutDraft !== aboutMe;

  return (
    <div className="space-y-6">
      <StreakReminders />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
          About you
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--color-ink-dim)" }}>
          What you do, what you're working on, your interests. One honest paragraph about you — it feeds your weekly review and journal reflections.
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

      <SchoolImport />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
          Devotional
        </p>
        <Card className="mt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Daily Gospel verse</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-dim)" }}>
                Show a verse + reflection each day in your Journal
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

    </div>
  );
}
