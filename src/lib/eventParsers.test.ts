import { describe, expect, it } from "vitest";
import {
  inferTopics,
  inWeekISO,
  isoDateTimeToParts,
  overlapsWeek,
  parseDevpostEvents,
  parseIcsEvents,
  parseJsonLdEvents,
  parseLumaEvents,
  parsePrice,
  parseVabuFanbase,
  parseVabuListing,
} from "./eventParsers";

describe("isoDateTimeToParts", () => {
  it("converts UTC instants to Nairobi wall time (+3)", () => {
    expect(isoDateTimeToParts("2026-09-17T15:00:00.000Z")).toEqual({ date: "2026-09-17", time: "18:00" });
  });
  it("respects an explicit numeric offset", () => {
    expect(isoDateTimeToParts("2026-09-17T18:00:00+03:00")).toEqual({ date: "2026-09-17", time: "18:00" });
  });
  it("takes floating times at face value", () => {
    expect(isoDateTimeToParts("2026-09-17T08:30")).toEqual({ date: "2026-09-17", time: "08:30" });
  });
  it("rolls the date when the UTC offset crosses midnight", () => {
    expect(isoDateTimeToParts("2026-09-17T23:30:00Z")).toEqual({ date: "2026-09-18", time: "02:30" });
  });
  it("handles date-only values and rejects junk", () => {
    expect(isoDateTimeToParts("2026-09-17")).toEqual({ date: "2026-09-17", time: null });
    expect(isoDateTimeToParts("not a date")).toBeNull();
  });
});

describe("inferTopics + parsePrice + inWeekISO", () => {
  it("maps keywords to at most three topics", () => {
    expect(inferTopics("AI and Machine Learning bootcamp for Python data")).toEqual(["ai", "data"]);
    expect(inferTopics("Random title")).toEqual([]);
  });
  it("reads free vs paid price strings", () => {
    expect(parsePrice("Free")).toEqual({ isFree: true, priceText: "Free" });
    expect(parsePrice("KES 200.00 - KES 500.00")).toEqual({ isFree: false, priceText: "KES 200–500" });
  });
  it("resolves a day/month inside the week, tolerating year rollover", () => {
    expect(inWeekISO(17, 9, "2026-09-14", "2026-09-20")).toBe("2026-09-17");
    expect(inWeekISO(17, 9, "2026-10-01", "2026-10-07")).toBeNull();
  });
  it("keeps multi-day events that span the week", () => {
    const hackathon = { date: "2026-07-31", endDate: "2026-10-01" };
    expect(overlapsWeek(hackathon, "2026-09-07", "2026-09-13")).toBe(true);
    expect(overlapsWeek({ date: "2026-05-01", endDate: null }, "2026-09-07", "2026-09-13")).toBe(false);
    expect(overlapsWeek({ date: "2026-09-20", endDate: null }, "2026-09-07", "2026-09-13")).toBe(false);
  });
});

describe("parseVabuListing", () => {
  const html =
    `<div class="col-md-6 mix tech online"><a onclick="window.location.href='/events/abc'">` +
    `<p class="event-title">Nairobi JS Meetup</p></a>` +
    `<p class="event-card-date">17 Sep - iHub, Nairobi</p>` +
    `<p class="event-card-price">Free</p></div>`;

  it("extracts url, title, category classes and price", () => {
    const cards = parseVabuListing(html);
    expect(cards).toHaveLength(1);
    expect(cards[0].url).toBe("https://vabu.app/events/abc");
    expect(cards[0].title).toBe("Nairobi JS Meetup");
    expect(cards[0].classes).toContain("tech");
    expect(cards[0].classes).toContain("online");
    expect(cards[0].datePart).toBe("17 Sep");
    expect(cards[0].pricePart).toBe("Free");
  });

  it("returns nothing for unrelated markup", () => {
    expect(parseVabuListing("<div>nothing here</div>")).toEqual([]);
  });
});

describe("parseVabuFanbase", () => {
  const html =
    `<article class="fanbase-content-card">` +
    `<a class="fanbase-content-card__media" href="/events/xyz"><img src="https://cdn.example/y.jpg" alt=""></a>` +
    `<h3><a href="/events/xyz">React Kenya Meetup</a></h3>` +
    `<p class="fanbase-content-card__date">Fri, Dec 05, 2026 · 8:00 AM</p>` +
    `<p class="fanbase-content-card__meta">iHub, Nairobi</p>` +
    `</article>`;

  it("reads the fixed ISO date and marks the org as force-tech", () => {
    const cards = parseVabuFanbase(html, "React Developers Kenya", true);
    expect(cards).toHaveLength(1);
    expect(cards[0].fixedISO).toBe("2026-12-05");
    expect(cards[0].forceTech).toBe(true);
    expect(cards[0].host).toBe("React Developers Kenya");
    expect(cards[0].url).toBe("https://vabu.app/events/xyz");
  });

  it("skips cards already marked as past", () => {
    const past = html.replace("<h3>", "Past event<h3>");
    expect(parseVabuFanbase(past, "Org", true)).toEqual([]);
  });
});

