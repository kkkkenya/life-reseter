import { TABS, type Tab } from "./BottomNav";

/**
 * Desktop navigation rail. The app was phone-shaped everywhere; this gives it a
 * real desktop frame — a persistent left rail above the lg breakpoint while the
 * bottom tab bar takes over on smaller screens (see BottomNav).
 */
export function SideNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r px-4 py-6 lg:flex"
      style={{ background: "var(--color-bg)", borderColor: "var(--color-line)" }}
    >
      <div className="px-3">
        <p className="font-display text-2xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
          Reset
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-dim)" }}>
          your own behavior system
        </p>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Primary">
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              aria-current={isActive ? "page" : undefined}
              className="tactile flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold"
              style={{
                background: isActive ? "var(--color-surface)" : "transparent",
                color: isActive ? "var(--color-ember)" : "var(--color-ink-dim)",
                boxShadow: isActive ? "var(--shadow-raised)" : "none",
              }}
            >
              <t.icon size={18} color={isActive ? "var(--color-ember)" : "var(--color-ink-faint)"} />
              {t.label}
            </button>
          );
        })}
      </nav>

      <p className="px-3 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        Data stays on this device, optionally synced through your own Supabase project.
      </p>
    </aside>
  );
}
