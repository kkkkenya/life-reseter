import { useMemo, useState } from "react";
import { ExternalLink, Search, TriangleAlert, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui";
import { directorySources, fetchSources, type EventSource, type Region } from "@/lib/eventSources";
import { loadSourceHealth, relativeTime } from "@/lib/eventHealth";

const REGIONS: (Region | "All")[] = ["All", "Kenya", "Africa", "Global"];

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="tactile shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold"
      style={{
        background: active ? "var(--color-ember)" : "var(--color-surface)",
        color: active ? "#fbf3e7" : "var(--color-ink-dim)",
        boxShadow: active ? "var(--shadow-raised)" : "var(--shadow-flush)",
      }}
    >
      {label}
    </button>
  );
}

/**
 * The manual-browse column: every org and aggregator worth checking by hand,
 * with a direct "open" and "search" link. Reads the same registry the fetchers
 * use, so adding a source to eventSources.ts makes it appear here automatically.
 */
export function SourceDirectory() {
  const all = useMemo(() => directorySources(), []);
  const [region, setRegion] = useState<Region | "All">("All");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((s: EventSource) => {
      if (region !== "All" && s.region !== region) return false;
      if (!q) return true;
      return `${s.name} ${s.category} ${s.note}`.toLowerCase().includes(q);
    });
  }, [all, region, query]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            Directory
          </p>
          <p className="text-sm font-semibold">Look it up yourself</p>
        </div>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--color-ember-soft)", color: "var(--color-ember)" }}>
          {rows.length}
        </span>
      </div>
      <p className="mt-1 text-xs" style={{ color: "var(--color-ink-dim)" }}>
        Orgs + aggregators that post events. Open their page, or jump straight to a search.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {REGIONS.map((r) => (
          <Chip key={r} active={region === r} label={r} onClick={() => setRegion(r)} />
        ))}
      </div>

      <div
        className="mt-3 flex items-center gap-2 rounded-xl border px-3 py-2"
        style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}
      >
        <Search size={13} color="var(--color-ink-faint)" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter sources…"
          aria-label="Filter sources"
          className="w-full bg-transparent text-xs outline-none"
          style={{ color: "var(--color-ink)" }}
        />
      </div>

      <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1 lg:max-h-[46vh]">
        {rows.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border px-3 py-2"
            style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{s.name}</p>
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-ink-dim)" }}>
                  {s.region} · {s.category} · {s.cadence}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <a
                  href={s.searchUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Browse ${s.name}`}
                  className="tactile rounded-lg px-2 py-1 text-[10px] font-bold"
                  style={{ background: "var(--color-ember-soft)", color: "var(--color-ember)" }}
                >
                  Open
                </a>
                {s.homepage !== s.searchUrl && (
                  <a
                    href={s.homepage}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${s.name} homepage`}
                    className="tactile rounded-lg px-2 py-1"
                    style={{ background: "var(--color-surface)", color: "var(--color-ink-dim)" }}
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
            <p className="mt-1 text-[11px] leading-snug" style={{ color: "var(--color-ink-dim)" }}>
              {s.note}
            </p>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-6 text-center text-xs" style={{ color: "var(--color-ink-dim)" }}>
            Nothing matches that filter.
          </li>
        )}
      </ul>
    </Card>
  );
}

/** Which sources succeeded on the last pull, how many they returned, and when. */
export function SourceHealthPanel({ refreshKey = "" }: { refreshKey?: string }) {
  const health = useMemo(() => loadSourceHealth(), [refreshKey]);
  const byId = useMemo(() => new Map(health.map((h) => [h.id, h])), [health]);
  const fetchers = useMemo(() => fetchSources(), []);
  const offline = fetchers.filter((s) => {
    const h = byId.get(s.id);
    return h ? !h.ok || h.count === 0 : false;
  }).length;
  const lastChecked = health.length ? relativeTime(health.reduce((a, b) => (a.lastCheckedAt > b.lastCheckedAt ? a : b)).lastCheckedAt) : "never";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            Source health
          </p>
          <p className="text-sm font-semibold">
            {offline === 0 ? "All sources responded" : `${offline} source${offline > 1 ? "s" : ""} quiet`}
          </p>
        </div>
        <span className="text-[10px]" style={{ color: "var(--color-ink-dim)" }}>
          checked {lastChecked}
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {fetchers.map((s) => {
          const h = byId.get(s.id);
          const quiet = h ? !h.ok || h.count === 0 : false;
          const Icon = quiet ? TriangleAlert : CheckCircle2;
          return (
            <li key={s.id} className="flex items-center justify-between gap-2 text-[11px]">
              <a
                href={s.homepage}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-1.5 truncate"
                style={{ color: "var(--color-ink-dim)" }}
              >
                <Icon size={12} color={quiet ? "var(--color-bad)" : "var(--color-good)"} />
                <span className="truncate">{s.name}</span>
              </a>
              <span className="shrink-0 font-mono" style={{ color: "var(--color-ink-dim)" }}>
                {h ? `${h.count} · ${relativeTime(h.lastCheckedAt)}` : "not pulled yet"}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
