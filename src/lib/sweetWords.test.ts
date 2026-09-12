import { describe, expect, it } from "vitest";
import { getSweetGreeting, getTimeGreeting, pickSweetNote } from "./sweetWords";

const at = (h: number, m = 0) => new Date(2026, 8, 7, h, m);

describe("getTimeGreeting boundaries", () => {
  it.each([
    [4, 59, "Good night"],
    [5, 0, "Good morning"],
    [11, 59, "Good morning"],
    [12, 0, "Good afternoon"],
    [16, 59, "Good afternoon"],
    [17, 0, "Good evening"],
    [21, 59, "Good evening"],
    [22, 0, "Good night"],
  ])("%i:%i -> %s", (h, m, want) => {
    expect(getTimeGreeting(at(h, m))).toBe(want);
  });
});

describe("pickSweetNote", () => {
  it("is deterministic per seed", () => {
    expect(pickSweetNote("2026-09-07")).toBe(pickSweetNote("2026-09-07"));
  });
  it("returns a real sentence", () => {
    expect(pickSweetNote("2026-09-07").length).toBeGreaterThan(5);
  });
});

describe("getSweetGreeting", () => {
  it("returns greeting + note", () => {
    expect(getSweetGreeting(new Date(2026, 8, 7, 9), "2026-09-07")).toEqual({
      greeting: "Good morning",
      note: pickSweetNote("2026-09-07"),
    });
  });
});
