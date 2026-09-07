import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_AI_FILL,
  MAX_EVENTS_PER_PULL,
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
    json: async () => (String(url).includes("direct-events") ? direct : ai),
  }));
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
