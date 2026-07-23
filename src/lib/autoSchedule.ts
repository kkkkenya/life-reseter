import type { LifeAreaKey, TimeBlock, TimeOfDay } from "@/types";

const DAY_START_MIN = 6 * 60; // 06:00
const DAY_END_MIN = 22 * 60; // 22:00
const DEFAULT_DURATION_MIN = 30;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const TIME_OF_DAY_WINDOWS: Record<TimeOfDay, [number, number]> = {
  morning: [6 * 60, 12 * 60],
  afternoon: [12 * 60, 17 * 60],
  evening: [17 * 60, 22 * 60],
  anytime: [DAY_START_MIN, DAY_END_MIN],
};

export interface SchedulableTask {
  uid: string;
  label: string;
  lifeArea: LifeAreaKey;
  timeOfDay?: TimeOfDay;
}

export interface ScheduleSuggestion {
  taskUid: string;
  label: string;
  lifeArea: LifeAreaKey;
  startTime: string;
  endTime: string;
}

/**
 * Gap-filling auto-scheduler (Motion/Reclaim-style "auto time-block my day", without
 * the AI round trip): finds free slots given the blocks already on the calendar and
 * drops each pending task into the closest open slot inside its preferred
 * time-of-day window, falling back to any open slot if that window is full.
 * Deterministic and fully offline — no network dependency, so it works even
 * without a Gemini key configured.
 */
export function suggestAutoSchedule(
  pendingTasks: SchedulableTask[],
  existingBlocks: TimeBlock[],
  durationMin = DEFAULT_DURATION_MIN
): ScheduleSuggestion[] {
  const occupied = existingBlocks
    .map((b) => [toMinutes(b.startTime), toMinutes(b.endTime)] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  const suggestions: ScheduleSuggestion[] = [];

  const overlaps = (start: number, end: number) => occupied.some(([s, e]) => start < e && end > s);

  const findSlot = (windowStart: number, windowEnd: number): number | null => {
    for (let t = windowStart; t + durationMin <= windowEnd; t += 15) {
      if (!overlaps(t, t + durationMin)) return t;
    }
    return null;
  };

  for (const task of pendingTasks) {
    const window = TIME_OF_DAY_WINDOWS[task.timeOfDay ?? "anytime"];
    let slot = findSlot(window[0], window[1]);
    if (slot === null && task.timeOfDay && task.timeOfDay !== "anytime") {
      // preferred window is full — fall back to anywhere in the day
      slot = findSlot(DAY_START_MIN, DAY_END_MIN);
    }
    if (slot === null) continue; // day is genuinely full — don't force an overlap

    const start = slot;
    const end = slot + durationMin;
    occupied.push([start, end]);
    occupied.sort((a, b) => a[0] - b[0]);

    suggestions.push({ taskUid: task.uid, label: task.label, lifeArea: task.lifeArea, startTime: toHHMM(start), endTime: toHHMM(end) });
  }

  return suggestions;
}
