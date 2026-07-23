import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui";
import type { DayRecord } from "@/types";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function completionColor(rec: DayRecord | undefined): string {
  if (!rec) return "var(--color-surface-raised)";
  const statuses = Object.values(rec.tasks);
  if (statuses.length === 0) return "var(--color-surface-raised)";
  const done = statuses.filter((s) => s === "done").length;
  const pct = done / statuses.length;
  if (pct >= 1) return "var(--color-good)";
  if (pct >= 0.5) return "var(--color-ember)";
  if (pct > 0) return "var(--color-ember-dim)";
  return "var(--color-bad)";
}

export function CalendarGrid({
  days,
  viewDate,
  onSelectDate,
}: {
  days: Record<number, DayRecord>;
  viewDate: string; // ISO date of the currently-viewed day
  onSelectDate: (isoDate: string) => void;
}) {
  const byDate = useMemo(() => {
    const map = new Map<string, DayRecord>();
    Object.values(days).forEach((d) => map.set(d.date, d));
    return map;
  }, [days]);

  const [cursor, setCursor] = useState(() => {
    const d = new Date(viewDate + "T00:00:00");
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = new Date().toISOString().slice(0, 10);

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(iso);
  }

  // Week strip: the 7 days surrounding viewDate's week
  const viewD = new Date(viewDate + "T00:00:00");
  const weekStart = new Date(viewD);
  weekStart.setDate(viewD.getDate() - viewD.getDay());
  const weekDates: string[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div>
      <Card>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-ink-dim)" }}>
          This week
        </p>
        <div className="flex justify-between">
          {weekDates.map((iso) => {
            const rec = byDate.get(iso);
            const isSelected = iso === viewDate;
            const isToday = iso === todayIso;
            const dayNum = Number(iso.slice(8, 10));
            return (
              <button
                key={iso}
                onClick={() => onSelectDate(iso)}
                className="flex flex-col items-center gap-1 rounded-xl px-1.5 py-2"
                style={{ background: isSelected ? "var(--color-ember-soft)" : "transparent" }}
              >
                <span className="text-[10px]" style={{ color: "var(--color-ink-faint)" }}>
                  {WEEKDAY_LABELS[new Date(iso + "T00:00:00").getDay()]}
                </span>
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                  style={{
                    background: completionColor(rec),
                    color: rec ? "#fbf3e7" : "var(--color-ink-dim)",
                    border: isToday ? "2px solid var(--color-ember)" : "none",
                  }}
                >
                  {dayNum}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mt-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--color-surface-raised)" }}>
            <ChevronLeft size={14} />
          </button>
          <p className="text-sm font-semibold">{MONTH_LABELS[month]} {year}</p>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--color-surface-raised)" }}>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1.5">
          {WEEKDAY_LABELS.map((l, i) => (
            <p key={i} className="text-center text-[10px]" style={{ color: "var(--color-ink-faint)" }}>{l}</p>
          ))}
          {cells.map((iso, i) => {
            if (!iso) return <div key={i} />;
            const rec = byDate.get(iso);
            const isSelected = iso === viewDate;
            const isToday = iso === todayIso;
            const dayNum = Number(iso.slice(8, 10));
            return (
              <button
                key={iso}
                onClick={() => onSelectDate(iso)}
                className="flex aspect-square items-center justify-center rounded-lg text-xs font-medium"
                style={{
                  background: completionColor(rec),
                  color: rec ? "#fbf3e7" : "var(--color-ink-dim)",
                  outline: isSelected ? "2px solid var(--color-ink)" : isToday ? "2px solid var(--color-ember)" : "none",
                  outlineOffset: "-2px",
                }}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-3 text-[10px]" style={{ color: "var(--color-ink-faint)" }}>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--color-good)" }} /> All done</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--color-ember)" }} /> Partial</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "var(--color-bad)" }} /> None done</span>
        </div>
      </Card>
    </div>
  );
}
