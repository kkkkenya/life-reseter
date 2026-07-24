import { useEffect, useMemo, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ComposedChart,
  Line,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Award, Copy, RefreshCw, Sparkles } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Card, PrimaryButton } from "@/components/ui";
import { StatGauge } from "@/components/Gauge";
import { programDayFromDate, dateFromProgramDay, formatShortDate } from "@/lib/planGenerator";
import { lifeAreaChartData, moodVsCompletion, pearsonCorrelation, computeBehaviorStats } from "@/lib/lifeAreaStats";
import {
  computePerfectDayStreak,
  computeHabitCorrelations,
  correlationPredictsSentence,
  taskHeatmapSeries,
  timeOfDayInsight,
  priorityRebalanceSuggestions,
  frequencyRebalanceSuggestions,
  computeSeasonPacing,
} from "@/lib/habitAnalytics";
import { HeatmapCalendar } from "@/components/HeatmapCalendar";
import { isGeminiConfigured, askGemini } from "@/lib/gemini";
import { coachVoice } from "@/data/coachTones";
import { isoWeekKey } from "@/lib/isoWeek";
import { buildWeeklySummaryContext } from "@/lib/weeklyReport";
import WeeklyReview, { shouldShowWeeklyReview } from "@/pages/life/WeeklyReview";

