import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, rateLimit, readMemo, sameOrigin, writeMemo } from "./apiGuard";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sameOrigin", () => {
  it("allows non-browser clients (no Origin header)", () => {
    expect(sameOrigin({ headers: { host: "app.vercel.app" } })).toBe(true);
    expect(sameOrigin({})).toBe(true);
  });
  it("allows matching same-origin POSTs", () => {
    expect(sameOrigin({ headers: { origin: "https://app.vercel.app", host: "app.vercel.app" } })).toBe(true);
    expect(
      sameOrigin({ headers: { origin: "https://app.vercel.app", "x-forwarded-host": "app.vercel.app" } })
    ).toBe(true);
  });
  it("rejects mismatched or unparseable Origins", () => {
    expect(sameOrigin({ headers: { origin: "https://evil.example", host: "app.vercel.app" } })).toBe(false);
    expect(sameOrigin({ headers: { origin: "not a url", host: "app.vercel.app" } })).toBe(false);
  });
});

describe("rateLimit", () => {
  it("allows up to max calls, then blocks within the window", () => {
    const now = 1_000_000;
    const key = "t1";
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000, now)).toBe(true);
    expect(rateLimit(key, 3, 60_000, now + 1)).toBe(false);
  });
  it("resets after the window elapses", () => {
    const key = "t2";
    expect(rateLimit(key, 1, 60_000, 1_000_000)).toBe(true);
    expect(rateLimit(key, 1, 60_000, 1_000_001)).toBe(false);
    expect(rateLimit(key, 1, 60_000, 1_000_000 + 60_000)).toBe(true);
  });
  it("keys are independent", () => {
    expect(rateLimit("a", 1, 60_000, 1_000_000)).toBe(true);
    expect(rateLimit("b", 1, 60_000, 1_000_000)).toBe(true);
    expect(rateLimit("a", 1, 60_000, 1_000_001)).toBe(false);
  });
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for entry", () => {
    expect(clientIp({ headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } })).toBe("1.2.3.4");
    expect(clientIp({ headers: {} })).toBe("unknown");
  });
});

describe("memo", () => {
  it("returns written values until the TTL expires", () => {
    writeMemo("k", { a: 1 }, 1_000_000);
    expect(readMemo<{ a: number }>("k", 60_000, 1_030_000)).toEqual({ a: 1 });
    expect(readMemo("k", 60_000, 1_060_001)).toBeNull();
  });
  it("missing keys read as null", () => {
    expect(readMemo("nope", 60_000)).toBeNull();
  });
});
