<<<<<<< HEAD
import { Sunrise, Feather, Compass, ShieldCheck } from "lucide-react";

export type Tab = "today" | "examen" | "detox" | "compass";
=======
import { Sunrise, Feather, Compass } from "lucide-react";

export type Tab = "today" | "examen" | "compass";
>>>>>>> 2cbfdcef78ad01192da598ce6a87ce9ba4536bfc

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { key: "today", label: "Today", icon: Sunrise },
  { key: "examen", label: "Examen", icon: Feather },
<<<<<<< HEAD
  { key: "detox", label: "Detox", icon: ShieldCheck },
=======
>>>>>>> 2cbfdcef78ad01192da598ce6a87ce9ba4536bfc
  { key: "compass", label: "Compass", icon: Compass },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t"
      style={{ background: "var(--color-bg)", borderColor: "var(--color-line)", boxShadow: "0 -8px 24px -12px rgba(74, 51, 39, 0.18)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around py-2.5">
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className="flex flex-col items-center gap-1 px-2.5 py-1"
            >
              <t.icon size={19} color={isActive ? "var(--color-ember)" : "var(--color-ink-faint)"} />
              <span
                className="text-[9.5px] font-medium"
                style={{ color: isActive ? "var(--color-ember)" : "var(--color-ink-faint)" }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
