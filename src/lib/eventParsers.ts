/**
 * eventParsers.ts — pure, dependency-free parsing for every fetch adapter.
 *
 * Nothing here performs network I/O, so it is all directly unit-testable.
 * The serverless pipeline (api/direct-events.ts) does the fetching and hands
 * raw text/JSON to these functions; the .ics export reuses the same shapes.
 */

export interface ParsedEvent {
  title: string;
  date: string; // YYYY-MM-DD
  endDate: string | null;
  startTime: string | null; // HH:MM
  endTime: string | null;
  city: string | null;
  venue: string | null;
  isOnline: boolean;
  url: string | null;
  image: string | null;
  source: string | null;
  origin: string;
  isFree: boolean | null;
  priceText: string | null;
  topics: string[];
}

/** Raw card scraped off a vabu listing / fanbase page, before detail fetch. */
export interface VabuCard {
  url: string;
  image: string | null;
  title: string;
  host: string | null;
  datePart: string;
  fixedISO: string | null;
  venuePart: string | null;
  pricePart: string | null;
  classes: string[];
  forceTech: boolean;
}

/** Africa/Nairobi is UTC+3 year-round (no DST) — used to normalise instants. */
export const EVENT_TZ_OFFSET_MIN = 180;

export const KENYA_CITIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Kiambu", "Machakos",
  "Kajiado", "Nyeri", "Meru", "Kakamega", "Bungoma", "Kericho", "Kisii", "Malindi",
  "Diani", "Naivasha", "Nanyuki", "Embu", "Kitale", "Garissa",
];

export const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const TOPIC_SET = new Set([
  "ai", "web dev", "mobile", "data", "cloud/devops",
  "cybersecurity", "startups", "design", "blockchain", "career",
]);

// ------------------------------------------------------------------ small helpers

export function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function absUrl(href: string, base = "https://vabu.app"): string {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("//")) return `https:${href}`;
  return `${base}${href.startsWith("/") ? "" : "/"}${href}`;
}

function asText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = decodeEntities(v).trim();
  return t ? t.slice(0, max) : null;
}

function clampText(t: string, max: number): string | null {
  const s = t.trim();
  return s ? s.slice(0, max) : null;
}

export function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function inferCity(text: string): string | null {
  const t = text.toLowerCase();
  for (const c of KENYA_CITIES) if (t.includes(c.toLowerCase())) return c;
  return null;
}

export function inferTopics(title: string, cats: string[] = []): string[] {
  const out: string[] = [];
  const push = (t: string) => {
    if (TOPIC_SET.has(t) && !out.includes(t) && out.length < 3) out.push(t);
  };
  if (cats.includes("business-and-professional")) {
    push("startups");
    push("career");
  }
  const t = title.toLowerCase();
  if (/\bai\b|machine learning|\bllm\b|deep learning/.test(t)) push("ai");
  if (/devops|cloud|kubernetes|docker|serverless/.test(t)) push("cloud/devops");
  if (/data|analytics|python|sql/.test(t)) push("data");
  if (/cyber|security|hack|ctf/.test(t)) push("cybersecurity");
  if (/design|\bux\b|\bui\b|figma/.test(t)) push("design");
  if (/mobile|android|ios|flutter|react native/.test(t)) push("mobile");
  if (/\bweb\b|javascript|typescript|react|frontend|next\.js/.test(t)) push("web dev");
  if (/blockchain|web3|crypto|solidity/.test(t)) push("blockchain");
  if (/startup|summit|founders|business|entrepreneur/.test(t)) push("startups");
  if (/women in tech|career|alumni|jobs|hiring|internship/.test(t)) push("career");
  return out;
}

export function parsePrice(p: string): { isFree: boolean | null; priceText: string | null } {
  const t = p.trim();
  if (!t) return { isFree: null, priceText: null };
  if (/^free$/i.test(t)) return { isFree: true, priceText: "Free" };
  const amounts = [...t.matchAll(/([\d,]+(?:\.\d{2})?)/g)].map((m) => m[1].replace(/\.00$/, ""));
  const cur = /kes/i.test(t) ? "KES " : /usd|\$/i.test(t) ? "$" : "";
  if (amounts.length === 0) return { isFree: null, priceText: t.slice(0, 40) };
  return { isFree: false, priceText: cur + amounts.join("–") };
}

