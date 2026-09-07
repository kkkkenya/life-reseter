// POST /api/tech-events — ONLINE-ONLY AI fill for the Events feed.
// Kenya in-person coverage comes from deterministic direct fetching
// (api/direct-events.ts). This endpoint compensates where deterministic
// fetching can't reach: virtual/online tech events in English, any country.
// Every item it returns is badged "AI picks" in the UI — never mixed silently
// with directly-fetched listings. Uses the same GEMINI_API_KEY as api/gemini.ts.
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

export interface Hub {
  name: string;
  url: string;
  blurb: string;
}

// Always-on hubs — stable root URLs only, shown when AI is off or as backup.
const HUBS: Hub[] = [
  { name: "GDG Nairobi", url: "https://gdg.community.dev/gdg-nairobi/", blurb: "Google dev meetups + IO Extended season" },
  { name: "iHub Nairobi", url: "https://ihub.co.ke/", blurb: "Kenya's tech hub — events + community" },
  { name: "Luma discover", url: "https://lu.ma/discover", blurb: "Search Nairobi tech this week" },
  { name: "Eventbrite Nairobi tech", url: "https://www.eventbrite.com/d/kenya--nairobi/tech-events/", blurb: "Ticketed + free tech gatherings" },
];

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

function asText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function asUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, 300);
  if (!/^https?:\/\//i.test(t)) return null;
  try {
    const u = new URL(t);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const TOPICS = new Set([
  "ai",
  "web dev",
  "mobile",
  "data",
  "cloud/devops",
  "cybersecurity",
  "startups",
  "design",
  "blockchain",
  "career",
]);

function asTopics(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const t of v) {
    if (typeof t !== "string") continue;
    const key = t.trim().toLowerCase().slice(0, 20);
    if (TOPICS.has(key) && !out.includes(key)) out.push(key);
    if (out.length >= 3) break;
  }
  return out;
}

function asIsFree(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (["free", "yes", "no cost"].includes(t)) return true;
    if (["paid", "ticketed", "no"].includes(t)) return false;
  }
  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { weekStart, weekEnd } = req.body ?? {};
  const start = asDate(weekStart);
  const end = asDate(weekEnd);
  if (!start || !end || start > end) {
    res.status(400).json({ error: "Missing week range." });
    return;
  }

  // No key or failure -> hubs only, so the section is never a dead end.
  if (!API_KEY) {
    res.status(200).json({ events: [], hubs: HUBS, source: "fallback" });
    return;
  }

  const instruction =
    `List ONLINE tech events (software, AI/data, startups, design, devops, cybersecurity, product) ` +
    `happening between ${start} and ${end} inclusive. VIRTUAL/ONLINE ONLY, run in English, any country — ` +
    `no in-person events (Kenya coverage comes from elsewhere). ` +
    `Only include events you believe genuinely exist with a real registration/info page — never invent titles, dates, or URLs. ` +
    `If unsure about a URL, omit the event rather than guessing. Prefer free community events, workshops, and livestreams. ` +
    `For each event also judge cost (isFree true/false/null + short priceText like "Free" or "$10") ` +
    `and pick up to 3 topics from exactly: AI, Web Dev, Mobile, Data, Cloud/DevOps, Cybersecurity, Startups, Design, Blockchain, Career. ` +
    `Max 10 events. Respond with JSON ONLY, no markdown: a bare array where each item matches exactly ` +
    `{"title":string,"date":"YYYY-MM-DD","startTime":"HH:MM"|null,"endTime":"HH:MM"|null,` +
    `"city":string|null,"venue":string|null,"isOnline":true,"url":string|null,"source":string|null,` +
    `"isFree":boolean|null,"priceText":string|null,"topics":string[]}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: instruction }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1500, thinkingConfig: { thinkingLevel: "low" } },
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(200).json({ events: [], hubs: HUBS, source: "fallback" });
      return;
    }
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    if (!text.trim()) {
      res.status(200).json({ events: [], hubs: HUBS, source: "fallback" });
      return;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(stripFences(text));
    } catch {
      res.status(200).json({ events: [], hubs: HUBS, source: "fallback" });
      return;
    }
    if (!Array.isArray(raw)) {
      res.status(200).json({ events: [], hubs: HUBS, source: "fallback" });
      return;
    }

    const seen = new Set<string>();
    const events = [];
    for (const item of raw.slice(0, 30)) {
      if (typeof item !== "object" || item === null) continue;
      const r = item as Record<string, unknown>;
      const title = asText(r.title, 110);
      const date = asDate(r.date);
      if (!title || !date || date < start || date > end) continue;
      const key = `${title.toLowerCase()}|${date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({
        title,
        date,
        startTime: asTime(r.startTime),
        endTime: asTime(r.endTime),
        city: asText(r.city, 60),
        venue: asText(r.venue, 120),
        isOnline: true, // this endpoint only serves the online fill
        url: asUrl(r.url),
        source: asText(r.source, 60),
        origin: "ai",
        isFree: asIsFree(r.isFree),
        priceText: asText(r.priceText, 40),
        topics: asTopics(r.topics),
      });
    }
    events.sort((a, b) => `${a.date} ${a.startTime ?? ""}`.localeCompare(`${b.date} ${b.endTime ?? ""}`));

    res.status(200).json({ events, hubs: HUBS, source: "gemini" });
  } catch {
    res.status(200).json({ events: [], hubs: HUBS, source: "fallback" });
  }
}
