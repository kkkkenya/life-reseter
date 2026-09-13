import { afterEach, describe, expect, it, vi } from "vitest";
import { loadSourceHealth, recordSourceHealth } from "./eventHealth";

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recordSourceHealth", () => {
  it("merges each pull into the stored history", () => {
    mockStorage();
    recordSourceHealth([{ id: "a", label: "A", url: "https://a", ok: true, count: 2 }], "2026-09-08T10:00:00Z");
    recordSourceHealth([{ id: "b", label: "B", url: "https://b", ok: true, count: 1 }], "2026-09-08T11:00:00Z");
    const all = loadSourceHealth();
    expect(all.map((h) => h.id).sort()).toEqual(["a", "b"]);
    const a = all.find((h) => h.id === "a");
    expect(a?.lastCount).toBe(2); // untouched by the second pull
    expect(a?.lastCheckedAt).toBe("2026-09-08T10:00:00Z");
  });

  it("a failed or partial pull preserves the rest of the history", () => {
    mockStorage();
    recordSourceHealth([{ id: "a", label: "A", url: "https://a", ok: true, count: 2 }], "2026-09-08T10:00:00Z");
    recordSourceHealth([], "2026-09-08T11:00:00Z");
    const all = loadSourceHealth();
    expect(all.length).toBe(1);
    expect(all[0].ok).toBe(true);
  });

  it("a source failing keeps its last good time but flips to offline", () => {
    mockStorage();
    recordSourceHealth([{ id: "a", label: "A", url: "https://a", ok: true, count: 2 }], "2026-09-08T10:00:00Z");
    recordSourceHealth([{ id: "a", label: "A", url: "https://a", ok: false, count: 0 }], "2026-09-08T11:00:00Z");
    const a = loadSourceHealth()[0];
    expect(a.ok).toBe(false);
    expect(a.lastOkAt).toBe("2026-09-08T10:00:00Z");
    expect(a.lastCheckedAt).toBe("2026-09-08T11:00:00Z");
    expect(a.lastCount).toBe(0);
  });

  it("sources reporting in for the first time are appended", () => {
    mockStorage();
    recordSourceHealth([{ id: "a", label: "A", url: "https://a", ok: true, count: 1 }], "2026-09-08T10:00:00Z");
    const next = recordSourceHealth(
      [
        { id: "a", label: "A", url: "https://a", ok: true, count: 3 },
        { id: "z", label: "Z", url: "https://z", ok: false, count: 0 },
      ],
      "2026-09-08T12:00:00Z"
    );
    expect(next.map((h) => h.id)).toEqual(["a", "z"]);
    expect(next[0].count).toBe(3);
  });
});
