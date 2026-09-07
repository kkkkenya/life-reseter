import type { LifeAreaKey } from "@/types";

export interface ParsedEvent {
  title: string | null;
  date: string | null; // YYYY-MM-DD
  startTime: string | null; // HH:MM
  endTime: string | null; // HH:MM
  location: string | null;
  notes: string | null;
  lifeArea: LifeAreaKey;
  confidence: number;
  clarifyingQuestions: string[];
}

const MAX_DIM = 1568;

export function isValidIsoDate(v: string): boolean {
  // Pure calendar check — never round-trips through Date/UTC, so it holds in
  // every timezone (new Date("2026-09-17T00:00:00").toISOString() is the 16th
  // east of UTC, which broke naive validation for Kenya users).
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  return d <= new Date(Number(m[1]), mo, 0).getDate();
}

export function isValidTime(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** Downscale uploads client-side so poster photos stay fast + cheap to parse. */
export function fileToEventImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        const base64 = dataUrl.split(",")[1] ?? "";
        if (!base64) throw new Error("Couldn't read that image");
        resolve({ base64, mimeType: "image/jpeg" });
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e instanceof Error ? e : new Error("Couldn't read that image"));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a readable image. Try a PNG or JPEG screenshot."));
    };
    img.src = url;
  });
}

export async function parseEventFromImage(file: File, todayIso: string): Promise<ParsedEvent> {
  const { base64, mimeType } = await fileToEventImage(file);
  const res = await fetch("/api/parse-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mimeType, todayIso }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Scan failed (${res.status})`);
  return data.event as ParsedEvent;
}

/** Best-effort: pull "3pm", "15:30", "noon" out of a spoken answer. */
export function spokenTimeToHHMM(transcript: string): string | null {
  const t = transcript.toLowerCase().trim();
  if (/\bnoon\b/.test(t)) return "12:00";
  if (/\bmidnight\b/.test(t)) return "00:00";
  const m = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|o\s*'?clock)?/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ap = m[3]?.replace(/\s/g, "");
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  // No am/pm and ambiguous 1-11: assume upcoming daytime/evening hours are meant as-is;
  // caller still shows it for confirmation, never silently commits.
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Best-effort: "today" / "tomorrow" / weekday name -> ISO date. Local-calendar
 *  math only (no toISOString), so results are exact in every timezone. */
export function spokenDateToISO(transcript: string, todayIso: string): string | null {
  const t = transcript.toLowerCase();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayIso);
  if (!m) return null;
  const base = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(base.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const at = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (/\btoday\b/.test(t)) return at(base);
  if (/\btomorrow\b/.test(t)) {
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return at(d);
  }
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < days.length; i++) {
    if (t.includes(days[i])) {
      const d = new Date(base);
      let delta = (i - d.getDay() + 7) % 7;
      if (delta === 0) delta = 7; // "Friday" when today is Friday = next Friday
      d.setDate(d.getDate() + delta);
      return at(d);
    }
  }
  const iso = t.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso && isValidIsoDate(iso[1])) return iso[1];
  return null;
}