describe("parseLumaEvents", () => {
  const json = {
    entries: [
      {
        event: {
          name: "Africa Vibe Coders · Tech Happy Hour",
          start_at: "2026-09-17T15:00:00.000Z",
          end_at: "2026-09-17T18:00:00.000Z",
          url: "abc123",
          cover_url: "https://images.lumacdn.com/x.jpg",
          location_type: "offline",
          geo_address_info: { city: "Nairobi", address: "Kilimani" },
        },
        calendar: { name: "Africa Vibe Coders" },
      },
    ],
  };

  it("maps a luma entry into a Nairobi-local event", () => {
    const events = parseLumaEvents(json);
    expect(events).toHaveLength(1);
    expect(events[0].title).toContain("Tech Happy Hour");
    expect(events[0].date).toBe("2026-09-17");
    expect(events[0].startTime).toBe("18:00");
    expect(events[0].city).toBe("Nairobi");
    expect(events[0].url).toBe("https://lu.ma/abc123");
    expect(events[0].origin).toBe("luma");
  });

  it("survives a malformed payload", () => {
    expect(parseLumaEvents({})).toEqual([]);
    expect(parseLumaEvents(null)).toEqual([]);
  });
});

describe("parseDevpostEvents", () => {
  const json = {
    hackathons: [
      {
        title: "RevenueCat Shipaton 2026",
        url: "https://revenuecat-shipaton-2026.devpost.com/",
        submission_period_dates: "Jul 31 - Oct 01, 2026",
        displayed_location: { location: "Online" },
        themes: [{ name: "Design" }, { name: "Mobile" }],
        thumbnail_url: "//cdn.example/thumb.jpg",
        organization_name: "RevenueCat",
      },
    ],
  };

  it("parses the submission window into dates", () => {
    const events = parseDevpostEvents(json);
    expect(events).toHaveLength(1);
    expect(events[0].date).toBe("2026-07-31");
    expect(events[0].endDate).toBe("2026-10-01");
    expect(events[0].isOnline).toBe(true);
    expect(events[0].image).toBe("https://cdn.example/thumb.jpg");
    expect(events[0].topics).toContain("design");
  });

  it("drops entries with an unparseable date range", () => {
    expect(parseDevpostEvents({ hackathons: [{ title: "X", submission_period_dates: "soon" }] })).toEqual([]);
  });
});

describe("parseJsonLdEvents", () => {
  const html = `<html><head><script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[
      {"@type":"Organization","name":"Some Org"},
      {"@type":"Event","name":"Nairobi AI Meetup",
       "startDate":"2026-09-17T18:00:00+03:00","endDate":"2026-09-17T20:00:00+03:00",
       "location":{"@type":"Place","name":"iHub","address":{"@type":"PostalAddress","addressLocality":"Nairobi","streetAddress":"Senteu Plaza"}},
       "url":"https://example.org/e","offers":{"@type":"Offer","price":0,"priceCurrency":"KES"}}
    ]}
  </script></head><body></body></html>`;

  it("finds nested Event objects and maps place + offers", () => {
    const events = parseJsonLdEvents(html, "Example Org", "https://example.org");
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Nairobi AI Meetup");
    expect(events[0].date).toBe("2026-09-17");
    expect(events[0].endTime).toBe("20:00");
    expect(events[0].city).toBe("Nairobi");
    expect(events[0].venue).toBe("iHub, Senteu Plaza");
    expect(events[0].isFree).toBe(true);
    expect(events[0].origin).toBe("jsonld");
  });

  it("returns nothing when there is no JSON-LD", () => {
    expect(parseJsonLdEvents("<html></html>", "x", "https://x.org")).toEqual([]);
  });

  it("never throws on malformed JSON-LD", () => {
    expect(parseJsonLdEvents(`<script type="application/ld+json">{bad json</script>`, "x", "https://x.org")).toEqual([]);
  });
});

describe("parseIcsEvents", () => {
  it("reads a UTC VEVENT and converts it to Nairobi time", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:1",
      "SUMMARY:DevFest Nairobi",
      "DTSTART:20260917T080000Z",
      "DTEND:20260917T170000Z",
      "LOCATION:iHub\\, Nairobi",
      "URL:https://example.org/devfest",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const events = parseIcsEvents(ics, "GDG Nairobi");
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("DevFest Nairobi");
    expect(events[0].date).toBe("2026-09-17");
    expect(events[0].startTime).toBe("11:00");
    expect(events[0].city).toBe("Nairobi");
    expect(events[0].url).toBe("https://example.org/devfest");
  });

  it("handles a floating local time and an all-day date", () => {
    const ics = [
      "BEGIN:VEVENT",
      "SUMMARY:Floating",
      "DTSTART;TZID=Africa/Nairobi:20260917T183000",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "SUMMARY:All day summit",
      "DTSTART;VALUE=DATE:20260918",
      "END:VEVENT",
    ].join("\n");
    const events = parseIcsEvents(ics, "Feed");
    expect(events[0].startTime).toBe("18:30");
    expect(events[1].date).toBe("2026-09-18");
    expect(events[1].startTime).toBeNull();
  });

  it("ignores events with no title or start", () => {
    expect(parseIcsEvents("BEGIN:VEVENT\nSUMMARY:No date\nEND:VEVENT", "Feed")).toEqual([]);
  });
});
