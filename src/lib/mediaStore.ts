/** Device-local media blobs for journaling (handwritten pages, voice notes).
 *
 *  Why IndexedDB and not localStorage: a single phone photo as base64 would
 *  eat most of the ~5MB localStorage quota and evict the whole profile.
 *  IndexedDB gives tens of MB+. Only tiny metadata refs live in the synced
 *  profile JSON; blobs never leave this device (cloud backup for media is a
 *  separate Supabase Storage job — the UI says so honestly).
 */

export type JournalMediaKind = "photo" | "audio";

export const MAX_PHOTOS_PER_ENTRY = 6;
export const MAX_AUDIO_PER_ENTRY = 3;
export const MAX_PHOTO_DIM = 1280;
export const MAX_AUDIO_UPLOAD_BYTES = 15 * 1024 * 1024;

const DB_NAME = "life-reset-media";
const STORE = "blobs";

export function newMediaId(kind: JournalMediaKind): string {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Media storage isn't available in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error("Couldn't open media storage."));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => {
          resolve(req.result);
          db.close();
        };
        req.onerror = () => {
          reject(new Error("Media storage failed."));
          db.close();
        };
      })
  );
}

export function saveMediaBlob(id: string, blob: Blob): Promise<void> {
  return tx("readwrite", (s) => s.put({ id, blob, savedAt: new Date().toISOString() })).then(() => undefined);
}

export function getMediaBlob(id: string): Promise<Blob | null> {
  return tx("readonly", (s) => s.get(id)).then((row) => {
    const rec = row as { blob?: Blob } | undefined;
    return rec?.blob instanceof Blob ? rec.blob : null;
  });
}

export function deleteMediaBlob(id: string): Promise<void> {
  return tx("readwrite", (s) => s.delete(id)).then(() => undefined);
}

/** Downscale a photo for journal storage (handwriting stays legible at 1280px). */
export function downscalePhoto(file: Blob, maxDim = MAX_PHOTO_DIM, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process that photo."))),
          "image/jpeg",
          quality
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e instanceof Error ? e : new Error("Couldn't process that photo."));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a readable image."));
    };
    img.src = url;
  });
}
