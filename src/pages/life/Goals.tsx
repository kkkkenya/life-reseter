import { useState } from "react";
import * as Icons from "lucide-react";
import { Card } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { LIFE_AREAS, OBJECTIVE_HORIZONS, type LifeAreaInfo } from "@/data/lifeAreas";
import { AreaRing } from "@/components/Gauge";
import { ChevronDown, Check, Star, Link2 } from "lucide-react";
import { GoalLinkPickerSheet, type GoalLinkPick } from "@/pages/life/GoalLinkPickerSheet";
import { goalDailyEvidence, formatGoalEvidenceText } from "@/lib/goalEvidence";
import type { LifeAreaGoal, LifeAreaKey, UserProfile } from "@/types";

function IconFor({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Cmp = (Icons as any)[name] ?? Icons.Circle;
  return <Cmp size={size} color={color} />;
}

/** Below the free-text daily input: link status/evidence chip, or a prompt to link one. */
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

export default function Goals() {
  const profile = useAppStore((s) => s.profile);
  const goals = profile.goals;
  const setGoal = useAppStore((s) => s.setGoal);
  const setGoalWhy = useAppStore((s) => s.setGoalWhy);
  const setGoalDailyLink = useAppStore((s) => s.setGoalDailyLink);
  const pinnedFocusArea = profile.pinnedFocusArea;
  const setPinnedFocusArea = useAppStore((s) => s.setPinnedFocusArea);
  const addMilestone = useAppStore((s) => s.addMilestone);
  const [openArea, setOpenArea] = useState<string | null>(LIFE_AREAS[0].key);
  const [justMarked, setJustMarked] = useState<string | null>(null);
  const [linkPickerArea, setLinkPickerArea] = useState<LifeAreaKey | null>(null);

  return (
    <div>
      <p className="mb-4 text-sm" style={{ color: "var(--color-ink-dim)" }}>
        Daily, weekly, 1 month, 6 months, 1 year — per life area. Mark one achieved and it
        lands in your milestone tracker.
      </p>
      <div className="space-y-3">
        {LIFE_AREAS.map((area) => {
          const isOpen = openArea === area.key;
          const isPinned = pinnedFocusArea === area.key;
          const g = goals[area.key];
          const filledCount = OBJECTIVE_HORIZONS.filter((h) => g[h.key]).length;
          const pct = filledCount / OBJECTIVE_HORIZONS.length;
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
                        {filledCount}/{OBJECTIVE_HORIZONS.length} set
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
                  {OBJECTIVE_HORIZONS.map((h) => {
                    const markKey = `${area.key}-${h.key}`;
                    return (
                      <div key={h.key}>
                        <p className="mb-1 text-xs font-medium" style={{ color: "var(--color-ink-dim)" }}>
                          {h.label}
                        </p>
                        <div className="flex gap-2">
                          <input
                            value={g[h.key]}
                            onChange={(e) => setGoal(area.key, h.key, e.target.value)}
                            placeholder={`${h.label} goal for ${area.shortLabel.toLowerCase()}...`}
                            className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
                          />
                          <button
                            disabled={!g[h.key]}
                            onClick={() => {
                              addMilestone(
                                `${h.label} goal achieved — ${area.shortLabel}`,
                                g[h.key]
                              );
                              setJustMarked(markKey);
                              setTimeout(() => setJustMarked(null), 1500);
                            }}
                            className="flex w-11 shrink-0 items-center justify-center rounded-xl disabled:opacity-30"
                            style={{
                              background: justMarked === markKey ? "var(--color-good)" : "var(--color-surface-raised)",
                              border: "1px solid var(--color-line)",
                            }}
                            aria-label={`Mark ${h.label} goal achieved`}
                          >
                            <Check size={15} color={justMarked === markKey ? "#fbf3e7" : "var(--color-ink-dim)"} />
                          </button>
                        </div>
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
                    );
                  })}
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
