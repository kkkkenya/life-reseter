import { useMemo, useState } from "react";
import Overview from "@/pages/life/Overview";
import Income from "@/pages/life/Income";
import Goals from "@/pages/life/Goals";
import Settings from "@/pages/life/Settings";
import CheckIn from "@/pages/life/CheckIn";
import School from "@/pages/life/School";
import Journal from "@/pages/life/Journal";
import { useAppStore } from "@/store/useAppStore";
import { LIFE_AREAS } from "@/data/lifeAreas";
import { lifeAreaCompletion, goalProgress, goalTargetsSetCount } from "@/lib/lifeAreaStats";
import { CompassRose, type CompassRoseDatum } from "@/components/CompassRose";
import { Card } from "@/components/ui";

type SubTab = "overview" | "goals" | "finances" | "school" | "journal" | "checkin" | "settings";

const TABS: { key: SubTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "goals", label: "Goals" },
  { key: "finances", label: "Finances" },
  { key: "school", label: "School" },
  { key: "journal", label: "Journal" },
  { key: "checkin", label: "Check-in" },
  { key: "settings", label: "Settings" },
];

/**
 * Compass — where your life is actually headed. Groups goals, finances, and
 * the life-area overview, since all three answer the same question: am I
 * moving toward what I said mattered.
 */
export default function Compass() {
  const [sub, setSub] = useState<SubTab>("overview");
  const profile = useAppStore((s) => s.profile);

  const { compassData, overall, headline } = useMemo(() => {
    const completion = lifeAreaCompletion(profile);
    const progress = goalProgress(profile);
    const targetsSet = goalTargetsSetCount(profile);

    const data: CompassRoseDatum[] = LIFE_AREAS.map((area) => {
      const c = completion[area.key];
      const hasCompletion = c.total > 0;
      const hasGoals = targetsSet[area.key] > 0;
      let value = 0;
      if (hasCompletion && hasGoals) value = (c.pct + progress[area.key]) / 2;
      else if (hasCompletion) value = c.pct;
      else if (hasGoals) value = progress[area.key];
      return { key: area.key, shortLabel: area.shortLabel, icon: area.icon, color: area.color, value };
    });

    const overallValue = data.reduce((sum, d) => sum + d.value, 0) / data.length;

    const sorted = [...data].sort((a, b) => b.value - a.value);
    const hasSignal = sorted.some((d) => d.value > 0);
    const spread = sorted[0].value - sorted[sorted.length - 1].value;
    let headlineText: string;
    if (!hasSignal) {
      headlineText = "Complete tasks or set goal targets to find your heading.";
    } else if (spread < 0.12) {
      headlineText = "Steady across the board — no area pulling ahead or lagging.";
    } else {
      headlineText = `${sorted[0].shortLabel} is leading. ${sorted[sorted.length - 1].shortLabel} needs the next push.`;
    }

    return { compassData: data, overall: overallValue, headline: headlineText };
  }, [profile]);

  return (
    <div className="mx-auto max-w-md px-5 pb-28 pt-14">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        Where you're headed
      </p>
      <h1 className="font-display text-2xl font-semibold">Compass</h1>

      <Card className="mt-4" elevation="floating">
        <CompassRose data={compassData} overall={overall} headline={headline} />
      </Card>

      <div className="mt-4 flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => {
          const active = sub === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSub(t.key)}
              className="tactile shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold"
              style={{
                background: active ? "var(--color-ember)" : "var(--color-surface)",
                color: active ? "#fbf3e7" : "var(--color-ink-dim)",
                boxShadow: active ? "var(--shadow-raised)" : "var(--shadow-flush)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {sub === "overview" && <Overview />}
        {sub === "goals" && <Goals />}
        {sub === "finances" && <Income />}
        {sub === "school" && <School />}
        {sub === "journal" && <Journal />}
        {sub === "checkin" && <CheckIn />}
        {sub === "settings" && <Settings />}
      </div>
    </div>
  );
}
