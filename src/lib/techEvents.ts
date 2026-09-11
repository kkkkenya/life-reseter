import { isValidIsoDate } from "./parseEvent";
import { recordSourceHealth } from "./eventHealth";

export interface TechEvent {
  title: string;
  date: string; // YYYY-MM-DD
  endDate: string | null; // set for multi-day events (e.g. symposiums)
  startTime: string | null; // HH:MM
  endTime: string | null;
  city: string | null;
  venue: string | null;
  isOnline: boolean;
  url: string | null;
  image: string | null; // poster thumbnail
  source: string | null; // host/org name
  origin: string | null; // which registry source it was fetched from (vabu, …)
  isFree: boolean | null;
  priceText: string | null;
  topics: string[];
}

export interface TechHub {
  name: string;
  url: string;
  blurb: string;
}

export interface DirectSource {
  id: string;
  label: string;
  url: string;
  ok?: boolean; // false when that source failed/slow this pull (markup changed?)
  count?: number; // in-week cards it contributed
}

export interface TechEventsResult {
  events: TechEvent[];
  hubs: TechHub[];
  sources: DirectSource[];
  aiFill: number; // how many items came from the clearly-badged AI online fill
  source: "direct" | "fallback" | "cache";
  fetchedAt: string; // ISO datetime
}

// Static hubs — deterministic links, always shown as backup.
export const TECH_HUBS: TechHub[] = [
  { name: "GDG Nairobi", url: "https://gdg.community.dev/gdg-nairobi/", blurb: "Google dev meetups + IO Extended season" },
  { name: "iHub Nairobi", url: "https://ihub.co.ke/", blurb: "Kenya's tech hub — events + community" },
  { name: "Luma discover", url: "https://lu.ma/discover", blurb: "Search Nairobi tech this week" },
  { name: "Eventbrite Nairobi tech", url: "https://www.eventbrite.com/d/kenya--nairobi/tech-events/", blurb: "Ticketed + free tech gatherings" },
];

const CACHE_KEY = "life-reset-tech-events-v4";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h — a weekly radar doesn't need fresh pulls

/** Max events per weekly pull: prompt asks for ≤20, server keeps ≤30 raw then
 *  dedupes + drops out-of-range items, so the feed is at most ~20. */
export const MAX_EVENTS_PER_PULL = 20;

const SAVED_KEY = "life-reset-saved-events";

export function eventKey(ev: Pick<TechEvent, "title" | "date">): string {
  return `${ev.title.toLowerCase()}|${ev.date}`;
}

/** Link to the .ics export of this week's feed. `download` forces a file save
 *  instead of the browser handing it to the calendar app (webcal/import). */
export function icsUrl(weekStart: string, weekEnd: string, download = false): string {
  const q = new URLSearchParams({ weekStart, weekEnd });
  if (download) q.set("download", "1");
  return `/api/weekly-ics?${q.toString()}`;
}

/** Bookmarks live in their own localStorage key (not the synced profile blob):
 *  small, device-local, survives feed refreshes and other weeks. */
export function loadSavedEvents(): TechEvent[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list
      .map((r) => (typeof r === "object" && r !== null ? normalizeEvent(r as Record<string, unknown>) : null))
      .filter((e): e is TechEvent => e !== null);
  } catch {
    return [];
  }
}

export function toggleSavedEvent(list: TechEvent[], ev: TechEvent): TechEvent[] {
  const key = eventKey(ev);
  const next = list.some((s) => eventKey(s) === key)
    ? list.filter((s) => eventKey(s) !== key)
    : [...list, ev];
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(next.slice(0, 100)));
  } catch {
    /* storage blocked — bookmarks just won't persist */
  }
  return next;
}

export const TOPIC_LABELS: Record<string, string> = {
  ai: "AI",
  "web dev": "Web Dev",
  mobile: "Mobile",
  data: "Data",
  "cloud/devops": "Cloud/DevOps",
  cybersecurity: "Security",
  startups: "Startups",
  design: "Design",
  blockchain: "Blockchain",
  career: "Career",
};

/** Monday-start week containing `ref`, as ISO dates. */
export function getWeekRange(ref: Date = new Date()): { weekStart: string; weekEnd: string } {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  const mon = new Date(d);
  mon.setDate(d.getDate() - dow);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const iso = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { weekStart: iso(mon), weekEnd: iso(sun) };
}

function readCache(weekStart: string, weekEnd: string): TechEventsResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { key: string; at: number; data: TechEventsResult };
    if (parsed.key !== `${weekStart}|${weekEnd}`) return null;
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return { ...parsed.data, source: "cache" };
  } catch {
    return null;
  }
}

