import { describe, expect, it } from "vitest";
import { EVENT_SOURCES, fetchSources, directorySources, sourceById } from "./eventSources";

const VALID_KINDS = ["vabu-listing", "vabu-org", "luma", "devpost", "jsonld", "ics"];

describe("event source registry", () => {
  it("has unique ids", () => {
    const ids = EVENT_SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses https for every link", () => {
    for (const s of EVENT_SOURCES) {
      expect(s.homepage).toMatch(/^https:\/\//);
      expect(s.searchUrl).toMatch(/^https:\/\//);
    }
  });

  it("gives every fetcher a valid kind and https url", () => {
    const fetchers = fetchSources();
    expect(fetchers.length).toBeGreaterThanOrEqual(3);
    for (const s of fetchers) {
      expect(s.fetch).toBeDefined();
      expect(VALID_KINDS).toContain(s.fetch!.kind);
      expect(s.fetch!.url).toMatch(/^https:\/\//);
    }
  });

  it("keeps the verified deterministic sources wired up", () => {
    const ids = fetchSources().map((s) => s.id);
    expect(ids).toContain("vabu");
    expect(ids).toContain("luma-nairobi");
    expect(ids).toContain("devpost");
  });

  it("covers Kenya and Global in the directory", () => {
    const regions = new Set(directorySources().map((s) => s.region));
    expect(regions.has("Kenya")).toBe(true);
    expect(regions.has("Global")).toBe(true);
    expect(directorySources().length).toBeGreaterThanOrEqual(20);
  });

  it("resolves a source by id", () => {
    expect(sourceById("vabu")?.name).toBeTruthy();
    expect(sourceById("nope")).toBeUndefined();
  });
});
