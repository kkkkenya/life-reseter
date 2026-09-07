import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  MAX_AUDIO_PER_ENTRY,
  MAX_PHOTOS_PER_ENTRY,
  deleteMediaBlob,
  getMediaBlob,
  newMediaId,
  saveMediaBlob,
} from "./mediaStore";

describe("newMediaId", () => {
  it("prefixes by kind and stays unique", () => {
    const a = newMediaId("photo");
    const b = newMediaId("photo");
    expect(a.startsWith("photo-")).toBe(true);
    expect(newMediaId("audio").startsWith("audio-")).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("media blob roundtrip (IndexedDB)", () => {
  it("saves, reads, and deletes", async () => {
    const id = newMediaId("photo");
    const blob = new Blob(["hello-bytes"], { type: "image/jpeg" });
    await saveMediaBlob(id, blob);
    const back = await getMediaBlob(id);
    expect(back).not.toBeNull();
    expect(back?.size).toBe(blob.size);
    expect(await back?.text()).toBe("hello-bytes");
    await deleteMediaBlob(id);
    expect(await getMediaBlob(id)).toBeNull();
  });

  it("returns null for unknown ids and tolerates double delete", async () => {
    expect(await getMediaBlob("photo-missing")).toBeNull();
    await deleteMediaBlob("photo-missing");
  });
});

describe("per-entry caps", () => {
  it("are sane constants", () => {
    expect(MAX_PHOTOS_PER_ENTRY).toBeGreaterThan(0);
    expect(MAX_AUDIO_PER_ENTRY).toBeGreaterThan(0);
  });
});
