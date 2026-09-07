import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  CalendarDays,
  Check,
  ExternalLink,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Video,
  X,
} from "lucide-react";
import { Card } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { useFeedback } from "@/hooks/useFeedback";
import {
  TOPIC_LABELS,
  TECH_HUBS,
  eventKey,
  fetchTechEvents,
  getWeekRange,
  loadSavedEvents,
  mapsLink,
  shareEvent,
  shortDayLabel,
  toggleSavedEvent,
  type TechEvent,
} from "@/lib/techEvents";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { buildEventInsert } from "@/lib/googleCalendar";

type Mode = "all" | "kenya" | "online" | "saved";
type Cost = "all" | "free" | "paid";

function selectStyle(): React.CSSProperties {
  return {
    borderColor: "var(--color-line)",
    background: "var(--color-surface)",
    color: "var(--color-ink)",
  };
}

function weekDays(weekStart: string): { iso: string; dow: string; num: string }[] {
  const base = new Date(weekStart + "T00:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      iso,
      dow: d.toLocaleDateString("en-KE", { weekday: "narrow" }),
      num: String(d.getDate()),
    };
  });
}

function EventCard({
  ev,
  copied,
  saved,
  onAdd,
  onShare,
  onToggleSave,
}: {
  ev: TechEvent;
  copied: boolean;
  saved: boolean;
  onAdd: (ev: TechEvent, el: Element | null) => void;
  onShare: (ev: TechEvent) => void;
  onToggleSave: (ev: TechEvent) => void;
}) {
  const dayRange =
    ev.endDate && ev.endDate !== ev.date
      ? `${shortDayLabel(ev.date)} → ${shortDayLabel(ev.endDate)}`
      : shortDayLabel(ev.date);
  const when = `${dayRange}${ev.startTime ? ` · ${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ""}` : ""}`;
  const map = mapsLink(ev);
  const place = [ev.city, ev.venue].filter(Boolean).join(" · ") || "Kenya";
  return (
    <Card className="py-4">
      {ev.image && (
        <img
          src={ev.image}
          alt=""
          loading="lazy"
          className="mb-3 h-32 w-full rounded-xl object-cover"
          style={{ border: "1px solid var(--color-line)" }}
        />
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-[11px] font-medium" style={{ color: "var(--color-ember)" }}>
          {when}
        </p>
        <button
          onClick={() => onToggleSave(ev)}
          aria-label={saved ? "Remove bookmark" : "Bookmark this event"}
          className="tactile flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: saved ? "var(--color-ember-soft)" : "var(--color-surface-raised)" }}
        >
          <Bookmark
            size={15}
            color={saved ? "var(--color-ember)" : "var(--color-ink-faint)"}
            fill={saved ? "var(--color-ember)" : "none"}
          />
        </button>
      </div>
      <p className="mt-0.5 text-sm font-semibold leading-snug">{ev.title}</p>

      {/* badges: cost + topics */}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {ev.isFree === true && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--color-good)", color: "#fbf3e7" }}>
            FREE{ev.priceText && ev.priceText.toLowerCase() !== "free" ? ` · ${ev.priceText}` : ""}
          </span>
        )}
        {ev.isFree === false && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--color-ember-soft)", color: "var(--color-ember)" }}>
            {ev.priceText ?? "Paid"}
          </span>
        )}
        {ev.topics.map((t) => (
          <span
            key={t}
            className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
            style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)" }}
          >
            {TOPIC_LABELS[t] ?? t}
          </span>
        ))}
      </div>

      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs" style={{ color: "var(--color-ink-dim)" }}>
        {ev.isOnline ? (
          <span className="inline-flex items-center gap-1">
            <Video size={11} /> Online
          </span>
        ) : map ? (
          <a href={map} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2" style={{ color: "var(--color-ember)" }}>
            <MapPin size={11} /> {place} ↗
          </a>
        ) : (
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} /> {place}
          </span>
        )}
        {ev.source && <span>· {ev.source}</span>}
        {ev.origin && (
          <span
            className="rounded-full px-1.5 py-px text-[10px] font-bold uppercase tracking-wide"
            style={
              ev.origin === "ai"
                ? { background: "var(--color-ember-soft)", color: "var(--color-ember)" }
                : { background: "var(--color-surface-raised)", color: "var(--color-ink-faint)" }
            }
          >
            {ev.origin === "ai" ? "AI picks" : ev.origin}
          </span>
        )}
      </p>

      {/* embedded links */}
      <div className="mt-3 flex gap-2">
        {ev.url && (
          <a
            href={ev.url}
            target="_blank"
            rel="noreferrer"
            className="tactile flex flex-1 items-center justify-center gap-1 rounded-full border py-2 text-xs font-semibold"
            style={{ borderColor: "var(--color-line)", color: "var(--color-ember)", background: "var(--color-surface)" }}
          >
            <ExternalLink size={12} /> Details
          </a>
        )}
        {map && (
          <a
            href={map}
            target="_blank"
            rel="noreferrer"
            className="tactile flex flex-1 items-center justify-center gap-1 rounded-full border py-2 text-xs font-semibold"
            style={{ borderColor: "var(--color-line)", color: "var(--color-ember)", background: "var(--color-surface)" }}
          >
            <MapPin size={12} /> Map
          </a>
        )}
        <button
          onClick={() => onShare(ev)}
          className="tactile flex flex-1 items-center justify-center gap-1 rounded-full border py-2 text-xs font-semibold"
          style={{ borderColor: "var(--color-line)", color: "var(--color-ink-dim)", background: "var(--color-surface)" }}
        >
          {copied ? <Check size={12} color="var(--color-good)" /> : <Share2 size={12} />}
          {copied ? "Copied" : "Share"}
        </button>
      </div>
      <button
        onClick={(e) => onAdd(ev, e.currentTarget)}
        className="tactile mt-2 flex w-full items-center justify-center gap-1 rounded-full py-2.5 text-xs font-semibold"
        style={{ background: "var(--color-ember-soft)", color: "var(--color-ember)" }}
      >
        <Plus size={12} /> Add to calendar
      </button>
    </Card>
  );
}

