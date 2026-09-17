import { describe, expect, it } from "vitest";
import { gcalEventUrl, type GcalLinkEvent } from "./gcalLink";

const ev = (over: Partial<GcalLinkEvent> & { title: string; date: string }): GcalLinkEvent => ({
  endDate: null,
  startTime: "10:00",
  endTime: "11:00",
  city: null,
  venue: null,
  isOnline: false,
  url: null,
  source: null,
  ...over,
});

describe("gcalEventUrl", () => {
  it("builds a zero-config TEMPLATE link with floating Nairobi times", () => {
    const url = new URL(
      gcalEventUrl(ev({ title: "Nairobi JS Meetup", date: "2026-09-15", startTime: "18:00", endTime: "20:00", venue: "iHub", city: "Nairobi", source: "Vabu", url: "https://lu.ma/x" }))
    );
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    const q = url.searchParams;
    expect(q.get("action")).toBe("TEMPLATE");
    expect(q.get("text")).toBe("Nairobi JS Meetup");
    expect(q.get("dates")).toBe("20260915T180000/20260915T200000");
    expect(q.get("ctz")).toBe("Africa/Nairobi");
    expect(q.get("location")).toBe("iHub, Nairobi");
    expect(q.get("details")).toContain("Host: Vabu");
    expect(q.get("details")).toContain("https://lu.ma/x");
  });

  it("falls back to all-day with an exclusive end date when untimed", () => {
    const q = new URL(gcalEventUrl(ev({ title: "DevConf", date: "2026-09-15", startTime: null, endTime: null }))).searchParams;
    expect(q.get("dates")).toBe("20260915/20260916");
  });

  it("spans multi-day events across the endDate", () => {
    const q = new URL(
      gcalEventUrl(ev({ title: "Shipathon", date: "2026-09-08", endDate: "2026-10-01", startTime: "09:00", endTime: "17:00" }))
    ).searchParams;
    expect(q.get("dates")).toBe("20260908T090000/20261001T170000");
    // untimed multi-day: all-day across every day covered (exclusive end)
    const q2 = new URL(gcalEventUrl(ev({ title: "Shipathon", date: "2026-09-08", endDate: "2026-09-10", startTime: null }))).searchParams;
    expect(q2.get("dates")).toBe("20260908/20260911");
  });

  it("defaults a missing end time to one hour and rolls past midnight", () => {
    const q = new URL(gcalEventUrl(ev({ title: "Late demo", date: "2026-09-15", startTime: "23:30", endTime: null }))).searchParams;
    expect(q.get("dates")).toBe("20260915T233000/20260916T003000");
  });

  it("treats an endTime before startTime on the same day as missing", () => {
    const q = new URL(gcalEventUrl(ev({ title: "Bad data", date: "2026-09-15", startTime: "18:00", endTime: "09:00" }))).searchParams;
    expect(q.get("dates")).toBe("20260915T180000/20260915T190000");
  });

  it("marks online events and drops empty params", () => {
    const q = new URL(gcalEventUrl(ev({ title: "Stream", date: "2026-09-15", isOnline: true, venue: null, city: null, source: null, url: null }))).searchParams;
    expect(q.get("location")).toBe("Online");
    expect(q.has("details")).toBe(false);
  });

  it("round-trips awkward titles through the query encoding", () => {
    const q = new URL(gcalEventUrl(ev({ title: "AI & Robots: Kenya's Future?", date: "2026-09-15" }))).searchParams;
    expect(q.get("text")).toBe("AI & Robots: Kenya's Future?");
  });
});
