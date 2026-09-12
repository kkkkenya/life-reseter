import { useState } from "react";
import { Check, ChevronDown, Copy, RefreshCw, Sparkles, Star } from "lucide-react";
import { Card, PrimaryButton } from "@/components/ui";
import { IconFor } from "@/components/IconFor";
import { GoalTargetEditor } from "@/components/GoalTargetEditor";
import { useAppStore } from "@/store/useAppStore";
import { LIFE_AREAS, getLifeArea, OBJECTIVE_HORIZONS } from "@/data/lifeAreas";
import { goalDailyEvidence, formatGoalEvidenceText } from "@/lib/goalEvidence";
import { askGemini, isGeminiConfigured } from "@/lib/gemini";
import { buildReviewPrompt, buildWeeklySummaryContext } from "@/lib/weeklyReport";
import { isoWeekKey } from "@/lib/isoWeek";
import type { LifeAreaKey, ObjectiveHorizon, GoalTarget, UserProfile } from "@/types";

const REVIEW_INTERVAL_MS = 7 * 86400000;

/**
 * Rolling 7-day check: shows once 7 days have passed since the last review (or, for a never-
 * reviewed profile, once 7 days have passed since the program started — a grace period so
 * brand-new users aren't nagged on day one). Exported so Overview.tsx can cheaply decide whether
 * to mount the component at all, rather than always mounting and self-hiding.
 */
export function shouldShowWeeklyReview(profile: UserProfile, now: Date = new Date()): boolean {
  if (!profile.startDate) return false;
  const startedAt = new Date(profile.startDate + "T00:00:00").getTime();
  if (now.getTime() - startedAt < REVIEW_INTERVAL_MS) return false;
  if (profile.lastGoalsReviewAt === null) return true;
  return now.getTime() - new Date(profile.lastGoalsReviewAt).getTime() > REVIEW_INTERVAL_MS;
}

