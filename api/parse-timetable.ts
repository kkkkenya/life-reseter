// POST /api/parse-timetable — class timetable photo -> session list.
// Same server-side key rules as api/parse-event.ts. The image is read once
// and never stored. Returns every class row found (client reviews all).
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const MAX_BASE64_CHARS = 7_000_000;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function stripFences(s: string): string {
  const t = s.trim();
  if (!t.startsWith("```")) return t;
  return t.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```\s*$/, "").trim();
}

function asText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function asTime(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null;
}

function asWeekday(v: unknown): number | null {
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 6) return v;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const i = days.findIndex((d) => d.startsWith(t.slice(0, 3)) && t.length >= 3);
    if (i >= 0) return i;
  }
  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!API_KEY) {
    res.status(501).json({ error: "Gemini isn't configured on the server (GEMINI_API_KEY missing)." });
    return;
  }
  const { imageBase64, mimeType } = req.body ?? {};
  if (typeof imageBase64 !== "string" || imageBase64.length < 1000) {
    res.status(400).json({ error: "Missing image. Upload a photo of the timetable." });
    return;
  }
  if (imageBase64.length > MAX_BASE64_CHARS) {
    res.status(413).json({ error: "Image is too large. Try a smaller photo (under ~5MB)." });
    return;
  }
  if (typeof mimeType !== "string" || !ALLOWED_MIME.has(mimeType)) {
    res.status(400).json({ error: "Unsupported image type. Use JPEG, PNG, or WebP." });
    return;
  }

  const instruction =
    `You read a school class timetable photo. Extract EVERY class session as one item. ` +
    `Times: 24-hour "HH:MM" (convert "8:00 AM" -> "08:00", "2:30 PM" -> "14:30"). ` +
    `weekday: 0=Sunday..6=Saturday — resolve day names ("Mon", "Monday" -> 1). ` +
    `If only a start time is visible, set endTime one hour later. If a field is genuinely unreadable, use null — never invent. ` +
    `Respond with JSON ONLY, no markdown: a bare array of at most 30 items matching exactly ` +
    `{"course":string,"weekday":0-6,"startTime":"HH:MM"|null,"endTime":"HH:MM"|null,"venue":string|null,"lecturer":string|null}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: instruction }, { inline_data: { mime_type: mimeType, data: imageBase64 } }],
          },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2000, thinkingConfig: { thinkingLevel: "low" } },
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data?.error?.message || "Gemini API error" });
      return;
    }
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    if (!text.trim()) {
      res.status(502).json({ error: "Gemini returned an empty response." });
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(stripFences(text));
    } catch {
      res.status(502).json({ error: "Couldn't read the timetable. Try a clearer photo." });
      return;
    }
    if (!Array.isArray(raw)) {
      res.status(502).json({ error: "Couldn't read the timetable. Try a clearer photo." });
      return;
    }
    const sessions = [];
    for (const item of raw.slice(0, 30)) {
      if (typeof item !== "object" || item === null) continue;
      const r = item as Record<string, unknown>;
      const course = asText(r.course, 80);
      const weekday = asWeekday(r.weekday);
      const startTime = asTime(r.startTime);
      if (!course || weekday === null || !startTime) continue;
      const endTime = asTime(r.endTime) ?? startTime;
      sessions.push({
        course,
        weekday,
        startTime,
        endTime: endTime > startTime ? endTime : startTime,
        venue: asText(r.venue, 80),
        lecturer: asText(r.lecturer, 80),
      });
    }
    res.status(200).json({ sessions });
  } catch {
    res.status(502).json({ error: "Failed to reach Gemini" });
  }
}
