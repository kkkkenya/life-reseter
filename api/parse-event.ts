// POST /api/parse-event — screenshot/poster -> calendar event JSON.
// Runs on Vercel's server, never in the browser. GEMINI_API_KEY (no VITE_
// prefix) is only readable here via process.env, same rule as api/gemini.ts.
// The uploaded image is forwarded to Gemini for one-shot extraction and is
// never stored — see README "Event scanning" section.
import { clientIp, rateLimit, sameOrigin } from "../src/lib/apiGuard";

// Small validators shared with the Gemini JSON reply (inlined — the events
// pipeline they used to live in was removed with the discovery feed).
function stripFences(s: string): string {
  const t = s.trim();
  if (!t.startsWith("```")) return t;
  return t.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```\s*$/, "").trim();
}
function asDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}
function asTime(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null;
}

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const MAX_BASE64_CHARS = 7_000_000; // ~5MB of image bytes
const MAX_BODY_BYTES = 8_000_000; // base64 + JSON envelope — reject before buffering
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SCANS_PER_HOUR = 12; // per IP — poster scans are an occasional user action

function asTrimmed(v: unknown, max = 140): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

const LIFE_AREAS = new Set([
  "health",
  "learning",
  "productivity",
  "business",
  "finances",
  "relationships",
  "mindset",
]);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!API_KEY) {
    res.status(501).json({ error: "Gemini isn't configured on the server (GEMINI_API_KEY missing)." });
    return;
  }
  // Reject oversized uploads from the declared Content-Length before the
  // body is buffered at all; the per-field check below still applies.
  const contentLength = Number(req.headers?.["content-length"] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    res.status(413).json({ error: "Image is too large. Try a smaller screenshot (under ~5MB)." });
    return;
  }
  if (!rateLimit(`scan:${clientIp(req)}`, MAX_SCANS_PER_HOUR, 60 * 60 * 1000)) {
    res.status(429).json({ error: "Too many scans — try again in a bit." });
    return;
  }

  const { imageBase64, mimeType, todayIso } = req.body ?? {};
  if (typeof imageBase64 !== "string" || imageBase64.length < 1000) {
    res.status(400).json({ error: "Missing image. Upload a screenshot or photo of the poster." });
    return;
  }
  if (imageBase64.length > MAX_BASE64_CHARS) {
    res.status(413).json({ error: "Image is too large. Try a smaller screenshot (under ~5MB)." });
    return;
  }
  if (typeof mimeType !== "string" || !ALLOWED_MIME.has(mimeType)) {
    res.status(400).json({ error: "Unsupported image type. Use JPEG, PNG, or WebP." });
    return;
  }
  const today = asDate(todayIso) ?? new Date().toISOString().slice(0, 10);

  const instruction =
    `You extract ONE calendar event from a poster/screenshot/banner image. ` +
    `Today is ${today}. ` +
    `Resolve relative dates ("Friday", "tomorrow", "Dec 12") against today; if the date already passed this year, prefer the next upcoming occurrence. ` +
    `Times: 24-hour "HH:MM". If only a start time is visible, set endTime to one hour after start. ` +
    `If a field is not visible, use null — never invent a time, date, or venue. ` +
    `lifeArea must be one of: health, learning, productivity, business, finances, relationships, mindset (best guess by event type). ` +
    `confidence: 0-1 for the extraction overall. ` +
    `clarifyingQuestions: short human questions ONLY for fields that are null/uncertain (e.g. "What time does it start?"). Empty array if everything is clear. ` +
    `Respond with JSON ONLY, no markdown, matching exactly: ` +
    `{"title":string|null,"date":"YYYY-MM-DD"|null,"startTime":"HH:MM"|null,"endTime":"HH:MM"|null,` +
    `"location":string|null,"notes":string|null,"lifeArea":string,"confidence":number,"clarifyingQuestions":string[]}`;

  try {
    // Key goes in the x-goog-api-key header, never the URL — keys in query
    // strings leak into logs and intermediary proxies.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: instruction }, { inline_data: { mime_type: mimeType, data: imageBase64 } }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
          thinkingConfig: { thinkingLevel: "low" },
        },
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
      const blockReason = data?.promptFeedback?.blockReason;
      res.status(502).json({ error: blockReason ? `Gemini blocked the request: ${blockReason}` : "Gemini returned an empty response." });
      return;
    }

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(stripFences(text));
    } catch {
      res.status(502).json({ error: "Couldn't read the poster. Try a clearer screenshot." });
      return;
    }

    const lifeAreaRaw = asTrimmed(raw.lifeArea, 20) ?? "productivity";
    const event = {
      title: asTrimmed(raw.title, 90),
      date: asDate(raw.date),
      startTime: asTime(raw.startTime),
      endTime: asTime(raw.endTime),
      location: asTrimmed(raw.location, 120),
      notes: asTrimmed(raw.notes, 280),
      lifeArea: LIFE_AREAS.has(lifeAreaRaw) ? lifeAreaRaw : "productivity",
      confidence: typeof raw.confidence === "number" ? Math.min(1, Math.max(0, raw.confidence)) : 0.5,
      clarifyingQuestions: Array.isArray(raw.clarifyingQuestions)
        ? raw.clarifyingQuestions.filter((q): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 4)
        : [],
    };

    res.status(200).json({ event });
  } catch {
    res.status(502).json({ error: "Failed to reach Gemini" });
  }
}
