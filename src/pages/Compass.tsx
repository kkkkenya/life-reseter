import { useState } from "react";
import Overview from "@/pages/life/Overview";
import Income from "@/pages/life/Income";
import Goals from "@/pages/life/Goals";
import Settings from "@/pages/life/Settings";
import CheckIn from "@/pages/life/CheckIn";
import School from "@/pages/life/School";
import Journal from "@/pages/life/Journal";

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

  return (
    <div className="mx-auto max-w-md px-5 pb-28 pt-14">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        Where you're headed
      </p>
      <h1 className="font-display text-2xl font-semibold">Compass</h1>

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
