/**
 * eventPipeline.ts — fetch orchestration shared by the API routes and tests.
 *
 * Consumes the single source registry (eventSources.ts) and the pure parsers
 * (eventParsers.ts). Performs only network I/O — no Node/process access — so it
 * runs identically in a Vercel function and under vitest with a mocked fetch.
 */

import { fetchSources, type EventSource } from "./eventSources";
import {
  absUrl,
  inWeekISO,
  MONTHS,
  overlapsWeek,
  parseDevpostEvents,
  parseIcsEvents,
  parseJsonLdEvents,
  parseLumaEvents,
  parsePrice,
  parseVabuFanbase,
  parseVabuListing,
  stripTags,
  to24h,
  type ParsedEvent,
  type VabuCard,
} from "./eventParsers";

export type { ParsedEvent } from "./eventParsers";

export interface SourceStatus {
  id: string;
  label: string;
  url: string;
  ok: boolean;
  count: number;
}

export interface DirectResult {
  events: ParsedEvent[];
  sources: SourceStatus[];
}

export interface AiResult {
  events: ParsedEvent[];
  hubs: Hub[];
  source: "gemini" | "fallback";
}

export interface Hub {
  name: string;
  url: string;
  blurb: string;
}

/** Always-on hubs — stable root URLs, shown whenever AI is off or as backup. */
export const FALLBACK_HUBS: Hub[] = [
  { name: "GDG Nairobi", url: "https://gdg.community.dev/gdg-nairobi/", blurb: "Google dev meetups + I/O Extended season" },
  { name: "Luma Nairobi", url: "https://lu.ma/nairobi", blurb: "Search Nairobi tech this week" },
  { name: "iHub Nairobi", url: "https://ihub.co.ke/", blurb: "Kenya's tech hub — events + community" },
  { name: "Eventbrite Nairobi tech", url: "https://www.eventbrite.com/d/kenya--nairobi/tech-events/", blurb: "Ticketed + free tech gatherings" },
];

const UA = "Mozilla/5.0 (compatible; life-reset-events/1.0; +https://github.com/kkkkenya/life-reseter)";

async function getText(url: string, timeoutMs: number): Promise<{ ok: boolean; body: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA }, redirect: "follow" });
    if (!res.ok) return { ok: false, body: "" };
    return { ok: true, body: await res.text() };
  } catch {
    return { ok: false, body: "" };
  } finally {
    clearTimeout(timer);
  }
}

function eventKeyOf(e: Pick<ParsedEvent, "title" | "date">): string {
  return `${e.title.toLowerCase()}|${e.date}`;
}

function isCardInWeek(c: VabuCard, weekStart: string, weekEnd: string): boolean {
  if (!c.classes.includes("tech") && !c.forceTech) return false;
  if (c.fixedISO) return c.fixedISO >= weekStart && c.fixedISO <= weekEnd;
  const m = c.datePart.match(/(\d{1,2})\s+(\w{3})/);
  if (!m) return false;
  const mon = MONTHS[m[2].toLowerCase().slice(0, 3)];
  if (!mon) return false;
  return inWeekISO(Number(m[1]), mon, weekStart, weekEnd) !== null;
}