export default function Overview() {
  const profile = useAppStore((s) => s.profile);
  const setWeeklyReport = useAppStore((s) => s.setWeeklyReport);
  const setTaskPriority = useAppStore((s) => s.setTaskPriority);
  const updateTaskFrequency = useAppStore((s) => s.updateTaskFrequency);
  const setSeasonDuration = useAppStore((s) => s.setSeasonDuration);
  const setCorrelationSnapshot = useAppStore((s) => s.setCorrelationSnapshot);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const todayDay = profile.startDate
    ? programDayFromDate(profile.startDate, new Date().toISOString().slice(0, 10))
    : 1;

  const { doneTotal, streak } = useMemo(() => {
    let done = 0;
    let streakCount = 0;
    let broke = false;
    for (let d = todayDay; d >= 1; d--) {
      const rec = profile.days[d];
      if (!rec) continue;
      const statuses = Object.values(rec.tasks);
      const anyDone = statuses.some((s) => s === "done");
      const anyPendingPast = d < todayDay && statuses.some((s) => s === "pending");
      done += statuses.filter((s) => s === "done").length;
      if (!broke) {
        if (anyDone && !anyPendingPast) streakCount++;
        else if (d < todayDay) broke = true;
      }
    }
    return { doneTotal: done, streak: streakCount };
  }, [profile.days, todayDay]);

  const stats = useMemo(() => computeBehaviorStats(profile), [profile]);

  const perfectDays = useMemo(() => computePerfectDayStreak(profile), [profile]);
  const todInsight = useMemo(() => timeOfDayInsight(profile), [profile]);
  const prioritySuggestions = useMemo(() => priorityRebalanceSuggestions(profile), [profile]);
  const frequencySuggestions = useMemo(() => frequencyRebalanceSuggestions(profile), [profile]);
  const seasonPacing = useMemo(() => computeSeasonPacing(profile), [profile]);
  const topTaskHeatmap = useMemo(() => {
    if (profile.tasks.length === 0) return null;
    // pick the task with the most "done" entries as the representative habit to show
    let best: { uid: string; label: string; doneCount: number } | null = null;
    for (const t of profile.tasks) {
      let doneCount = 0;
      Object.values(profile.days).forEach((d) => {
        if (d.tasks[t.uid] === "done") doneCount++;
      });
      if (!best || doneCount > best.doneCount) best = { uid: t.uid, label: t.label, doneCount };
    }
    if (!best || best.doneCount === 0) return null;
    return { label: best.label, series: taskHeatmapSeries(best.uid, profile) };
  }, [profile]);
  const radarData = [
    { stat: "WIS", value: stats.wisdom },
    { stat: "CONF", value: stats.confidence },
    { stat: "STR", value: stats.strength },
    { stat: "DISC", value: stats.discipline },
    { stat: "FOCUS", value: stats.focus },
  ];

  const lifeAreaData = useMemo(() => lifeAreaChartData(profile), [profile]);
  const moodData = useMemo(() => moodVsCompletion(profile), [profile]);
  const correlation = useMemo(() => pearsonCorrelation(moodData), [moodData]);

  const weekKey = isoWeekKey();
  const cachedReport = profile.weeklyReports[weekKey];

  const cachedSnapshot = profile.correlationSnapshots[weekKey];
  // A fresh live compute each render — cheap (pure math over already-loaded data) — used both as
  // this week's fallback before the snapshot is first written, and as the trigger for writing it.
  const liveWeeklyCorrelations = useMemo(() => computeHabitCorrelations(profile, 8, 3), [profile]);

  useEffect(() => {
    if (profile.correlationSnapshots[weekKey]) return; // already snapshotted this week — hold steady, don't shift mid-week
    if (liveWeeklyCorrelations.length === 0) return; // nothing meaningful yet — wait for more data rather than caching an empty week
    setCorrelationSnapshot(weekKey, liveWeeklyCorrelations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, liveWeeklyCorrelations]);

  const weeklyPatterns = cachedSnapshot ?? liveWeeklyCorrelations;

  async function generateReport() {
    setGenerating(true);
    setGenError(null);
    try {
      const context = buildWeeklySummaryContext(profile);
      const text = await askGemini(context, {
        systemInstruction: `${coachVoice(profile.coachTone)} Write a short weekly report (5-7 sentences max) based on the data given. End with one direct, concrete instruction for next week.`,
        temperature: 0.6,
        maxOutputTokens: 300,
      });
      setWeeklyReport(weekKey, text);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  }

  function copyReport() {
    if (!cachedReport) return;
    navigator.clipboard.writeText(cachedReport).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
              Day {todayDay}
            </p>
            <p className="text-[10px]" style={{ color: "var(--color-ink-faint)" }}>
              {formatShortDate(profile.days[todayDay]?.date ?? dateFromProgramDay(profile.startDate ?? "", todayDay))}
            </p>
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: "var(--color-ember-soft)", color: "var(--color-ember)" }}
          >
            {streak} day streak
          </span>
        </div>

        <div className="mt-5 h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="75%">
              <PolarGrid stroke="var(--color-line)" />
              <PolarAngleAxis dataKey="stat" tick={{ fill: "var(--color-ink-dim)", fontSize: 10, fontFamily: "JetBrains Mono" }} />
              <Radar dataKey="value" stroke="var(--color-ember)" fill="var(--color-ember)" fillOpacity={0.35} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
          Derived from what you've actually completed in each area — not a quiz guess.
        </p>
      </Card>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatGauge label="Wisdom" value={stats.wisdom} />
        <StatGauge label="Confidence" value={stats.confidence} />
        <StatGauge label="Strength" value={stats.strength} />
        <StatGauge label="Discipline" value={stats.discipline} />
        <StatGauge label="Focus" value={stats.focus} />
      </div>

      <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        Consistency
      </p>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>Perfect-day streak</p>
            <p className="font-mono text-2xl font-bold" style={{ color: "var(--color-ember)" }}>{perfectDays.current}</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>Longest ever</p>
            <p className="font-mono text-2xl font-bold">{perfectDays.longest}</p>
          </div>
        </div>
        <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
          A perfect day = every scheduled task completed, nothing skipped.
        </p>

        {topTaskHeatmap && (
          <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--color-line)" }}>
            <p className="mb-2 text-xs" style={{ color: "var(--color-ink-dim)" }}>
              Last 12 weeks — {topTaskHeatmap.label}
            </p>
            <HeatmapCalendar series={topTaskHeatmap.series} />
          </div>
        )}

      </Card>

      {weeklyPatterns.length > 0 && (
        <>
          <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            This week's patterns
          </p>
          <Card>
            <div className="space-y-3">
              {weeklyPatterns.map((c, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: "var(--color-ink-dim)" }}>
                  <span style={{ color: "var(--color-ember)", fontWeight: 600 }}>#{i + 1}</span>{" "}
                  {correlationPredictsSentence(c)}
                </p>
              ))}
            </div>
            <p className="mt-3 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
              {cachedSnapshot
                ? "Locked in for this week — refreshes next week as new data comes in."
                : "First read on this — will lock in once you've logged a bit more this week."}
            </p>
          </Card>
        </>
      )}

      {(todInsight || prioritySuggestions.length > 0 || frequencySuggestions.length > 0) && (
        <>
          <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            Smart suggestions
          </p>
          <Card>
            {todInsight && (
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-dim)" }}>
                You complete <span style={{ color: "var(--color-ember)", fontWeight: 600 }}>{Math.round(todInsight.bestRate * 100)}%</span> of your{" "}
                <span className="capitalize">{todInsight.best}</span> tasks, vs only{" "}
                <span style={{ color: "var(--color-bad)", fontWeight: 600 }}>{Math.round(todInsight.worstRate * 100)}%</span> in the{" "}
                <span className="capitalize">{todInsight.worst}</span>. Worth scheduling new habits in the {todInsight.best} when you can.
              </p>
            )}

            {prioritySuggestions.length > 0 && (
              <div className={todInsight ? "mt-4 space-y-3 border-t pt-3" : "space-y-3"} style={{ borderColor: "var(--color-line)" }}>
                {prioritySuggestions.map((s) => (
                  <div key={s.uid} className="flex items-center justify-between gap-3">
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-dim)" }}>
                      "{s.label}" is {s.currentPriority} but you complete it only{" "}
                      <span style={{ fontWeight: 600, color: s.direction === "downgrade" ? "var(--color-bad)" : "var(--color-ember)" }}>
                        {Math.round(s.rate * 100)}%
                      </span>{" "}
                      of the time
                      {s.direction === "upgrade" ? " — you're already showing up for this, worth ranking it higher." : "."}
                    </p>
                    <button
                      onClick={() => setTaskPriority(s.uid, s.suggestedPriority)}
                      className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
                      style={{ background: "var(--color-surface-raised)", color: "var(--color-ember)" }}
                    >
                      → {s.suggestedPriority}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {frequencySuggestions.length > 0 && (
              <div
                className={todInsight || prioritySuggestions.length > 0 ? "mt-4 space-y-3 border-t pt-3" : "space-y-3"}
                style={{ borderColor: "var(--color-line)" }}
              >
                {frequencySuggestions.map((s) => (
                  <div key={s.uid} className="flex items-center justify-between gap-3">
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-dim)" }}>
                      "{s.label}" is set to {s.currentFrequency}x/week but you've only completed it on{" "}
                      <span style={{ fontWeight: 600, color: "var(--color-bad)" }}>{Math.round(s.rate * 100)}%</span> of scheduled days
                      recently. Dropping to {s.suggestedFrequency}x/week may be more sustainable than missing it repeatedly.
                    </p>
                    <button
                      onClick={() => updateTaskFrequency(s.uid, s.suggestedFrequency)}
                      className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
                      style={{ background: "var(--color-surface-raised)", color: "var(--color-ember)" }}
                    >
                      → {s.suggestedFrequency}x/wk
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {shouldShowWeeklyReview(profile) && <WeeklyReview />}

      {seasonPacing && (
        <>
          <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            Season pacing
          </p>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-dim)" }}>
                Season {profile.season.seasonNumber} is set to {profile.season.durationDays} days. At your recent{" "}
                <span style={{ fontWeight: 600, color: "var(--color-ember)" }}>{Math.round(seasonPacing.rate * 100)}%</span>{" "}
                completion rate, a{" "}
                <span style={{ fontWeight: 600 }}>{seasonPacing.suggestedDurationDays}-day</span> season fits your actual pace better
                {seasonPacing.pace === "ahead"
                  ? " — you're moving faster than the current length assumes."
                  : seasonPacing.pace === "behind"
                  ? " — the current length is tighter than what you've been able to sustain."
                  : " — close to where it already is."}
              </p>
              {seasonPacing.suggestedDurationDays !== profile.season.durationDays && (
                <button
                  onClick={() => setSeasonDuration(seasonPacing.suggestedDurationDays)}
                  className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
                  style={{ background: "var(--color-surface-raised)", color: "var(--color-ember)" }}
                >
                  → {seasonPacing.suggestedDurationDays}d
                </button>
              )}
            </div>
          </Card>
        </>
      )}

      <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        Weekly report
      </p>
      <Card>
        {!isGeminiConfigured ? (
          <p className="text-sm" style={{ color: "var(--color-ink-dim)" }}>
            Set GEMINI_API_KEY (and VITE_GEMINI_ENABLED=true) to enable AI-generated weekly reports.
          </p>
        ) : cachedReport ? (
          <>
            <p className="whitespace-pre-line text-sm leading-relaxed">{cachedReport}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={copyReport}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold"
                style={{ background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
              >
                <Copy size={13} /> {copied ? "Copied" : "Copy to share"}
              </button>
              <button
                onClick={generateReport}
                disabled={generating}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold disabled:opacity-50"
                style={{ background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
              >
                <RefreshCw size={13} className={generating ? "animate-spin" : ""} /> Regenerate
              </button>
            </div>
          </>
        ) : (
          <div>
            <p className="text-sm" style={{ color: "var(--color-ink-dim)" }}>
              No report yet for this week.
            </p>
            <div className="mt-3">
              <PrimaryButton onClick={generateReport} disabled={generating}>
                <span className="flex items-center justify-center gap-2">
                  <Sparkles size={15} /> {generating ? "Generating..." : "Generate weekly report"}
                </span>
              </PrimaryButton>
            </div>
          </div>
        )}
        {genError && (
          <p className="mt-2 text-xs" style={{ color: "var(--color-bad)" }}>
            {genError}
          </p>
        )}
      </Card>

      <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        Your 7 life areas
      </p>
      <Card>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lifeAreaData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="area"
                width={90}
                tick={{ fill: "var(--color-ink-dim)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="xp" radius={[0, 6, 6, 0]}>
                {lifeAreaData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
          XP earned per area, from completed tasks tagged to that area.
        </p>
      </Card>

      <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        Mood vs. task completion
      </p>
      <Card>
        {moodData.length < 4 ? (
          <p className="text-sm" style={{ color: "var(--color-ink-dim)" }}>
            Log at least 4 journal entries to see how your mood tracks against how much you
            actually complete.
          </p>
        ) : (
          <>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={moodData}>
                  <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fill: "var(--color-ink-dim)", fontSize: 10 }} />
                  <YAxis yAxisId="left" domain={[0, 100]} tick={{ fill: "var(--color-ink-dim)", fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{ fill: "var(--color-ink-dim)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-line)", fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" dataKey="completionPct" stroke="var(--color-ember)" strokeWidth={2} dot={false} name="Completion %" />
                  <Line yAxisId="right" type="monotone" dataKey="mood" stroke="var(--color-gold)" strokeWidth={2} dot={false} name="Mood" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1" style={{ color: "var(--color-ink-dim)" }}>
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--color-ember)" }} /> Completion %
              </span>
              <span className="flex items-center gap-1" style={{ color: "var(--color-ink-dim)" }}>
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--color-gold)" }} /> Mood
              </span>
            </div>
            {correlation !== null && (
              <p className="mt-2 text-xs" style={{ color: "var(--color-ink-dim)" }}>
                {correlation > 0.3
                  ? "Your mood trends up on days you complete more tasks — consistency is doing real work here."
                  : correlation < -0.3
                  ? "Your mood trends down on high-completion days — worth checking if you're overloading yourself."
                  : "No strong link yet between completion and mood — keep logging."}
              </p>
            )}
          </>
        )}
      </Card>

      {profile.milestones.length > 0 && (
        <>
          <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            Milestones
          </p>
          <Card>
            <div className="space-y-3">
              {[...profile.milestones].reverse().slice(0, 8).map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <Award size={16} className="mt-0.5 shrink-0" color="var(--color-gold)" />
                  <div>
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <Card className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
          Lifetime
        </p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm" style={{ color: "var(--color-ink-dim)" }}>Tasks completed</p>
          <p className="font-mono text-lg font-bold">{doneTotal}</p>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-sm" style={{ color: "var(--color-ink-dim)" }}>Total XP</p>
          <p className="font-mono text-lg font-bold" style={{ color: "var(--color-ember)" }}>{profile.xpTotal}</p>
        </div>
      </Card>
    </div>
  );
}
