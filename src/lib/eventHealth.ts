/**
 * eventHealth.ts — remembers how each source behaved on the last pull, so the
 * Events page can show a source-health panel ("3 of 12 sources offline · last
 * checked 4h ago") instead of hiding a silently-broken scraper.
 *
 * Device-local on purpose: it is diagnostic, not synced profile data.
 */

export interface SourceStatusLike {
  id: string;
  label: string;
  url: string;
  ok?: boolean;
  count?: number;
}

export interface SourceHealth {
  id: string;
  label: string;
  url: string;
  ok: boolean;
  count: number;
  lastCheckedAt: string; // ISO datetime of the most recent attempt
  lastOkAt: string | null; // ISO datetime it last returned events successfully
  lastCount: number;
}

const HEALTH_KEY = "life-reset-event-health-v1";

export function loadSourceHealth(): SourceHealth[] {
  try {
    const raw = localStorage.getItem(HEALTH_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter((x): x is SourceHealth => typeof x === "object" && x !== null && typeof (x as SourceHealth).id === "string");
  } catch {
    return [];
  }
}

/** Merge this pull's per-source status into the stored history. */
export function recordSourceHealth(sources: SourceStatusLike[], fetchedAt: string): SourceHealth[] {
  const prev = new Map(loadSourceHealth().map((h) => [h.id, h]));
  const next: SourceHealth[] = sources.map((s) => {
    const before = prev.get(s.id);
    const ok = s.ok === true;
    const count = s.count ?? 0;
    return {
      id: s.id,
      label: s.label,
      url: s.url,
      ok,
      count,
      lastCheckedAt: fetchedAt,
      lastOkAt: ok && count > 0 ? fetchedAt : before?.lastOkAt ?? null,
      lastCount: count,
    };
  });
  try {
    localStorage.setItem(HEALTH_KEY, JSON.stringify(next.slice(0, 40)));
  } catch {
    /* storage blocked — the panel just falls back to this pull's data */
  }
  return next;
}

/** Compact "4h ago" style label for a last-checked timestamp. */
export function relativeTime(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