/** Fetch a vabu detail page and turn one card into a fully-populated event. */
async function fetchVabuDetail(card: VabuCard, fallbackYear: number): Promise<ParsedEvent | null> {
  const { ok, body: html } = await getText(card.url, 8000);
  if (!ok) return null;
  try {
    const eventDate = html.match(/const eventDate = "(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):\d{2}"/);
    const dateRange = stripTags(html.match(/<h4>Date and Time<\/h4>\s*<p>([\s\S]*?)<\/p>/)?.[1] ?? "");
    const location = stripTags(html.match(/<h4>Location<\/h4>\s*<p class="mb-0">([\s\S]*?)<\/p>/)?.[1] ?? "") || null;
    const ogImage = html.match(/<meta property='og:image' content='([^']+)'/)?.[1] ?? null;
    const ticketPrices = [...html.matchAll(/<span class="ticket-price">([^<]+)<\/span>/g)].map((m) => m[1].trim());

    const times = [...dateRange.matchAll(/(\w{3}), (\w{3}) (\d{1,2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/gi)];
    let date: string | null = null;
    let endDate: string | null = null;
    let startTime: string | null = null;
    let endTime: string | null = null;
    const year = eventDate ? Number(eventDate[1]) : fallbackYear;
    for (const m of times.slice(0, 2)) {
      const mon = MONTHS[m[2].toLowerCase().slice(0, 3)] ?? 1;
      const iso = `${year}-${String(mon).padStart(2, "0")}-${m[3].padStart(2, "0")}`;
      const hhmm = to24h(Number(m[4]), Number(m[5]), m[6]);
      if (!date) {
        date = iso;
        startTime = hhmm;
      } else {
        endDate = iso === date ? null : iso;
        endTime = hhmm;
      }
    }
    if (!date && eventDate) {
      date = `${eventDate[1]}-${eventDate[2]}-${eventDate[3]}`;
      startTime = `${eventDate[4]}:${eventDate[5]}`;
    }
    if (!date) return null;

    let isFree: boolean | null = null;
    let priceText: string | null = null;
    if (ticketPrices.length > 0) {
      const allFree = ticketPrices.every((p) => /^free$/i.test(p));
      if (allFree) {
        isFree = true;
        priceText = "Free";
      } else {
        const nums = ticketPrices
          .map((p) => Number((p.match(/([\d,]+(?:\.\d{2})?)/)?.[1] ?? "").replace(/,/g, "")))
          .filter((n) => Number.isFinite(n) && n > 0);
        isFree = false;
        priceText = nums.length > 0 ? `From KES ${Math.min(...nums).toLocaleString("en-US")}` : "Paid";
      }
    } else if (card.pricePart) {
      ({ isFree, priceText } = parsePrice(card.pricePart));
    }

    const venue = location ?? card.venuePart;
    return {
      title: card.title,
      date,
      endDate,
      startTime,
      endTime,
      city: null,
      venue: venue?.slice(0, 120) ?? null,
      isOnline: card.classes.includes("online"),
      url: card.url,
      image: ogImage ?? card.image,
      source: card.host,
      origin: "vabu",
      isFree,
      priceText,
      topics: [],
    };
  } catch {
    return null;
  }
}

/** Parse a single source's raw payload into events. */
async function eventsFromSource(
  source: EventSource,
  body: string,
  weekStart: string,
  weekEnd: string
): Promise<ParsedEvent[]> {
  const cfg = source.fetch;
  if (!cfg) return [];
  switch (cfg.kind) {
    case "vabu-listing":
      return fromVabuCards(parseVabuListing(body), weekStart, weekEnd, weekStart.slice(0, 4));
    case "vabu-org":
      return fromVabuCards(
        parseVabuFanbase(body, source.name, cfg.engineering ?? false),
        weekStart,
        weekEnd,
        weekStart.slice(0, 4)
      );
    case "luma":
      return parseLumaEvents(JSON.parse(body || "{}"), source.name);
    case "devpost":
      return parseDevpostEvents(JSON.parse(body || "{}"), source.name);
    case "jsonld":
      return parseJsonLdEvents(body, source.name, cfg.url);
    case "ics":
      return parseIcsEvents(body, source.name);
    default:
      return [];
  }
}

async function fromVabuCards(
  cards: VabuCard[],
  weekStart: string,
  weekEnd: string,
  fallbackYearStr: string
): Promise<ParsedEvent[]> {
  const fallbackYear = Number(fallbackYearStr);
  const seen = new Set<string>();
  const inWeek: VabuCard[] = [];
  for (const c of cards) {
    if (seen.has(c.url)) continue;
    seen.add(c.url);
    if (!isCardInWeek(c, weekStart, weekEnd)) continue;
    inWeek.push(c);
    if (inWeek.length >= 12) break;
  }
  const details = await Promise.allSettled(inWeek.map((c) => fetchVabuDetail(c, fallbackYear)));
  return details.flatMap((d) => (d.status === "fulfilled" && d.value ? [d.value] : []));
}

/** Pull every deterministic source in parallel and merge the in-week events. */
export async function collectDirectEvents(weekStart: string, weekEnd: string): Promise<DirectResult> {
  const sources = fetchSources();
  const settled = await Promise.allSettled(
    sources.map(async (s) => {
      const { ok, body } = await getText(s.fetch!.url, 9000);
      if (!ok) return { ok: false, events: [] as ParsedEvent[] };
      try {
        return { ok: true, events: await eventsFromSource(s, body, weekStart, weekEnd) };
      } catch {
        return { ok: false, events: [] as ParsedEvent[] };
      }
    })
  );

  const status: SourceStatus[] = [];
  const seen = new Set<string>();
  const events: ParsedEvent[] = [];
  settled.forEach((res, i) => {
    const src = sources[i];
    const value = res.status === "fulfilled" ? res.value : { ok: false, events: [] as ParsedEvent[] };
    const inWeek = value.events
      .filter((e) => overlapsWeek(e, weekStart, weekEnd))
      .filter((e) => {
        const k = eventKeyOf(e);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    events.push(...inWeek);
    status.push({
      id: src.id,
      label: src.name,
      url: src.homepage,
      ok: value.ok,
      count: inWeek.length,
    });
  });

  events.sort((a, b) => `${a.date} ${a.startTime ?? ""}`.localeCompare(`${b.date} ${b.startTime ?? ""}`));
  return { events, sources: status };
}

// ------------------------------------------------------------------- AI online fill

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
    return u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}
function asTopics(v: unknown): string[] {
  const allowed = new Set(["ai", "web dev", "mobile", "data", "cloud/devops", "cybersecurity", "startups", "design", "blockchain", "career"]);
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const t of v) {
    if (typeof t !== "string") continue;
    const key = t.trim().toLowerCase().slice(0, 20);
    if (allowed.has(key) && !out.includes(key)) out.push(key);
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

/** HEAD-then-GET liveness check so AI-suggested links are never dead. */
async function verifyUrl(url: string, timeoutMs = 3000): Promise<boolean> {
  const opts = { redirect: "follow" as const, headers: { "User-Agent": "life-reset-events/1.0" } };
  for (const method of ["HEAD", "GET"] as const) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, method, signal: ctrl.signal });
      clearTimeout(timer);
      if (res.status === 405 || res.status === 501) continue;
      return res.ok || (res.status >= 300 && res.status < 400);
    } catch {
      clearTimeout(timer);
      return false;
    }
  }
  return false;
}

