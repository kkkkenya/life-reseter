// GET /api/direct-events?weekStart=YYYY-MM-DD&weekEnd=YYYY-MM-DD
// Deterministic event fetching — no AI curation. Pulls server-rendered pages
// from a curated registry below and parses them with targeted regexes.
// To add a school org: give it a vabu fanbase page (vabu.app/u/...) and add
// one entry to DIRECT_SOURCES. Sites that need login (LinkedIn, Instagram)
// or a headless browser can NOT be fetched from serverless — see NOTES.
const DIRECT_SOURCES: { id: string; label: string; url: string; kind: "vabu-listing" | "vabu-org"; engineering: boolean }[] = [
  { id: "vabu", label: "Vabu", url: "https://vabu.app/events", kind: "vabu-listing", engineering: false },
  // IEEE cohorts + student/for-student engineering orgs (all tech by definition).
  // To follow a new org: find its vabu fanbase (vabu.app/u/...) and add one line.
  { id: "vabu-ieee-sight", label: "IEEE SIGHT", url: "https://vabu.app/u/IEEE%20SIGHT", kind: "vabu-org", engineering: true },
  { id: "vabu-ieee-sight-ke", label: "IEEE SIGHT Kenya", url: "https://vabu.app/u/ieee-sight-kenya", kind: "vabu-org", engineering: true },
  { id: "vabu-ieee-stem", label: "IEEE STEM Outreach", url: "https://vabu.app/u/ieee-stem-outreach", kind: "vabu-org", engineering: true },
  { id: "vabu-ieee-grss", label: "IEEE GRSS Kenya", url: "https://vabu.app/u/ieee-grss-kenya", kind: "vabu-org", engineering: true },
  { id: "vabu-ieee-ignite", label: "IEEE Tech Ignite", url: "https://vabu.app/u/ieee-tech-ignite-summer-school-2025", kind: "vabu-org", engineering: true },
  { id: "vabu-react-ke", label: "React Developers Kenya", url: "https://vabu.app/u/react-developers-kenya", kind: "vabu-org", engineering: true },
  { id: "vabu-angular-ke", label: "Angular Kenya", url: "https://vabu.app/u/angular-kenya", kind: "vabu-org", engineering: true },
  { id: "vabu-nairobi-devops", label: "Nairobi DevOps", url: "https://vabu.app/u/nairobi-devops", kind: "vabu-org", engineering: true },
  { id: "vabu-nairobi-talks", label: "Nairobi Tech Talks", url: "https://vabu.app/u/nairobi-tech-talks", kind: "vabu-org", engineering: true },
];

const KENYA_CITIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Kiambu", "Machakos",
  "Kajiado", "Nyeri", "Meru", "Kakamega", "Bungoma", "Kericho", "Kisii", "Malindi",
  "Diani", "Naivasha", "Nanyuki", "Embu", "Kitale", "Garissa",
];

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

