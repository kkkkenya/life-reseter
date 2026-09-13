import { useState } from "react";
import Overview from "@/pages/life/Overview";
import Income from "@/pages/life/Income";
import Goals from "@/pages/life/Goals";
import Settings from "@/pages/life/Settings";
import CheckIn from "@/pages/life/CheckIn";
import Journal from "@/pages/life/Journal";

type SubTab = "overview" | "goals" | "finances" | "journal" | "checkin" | "settings";

const TABS: { key: SubTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "goals", label: "Goals" },
  { key: "finances", label: "Finances" },
  { key: "journal", label: "Journal" },
  { key: "checkin", label: "Check-in" },
  { key: "settings", label: "Settings" },
];

/**
 * Life — the weekly view of yourself: goals, finances, journal, check-ins and
 * the overview that ties them together. Everything here is reviewed on a
 * rhythm (weekly or monthly), not browsed daily.
 */
export default function Life() {
  const [sub, setSub] = useState<SubTab>("overview");

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-28 pt-14 lg:max-w-3xl lg:px-10 lg:pb-16">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
        The longer view
      </p>
      <h1 className="font-display text-2xl font-semibold">Life</h1>

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
        {sub === "journal" && <Journal />}
        {sub === "checkin" && <CheckIn />}
        {sub === "settings" && <Settings />}
      </div>
    </div>
  );
}
