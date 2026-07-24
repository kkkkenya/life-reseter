import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Plus, Star, CalendarClock, CalendarDays, List } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { IconFor } from "@/components/IconFor";
import { useFeedback } from "@/hooks/useFeedback";
import { programDayFromDate, dateFromProgramDay, formatShortDate } from "@/lib/planGenerator";
import { detoxStreakDuration } from "@/lib/streaks";
import { askGemini } from "@/lib/gemini";
import { coachVoice } from "@/data/coachTones";
import { isSunday, isoWeekKey } from "@/lib/isoWeek";
import { type SchedulableTask } from "@/lib/autoSchedule";
import { Card, PrimaryButton } from "@/components/ui";
import { TaskList, type TaskEntry } from "@/pages/today/TaskList";
import { AddTaskSheet } from "@/pages/today/AddTaskSheet";
import { MitPickerSheet } from "@/pages/today/MitPickerSheet";
import { ScheduleView, type RolloverCandidate } from "@/pages/today/ScheduleView";
import { CalendarGrid } from "@/pages/today/CalendarGrid";
import { QuestBoard } from "@/pages/today/QuestBoard";
import { DailyReviewCard } from "@/pages/today/DailyReviewCard";
import { EveningPlanningCard } from "@/pages/today/EveningPlanningCard";
import { DayCompleteModal } from "@/components/DayCompleteModal";
import { dayCompletionInfo, computeDayStreak } from "@/lib/dayCompletion";
import type { TimeOfDay, RecurrenceRule, TaskPriority, TaskDefinition } from "@/types";

