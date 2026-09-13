import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Plus } from "lucide-react";
import { Card, PrimaryButton } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { classesOn, weekdayOfISO } from "@/lib/school";
import { eventCoversDay, eventKey, loadSavedEvents, type TechEvent } from "@/lib/techEvents";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import type { GCalEvent } from "@/lib/googleCalendar";
import {
  completionTint,
  gcalDateOf,
  gcalTimeOf,
  mergeCalendarDay,
  monthGrid,
  monthRange,
  GRID_WEEKDAYS,
  type CalendarItem,
  type CalendarItemSource,
} from "@/lib/calendarMonth";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SOURCE_META: Record<CalendarItemSource, { label: string; color: string }> = {
  block: { label: "Block", color: "var(--color-ember)" },
  class: { label: "Class", color: "#5cb8e8" },
  deadline: { label: "Deadline", color: "var(--color-bad)" },
  event: { label: "Event", color: "var(--color-good)" },
  gcal: { label: "Google", color: "#9e5ce8" },
};

/**
 * Calendar — the whole picture on one grid. Everything the app knows about a
 * day (blocks, classes, deadlines, tech events, Google Calendar when
 * connected) merges into a month view with a per-day panel. Works fully
 * offline; Google is an optional overlay.
 */
export default function CalendarPage() {
  const profile = useAppStore((s) => s.profile);
  const timeBlocks = useAppStore((s) => s.profile.timeBlocks);
  const classes = useAppStore((s) => s.profile.classes);
  const deadlines = useAppStore((s) => s.profile.deadlines);
  const addTimeBlock = useAppStore((s) => s.addTimeBlock);
  const toggleTimeBlockDone = useAppStore((s) => s.toggleTimeBlockDone);
  const toggleDeadlineDone = useAppStore((s) => s.toggleDeadlineDone);

  const gcal = useGoogleCalendar();

  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedIso, setSelectedIso] = useState(() => new Date().toISOString().slice(0, 10));
  const [saved] = useState<TechEvent[]>(() => loadSavedEvents());
  const [monthEvents, setMonthEvents] = useState<TechEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [gEvents, setGEvents] = useState<GCalEvent[]>([]);
  const [blockTime, setBlockTime] = useState("18:00");
  const [blockLabel, setBlockLabel] = useState("");

  const range = useMemo(() => monthRange(cursor.year, cursor.month), [cursor]);
  const rangeKey = `${range.startIso}|${range.endIso}`;

  // Tech events for the visible month: deterministic sources (edge-cached
  // GET for the month range) plus this device's saved events.
  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    fetch(`/api/direct-events?weekStart=${range.startIso}&weekEnd=${range.endIso}`)
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data: { events?: TechEvent[] }) => {
        if (!cancelled) setMonthEvents(Array.isArray(data.events) ? data.events : []);
      })
      .catch(() => {
        if (!cancelled) setMonthEvents([]);
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rangeKey, range.startIso, range.endIso]);

  // Google overlay: only when connected; a lapsed token just hides the layer.
  useEffect(() => {
    if (!gcal.connected) {
      setGEvents([]);
      return;
    }
    let cancelled = false;
    gcal
      .list(range.startIso, range.endIso)
      .then((evs) => {
        if (!cancelled) setGEvents(evs);
      })
      .catch(() => {
        if (!cancelled) setGEvents([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gcal.connected, rangeKey]);

  const allEvents = useMemo(() => [...monthEvents, ...saved], [monthEvents, saved]);

  // Which sources touch each visible day — drives the grid dots.
  const sourcesByDay = useMemo(() => {
    const map = new Map<string, Set<CalendarItemSource>>();
    const touch = (iso: string, s: CalendarItemSource) => {
      if (!map.has(iso)) map.set(iso, new Set());
      map.get(iso)!.add(s);
    };
    Object.entries(timeBlocks).forEach(([iso, blocks]) => {
      if (blocks.length > 0) touch(iso, "block");
    });
    const grid = monthGrid(cursor.year, cursor.month).cells;
    for (const iso of grid) {
      if (!iso) continue;
      if (classesOn(classes, weekdayOfISO(iso)).length > 0) touch(iso, "class");
      if (deadlines.some((d) => d.dueDate === iso && !d.done)) touch(iso, "deadline");
    }
    for (const e of allEvents) {
      const end = e.endDate && e.endDate > e.date ? e.endDate : e.date;
      for (const iso of grid) {
        if (iso && iso >= e.date && iso <= end) touch(iso, "event");
      }
    }
    for (const g of gEvents) {
      const iso = gcalDateOf(g);
      if (iso) touch(iso, "gcal");
    }
    return map;
  }, [timeBlocks, classes, deadlines, allEvents, gEvents, cursor]);

  const { cells } = monthGrid(cursor.year, cursor.month);
  const todayIso = new Date().toISOString().slice(0, 10);

  // Day record tint: the profile's task completion for that calendar date.
  const dayByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    Object.values(profile.days).forEach((rec) => map.set(rec.date, Object.values(rec.tasks)));
    return map;
  }, [profile.days]);

  const selectedItems = useMemo<CalendarItem[]>(() => {
    const weekday = weekdayOfISO(selectedIso);
    const items: CalendarItem[] = [];
    for (const b of timeBlocks[selectedIso] ?? []) {
      items.push({
        key: b.id,
        source: "block",
        time: b.startTime,
        endTime: b.endTime,
        label: b.label,
        done: b.done,
        toggleable: true,
      });
    }
    for (const c of classesOn(classes, weekday)) {
      items.push({
        key: c.id,
        source: "class",
        time: c.startTime,
        endTime: c.endTime ?? null,
        label: c.course,
        detail: c.venue ?? null,
      });
    }
    for (const d of deadlines) {
      if (d.dueDate !== selectedIso || d.done) continue;
      items.push({
        key: d.id,
        source: "deadline",
        time: d.dueTime ?? null,
        label: d.title,
        done: false,
        toggleable: true,
      });
    }
    for (const e of allEvents) {
      if (!eventCoversDay(e, selectedIso)) continue;
      items.push({
        key: eventKey(e),
        source: "event",
        time: e.startTime,
        endTime: e.endTime,
        label: e.title,
        detail: [e.venue, e.city].filter(Boolean).join(" · ") || (e.isOnline ? "Online" : null),
        href: e.url,
      });
    }
    for (const g of gEvents) {
      if (gcalDateOf(g) !== selectedIso) continue;
      items.push({
        key: g.id ?? `${gcalDateOf(g)}-${g.summary ?? ""}`,
        source: "gcal",
        time: gcalTimeOf(g),
        label: g.summary ?? "(untitled)",
        detail: "Google Calendar",
      });
    }
    return mergeCalendarDay(items);
  }, [selectedIso, timeBlocks, classes, deadlines, allEvents, gEvents]);

  function addBlock() {
    if (!blockLabel.trim()) return;
    const [h, m] = blockTime.split(":").map(Number);
    const endH = (Number.isFinite(h) ? h : 18) + 1;
    addTimeBlock(selectedIso, {
      startTime: blockTime,
      endTime: `${String(endH % 24).padStart(2, "0")}:${String(Number.isFinite(m) ? m : 0).padStart(2, "0")}`,
      label: blockLabel.trim().slice(0, 140),
      lifeArea: "productivity",
    });
    setBlockLabel("");
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-28 pt-14 lg:max-w-[1200px] lg:px-10 lg:pb-16">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
            Everything, on one grid
          </p>
          <h1 className="font-display flex items-center gap-2 text-2xl font-semibold">
            <CalendarDays size={22} color="var(--color-ember)" /> Calendar
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {gcal.connected && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
              style={{ background: "var(--color-ember-soft)", color: "#9e5ce8" }}
            >
              Google connected
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Month grid */}
        <main>
          <Card>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }))}
                aria-label="Previous month"
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: "var(--color-surface-raised)" }}
              >
                <ChevronLeft size={14} />
              </button>
              <p className="text-sm font-semibold">
                {MONTH_LABELS[cursor.month]} {cursor.year}
              </p>
              <button
                onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }))}
                aria-label="Next month"
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: "var(--color-surface-raised)" }}
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {GRID_WEEKDAYS.map((l, i) => (
                <p key={i} className="text-center text-[10px] font-semibold" style={{ color: "var(--color-ink-faint)" }}>
                  {l}
                </p>
              ))}
              {cells.map((iso, i) => {
                if (!iso) return <div key={i} />;
                const sources = sourcesByDay.get(iso) ?? new Set<CalendarItemSource>();
                const isToday = iso === todayIso;
                const isSelected = iso === selectedIso;
                const tint = completionTint(dayByDate.get(iso) ?? []);
                return (
                  <button
                    key={iso}
                    onClick={() => setSelectedIso(iso)}
                    className="relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium"
                    style={{
                      background: tint,
                      color: dayByDate.has(iso) ? "#fbf3e7" : "var(--color-ink-dim)",
                      outline: isSelected ? "2px solid var(--color-ink)" : isToday ? "2px solid var(--color-ember)" : "none",
                      outlineOffset: "-2px",
                    }}
                    aria-label={`${iso} — ${sources.size} items`}
                  >
                    {Number(iso.slice(8, 10))}
                    <span className="flex h-1.5 items-center gap-0.5" aria-hidden="true">
                      {(["block", "class", "deadline", "event", "gcal"] as CalendarItemSource[]).map((s) =>
                        sources.has(s) ? (
                          <span key={s} className="h-1.5 w-1.5 rounded-full" style={{ background: SOURCE_META[s].color }} />
                        ) : null
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-[10px]" style={{ color: "var(--color-ink-faint)" }}>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--color-good)" }} /> all tasks done</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--color-bad)" }} /> none done</span>
              {(Object.keys(SOURCE_META) as CalendarItemSource[]).map((s) => (
                <span key={s} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: SOURCE_META[s].color }} /> {SOURCE_META[s].label.toLowerCase()}
                </span>
              ))}
            </div>
          </Card>
        </main>

        {/* Selected-day panel */}
        <aside className="lg:sticky lg:top-16 lg:self-start">
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{selectedIso}</p>
              {selectedIso !== todayIso && (
                <button
                  onClick={() => {
                    setSelectedIso(todayIso);
                    setCursor({ year: now.getFullYear(), month: now.getMonth() });
                  }}
                  className="text-xs font-semibold"
                  style={{ color: "var(--color-ember)" }}
                >
                  Today
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {selectedItems.length === 0 && (
                <p className="py-3 text-sm" style={{ color: "var(--color-ink-dim)" }}>
                  Nothing on this day. Add a block below, or it's a genuinely free day.
                </p>
              )}
              {selectedItems.map((item) => {
                const meta = SOURCE_META[item.source];
                const content = (
                  <>
                    <span
                      className="w-14 shrink-0 font-mono text-[11px] font-semibold"
                      style={{ color: meta.color }}
                    >
                      {item.time ?? "all-day"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-sm"
                        style={{ textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.6 : 1 }}
                      >
                        {item.label}
                        {item.source === "deadline" ? " (due)" : ""}
                      </span>
                      {item.detail && (
                        <span className="block truncate text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                          {item.detail}
                        </span>
                      )}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide"
                      style={{ background: "var(--color-surface-raised)", color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    {item.href && <ExternalLink size={12} color="var(--color-ink-faint)" />}
                  </>
                );
                const cls =
                  "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left";
                const style = { background: "var(--color-surface-raised)" };
                if (item.toggleable && item.source === "block") {
                  return (
                    <button
                      key={item.key}
                      className={cls}
                      style={style}
                      onClick={() => toggleTimeBlockDone(selectedIso, item.key)}
                    >
                      {content}
                    </button>
                  );
                }
                if (item.toggleable && item.source === "deadline") {
                  return (
                    <button
                      key={item.key}
                      className={cls}
                      style={style}
                      onClick={() => toggleDeadlineDone(item.key)}
                    >
                      {content}
                    </button>
                  );
                }
                if (item.href) {
                  return (
                    <a key={item.key} href={item.href} target="_blank" rel="noreferrer" className={cls} style={style}>
                      {content}
                    </a>
                  );
                }
                return (
                  <div key={item.key} className={cls} style={style}>
                    {content}
                  </div>
                );
              })}
            </div>

            {/* One write the calendar owns: dropping a block on the selected day */}
            <div className="mt-4 space-y-2 border-t pt-3" style={{ borderColor: "var(--color-line)" }}>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={blockTime}
                  onChange={(e) => setBlockTime(e.target.value)}
                  aria-label="Block start time"
                  className="w-24 rounded-xl border px-2 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
                />
                <input
                  value={blockLabel}
                  onChange={(e) => setBlockLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && blockLabel.trim()) addBlock();
                  }}
                  placeholder={`Block time on ${selectedIso}…`}
                  className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--color-line)", background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
                />
              </div>
              <PrimaryButton disabled={!blockLabel.trim()} onClick={addBlock}>
                <span className="flex items-center justify-center gap-1.5">
                  <Plus size={14} /> Add block
                </span>
              </PrimaryButton>
            </div>

            {eventsLoading && (
              <p className="mt-3 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                Refreshing tech events for this month…
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
