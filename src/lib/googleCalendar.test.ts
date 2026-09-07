import { describe, expect, it } from "vitest";
import { GOOGLE_CALENDAR_SCOPE, buildEventInsert, isTokenLive } from "./googleCalendar";

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
  it("omits empty location", () => {
    expect(buildEventInsert({ label: "X", date: "2026-09-08", startTime: "08:00", endTime: "09:00" }).location).toBeUndefined();
  });
});

describe("scope", () => {
  it("uses the narrow events scope, not full calendar", () => {
    expect(GOOGLE_CALENDAR_SCOPE).toBe("https://www.googleapis.com/auth/calendar.events");
  });
});