export function normalizeEvent(raw: Record<string, unknown>): TechEvent | null {
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 110) : "";
  const isoDate = (v: unknown) => (typeof v === "string" && isValidIsoDate(v.trim().slice(0, 10)) ? v.trim().slice(0, 10) : null);
  const dateStr = isoDate(raw.date);
  if (!title || !dateStr) return null;
  const time = (v: unknown) =>
    typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v.trim().slice(0, 5)) ? v.trim().slice(0, 5) : null;
  const text = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  return {
    title,
    date: dateStr,
    endDate: isoDate(raw.endDate),
    startTime: time(raw.startTime),
    endTime: time(raw.endTime),
    city: text(raw.city, 60),
    venue: text(raw.venue, 120),
    isOnline: raw.isOnline === true,
    url: text(raw.url, 300)?.startsWith("http") ? (text(raw.url, 300) as string) : null,
    image: text(raw.image, 300)?.startsWith("http") ? (text(raw.image, 300) as string) : null,
    source: text(raw.source, 60),
    origin: text(raw.origin, 20),
    isFree: typeof raw.isFree === "boolean" ? raw.isFree : null,
    priceText: text(raw.priceText, 40),
    topics: Array.isArray(raw.topics)
      ? raw.topics.filter((t): t is string => typeof t === "string" && t in TOPIC_LABELS).slice(0, 3)
      : [],
  };
}

/** Max AI-fill items merged per pull (direct listings always win dedupes). */
export const MAX_AI_FILL = 8;

function toTechEventList(raw: unknown, weekStart: string, weekEnd: string): TechEvent[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[])
    .map(normalizeEvent)
    .filter((e): e is TechEvent => {
      if (e === null) return false;
      // Keep multi-day events that merely *span* this week, not only ones that start in it.
      const end = e.endDate && e.endDate > e.date ? e.endDate : e.date;
      return e.date <= weekEnd && end >= weekStart;
    });
}

export async function fetchTechEvents(force = false): Promise<TechEventsResult> {
  const { weekStart, weekEnd } = getWeekRange();
  if (!force) {
    const cached = readCache(weekStart, weekEnd);
    if (cached) return cached;
  }
  // Direct (Kenya truth) + AI online fill race in parallel; either may fail
  // without killing the feed.
  const [directRes, aiRes] = await Promise.allSettled([
    fetch(`/api/direct-events?weekStart=${weekStart}&weekEnd=${weekEnd}`).then((r) =>
      r.json().catch(() => ({}))
    ),
    fetch("/api/tech-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart, weekEnd }),
    }).then((r) => r.json().catch(() => ({}))),
  ]);

  const directData = directRes.status === "fulfilled" ? directRes.value : {};
  const aiData = aiRes.status === "fulfilled" ? aiRes.value : {};

  const seen = new Set<string>();
  const events: TechEvent[] = [];
  for (const e of toTechEventList(directData.events, weekStart, weekEnd)) {
    const k = eventKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    events.push(e);
  }
  let aiFill = 0;
  for (const e of toTechEventList(aiData.events, weekStart, weekEnd)) {
    if (aiFill >= MAX_AI_FILL) break;
    const k = eventKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    events.push(e);
    aiFill += 1;
  }
  events.sort((a, b) => `${a.date} ${a.startTime ?? ""}`.localeCompare(`${b.date} ${b.startTime ?? ""}`));

  const result: TechEventsResult = {
    events,
    hubs: TECH_HUBS,
    sources: Array.isArray(directData.sources) ? directData.sources : [],
    aiFill,
    source: "direct",
    fetchedAt: new Date().toISOString(),
  };
  recordSourceHealth(result.sources, result.fetchedAt);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ key: `${weekStart}|${weekEnd}`, at: Date.now(), data: result }));
  } catch {
    /* storage full/blocked — caching is best-effort */
  }
  return result;
}

export function shortDayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso.slice(5);
  return d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
}

/** Google Maps search link for an in-person venue. Null for online events. */
export function mapsLink(ev: Pick<TechEvent, "isOnline" | "city" | "venue">): string | null {
  if (ev.isOnline) return null;
  const q = [ev.venue, ev.city, "Kenya"].filter(Boolean).join(", ");
  if (!q || q === "Kenya") return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Share an event: native share sheet, else copy link (or title+date). */
export async function shareEvent(ev: Pick<TechEvent, "title" | "date" | "url">): Promise<"shared" | "copied"> {
  const text = `${ev.title} — ${shortDayLabel(ev.date)}${ev.url ? ` ${ev.url}` : ""}`;
  try {
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string; url?: string }) => Promise<void> };
    if (nav.share) {
      await nav.share({ title: ev.title, text, url: ev.url ?? undefined });
      return "shared";
    }
  } catch {
    /* user dismissed or share failed — fall through to copy */
  }
  await navigator.clipboard.writeText(ev.url ?? text);
  return "copied";
}