export default function Today({
  onOpenExamen,
  onOpenStreaks,
  onOpenDetox,
}: {
  onOpenExamen?: () => void;
  onOpenStreaks?: () => void;
  onOpenDetox?: () => void;
}) {
  const profile = useAppStore((s) => s.profile);
  const completeTask = useAppStore((s) => s.completeTask);
  const skipTask = useAppStore((s) => s.skipTask);
  const regenerateCalendar = useAppStore((s) => s.regenerateCalendar);
  const addRecurringTask = useAppStore((s) => s.addRecurringTask);
  const setMit = useAppStore((s) => s.setMit);
  const setDailyReview = useAppStore((s) => s.setDailyReview);
  const setWeeklyFocus = useAppStore((s) => s.setWeeklyFocus);
  const setEveningPlanned = useAppStore((s) => s.setEveningPlanned);
  const addTimeBlock = useAppStore((s) => s.addTimeBlock);
  const removeTimeBlock = useAppStore((s) => s.removeTimeBlock);
  const toggleTimeBlockDone = useAppStore((s) => s.toggleTimeBlockDone);
  const moveTimeBlock = useAppStore((s) => s.moveTimeBlock);
  const markDayCompleteShown = useAppStore((s) => s.markDayCompleteShown);

  const feedback = useFeedback();

  const todayProgramDay = profile.startDate
    ? programDayFromDate(profile.startDate, new Date().toISOString().slice(0, 10))
    : 1;
  const [viewDay, setViewDay] = useState(todayProgramDay);
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<"list" | "schedule" | "calendar">("list");
  const [mitPicking, setMitPicking] = useState(false);

  const [reviewGenerating, setReviewGenerating] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);
  const weekKey = isoWeekKey();

  useEffect(() => {
    regenerateCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.tasks.length]);

  const rec = profile.days[viewDay];
  const entries: TaskEntry[] = rec
    ? Object.entries(rec.tasks).map(([uid, status]) => {
        const task = profile.tasks.find((t) => t.uid === uid);
        return { uid, status, task };
      })
    : [];

  const doneCount = entries.filter((e) => e.status === "done").length;
  const skippedCount = entries.filter((e) => e.status === "skipped").length;
  const pendingCount = entries.filter((e) => e.status === "pending").length;

  const mit = profile.mitByDay[viewDay];
  const mitEntry = mit?.taskUid ? entries.find((e) => e.uid === mit.taskUid) : null;
  const mitDone = mit?.taskUid ? mitEntry?.status === "done" : mit?.done;

  const dayBlocks = profile.timeBlocks[rec?.date ?? ""] ?? [];

  const showSundayRitual = isSunday() && viewDay === todayProgramDay && !profile.weeklyFocus[weekKey];
  const [weekFocusDraft, setWeekFocusDraft] = useState("");

  // ---- Rollover: yesterday's incomplete blocks, only surfaced while viewing today ----
  const isViewingToday = viewDay === todayProgramDay;

  // ---- "Day complete" popup: fires once per calendar date, the moment today's last pending task clears ----
  const todayDayInfo = dayCompletionInfo(profile.days[todayProgramDay]);
  const dayCompleteAlreadyShown = !!profile.dayCompleteShown[todayIso];
  const [showDayComplete, setShowDayComplete] = useState(false);

  useEffect(() => {
    if (todayDayInfo.complete && !dayCompleteAlreadyShown) {
      markDayCompleteShown(todayIso);
      setShowDayComplete(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayDayInfo.complete, dayCompleteAlreadyShown]);
  const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const rolloverCandidates: RolloverCandidate[] = isViewingToday
    ? (profile.timeBlocks[yesterdayIso] ?? []).filter((b) => !b.done).map((block) => ({ fromDate: yesterdayIso, block }))
    : [];

  // ---- Auto-schedule: pending tasks today that don't already have a matching block ----
  const blockLabels = new Set(dayBlocks.map((b) => b.label.trim().toLowerCase()));
  const autoScheduleCandidates: SchedulableTask[] = isViewingToday
    ? entries
        .filter((e) => e.status === "pending" && e.task && !blockLabels.has(e.task.label.trim().toLowerCase()))
        .map((e) => ({ uid: e.task!.uid, label: e.task!.label, lifeArea: e.task!.lifeArea, timeOfDay: e.task!.timeOfDay }))
    : [];

  // ---- Evening planning ritual: guided "pick tomorrow's MIT" once per evening ----
  const tomorrowProgramDay = todayProgramDay + 1;
  const tomorrowRec = profile.days[tomorrowProgramDay];
  const tomorrowEntries: TaskEntry[] = tomorrowRec
    ? Object.entries(tomorrowRec.tasks).map(([uid, status]) => {
        const task = profile.tasks.find((t) => t.uid === uid);
        return { uid, status, task };
      })
    : [];
  const hourNow = new Date().getHours();
  const showEveningRitual =
    isViewingToday &&
    hourNow >= 19 &&
    !profile.mitByDay[tomorrowProgramDay] &&
    !profile.eveningPlanned[todayIso];

  function confirmAddTask(def: TaskDefinition, recurrence: RecurrenceRule, priority: TaskPriority, timeOfDay: TimeOfDay) {
    addRecurringTask(def.id, def.label, def.icon, def.category, def.lifeArea, recurrence, priority, timeOfDay);
    setAddOpen(false);
  }

  async function generateReview() {
    setReviewGenerating(true);
    setReviewError(null);
    try {
      const lines = entries.map((e) => `${e.task?.label ?? "task"}: ${e.status}`).join("; ");
      const text = await askGemini(
        `Today's tasks: ${lines || "none scheduled"}. Done ${doneCount}, skipped ${skippedCount}, pending ${pendingCount}.`,
        {
          systemInstruction: `${coachVoice(profile.coachTone)} Give a 2-3 sentence review of the day based on this data. End with one concrete note for tomorrow.`,
          temperature: 0.6,
          maxOutputTokens: 180,
        }
      );
      setDailyReview(todayIso, text);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Failed to generate review.");
    } finally {
      setReviewGenerating(false);
    }
  }

  const review = profile.dailyReview[todayIso];

  return (
    <div className="mx-auto max-w-md px-5 pb-28 pt-14">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            Your reset
          </p>
          <h1 className="font-display text-2xl font-semibold">Day {viewDay}</h1>
          <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
            {formatShortDate(profile.days[viewDay]?.date ?? dateFromProgramDay(profile.startDate ?? todayIso, viewDay))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewDay((d) => Math.max(1, d - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "var(--color-surface)" }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setViewDay((d) => d + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "var(--color-surface)" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {isViewingToday && <QuestBoard dateKey={todayIso} isToday />}

      {showSundayRitual && (
        <Card className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
            Sunday planning
          </p>
          <p className="mt-1.5 text-sm" style={{ color: "var(--color-ink-dim)" }}>
            One sentence: what's this week's focus?
          </p>
          <input
            value={weekFocusDraft}
            onChange={(e) => setWeekFocusDraft(e.target.value)}
            placeholder="e.g. Ship the billing flow fix"
            className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
          />
          <div className="mt-2">
            <PrimaryButton disabled={!weekFocusDraft.trim()} onClick={() => setWeeklyFocus(weekKey, weekFocusDraft.trim())}>
              Set the week
            </PrimaryButton>
          </div>
        </Card>
      )}
      {!showSundayRitual && profile.weeklyFocus[weekKey] && isViewingToday && (
        <Card className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            This week's focus
          </p>
          <p className="mt-1 text-sm">{profile.weeklyFocus[weekKey]}</p>
        </Card>
      )}

      {mit ? (
        <button
          className="mt-4 w-full rounded-2xl border-2 p-4 text-left"
          style={{ borderColor: "var(--color-ember)", background: "var(--color-ember-soft)" }}
          onClick={(e) => {
            if (!mit.taskUid) return;
            completeTask(viewDay, mit.taskUid);
            feedback.complete(e.currentTarget);
          }}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
              <Star size={13} fill="var(--color-ember)" /> Most important task
            </span>
            {mitDone && <Check size={16} color="var(--color-good)" />}
          </div>
          <p className="mt-1.5 text-sm font-semibold" style={{ textDecoration: mitDone ? "line-through" : "none" }}>
            {mit.label}
          </p>
        </button>
      ) : (
        isViewingToday &&
        entries.length > 0 && (
          <button
            onClick={() => setMitPicking(true)}
            className="mt-4 flex w-full items-center justify-between rounded-2xl border border-dashed px-4 py-3"
            style={{ borderColor: "var(--color-line)" }}
          >
            <span className="text-sm" style={{ color: "var(--color-ink-dim)" }}>
              Pick today's one most important task
            </span>
            <Star size={15} color="var(--color-ink-faint)" />
          </button>
        )
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-4 text-xs" style={{ color: "var(--color-ink-dim)" }}>
          <span>{pendingCount} to-do</span>
          <span>{doneCount} done</span>
          <span>{skippedCount} skipped</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg p-0.5" style={{ background: "var(--color-surface)" }}>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
              style={{ background: view === "list" ? "var(--color-ember-soft)" : "transparent", color: view === "list" ? "var(--color-ember)" : "var(--color-ink-dim)" }}
            >
              <List size={13} />
            </button>
            <button
              onClick={() => setView("schedule")}
              aria-label="Schedule view"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
              style={{ background: view === "schedule" ? "var(--color-ember-soft)" : "transparent", color: view === "schedule" ? "var(--color-ember)" : "var(--color-ink-dim)" }}
            >
              <CalendarClock size={13} />
            </button>
            <button
              onClick={() => setView("calendar")}
              aria-label="Calendar view"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
              style={{ background: view === "calendar" ? "var(--color-ember-soft)" : "transparent", color: view === "calendar" ? "var(--color-ember)" : "var(--color-ink-dim)" }}
            >
              <CalendarDays size={13} />
            </button>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
            style={{ background: "var(--color-ember-soft)", color: "var(--color-ember)" }}
          >
            <Plus size={13} /> Add task
          </button>
        </div>
      </div>

      {profile.streaks.length > 0 && (
        <button onClick={() => onOpenStreaks?.()} className="mt-4 flex w-full gap-2 overflow-x-auto">
          {profile.streaks.map((h) => {
            const days = Math.floor((Date.now() - new Date(h.startedAt).getTime()) / 86400000);
            return (
              <span
                key={h.id}
                className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}
              >
                <IconFor name={h.icon} size={12} color={h.color ?? "var(--color-ember)"} />
                <span style={{ color: "var(--color-ink-dim)" }}>{h.label}</span>
                <span className="font-mono font-semibold" style={{ color: h.color ?? "var(--color-ember)" }}>
                  {days}d
                </span>
              </span>
            );
          })}
        </button>
      )}

      {profile.detoxHabits.length > 0 ? (
        <button onClick={() => onOpenDetox?.()} className="mt-3 flex w-full gap-2 overflow-x-auto">
          {profile.detoxHabits.map((h) => {
            const dur = detoxStreakDuration(h.currentStreakStart);
            return (
              <span
                key={h.id}
                className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}
              >
                <IconFor name={h.icon} size={12} color={h.color} />
                <span style={{ color: "var(--color-ink-dim)" }}>{h.label}</span>
                <span className="font-mono font-semibold" style={{ color: h.color }}>
                  {dur.days}d
                </span>
              </span>
            );
          })}
        </button>
      ) : (
        <button
          onClick={() => onOpenDetox?.()}
          className="mt-3 flex w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
          style={{ borderColor: "var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink-dim)" }}
        >
          <Plus size={12} /> Track a habit you're cutting down or quitting
        </button>
      )}

      {isViewingToday && !profile.journal[todayProgramDay] && (
        <button
          onClick={() => onOpenExamen?.()}
          className="mt-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3"
          style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}
        >
          <span className="text-sm" style={{ color: "var(--color-ink-dim)" }}>
            Haven't done today's Examen yet
          </span>
          <span className="text-xs font-semibold" style={{ color: "var(--color-ember)" }}>
            Reflect →
          </span>
        </button>
      )}

      {showEveningRitual && (
        <EveningPlanningCard
          tomorrowEntries={tomorrowEntries}
          onPickMit={(uid, label) => {
            setMit(tomorrowProgramDay, { label, taskUid: uid, done: false });
            setEveningPlanned(todayIso, true);
          }}
          onDismiss={() => setEveningPlanned(todayIso, true)}
        />
      )}

      {view === "list" && (
        <div className="mt-6 space-y-3">
          <TaskList
            entries={entries}
            carriedOver={rec?.carriedOver}
            onComplete={(uid, el) => {
              completeTask(viewDay, uid);
              feedback.complete(el);
            }}
            onSkip={(uid, reason) => {
              skipTask(viewDay, uid, reason);
              feedback.skip();
            }}
          />
          {entries.length > 0 && (
            <DailyReviewCard review={review} generating={reviewGenerating} error={reviewError} onGenerate={generateReview} />
          )}
        </div>
      )}

      {view === "schedule" && (
        <div className="mt-6">
          <ScheduleView
            blocks={dayBlocks}
            rolloverCandidates={rolloverCandidates}
            autoScheduleCandidates={autoScheduleCandidates}
            onAddBlock={(block) => rec && addTimeBlock(rec.date, block)}
            onRemoveBlock={(id) => rec && removeTimeBlock(rec.date, id)}
            onToggleDone={(id) => {
              if (!rec) return;
              toggleTimeBlockDone(rec.date, id);
              feedback.tap();
            }}
            onCarryOver={(fromDate, id) => {
              if (!rec) return;
              moveTimeBlock(fromDate, id, rec.date);
              feedback.tap();
            }}
            onAutoSchedule={(suggestions) => {
              if (!rec) return;
              for (const sug of suggestions) {
                addTimeBlock(rec.date, {
                  startTime: sug.startTime,
                  endTime: sug.endTime,
                  label: sug.label,
                  lifeArea: sug.lifeArea,
                  autoScheduled: true,
                });
              }
              feedback.complete(null);
            }}
          />
        </div>
      )}

      {view === "calendar" && rec && (
        <div className="mt-6">
          <CalendarGrid
            days={profile.days}
            viewDate={rec.date}
            onSelectDate={(iso) => {
              const day = programDayFromDate(profile.startDate!, iso);
              setViewDay(day);
              setView("list");
            }}
          />
        </div>
      )}

      {addOpen && (
        <AddTaskSheet existingTasks={profile.tasks} onClose={() => setAddOpen(false)} onConfirm={confirmAddTask} />
      )}

      {mitPicking && (
        <MitPickerSheet
          entries={entries}
          onClose={() => setMitPicking(false)}
          onPick={(uid, label) => {
            setMit(viewDay, { label, taskUid: uid, done: false });
            setMitPicking(false);
          }}
        />
      )}

      {showDayComplete && (
        <DayCompleteModal
          streak={computeDayStreak(profile, todayProgramDay)}
          tasksDone={todayDayInfo.done}
          onClose={() => setShowDayComplete(false)}
        />
      )}
    </div>
  );
}