/** "17 Sep" -> ISO date if it lands inside [weekStart, weekEnd], else null.
 *  Tries neighbouring years so Dec/Jan boundary weeks and stale clocks can't
 *  silently drop real events. */
export function inWeekISO(day: number, mon: number, weekStart: string, weekEnd: string): string | null {
  const ys = Number(weekStart.slice(0, 4));
  const ye = Number(weekEnd.slice(0, 4));
  for (const year of [ys - 1, ys, ye, ye + 1]) {
    const iso = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (iso >= weekStart && iso <= weekEnd) return iso;
  }
  return null;
}

export function to24h(h: number, min: number, ap: string): string {
  let hh = h % 12;
  if (/pm/i.test(ap)) hh += 12;
  return `${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * True when an event's span overlaps the week. Multi-day events (a hackathon
 * running Jul 31 – Oct 1, a two-day summit) must still show in a week that
 * falls inside their range, not only in the week they start.
 */
export function overlapsWeek(
  e: Pick<ParsedEvent, "date" | "endDate">,
  weekStart: string,
  weekEnd: string
): boolean {
  const end = e.endDate && e.endDate > e.date ? e.endDate : e.date;
  return e.date <= weekEnd && end >= weekStart;
}

/**
 * Normalise an ISO-ish datetime to Kenya-local date + HH:MM.
 * Explicit offsets (Z / ±HH:MM) are converted to UTC+3; floating times are
 * taken at face value (feeds for local events already publish local time).
 */
export function isoDateTimeToParts(
  s: string,
  offsetMin = EVENT_TZ_OFFSET_MIN
): { date: string; time: string | null } | null {
  const m = s
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, , off] = m;
  if (!hh) return { date: `${y}-${mo}-${d}`, time: null };
  const base = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm));
  if (!off) return { date: `${y}-${mo}-${d}`, time: `${hh}:${mm}` };
  let utcMs = base;
  if (off !== "Z") {
    const sign = off[0] === "-" ? -1 : 1;
    const digits = off.slice(1).replace(":", "");
    const oh = Number(digits.slice(0, 2));
    const om = Number(digits.slice(2, 4)) || 0;
    utcMs = base - sign * (oh * 60 + om) * 60000;
  }
  const local = new Date(utcMs + offsetMin * 60000);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${local.getUTCFullYear()}-${p(local.getUTCMonth() + 1)}-${p(local.getUTCDate())}`,
    time: `${p(local.getUTCHours())}:${p(local.getUTCMinutes())}`,
  };
}

// ------------------------------------------------------------------ vabu adapters

export function parseVabuListing(html: string): VabuCard[] {
  const cards: VabuCard[] = [];
  // Split on the card opening tag so each chunk starts with its OWN category
  // classes (splitting mid-div misaligns classes onto the wrong card).
  const blocks = html.split('<div class="col-md-6 mix ');
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    try {
      const cls = b.slice(0, Math.max(0, b.indexOf('"'))).split(" ").filter(Boolean);
      const url = b.match(/onclick="window\.location\.href='([^']+)'/)?.[1];
      if (!url) continue;
      const title = stripTags(b.match(/class="event-title">([\s\S]*?)<\/a>/)?.[1] ?? "").trim();
      if (!title) continue;
      const img = b.match(/data-src="([^"]+)"/)?.[1] ?? null;
      const host = stripTags(b.match(/event-card-location[\s\S]*?By ([\s\S]*?)<\/a>/)?.[1] ?? "") || null;
      const dateVenue = stripTags(b.match(/<p class="event-card-date">([\s\S]*?)<\/p>/)?.[1] ?? "");
      const [datePart = "", ...venueBits] = dateVenue.split(/\s+-\s+/);
      const priceRaw = stripTags(b.match(/<p class="event-card-price">([\s\S]*?)<\/p>/)?.[1] ?? "") || null;
      cards.push({
        url: absUrl(url),
        image: img ? absUrl(img) : null,
        title: title.slice(0, 110),
        host: host?.slice(0, 60) ?? null,
        datePart: datePart.trim(),
        fixedISO: null,
        venuePart: venueBits.join(" - ").trim() || null,
        pricePart: priceRaw,
        classes: cls,
        forceTech: false,
      });
    } catch {
      continue; // one malformed card never kills the pull
    }
  }
  return cards;
}

