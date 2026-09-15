import { afterEach, describe, expect, it, vi } from "vitest";
import { GOOGLE_CALENDAR_SCOPE, isTokenLive, listUpcomingEvents } from "./googleCalendar";

describe("isTokenLive", () => {
  it("is live well before expiry, dead within the safety margin", () => {
    const now = 1_000_000;
    expect(isTokenLive(now + 3_600_000, now)).toBe(true);
    expect(isTokenLive(now + 30_000, now)).toBe(false);
    expect(isTokenLive(now - 1_000, now)).toBe(false);
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
    await expect(listUpcomingEvents(token, "2026-09-14T00:00:00.000Z", "2026-09-20T23:59:59.000Z")).rejects.toThrow(
      "Invalid Credentials"
    );
  });
});