interface DirectEvent {
  title: string;
  date: string;
  endDate: string | null;
  startTime: string | null;
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

function absUrl(href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  return `https://vabu.app${href.startsWith("/") ? "" : "/"}${href}`;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function inferCity(text: string): string | null {
  const t = text.toLowerCase();
  for (const c of KENYA_CITIES) {
    if (t.includes(c.toLowerCase())) return c;
  }
  return null;
}

function inferTopics(title: string, cats: string[]): string[] {
  const out: string[] = [];
  const push = (t: string) => {
    if (!out.includes(t) && out.length < 3) out.push(t);
  };
  if (cats.includes("business-and-professional")) {
    push("startups");
    push("career");
  }
  const t = title.toLowerCase();
  if (/\bai\b|\bmachine learning\b|\bllm\b/.test(t)) push("ai");
  if (/devops|cloud|kubernetes|docker/.test(t)) push("cloud/devops");
  if (/data|analytics|python/.test(t)) push("data");
  if (/cyber|security|hack/.test(t)) push("cybersecurity");
  if (/design|ux|ui\b/.test(t)) push("design");
  if (/mobile|android|ios|flutter/.test(t)) push("mobile");
  if (/\bweb\b|javascript|react|frontend/.test(t)) push("web dev");
  if (/blockchain|web3|crypto/.test(t)) push("blockchain");
  if (/startup|summit|founders|business/.test(t)) push("startups");
  if (/women in tech|career|alumni|jobs/.test(t)) push("career");
  return out;
}

function parsePrice(p: string): { isFree: boolean | null; priceText: string | null } {
  const t = p.trim();
  if (!t) return { isFree: null, priceText: null };
  if (/^free$/i.test(t)) return { isFree: true, priceText: "Free" };
  // "KES 200.00 - KES 500.00" -> "KES 200–500"
  const amounts = [...t.matchAll(/([\d,]+(?:\.\d{2})?)/g)].map((m) => m[1].replace(/\.00$/, ""));
  const cur = /kes/i.test(t) ? "KES " : /usd|\$/i.test(t) ? "$" : "";
  if (amounts.length === 0) return { isFree: null, priceText: t.slice(0, 40) };
  const priceText = cur + amounts.join("–");
  return { isFree: false, priceText };
}

/** "17 Sep" -> ISO date if it falls inside [weekStart, weekEnd], else null.
 *  Tries neighboring years so Dec/Jan boundary weeks and stale machine clocks
 *  can't silently drop real events. */
function inWeekISO(day: number, mon: number, weekStart: string, weekEnd: string): string | null {
  const ys = Number(weekStart.slice(0, 4));
  const ye = Number(weekEnd.slice(0, 4));
  for (const year of [ys - 1, ys, ye, ye + 1]) {
    const iso = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (iso >= weekStart && iso <= weekEnd) return iso;
  }
  return null;
}

function to24h(h: number, min: number, ap: string): string {
  let hh = h % 12;
  if (/pm/i.test(ap)) hh += 12;
  return `${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

interface ListingCard {
  url: string;
  image: string | null;
  title: string;
  host: string | null;
  datePart: string;
  fixedISO: string | null; // set when the card carries a full date incl. year (fanbase pages)
  venuePart: string | null;
  pricePart: string | null;
  classes: string[];
  forceTech: boolean; // true for engineering-org fanbases: all their events are relevant
}

function parseListing(html: string): ListingCard[] {
  const cards: ListingCard[] = [];
  // Split on the card opening tag so each chunk starts with its OWN category
  // classes (splitting on data-ref="mixitup-target" misaligns: the tag sits
  // mid-div and each chunk then carries the NEXT card's classes).
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
 *  year, no category classes. Past events carry a "Past event"/"Event ended"
 *  marker and are skipped. */
function parseFanbase(html: string, orgLabel: string, engineering: boolean): ListingCard[] {
  const cards: ListingCard[] = [];
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
      // "Fri, Dec 05, 2025 · 8:00 AM" or "Fri, Dec 05 · 8:00 AM"
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

async function fetchDetail(card: ListingCard, fallbackYear: number): Promise<DirectEvent | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(card.url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "life-reset-events/1.0 (+https://github.com/kkkkenya/life-reseter)" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const html = await res.text();

    const eventDate = html.match(/const eventDate = "(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):\d{2}"/);
    const dateRange = stripTags(html.match(/<h4>Date and Time<\/h4>\s*<p>([\s\S]*?)<\/p>/)?.[1] ?? "");
    const location = stripTags(html.match(/<h4>Location<\/h4>\s*<p class="mb-0">([\s\S]*?)<\/p>/)?.[1] ?? "") || null;
    const ogImage = html.match(/<meta property='og:image' content='([^']+)'/)?.[1] ?? null;
    const ticketPrices = [...html.matchAll(/<span class="ticket-price">([^<]+)<\/span>/g)].map((m) => m[1].trim());

    // start/end from "Thu, Sep 17 08:00 AM - Fri, Sep 18 05:00 PM"
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
      city: venue ? inferCity(venue) : null,
      venue: venue?.slice(0, 120) ?? null,
      isOnline: card.classes.includes("online"),
      url: card.url,
      image: ogImage ?? card.image,
      source: card.host,
      origin: "vabu",
      isFree,
      priceText,
      topics: inferTopics(card.title, card.classes),
    };
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const weekStart = typeof req.query?.weekStart === "string" ? req.query.weekStart : null;
  const weekEnd = typeof req.query?.weekEnd === "string" ? req.query.weekEnd : null;
  if (!weekStart || !weekEnd || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !/^\d{4}-\d{2}-\d{2}$/.test(weekEnd)) {
    res.status(400).json({ error: "Missing week range." });
    return;
  }
  const fallbackYear = Number(weekStart.slice(0, 4));

  try {
    const pages = await Promise.allSettled(
      DIRECT_SOURCES.map(async (s) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 9000);
        try {
          const r = await fetch(s.url, {
            signal: ctrl.signal,
            headers: { "User-Agent": "life-reset-events/1.0 (+https://github.com/kkkkenya/life-reseter)" },
          });
          if (!r.ok) return { id: s.id, ok: false as const, cards: [] as ListingCard[] };
          const text = await r.text();
          const cards =
            s.kind === "vabu-org" ? parseFanbase(text, s.label, s.engineering) : parseListing(text);
          return { id: s.id, ok: true as const, cards };
        } catch {
          return { id: s.id, ok: false as const, cards: [] as ListingCard[] };
        } finally {
          clearTimeout(timer);
        }
      })
    );
    const perSource = pages.map((p) => (p.status === "fulfilled" ? p.value : { id: "unknown", ok: false as const, cards: [] as ListingCard[] }));
    const cards = perSource.flatMap((p) => p.cards);

    // Dedupe by URL. Listing cards need the tech class; engineering-org
    // fanbase cards are relevant by definition (forceTech).
    function isCardInWeek(c: ListingCard): boolean {
      if (!c.classes.includes("tech") && !c.forceTech) return false;
      if (c.fixedISO) return c.fixedISO >= weekStart && c.fixedISO <= weekEnd;
      const m = c.datePart.match(/(\d{1,2})\s+(\w{3})/);
      if (!m) return false;
      const mon = MONTHS[m[2].toLowerCase().slice(0, 3)];
      if (!mon) return false;
      return inWeekISO(Number(m[1]), mon, weekStart, weekEnd) !== null;
    }
    const sourceStats = perSource.map((p) => ({
      id: p.id,
      ok: p.ok,
      count: p.cards.filter(isCardInWeek).length,
    }));
    const seen = new Set<string>();
    const inWeek: ListingCard[] = [];
    for (const c of cards) {
      if (seen.has(c.url)) continue;
      seen.add(c.url);
      if (!isCardInWeek(c)) continue;
      inWeek.push(c);
      if (inWeek.length >= 12) break;
    }

    const details = await Promise.allSettled(inWeek.map((c) => fetchDetail(c, fallbackYear)));
    const events = details
      .flatMap((d) => (d.status === "fulfilled" && d.value ? [d.value] : []))
      .filter((e) => e.date >= weekStart && e.date <= weekEnd)
      .sort((a, b) => `${a.date} ${a.startTime ?? ""}`.localeCompare(`${b.date} ${b.startTime ?? ""}`));

    res.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate=86400");
    res.status(200).json({
      events,
      sources: DIRECT_SOURCES.map(({ id, label, url }) => ({
        id,
        label,
        url,
        ok: sourceStats.find((s) => s.id === id)?.ok ?? false,
        count: sourceStats.find((s) => s.id === id)?.count ?? 0,
      })),
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    res.status(200).json({ events: [], sources: [], fetchedAt: new Date().toISOString() });
  }
}
