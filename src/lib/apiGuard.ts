/**
 * apiGuard.ts — shared guards for the POST endpoints that proxy paid Gemini
 * calls. Three cheap layers, honest about their limits:
 *
 * 1. sameOrigin — browsers always attach Origin to cross-origin POSTs, so a
 *    mismatched or invalid Origin is rejected. Not real auth (curl can omit
 *    the header), but it kills drive-by browser abuse.
 * 2. rateLimit — per-IP counter in module memory. Serverless instances don't
 *    share state and get recycled, so this is spam damping, not a quota.
 * 3. memo — per-key TTL result cache. Repeat pulls within the TTL never
 *    reach Gemini, which is the part that actually costs money.
 */

type HeadersLike = Record<string, string | string[] | undefined>;

export function sameOrigin(req: { headers?: HeadersLike }): boolean {
  const origin = req.headers?.origin;
  if (typeof origin !== "string" || !origin) return true; // non-browser client
  const host = req.headers?.["x-forwarded-host"] ?? req.headers?.host;
  const hostStr = (Array.isArray(host) ? host[0] : host)?.split(",")[0]?.trim();
  if (!hostStr) return true;
  try {
    return new URL(origin).host === hostStr;
  } catch {
    return false;
  }
}

const hits = new Map<string, { n: number; resetAt: number }>();

/** True when `key` is still under `max` calls per `windowMs`. */
export function rateLimit(key: string, max: number, windowMs: number, now: number = Date.now()): boolean {
  const h = hits.get(key);
  if (!h || h.resetAt <= now) {
    if (hits.size > 500) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    hits.set(key, { n: 1, resetAt: now + windowMs });
    return true;
  }
  h.n += 1;
  return h.n <= max;
}

export function clientIp(req: { headers?: HeadersLike }): string {
  const raw = req.headers?.["x-forwarded-for"];
  const first = (Array.isArray(raw) ? raw[0] : raw)?.split(",")[0]?.trim();
  return first || "unknown";
}

const memos = new Map<string, { at: number; value: unknown }>();

export function readMemo<T>(key: string, ttlMs: number, now: number = Date.now()): T | null {
  const m = memos.get(key);
  if (!m) return null;
  if (now - m.at > ttlMs) {
    memos.delete(key);
    return null;
  }
  return m.value as T;
}

export function writeMemo<T>(key: string, value: T, now: number = Date.now()): void {
  if (memos.size > 100) memos.clear(); // keyspace is tiny (one per week) — just cycle it
  memos.set(key, { at: now, value });
}