export default function WeeklyReview() {
  const profile = useAppStore((s) => s.profile);
  const setGoal = useAppStore((s) => s.setGoal);
  const setGoalWhy = useAppStore((s) => s.setGoalWhy);
  const markGoalsReviewed = useAppStore((s) => s.markGoalsReviewed);
  const setWeeklyReport = useAppStore((s) => s.setWeeklyReport);
  const [acknowledged, setAcknowledged] = useState<Set<LifeAreaKey>>(new Set());
  const [expandedArea, setExpandedArea] = useState<LifeAreaKey | null>(null);

  // The one AI feature left: a weekly review written from the week's real
  // numbers (completions, streaks, journal moods, income). No daily reviews,
  // no coach personas, no quests — one honest read per week.
  const weekKey = isoWeekKey();
  const cachedReport = profile.weeklyReports[weekKey];
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const firstName = profile.displayName.trim().split(/\s+/)[0] || "";

  async function generateReview() {
    setGenerating(true);
    setGenError(null);
    try {
      const context = buildWeeklySummaryContext(profile);
      const text = await askGemini(buildReviewPrompt(context, firstName), {
        temperature: 0.7,
        maxOutputTokens: 220,
      });
      setWeeklyReport(weekKey, text);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed to generate review.");
    } finally {
      setGenerating(false);
    }
  }

  function copyReview() {
    if (!cachedReport) return;
    navigator.clipboard.writeText(cachedReport).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Defensive re-check — Overview decides whether to mount at all, but this keeps the component
  // safe to render standalone too.
  if (!shouldShowWeeklyReview(profile)) return null;

  const pinnedArea = profile.pinnedFocusArea ? getLifeArea(profile.pinnedFocusArea) : null;
  const compactAreas = pinnedArea ? LIFE_AREAS.filter((a) => a.key !== pinnedArea.key) : LIFE_AREAS;

  const pinnedGoal = pinnedArea ? profile.goals[pinnedArea.key] : null;
  const pinnedEvidence = pinnedGoal ? goalDailyEvidence(pinnedGoal, profile) : null;
  const pinnedEvidenceText = pinnedEvidence ? formatGoalEvidenceText(pinnedEvidence) : null;

  // Milestone achievements don't currently carry a life-area association in the data model, so
  // this surfaces recent wins generally rather than claiming they belong to the pinned area.
  const weekCutoff = Date.now() - REVIEW_INTERVAL_MS;
  const milestonesThisWeek = profile.milestones.filter((m) => new Date(m.achievedAt).getTime() >= weekCutoff);

  function toggleAcknowledged(key: LifeAreaKey) {
    setAcknowledged((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      {isGeminiConfigured && (
        <Card className="mb-3" spineColor="var(--color-gold)">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ember)" }}>
            This week, reviewed
          </p>
          {cachedReport ? (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{cachedReport}</p>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--color-ink-dim)" }}>
              One AI read of your week — written from what you actually completed, skipped, journaled and earned. Not a horoscope.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {cachedReport && (
              <button
                onClick={copyReview}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold"
                style={{ background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
              >
                <Copy size={13} /> {copied ? "Copied" : "Copy to share"}
              </button>
            )}
            <button
              onClick={generateReview}
              disabled={generating}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold disabled:opacity-50"
              style={{ background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
            >
              {cachedReport ? (
                <>
                  <RefreshCw size={13} className={generating ? "animate-spin" : ""} /> Regenerate
                </>
              ) : (
                <>
                  <Sparkles size={13} /> {generating ? "Writing…" : "Write my review"}
                </>
              )}
            </button>
          </div>
          {genError && (
            <p className="mt-2 text-xs" style={{ color: "var(--color-bad)" }}>
              {genError}
            </p>
          )}
        </Card>
      )}

      <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        Weekly check-in
      </p>

      {pinnedArea && pinnedGoal ? (
        <Card spineColor={pinnedArea.color} className="mb-3">
          <div className="flex items-center gap-2">
            <IconFor name={pinnedArea.icon} size={16} color={pinnedArea.color} />
            <p className="text-sm font-semibold">{pinnedArea.label}</p>
            <Star size={13} color={pinnedArea.color} fill={pinnedArea.color} />
          </div>

          <div className="mt-3">
            <p className="mb-1 text-xs font-medium" style={{ color: "var(--color-ink-dim)" }}>
              Why this area matters to you
            </p>
            <textarea
              value={pinnedGoal.why}
              onChange={(e) => setGoalWhy(pinnedArea.key, e.target.value)}
              placeholder="What's the real reason this matters..."
              rows={2}
              className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
            />
          </div>

          <div className="mt-3 space-y-3">
            {OBJECTIVE_HORIZONS.map((h) => (
              <div key={h.key}>
                <p className="mb-1 text-xs font-medium" style={{ color: "var(--color-ink-dim)" }}>
                  {h.label}
                </p>
                <GoalTargetEditor
                  value={pinnedGoal[h.key]}
                  onChange={(patch: Partial<GoalTarget>) => setGoal(pinnedArea.key, h.key as ObjectiveHorizon, patch)}
                  accent={pinnedArea.color}
                  labelPlaceholder={`${h.label} goal for ${pinnedArea.shortLabel.toLowerCase()}...`}
                />
              </div>
            ))}
          </div>

          {pinnedEvidenceText && (
            <p className="mt-3 text-xs" style={{ color: "var(--color-ink-dim)" }}>
              Daily link evidence:{" "}
              <span style={{ fontWeight: 600, color: pinnedArea.color }}>{pinnedEvidenceText}</span>
            </p>
          )}

          {milestonesThisWeek.length > 0 && (
            <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-line)" }}>
              <p className="mb-1.5 text-xs font-medium" style={{ color: "var(--color-ink-dim)" }}>
                Milestones this week
              </p>
              <div className="space-y-1">
                {milestonesThisWeek.map((m) => (
                  <p key={m.id} className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
                    • {m.label}
                  </p>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="mb-3">
          <p className="text-sm" style={{ color: "var(--color-ink-dim)" }}>
            Pin a focus area in Goals to get a deeper weekly check-in on it. For now, here's a quick
            pass over all 7.
          </p>
        </Card>
      )}

      <Card>
        {compactAreas.map((area, i) => {
          const isAck = acknowledged.has(area.key);
          const isExpanded = expandedArea === area.key;
          const goal = profile.goals[area.key];
          return (
            <div key={area.key} className={i > 0 ? "mt-3 border-t pt-3" : ""} style={{ borderColor: "var(--color-line)" }}>
              <div className="flex items-center gap-2">
                <button
                  className="tactile flex flex-1 items-center gap-2.5 text-left"
                  onClick={() => setExpandedArea(isExpanded ? null : area.key)}
                >
                  <IconFor name={area.icon} size={15} color={area.color} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{area.label}</p>
                    <p className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
                      Still on track?
                    </p>
                  </div>
                  <ChevronDown
                    size={14}
                    color="var(--color-ink-faint)"
                    style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                  />
                </button>
                <button
                  onClick={() => toggleAcknowledged(area.key)}
                  aria-label={`Acknowledge ${area.label} is still on track`}
                  className="tactile flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: isAck ? "var(--color-good)" : "var(--color-surface-raised)",
                    border: "1px solid var(--color-line)",
                  }}
                >
                  <Check size={14} color={isAck ? "#fbf3e7" : "var(--color-ink-dim)"} />
                </button>
              </div>
              {isExpanded && (
                <div className="mt-3 space-y-2.5 pl-1">
                  {OBJECTIVE_HORIZONS.map((h) => (
                    <div key={h.key}>
                      <p className="mb-1 text-[11px] font-medium" style={{ color: "var(--color-ink-dim)" }}>
                        {h.label}
                      </p>
                      <GoalTargetEditor
                        value={goal[h.key]}
                        onChange={(patch: Partial<GoalTarget>) => setGoal(area.key, h.key as ObjectiveHorizon, patch)}
                        accent={area.color}
                        labelPlaceholder={`${h.label} goal for ${area.shortLabel.toLowerCase()}...`}
                        size="compact"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <div className="mt-3">
        <PrimaryButton onClick={markGoalsReviewed}>Done reviewing</PrimaryButton>
      </div>
    </>
  );
}