/** Fanbase (org) pages: article.fanbase-content-card markup, full dates incl.
 *  year, no category classes. Past events carry a "Past event" marker. */
export function parseVabuFanbase(html: string, orgLabel: string, engineering: boolean): VabuCard[] {
  const cards: VabuCard[] = [];
  const blocks = html.split('<article class="fanbase-content-card">');
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    try {
      const head = b.slice(0, 1500);
      if (/Past event|Event ended/i.test(head)) continue;
      const url =
        b.match(/<a class="fanbase-content-card__media" href="([^"]+)"/)?.[1] ??
        b.match(/<h3><a href="([^"]+)"/)?.[1];
      if (!url) continue;
      const title = stripTags(b.match(/<h3><a href="[^"]+">([\s\S]*?)<\/a><\/h3>/)?.[1] ?? "").trim();
      if (!title) continue;
      const dateRaw = stripTags(b.match(/fanbase-content-card__date">([\s\S]*?)<\/p>/)?.[1] ?? "");
      const dm = dateRaw.match(/(\w{3}), (\w{3}) (\d{1,2})(?:, (\d{4}))?/);
      let datePart = "";
      let fixedISO: string | null = null;
      if (dm) {
        const mon = MONTHS[dm[2].toLowerCase().slice(0, 3)];
        if (mon) {
          datePart = `${dm[3]} ${dm[2]}`;
          if (dm[4]) fixedISO = `${dm[4]}-${String(mon).padStart(2, "0")}-${dm[3].padStart(2, "0")}`;
        }
      }
      if (!datePart) continue;
      const img = b.match(/<img src="([^"]+)" alt=/)?.[1] ?? null;
      const meta = stripTags(b.match(/fanbase-content-card__meta">([\s\S]*?)<\/p>/)?.[1] ?? "") || null;
      cards.push({
        url: absUrl(url),
        image: img && /^https?:\/\//.test(img) ? img : img ? absUrl(img) : null,
        title: title.slice(0, 110),
        host: orgLabel,
        datePart,
        fixedISO,
        venuePart: meta?.slice(0, 120) ?? null,
        pricePart: null,
        classes: [],
        forceTech: engineering,
      });
    } catch {
      continue;
    }
  }
  return cards;
}

// ------------------------------------------------------------------ luma adapter

interface LumaEntry {
  event?: {
    name?: string;
    start_at?: string;
    end_at?: string;
    url?: string;
    cover_url?: string;
    location_type?: string;
    geo_address_info?: { city?: string; address?: string; full_address?: string };
  };
  calendar?: { name?: string };
}

/** lu.ma discover JSON -> events. Times arrive in UTC; normalised to UTC+3. */
export function parseLumaEvents(json: unknown, sourceLabel = "Luma"): ParsedEvent[] {
  const entries = (json as { entries?: unknown })?.entries;
  if (!Array.isArray(entries)) return [];
  const out: ParsedEvent[] = [];
  for (const raw of entries as LumaEntry[]) {
    const e = raw?.event;
    if (!e?.name || !e.start_at) continue;
    const parts = isoDateTimeToParts(e.start_at);
    if (!parts) continue;
    const end = e.end_at ? isoDateTimeToParts(e.end_at) : null;
    const loc = e.geo_address_info ?? {};
    const online = e.location_type === "online" || e.location_type === "hybrid";
    out.push({
      title: e.name.trim().slice(0, 110),
      date: parts.date,
      endDate: end && end.date !== parts.date ? end.date : null,
      startTime: parts.time,
      endTime: end?.time ?? null,
      city: loc.city ? loc.city.slice(0, 60) : inferCity(loc.full_address ?? loc.address ?? ""),
      venue: clampText(loc.address ?? loc.full_address ?? "", 120),
      isOnline: online,
      url: e.url ? `https://lu.ma/${e.url}` : null,
      image: e.cover_url ? absUrl(e.cover_url) : null,
      source: raw.calendar?.name?.slice(0, 60) ?? sourceLabel,
      origin: "luma",
      isFree: null,
      priceText: null,
      topics: inferTopics(e.name),
    });
  }
  return out;
}

// --------------------------------------------------------------- devpost adapter

function devpostDateRange(s: string): { start: string; end: string | null } | null {
  // "Jul 31 - Oct 01, 2026"
  const m = s.match(/^([A-Za-z]{3})\s+(\d{1,2})\s*-\s*([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/);
  if (!m) return null;
  const year = Number(m[5]);
  const sm = MONTHS[m[1].toLowerCase()];
  const em = MONTHS[m[3].toLowerCase()];
  if (!sm || !em) return null;
  const iso = (mon: number, day: number) => `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { start: iso(sm, Number(m[2])), end: iso(em, Number(m[4])) };
}

/** devpost.com/api/hackathons JSON -> events (submission windows). */
export function parseDevpostEvents(json: unknown, sourceLabel = "Devpost"): ParsedEvent[] {
  const list = (json as { hackathons?: unknown })?.hackathons;
  if (!Array.isArray(list)) return [];
  const out: ParsedEvent[] = [];
  for (const raw of list as Record<string, unknown>[]) {
    const title = asText(raw.title, 110);
    const range = typeof raw.submission_period_dates === "string" ? devpostDateRange(raw.submission_period_dates) : null;
    if (!title || !range) continue;
    const themes = Array.isArray(raw.themes)
      ? (raw.themes as { name?: string }[]).map((t) => t.name ?? "").filter(Boolean)
      : [];
    const location = asText((raw.displayed_location as { location?: string } | undefined)?.location, 60) ?? "";
    const thumb = asText(raw.thumbnail_url, 300);
    out.push({
      title,
      date: range.start,
      endDate: range.end && range.end !== range.start ? range.end : null,
      startTime: null,
      endTime: null,
      city: null,
      venue: location || null,
      isOnline: /online|virtual|anywhere/i.test(location) || location === "",
      url: asText(raw.url, 300),
      image: thumb ? absUrl(thumb) : null,
      source: asText(raw.organization_name, 60) ?? sourceLabel,
      origin: "devpost",
      isFree: true,
      priceText: "Free entry",
      topics: inferTopics(`${title} ${themes.join(" ")}`),
    });
  }
  return out;
}

// ---------------------------------------------------------------- jsonld adapter

function jsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw));
    } catch {
      /* malformed block — skip, never throw */
    }
  }
  return out;
}

function collectEvents(node: unknown, acc: Record<string, unknown>[], depth = 0): void {
  if (depth > 12 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectEvents(item, acc, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  const isEvent = type === "Event" || (Array.isArray(type) && type.some((t) => t === "Event"));
  if (isEvent) acc.push(obj);
  for (const key of ["@graph", "itemListElement", "item", "subEvent", "events"]) {
    if (key in obj) collectEvents(obj[key], acc, depth + 1);
  }
}

function locationOf(loc: unknown): { venue: string | null; city: string | null; online: boolean } {
  if (typeof loc === "string") return { venue: clampText(loc, 120), city: inferCity(loc), online: /online|virtual/i.test(loc) };
  if (!loc || typeof loc !== "object") return { venue: null, city: null, online: false };
  const o = loc as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name : "";
  const addr = o.address;
  let cityStr = "";
  let street = "";
  if (addr && typeof addr === "object") {
    const a = addr as Record<string, unknown>;
    cityStr = typeof a.addressLocality === "string" ? a.addressLocality : "";
    street = typeof a.streetAddress === "string" ? a.streetAddress : "";
  } else if (typeof addr === "string") {
    street = addr;
  }
  const venue = clampText([name, street].filter(Boolean).join(", "), 120);
  const city = inferCity(cityStr) ?? (cityStr ? clampText(cityStr, 60) : inferCity(street));
  return { venue, city, online: /virtual|online/i.test(name) };
}

/** schema.org Event blocks embedded in any HTML page. */
export function parseJsonLdEvents(html: string, sourceLabel: string, pageUrl: string): ParsedEvent[] {
  const events: Record<string, unknown>[] = [];
  for (const block of jsonLdBlocks(html)) collectEvents(block, events);
  const out: ParsedEvent[] = [];
  for (const e of events) {
    const title = asText(e.name, 110);
    const startRaw = typeof e.startDate === "string" ? e.startDate : null;
    if (!title || !startRaw) continue;
    const start = isoDateTimeToParts(startRaw);
    if (!start) continue;
    const end = typeof e.endDate === "string" ? isoDateTimeToParts(e.endDate) : null;
    const loc = locationOf(e.location);
    const mode = typeof e.eventAttendanceMode === "string" ? e.eventAttendanceMode : "";
    const offers = e.offers as Record<string, unknown> | undefined;
    let isFree: boolean | null = null;
    let priceText: string | null = null;
    if (offers) {
      const price = offers.price;
      const cur = typeof offers.priceCurrency === "string" ? offers.priceCurrency : "";
      if (price === 0 || price === "0") {
        isFree = true;
        priceText = "Free";
      } else if (typeof price === "number" || (typeof price === "string" && /\d/.test(price))) {
        isFree = false;
        priceText = `${cur} ${price}`.trim().slice(0, 40);
      }
    }
    const image = typeof e.image === "string"
      ? e.image
      : Array.isArray(e.image)
        ? (typeof e.image[0] === "string" ? (e.image[0] as string) : null)
        : (e.image as { url?: string } | undefined)?.url ?? null;
    out.push({
      title,
      date: start.date,
      endDate: end && end.date !== start.date ? end.date : null,
      startTime: start.time,
      endTime: end?.time ?? null,
      city: loc.city,
      venue: loc.venue,
      isOnline: loc.online || /Online/i.test(mode),
      url: asText(e.url, 300) ?? pageUrl,
      image: image ? absUrl(image) : null,
      source: sourceLabel,
      origin: "jsonld",
      isFree,
      priceText,
      topics: inferTopics(title),
    });
  }
  return out;
}

// ------------------------------------------------------------------- ics adapter

/** RFC 5545 line unfolding: a line starting with space/tab continues the previous. */
function unfoldIcs(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescapeIcs(v: string): string {
  return v.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

function icsDateValue(v: string): { date: string; time: string | null } | null {
  const t = v.trim();
  const dateOnly = t.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) return { date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`, time: null };
  const dt = t.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!dt) return null;
  const iso = `${dt[1]}-${dt[2]}-${dt[3]}T${dt[4]}:${dt[5]}:${dt[6] ?? "00"}${dt[7] ?? ""}`;
  return isoDateTimeToParts(iso);
}

/** An iCalendar (.ics) feed -> events. */
export function parseIcsEvents(ics: string, sourceLabel: string): ParsedEvent[] {
  const lines = unfoldIcs(ics);
  const out: ParsedEvent[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (trimmed === "END:VEVENT") {
      if (cur) {
        const title = cur.SUMMARY ? unescapeIcs(cur.SUMMARY) : "";
        const start = cur.DTSTART ? icsDateValue(cur.DTSTART) : null;
        const end = cur.DTEND ? icsDateValue(cur.DTEND) : null;
        if (title && start) {
          const loc = cur.LOCATION ? unescapeIcs(cur.LOCATION) : "";
          out.push({
            title: title.slice(0, 110),
            date: start.date,
            endDate: end && end.date !== start.date ? end.date : null,
            startTime: start.time,
            endTime: end?.time ?? null,
            city: inferCity(loc),
            venue: clampText(loc, 120),
            isOnline: /online|virtual|zoom|meet\.google/i.test(`${loc} ${cur.DESCRIPTION ?? ""}`),
            url: cur.URL && /^https?:/i.test(cur.URL) ? cur.URL : null,
            image: null,
            source: sourceLabel,
            origin: "ics",
            isFree: null,
            priceText: null,
            topics: inferTopics(title),
          });
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = trimmed.indexOf(":");
    if (idx <= 0) continue;
    const rawKey = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    const key = rawKey.split(";")[0].toUpperCase();
    if (!(key in cur)) cur[key] = value; // first wins
  }
  return out;
}