/** Tech radar — Kenya in-person + online English-speaking events, this week. */
export default function Events() {
  const addTimeBlock = useAppStore((s) => s.addTimeBlock);
  const feedback = useFeedback();
  const gcal = useGoogleCalendar();
  const [mode, setMode] = useState<Mode>("all");
  const [day, setDay] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [cost, setCost] = useState<Cost>("all");
  const [topic, setTopic] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<TechEvent[]>([]);
  const [saved, setSaved] = useState<TechEvent[]>(() => loadSavedEvents());
  const [hubs] = useState<{ name: string; url: string; blurb: string }[]>(() => [...TECH_HUBS]);
  const [directSources, setDirectSources] = useState<{ id: string; label: string; url: string; ok?: boolean; count?: number }[]>([]);
  const [aiFill, setAiFill] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const week = useMemo(() => getWeekRange(), []);
  const days = useMemo(() => weekDays(week.weekStart), [week.weekStart]);

  async function load(force = false) {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetchTechEvents(force);
      setEvents(res.events);
      setDirectSources(res.sources);
      setAiFill(res.aiFill);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load events.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addToCalendar(ev: TechEvent, el: Element | null) {
    const start = ev.startTime ?? "18:00";
    const [h, m] = start.split(":").map(Number);
    const end =
      ev.endTime ?? `${String(((Number.isFinite(h) ? h : 18) + 1) % 24).padStart(2, "0")}:${String(Number.isFinite(m) ? m : 0).padStart(2, "0")}`;
    addTimeBlock(ev.date, {
      startTime: start,
      endTime: end,
      label: ev.title.slice(0, 140),
      lifeArea: "learning",
    });
    feedback.complete(el);
    // Best-effort mirror to Google when connected (auth state is on the dot).
    if (gcal.connected) {
      void gcal
        .insert(
          buildEventInsert({
            label: ev.title,
            date: ev.date,
            startTime: start,
            endTime: end,
            location: ev.venue ?? ev.city ?? undefined,
            description: ev.url ?? undefined,
          })
        )
        .catch(() => {});
    }
  }

  async function handleShare(ev: TechEvent) {
    try {
      await shareEvent(ev);
      setCopiedKey(eventKey(ev));
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      /* clipboard unavailable — nothing to show */
    }
  }

  function handleToggleSave(ev: TechEvent) {
    setSaved((prev) => toggleSavedEvent(prev, ev));
  }

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const e of [...events, ...saved]) {
      if (!e.isOnline && e.city) set.add(e.city);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [events, saved]);

  const topicsPresent = useMemo(() => {
    const set = new Set<string>();
    for (const e of [...events, ...saved]) for (const t of e.topics) set.add(t);
    return [...set].sort((a, b) => (TOPIC_LABELS[a] ?? a).localeCompare(TOPIC_LABELS[b] ?? b));
  }, [events, saved]);

  const base = mode === "saved" ? saved : events;
  const visible = base.filter((ev) => {
    if (mode === "kenya" && ev.isOnline) return false;
    if (mode === "online" && !ev.isOnline) return false;
    if (day !== "all" && ev.date !== day) return false;
    if (city !== "all" && ev.city !== city) return false;
    if (cost === "free" && ev.isFree !== true) return false;
    if (cost === "paid" && ev.isFree !== false) return false;
    if (topic !== "all" && !ev.topics.includes(topic)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${ev.title} ${ev.city ?? ""} ${ev.venue ?? ""} ${ev.source ?? ""} ${ev.topics.join(" ")}`
      .toLowerCase()
      .includes(q);
  });

  const hasFilters = mode !== "all" || day !== "all" || city !== "all" || cost !== "all" || topic !== "all" || query.trim() !== "";
  const hasDetailFilters = day !== "all" || city !== "all" || cost !== "all" || topic !== "all" || query.trim() !== "";
  function clearFilters() {
    setMode("all");
    setDay("all");
    setCity("all");
    setCost("all");
    setTopic("all");
    setQuery("");
  }

  const kenyaCount = events.filter((e) => !e.isOnline).length;
  const onlineCount = events.filter((e) => e.isOnline).length;
  const modes: { key: Mode; label: string }[] = [
    { key: "all", label: `All (${events.length})` },
    { key: "kenya", label: `Kenya (${kenyaCount})` },
    { key: "online", label: `Online (${onlineCount})` },
    { key: "saved", label: `Saved (${saved.length})` },
  ];
  const costs: { key: Cost; label: string }[] = [
    { key: "all", label: "Any cost" },
    { key: "free", label: "Free" },
    { key: "paid", label: "Paid" },
  ];

  function chip(active: boolean, onClick: () => void, label: string, key?: string) {
    return (
      <button
        key={key ?? label}
        onClick={onClick}
        className="tactile shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold"
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

  return (
    <div className="mx-auto max-w-md px-5 pb-28 pt-14">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            {week.weekStart} → {week.weekEnd}
          </p>
          <h1 className="font-display flex items-center gap-2 text-2xl font-semibold">
            <CalendarDays size={22} color="var(--color-ember)" /> Tech this week
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
            Kenya listings fetched directly · online picks labeled AI. Verify on the event page.
          </p>
        </div>
        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          aria-label="Refresh events"
          className="tactile flex h-9 w-9 shrink-0 items-center justify-center rounded-xl disabled:opacity-50"
          style={{ background: "var(--color-surface)" }}
        >
          <RefreshCw size={15} color="var(--color-ink-dim)" className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Where */}
      <div className="mt-4 flex gap-1.5 overflow-x-auto">
        {modes.map((c) => chip(mode === c.key, () => setMode(c.key), c.label, c.key))}
      </div>

      {/* Day strip */}
      <div className="mt-2.5 flex gap-1.5 overflow-x-auto">
        {chip(day === "all", () => setDay("all"), "Any day", "any-day")}
        {days.map((d) => (
          <button
            key={d.iso}
            onClick={() => setDay(day === d.iso ? "all" : d.iso)}
            aria-label={`Filter ${d.iso}`}
            className="tactile flex shrink-0 flex-col items-center rounded-xl px-2.5 py-1.5"
            style={{
              background: day === d.iso ? "var(--color-ember)" : "var(--color-surface)",
              color: day === d.iso ? "#fbf3e7" : "var(--color-ink-dim)",
              boxShadow: day === d.iso ? "var(--shadow-raised)" : "var(--shadow-flush)",
            }}
          >
            <span className="text-[10px] font-semibold">{d.dow}</span>
            <span className="text-xs font-bold">{d.num}</span>
          </button>
        ))}
      </div>

      {/* City / cost / topic */}
      <div className="mt-2.5 flex gap-2">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="Filter by city"
          className="w-1/3 rounded-xl border px-2 py-2 text-xs font-medium outline-none"
          style={selectStyle()}
        >
          <option value="all">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={cost}
          onChange={(e) => setCost(e.target.value as Cost)}
          aria-label="Filter by cost"
          className="w-1/3 rounded-xl border px-2 py-2 text-xs font-medium outline-none"
          style={selectStyle()}
        >
          {costs.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          aria-label="Filter by topic"
          className="w-1/3 rounded-xl border px-2 py-2 text-xs font-medium outline-none"
          style={selectStyle()}
        >
          <option value="all">All topics</option>
          {topicsPresent.map((t) => (
            <option key={t} value={t}>{TOPIC_LABELS[t] ?? t}</option>
          ))}
        </select>
      </div>

      <div
        className="mt-2.5 flex items-center gap-2 rounded-xl border px-3 py-2.5"
        style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}
      >
        <Search size={14} color="var(--color-ink-faint)" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, city, host, topic…"
          className="w-full bg-transparent text-sm outline-none"
          style={{ color: "var(--color-ink)" }}
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search">
            <X size={14} color="var(--color-ink-faint)" />
          </button>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--color-ink-dim)" }}>
          {!loading && !error
            ? `Showing ${visible.length} of ${base.length}${mode !== "saved" && aiFill > 0 ? ` · including ${aiFill} AI picks` : ""}`
            : " "}
        </p>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs font-semibold" style={{ color: "var(--color-ember)" }}>
            Clear all ×
          </button>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {loading &&
          [0, 1, 2].map((i) => (
            <Card key={i} className="animate-pulse py-4">
              <div className="h-3 w-24 rounded" style={{ background: "var(--color-line)" }} />
              <div className="mt-2 h-4 w-3/4 rounded" style={{ background: "var(--color-line)" }} />
            </Card>
          ))}

        {!loading && error && (
          <Card>
            <p className="text-sm" style={{ color: "var(--color-bad)" }}>{error}</p>
            <button
              onClick={() => void load(true)}
              className="mt-2 text-sm font-semibold"
              style={{ color: "var(--color-ember)" }}
            >
              Try again →
            </button>
          </Card>
        )}

        {!loading && !error && visible.length === 0 && (
          <Card>
            <p className="text-sm font-semibold">
              {mode === "saved" && !hasDetailFilters ? "No saved events yet." : "Nothing matching those filters."}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-dim)" }}>
              {mode === "saved" && !hasDetailFilters
                ? "Tap the bookmark on any event to keep it here — saved events stay even after the weekly feed refreshes."
                : "Nothing in the feed for these filters this week. Try clearing a filter — the hubs below are worth a look."}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-sm font-semibold" style={{ color: "var(--color-ember)" }}>
                Clear all filters →
              </button>
            )}
          </Card>
        )}

        {!loading && !error && visible.map((ev) => (
          <EventCard
            key={eventKey(ev)}
            ev={ev}
            copied={copiedKey === eventKey(ev)}
            saved={saved.some((s) => eventKey(s) === eventKey(ev))}
            onAdd={addToCalendar}
            onShare={handleShare}
            onToggleSave={handleToggleSave}
          />
        ))}
      </div>

      {directSources.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            Fetched from
          </p>
          <div className="flex flex-wrap gap-1.5">
            {directSources.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="tactile inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{
                  borderColor: "var(--color-line)",
                  color: s.ok === false ? "var(--color-ink-faint)" : "var(--color-ember)",
                  background: "var(--color-surface)",
                  opacity: s.ok === false ? 0.65 : 1,
                }}
              >
                {s.label}
                {typeof s.count === "number" && s.ok !== false ? ` · ${s.count}` : ""}
                {s.ok === false ? " (offline)" : ""} <ExternalLink size={11} />
              </a>
            ))}
          </div>
        </div>
      )}

      {hubs.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            Always-on hubs
          </p>
          <div className="space-y-2">
            {hubs.map((h) => (
              <a
                key={h.url}
                href={h.url}
                target="_blank"
                rel="noreferrer"
                className="tactile flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
                style={{ borderColor: "var(--color-line)", background: "var(--color-surface)" }}
              >
                <span>
                  <span className="block text-sm font-semibold">{h.name}</span>
                  <span className="block text-xs" style={{ color: "var(--color-ink-dim)" }}>{h.blurb}</span>
                </span>
                <ExternalLink size={14} color="var(--color-ink-faint)" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
