import type { HeatmapDay } from "@/lib/habitAnalytics";

const STATUS_COLOR: Record<HeatmapDay["status"], string> = {
  done: "var(--color-good)",
  skipped: "var(--color-bad)",
  pending: "var(--color-ember-dim)",
  none: "var(--color-surface-raised)",
};

export function HeatmapCalendar({ series }: { series: HeatmapDay[] }) {
  // group into weeks (columns), Sunday-start
  const weeks: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];

  series.forEach((day, i) => {
    const weekday = new Date(day.date + "T00:00:00").getDay();
    if (i === 0) {
      for (let pad = 0; pad < weekday; pad++) currentWeek.push({ date: "", status: "none" });
    }
    currentWeek.push(day);
    if (weekday === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push({ date: "", status: "none" });
    weeks.push(currentWeek);
  }

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day, di) => (
            <div
              key={di}
              title={day.date}
              className="h-3 w-3 rounded-sm"
              style={{ background: STATUS_COLOR[day.status] }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
