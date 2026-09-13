import { afterEach, describe, expect, it, vi } from "vitest";
import { GOOGLE_CALENDAR_SCOPE, buildEventInsert, insertCalendarEvent, isTokenLive, listUpcomingEvents } from "./googleCalendar";

describe("isTokenLive", () => {
  it("is live well before expiry, dead within the safety margin", () => {
    const now = 1_000_000;
    expect(isTokenLive(now + 3_600_000, now)).toBe(true);
    expect(isTokenLive(now + 30_000, now)).toBe(false);
    expect(isTokenLive(now - 1_000, now)).toBe(false);
  });
});

describe("buildEventInsert", () => {
  it("builds a Calendar API body", () => {
    const body = buildEventInsert({
      label: "EMT 101",
      date: "2026-09-08",
      startTime: "08:00",
      endTime: "10:00",
      location: "LT 3",
    });
    expect(body.summary).toBe("EMT 101");
    expect(body.location).toBe("LT 3");
    expect(body.start.dateTime).toBe("2026-09-08T08:00:00");
    expect(body.end.dateTime).toBe("2026-09-08T10:00:00");
    expect(typeof body.start.timeZone).toBe("string");
  });
  it("never ends before it starts", () => {
    const body = buildEventInsert({ label: "X", date: "2026-09-08", startTime: "18:00", endTime: "09:00" });
    expect(body.end.dateTime).toBe("2026-09-08T18:00:00");
  });
  it("spans multi-day events across the endDate", () => {
    const body = buildEventInsert({
      label: "Shipathon",
      date: "2026-09-08",
      endDate: "2026-10-01",
      startTime: "18:00",
      endTime: "19:00",
    });
    expect(body.start.dateTime).toBe("2026-09-08T18:00:00");
    expect(body.end.dateTime).toBe("2026-10-01T19:00:00");
  });
  it("treats an endDate equal to the start as same-day", () => {
    const body = buildEventInsert({
      label: "X",
      date: "2026-09-08",
      endDate: "2026-09-08",
      startTime: "18:00",
      endTime: "09:00",
    });
    expect(body.end.dateTime).toBe("2026-09-08T18:00:00");
  });
  it("omits empty location", () => {
    expect(buildEventInsert({ label: "X", date: "2026-09-08", startTime: "08:00", endTime: "09:00" }).location).toBeUndefined();
  });
});

describe("scope", () => {
  it("uses the narrow events scope, not full calendar", () => {
    expect(GOOGLE_CALENDAR_SCOPE).toBe("https://www.googleapis.com/auth/calendar.events");
  });
});

describe("Calendar API requests", () => {
  const token = "ya29.test-token";

  function mockFetch(response: unknown, status = 200) {
    const fn = vi.fn(async (url: string, init?: RequestInit) => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => response,
      url,
      init,
    }));
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("insert posts the exact Calendar v3 body with bearer auth", async () => {
    const fn = mockFetch({ id: "evt_1", htmlLink: "https://calendar.google.com/e1" });
    const body = buildEventInsert({ label: "EMT 101", date: "2026-09-18", startTime: "08:00", endTime: "10:00", location: "LT 3" });
    const out = await insertCalendarEvent(token, body);
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${token}`);
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    const sent = JSON.parse(init?.body as string);
    expect(sent.summary).toBe("EMT 101");
    expect(sent.start.timeZone).toBe(typeof sent.end.timeZone === "string" ? sent.end.timeZone : "");
    expect(sent.start.dateTime).toBe("2026-09-18T08:00:00");
    expect(out.id).toBe("evt_1");
  });

  it("list queries singleEvents ordered with the right window", async () => {
    const fn = mockFetch({ items: [{ id: "g1", summary: "Hackathon" }] });
    const events = await listUpcomingEvents(token, "2026-09-14T00:00:00.000Z", "2026-09-20T23:59:59.000Z");
    const [url, init] = fn.mock.calls[0];
    expect(url).toContain("https://www.googleapis.com/calendar/v3/calendars/primary/events?");
    expect(url).toContain("singleEvents=true");
    expect(url).toContain("orderBy=startTime");
    expect(url).toContain("timeMin=2026-09-14T00");
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${token}`);
    expect(events.map((e) => e.id)).toEqual(["g1"]);
  });

  it("surfaces Google's error message on failure", async () => {
    mockFetch({ error: { message: "Invalid Credentials" } }, 401);
    await expect(
      insertCalendarEvent(token, buildEventInsert({ label: "X", date: "2026-09-18", startTime: "08:00", endTime: "09:00" }))
    ).rejects.toThrow("Invalid Credentials");
  });
});
