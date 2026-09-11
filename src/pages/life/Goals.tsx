import { useState } from "react";
import { resolveIcon } from "@/components/iconMap";
import { Card } from "@/components/ui";
import { GoalTargetEditor } from "@/components/GoalTargetEditor";
import { useAppStore } from "@/store/useAppStore";
import { LIFE_AREAS, OBJECTIVE_HORIZONS, type LifeAreaInfo } from "@/data/lifeAreas";
import { AreaRing } from "@/components/Gauge";
import { ChevronDown, Star, Link2 } from "lucide-react";
import { GoalLinkPickerSheet, type GoalLinkPick } from "@/pages/life/GoalLinkPickerSheet";
import { goalDailyEvidence, formatGoalEvidenceText } from "@/lib/goalEvidence";
import type { LifeAreaGoal, LifeAreaKey, ObjectiveHorizon, GoalTarget, UserProfile } from "@/types";

function IconFor({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  const Cmp = resolveIcon(name);
  return <Cmp size={size} color={color} />;
}

/** Below the daily target editor: link status/evidence chip, or a prompt to link one. */
function DailyLinkRow({
  area,
  goal,
  profile,
  onOpenPicker,
  onClear,
}: {
  area: LifeAreaInfo;
  goal: LifeAreaGoal;
  profile: UserProfile;
  onOpenPicker: () => void;
  onClear: () => void;
}) {
  const evidence = goalDailyEvidence(goal, profile);

  if (evidence.kind === "none") {
    return (
      <button
        onClick={onOpenPicker}
        className="tactile mt-1.5 flex items-center gap-1.5 text-xs font-medium"
        style={{ color: area.color }}
      >
        <Link2 size={12} /> Link to a task or streak
      </button>
    );
  }

  if (evidence.kind === "missing") {
    return (
      <div
        className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5"
        style={{ borderColor: "var(--color-line)" }}
      >
        <span className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
          Linked item removed
        </span>
        <button onClick={onClear} className="text-xs font-semibold" style={{ color: "var(--color-ember)" }}>
          Clear link
        </button>
      </div>
    );
  }

  const evidenceText = formatGoalEvidenceText(evidence);
  return (
    <button
      onClick={onOpenPicker}
      className="tactile mt-1.5 flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left"
      style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)" }}
    >
      <IconFor
        name={evidence.icon}
        size={13}
        color={evidence.kind === "streak" ? evidence.color ?? area.color : area.color}
      />
      <span className="flex-1 truncate text-xs font-medium">{evidence.label}</span>
      <span
        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--color-ink-faint)", border: "1px solid var(--color-line)" }}
      >
        {evidence.kind === "task" ? "Task" : "Streak"}
      </span>
      {evidenceText && (
        <span className="shrink-0 text-[11px]" style={{ color: "var(--color-ink-dim)" }}>
          {evidenceText}
        </span>
      )}
    </button>
  );
}

/** Mean progress (0-1) across horizons that actually have a target set; 0 if none do. */
function areaProgress(goal: LifeAreaGoal): number {
  const targets = OBJECTIVE_HORIZONS.map((h) => goal[h.key]).filter((t) => t.targetValue > 0);
  if (targets.length === 0) return 0;
  return targets.reduce((sum, t) => sum + Math.min(1, t.currentValue / t.targetValue), 0) / targets.length;
}