export async function collectAiEvents(
  weekStart: string,
  weekEnd: string,
  apiKey: string | undefined,
  model: string
): Promise<AiResult> {
  if (!apiKey) return { events: [], hubs: FALLBACK_HUBS, source: "fallback" };

  const instruction =
    `List ONLINE tech events (software, AI/data, startups, design, devops, cybersecurity, product) ` +
    `happening between ${weekStart} and ${weekEnd} inclusive. VIRTUAL/ONLINE ONLY, run in English, any country — ` +
    `no in-person events (Kenya coverage comes from elsewhere). Prioritise ones relevant to a developer in Kenya ` +
    `(Africa-friendly time zones, remote-friendly, free). ` +
    `Only include events you believe genuinely exist with a real registration/info page — never invent titles, dates, or URLs. ` +
    `If unsure about a URL, omit the event rather than guessing. Prefer free community events, workshops, and livestreams. ` +
    `For each event also judge cost (isFree true/false/null + short priceText like "Free" or "$10") ` +
    `and pick up to 3 topics from exactly: AI, Web Dev, Mobile, Data, Cloud/DevOps, Cybersecurity, Startups, Design, Blockchain, Career. ` +
    `Max 10 events. Respond with JSON ONLY, no markdown: a bare array where each item matches exactly ` +
    `{"title":string,"date":"YYYY-MM-DD","startTime":"HH:MM"|null,"endTime":"HH:MM"|null,` +
    `"city":string|null,"venue":string|null,"isOnline":true,"url":string|null,"source":string|null,` +
    `"isFree":boolean|null,"priceText":string|null,"topics":string[]}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: instruction }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1500, thinkingConfig: { thinkingLevel: "low" } },
      }),
    });
    if (!upstream.ok) return { events: [], hubs: FALLBACK_HUBS, source: "fallback" };
    const data = await upstream.json();
    const text: string =
      (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
        ?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text.trim()) return { events: [], hubs: FALLBACK_HUBS, source: "fallback" };

    let raw: unknown;
    try {
      raw = JSON.parse(stripFences(text));
    } catch {
      return { events: [], hubs: FALLBACK_HUBS, source: "fallback" };
    }
    if (!Array.isArray(raw)) return { events: [], hubs: FALLBACK_HUBS, source: "fallback" };

    const seen = new Set<string>();
    const events: ParsedEvent[] = [];
    for (const item of raw.slice(0, 30)) {
      if (typeof item !== "object" || item === null) continue;
      const r = item as Record<string, unknown>;
      const title = asText(r.title, 110);
      const date = asDate(r.date);
      if (!title || !date || date < weekStart || date > weekEnd) continue;
      const key = `${title.toLowerCase()}|${date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({
        title,
        date,
        endDate: null,
        startTime: asTime(r.startTime),
        endTime: asTime(r.endTime),
        city: asText(r.city, 60),
        venue: asText(r.venue, 120),
        isOnline: true,
        url: asUrl(r.url),
        image: null,
        source: asText(r.source, 60),
        origin: "ai",
        isFree: asIsFree(r.isFree),
        priceText: asText(r.priceText, 40),
        topics: asTopics(r.topics),
      });
    }
    events.sort((a, b) => `${a.date} ${a.startTime ?? ""}`.localeCompare(`${b.date} ${b.startTime ?? ""}`));
    await Promise.all(
      events.map(async (e) => {
        if (!e.url) return;
        const ok = await verifyUrl(e.url).catch(() => false);
        if (!ok) e.url = null;
      })
    );
    return { events, hubs: FALLBACK_HUBS, source: "gemini" };
  } catch {
    return { events: [], hubs: FALLBACK_HUBS, source: "fallback" };
  }
}

/** Small re-export so the ICS route can reuse the same normaliser. */
export const __absUrl = absUrl;
