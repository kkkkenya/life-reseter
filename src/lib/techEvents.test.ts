import { afterEach, describe, expect, it, vi } from "vitest";
import { loadSourceHealth } from "./eventHealth";
import {
  MAX_AI_FILL,
  MAX_EVENTS_PER_PULL,
  coveredDays,
  eventCoversDay,
  eventKey,
  fetchTechEvents,
  getWeekRange,
  mapsLink,
  normalizeEvent,
  type TechEvent,
} from "./techEvents";

function mockStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  });
}

const ev = (over: Partial<TechEvent> & { title: string; date: string }): TechEvent => ({
  endDate: null,
  startTime: "10:00",
  endTime: "11:00",
  city: null,
  venue: null,
  isOnline: false,
  url: null,
  image: null,
  source: null,
  origin: "vabu",
  isFree: true,
  priceText: "Free",
  topics: [],
  ...over,
});

function mockFetch(directEvents: unknown[], aiEvents: unknown[]) {
  const direct = {
    events: directEvents,
    sources: [{ id: "vabu", label: "Vabu", url: "https://vabu.app/events", ok: true, count: 1 }],
    fetchedAt: new Date().toISOString(),
  };
  const ai = { events: aiEvents, hubs: [] };
  const fn = vi.fn(async (url: string) => ({
    ok: true,
    json: async () => (String(url).includes("direct-events") ? direct : ai),
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

function mockFetchFailing(status = 500) {
  const fn = vi.fn(async () => ({ ok: false, status, json: async () => ({}) }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getWeekRange", () => {
  it("anchors Monday-start weeks", () => {
    const { weekStart, weekEnd } = getWeekRange(new Date(2026, 8, 9)); // a Wednesday
    expect(weekStart).toBe("2026-09-07");
    expect(weekEnd).toBe("2026-09-13");
    expect(new Date(`${weekStart}T00:00:00`).getDay()).toBe(1);
  });
});

describe("normalizeEvent", () => {
  it("rejects empty and impossible dates", () => {
    expect(normalizeEvent({})).toBeNull();
    expect(normalizeEvent({ title: "X", date: "2026-02-30" })).toBeNull();
  });
  it("keeps new direct fields", () => {
    const n = normalizeEvent({
      title: "S",
      date: "2026-09-17",
      endDate: "2026-09-18",
      image: "https://x/y.jpg",
      origin: "vabu",
      topics: ["ai", "bogus"],
    });
    expect(n?.endDate).toBe("2026-09-18");
    expect(n?.image).toBe("https://x/y.jpg");
    expect(n?.origin).toBe("vabu");
    expect(n?.topics).toEqual(["ai"]);
  });
});

describe("eventKey + mapsLink + caps", () => {
  it("keys ignore title case", () => {
    expect(eventKey({ title: "ABC", date: "2026-09-17" })).toBe(eventKey({ title: "abc", date: "2026-09-17" }));
  });
  it("mapsLink skips online and venue-less events", () => {
    expect(mapsLink({ isOnline: true, city: "Nairobi", venue: "iHub" })).toBeNull();
    expect(mapsLink({ isOnline: false, city: null, venue: null })).toBeNull();
    expect(mapsLink({ isOnline: false, city: "Nairobi", venue: "iHub" })).toContain("google.com/maps");
  });
  it("caps hold", () => {
    expect(MAX_EVENTS_PER_PULL).toBe(20);
    expect(MAX_AI_FILL).toBe(8);
  });
});

describe("fetchTechEvents merge", () => {
  it("merges direct + AI fill, direct wins dedupes", async () => {
    mockStorage();
    const { weekStart } = getWeekRange();
    mockFetch(
      [ev({ title: "VabuConf", date: weekStart, origin: "vabu" })],
      [
        ev({ title: "VabuConf", date: weekStart, origin: "ai", isOnline: true }),
        ev({ title: "Online Summit", date: weekStart, origin: "ai", isOnline: true }),
      ]
    );
    const res = await fetchTechEvents(true);
    expect(res.events.map((e) => e.title).sort()).toEqual(["Online Summit", "VabuConf"]);
    expect(res.events.find((e) => e.title === "VabuConf")?.origin).toBe("vabu");
    expect(res.aiFill).toBe(1);
  });

  it("caps the AI fill", async () => {
    mockStorage();
    const { weekStart } = getWeekRange();
    const many = Array.from({ length: 12 }, (_, i) => ev({ title: `AI ${i}`, date: weekStart, origin: "ai", isOnline: true }));
    mockFetch([], many);
    const res = await fetchTechEvents(true);
    expect(res.events.length).toBe(MAX_AI_FILL);
    expect(res.aiFill).toBe(MAX_AI_FILL);
  });

  it("serves the second call from cache without fetching", async () => {
    mockStorage();
    const { weekStart } = getWeekRange();
    const fn = mockFetch([ev({ title: "Cached", date: weekStart })], []);
    await fetchTechEvents(true);
    const before = fn.mock.calls.length;
    const res = await fetchTechEvents(false);
    expect(fn.mock.calls.length).toBe(before);
    expect(res.source).toBe("cache");
    expect(res.events[0]?.title).toBe("Cached");
  });

  it("survives both endpoints failing", async () => {
    mockStorage();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      })
    );
    const res = await fetchTechEvents(true);
    expect(res.events).toEqual([]);
    expect(res.hubs.length).toBeGreaterThan(0);
  });
});

describe("fetchTechEvents failure handling", () => {
  it("serves the last good feed as stale when a refresh fails", async () => {
    mockStorage();
    const { weekStart } = getWeekRange();
    mockFetch([ev({ title: "Good", date: weekStart })], []);
    await fetchTechEvents(true);

    mockFetchFailing();
    const res = await fetchTechEvents(true);
    expect(res.stale).toBe(true);
    expect(res.events.map((e) => e.title)).toEqual(["Good"]);
  });

  it("a failed pull never overwrites the good cache", async () => {
    mockStorage();
    const { weekStart } = getWeekRange();
    mockFetch([ev({ title: "Good", date: weekStart })], []);
    await fetchTechEvents(true);

    mockFetchFailing();
    await fetchTechEvents(true);

    mockFetch([ev({ title: "Good", date: weekStart })], []);
    const again = await fetchTechEvents(true);
    expect(again.stale).toBeUndefined();
    expect(again.events.map((e) => e.title)).toEqual(["Good"]);
    expect(again.source).toBe("direct");
  });

  it("a failed pull with no history is a fallback and stays uncached", async () => {
    mockStorage();
    const fn = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", fn);
    const res = await fetchTechEvents(true);
    expect(res.events).toEqual([]);
    expect(res.source).toBe("fallback");
    expect(res.stale).toBeUndefined();

    const calls = fn.mock.calls.length;
    await fetchTechEvents(false); // no cache was written → this must hit the network again
    expect(fn.mock.calls.length).toBe(calls + 2);
  });

  it("a failed pull preserves source-health history", async () => {
    mockStorage();
    const { weekStart } = getWeekRange();
    mockFetch([ev({ title: "Good", date: weekStart })], []);
    await fetchTechEvents(true);
    expect(loadSourceHealth().length).toBeGreaterThan(0);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      })
    );
    await fetchTechEvents(true);
    expect(loadSourceHealth().length).toBeGreaterThan(0);
  });
});

describe("eventCoversDay + coveredDays", () => {
  it("multi-day events cover every day they span", () => {
    const e = { date: "2026-09-08", endDate: "2026-09-10" };
    expect(eventCoversDay(e, "2026-09-08")).toBe(true);
    expect(eventCoversDay(e, "2026-09-09")).toBe(true);
    expect(eventCoversDay(e, "2026-09-10")).toBe(true);
    expect(eventCoversDay(e, "2026-09-11")).toBe(false);
    expect(eventCoversDay(e, "2026-09-07")).toBe(false);
  });

  it("single-day events only cover their own date", () => {
    expect(eventCoversDay({ date: "2026-09-08", endDate: null }, "2026-09-08")).toBe(true);
    expect(eventCoversDay({ date: "2026-09-08", endDate: null }, "2026-09-09")).toBe(false);
  });

  it("coveredDays caps the planner blocks", () => {
    expect(coveredDays({ date: "2026-09-08", endDate: "2026-09-09" })).toEqual(["2026-09-08", "2026-09-09"]);
    expect(coveredDays({ date: "2026-08-01", endDate: "2026-10-01" })).toEqual([
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
    expect(coveredDays({ date: "2026-09-08", endDate: null })).toEqual(["2026-09-08"]);
  });
});