export default function Goals() {
  const profile = useAppStore((s) => s.profile);
  const goals = profile.goals;
  const setGoal = useAppStore((s) => s.setGoal);
  const setGoalWhy = useAppStore((s) => s.setGoalWhy);
  const setGoalDailyLink = useAppStore((s) => s.setGoalDailyLink);
  const pinnedFocusArea = profile.pinnedFocusArea;
  const setPinnedFocusArea = useAppStore((s) => s.setPinnedFocusArea);
  const [openArea, setOpenArea] = useState<string | null>(LIFE_AREAS[0].key);
  const [linkPickerArea, setLinkPickerArea] = useState<LifeAreaKey | null>(null);

  return (
    <div>
      <p className="mb-4 text-sm" style={{ color: "var(--color-ink-dim)" }}>
        Daily, weekly, 1 month, 6 months, 1 year — per life area. Give each a number and a
        target and the progress bar tracks itself; hit it and it lands in your milestone tracker.
      </p>
      <div className="space-y-3">
        {LIFE_AREAS.map((area) => {
          const isOpen = openArea === area.key;
          const isPinned = pinnedFocusArea === area.key;
          const g = goals[area.key];
          const targetsSet = OBJECTIVE_HORIZONS.filter((h) => g[h.key].targetValue > 0).length;
          const pct = areaProgress(g);
          return (
            <Card
              key={area.key}
              className="p-0 overflow-hidden"
              spineColor={area.color}
              elevation={isOpen ? "floating" : "raised"}
              style={isPinned ? { borderColor: area.color, borderWidth: 1.5 } : undefined}
            >
              <div className="flex w-full items-center gap-2 p-4">
                <button
                  className="tactile flex flex-1 items-center justify-between text-left"
                  onClick={() => setOpenArea(isOpen ? null : area.key)}
                >
                  <div className="flex items-center gap-3">
                    <AreaRing pct={pct} accent={area.color}>
                      <IconFor name={area.icon} size={16} color={area.color} />
                    </AreaRing>
                    <div>
                      <p className="text-sm font-medium">{area.label}</p>
                      <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
                        {targetsSet === 0 ? "No targets set" : `${targetsSet}/${OBJECTIVE_HORIZONS.length} targets set`}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    size={16}
                    color="var(--color-ink-dim)"
                    style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                  />
                </button>
                <button
                  onClick={() => setPinnedFocusArea(isPinned ? null : area.key)}
                  aria-label={isPinned ? `Unpin ${area.label}` : `Pin ${area.label} as this week's focus`}
                  className="tactile shrink-0 rounded-full p-1.5"
                  style={{ background: isPinned ? `color-mix(in srgb, ${area.color} 18%, transparent)` : "transparent" }}
                >
                  <Star
                    size={16}
                    color={isPinned ? area.color : "var(--color-ink-faint)"}
                    fill={isPinned ? area.color : "none"}
                  />
                </button>
              </div>
              {isOpen && (
                <div className="space-y-3 px-4 pb-4">
                  <div>
                    <p className="mb-1 text-xs font-medium" style={{ color: "var(--color-ink-dim)" }}>
                      Why this area matters to you
                    </p>
                    <textarea
                      value={g.why}
                      onChange={(e) => setGoalWhy(area.key, e.target.value)}
                      placeholder="What's the real reason this matters..."
                      rows={2}
                      className="w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none"
                      style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
                    />
                  </div>
                  {OBJECTIVE_HORIZONS.map((h) => (
                    <div key={h.key}>
                      <p className="mb-1 text-xs font-medium" style={{ color: "var(--color-ink-dim)" }}>
                        {h.label}
                      </p>
                      <GoalTargetEditor
                        value={g[h.key]}
                        onChange={(patch: Partial<GoalTarget>) => setGoal(area.key, h.key as ObjectiveHorizon, patch)}
                        accent={area.color}
                        labelPlaceholder={`${h.label} goal for ${area.shortLabel.toLowerCase()}...`}
                      />
                      {h.key === "daily" && (
                        <DailyLinkRow
                          area={area}
                          goal={g}
                          profile={profile}
                          onOpenPicker={() => setLinkPickerArea(area.key)}
                          onClear={() => setGoalDailyLink(area.key, "none", "")}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {linkPickerArea && (
        <GoalLinkPickerSheet
          tasks={profile.tasks}
          streaks={profile.streaks}
          onClose={() => setLinkPickerArea(null)}
          onClear={() => {
            setGoalDailyLink(linkPickerArea, "none", "");
            setLinkPickerArea(null);
          }}
          onPick={(pick: GoalLinkPick) => {
            if (pick.type === "task") setGoalDailyLink(linkPickerArea, "task", pick.uid);
            else setGoalDailyLink(linkPickerArea, "streak", pick.id);
            setLinkPickerArea(null);
          }}
        />
      )}
    </div>
  );
}
