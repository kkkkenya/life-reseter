import { describe, expect, it } from "vitest";
import {
  collectJournalMedia,
  mediaRemotePath,
  pendingMediaUploads,
} from "./mediaSync";
import type { UserProfile } from "@/types";

function profileWith(mediaByDay: Record<number, { id: string; remote?: boolean }[]>): UserProfile {
  const journal: UserProfile["journal"] = {};
  for (const [day, refs] of Object.entries(mediaByDay)) {
    journal[Number(day)] = {
      day: Number(day),
      wentWell: "",
      couldImprove: "",
      tomorrowWin: "",
      mood: 5,
      media: refs.map((r) => ({ id: r.id, kind: "photo" as const, createdAt: "2026-09-07T00:00:00Z", remote: r.remote })),
      savedAt: "",
    };
  }
  return { journal } as UserProfile;
}

describe("mediaRemotePath", () => {
  it("scopes files to the owner's folder", () => {
    expect(mediaRemotePath("user-123", "photo-abc")).toBe("user-123/photo-abc");
  });
});

describe("collectJournalMedia", () => {
  it("gathers refs across days with their day attached", () => {
    const items = collectJournalMedia(profileWith({ 3: [{ id: "a" }], 5: [{ id: "b" }, { id: "c" }] }));
    expect(items).toHaveLength(3);
    expect(items.find((i) => i.ref.id === "b")?.day).toBe(5);
  });
  it("handles entries without media", () => {
    expect(collectJournalMedia(profileWith({}))).toEqual([]);
  });
});

describe("pendingMediaUploads", () => {
  it("picks only un-backed-up refs", () => {
    const items = collectJournalMedia(profileWith({ 3: [{ id: "a", remote: true }, { id: "b" }] }));
    expect(pendingMediaUploads(items).map((r) => r.id)).toEqual(["b"]);
  });
});
