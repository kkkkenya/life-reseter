/** Google Calendar via Identity Services (GIS) token flow — no npm package.
 *
 *  Honest limits of a static frontend: access tokens live ~1 hour and there
 *  is no refresh token without a backend secret vault, so the status dot
 *  quietly goes red and the user taps to reconnect. Tokens live in memory
 *  only (never localStorage). Needs VITE_GOOGLE_CLIENT_ID from a Google
 *  Cloud OAuth client (type: Web application).
 */

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GIS_SRC = "https://accounts.google.com/gsi/client";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
export const isGoogleConfigured = Boolean(CLIENT_ID);

export interface GCalEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
}

let gisPromise: Promise<void> | null = null;

export function loadGisScript(): Promise<void> {
  if (typeof document === "undefined") return Promise.reject(new Error("Browser only."));
  if ((window as unknown as { google?: unknown }).google) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = GIS_SRC;
    tag.async = true;
    tag.defer = true;
    tag.onload = () => resolve();
    tag.onerror = () => {
      gisPromise = null;
      reject(new Error("Couldn't load Google sign-in. Check your connection."));
    };
    document.head.appendChild(tag);
  });
  return gisPromise;
}

export function getClientId(): string {
  if (!CLIENT_ID) throw new Error("Google Calendar isn't set up (VITE_GOOGLE_CLIENT_ID missing).");
  return CLIENT_ID;
}

/** True while a token plausibly still works (60s safety margin). */
export function isTokenLive(expiresAt: number, now: number = Date.now()): boolean {
  return expiresAt - now > 60_000;
}

async function gcal<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } })?.error?.message;
    throw new Error(msg || `Google Calendar request failed (${res.status})`);
  }
  return data as T;
}

export async function listUpcomingEvents(token: string, timeMinISO: string, timeMaxISO: string): Promise<GCalEvent[]> {
  const q = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    maxResults: "20",
  });
  const data = await gcal<{ items?: GCalEvent[] }>(token, `/calendars/primary/events?${q}`);
  return Array.isArray(data.items) ? data.items : [];
}

export function revokeToken(token: string): void {
  try {
    fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
  } catch {
    /* best-effort */
  }
}
