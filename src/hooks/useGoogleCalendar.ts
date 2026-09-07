import { useCallback, useEffect, useState } from "react";
import {
  GOOGLE_CALENDAR_SCOPE,
  getClientId,
  insertCalendarEvent,
  isGoogleConfigured,
  isTokenLive,
  listUpcomingEvents,
  loadGisScript,
  revokeToken,
  type GCalEvent,
  type GCalInsert,
} from "@/lib/googleCalendar";

interface TokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void;
}

// Module-level session: every hook instance (status dot, Today, sheets)
// shares one token. Memory only — a refresh starts disconnected (red dot).
const subs = new Set<() => void>();
let sharedToken: string | null = null;
let sharedExpiry = 0;
function setShared(token: string | null, expiry: number) {
  sharedToken = token;
  sharedExpiry = expiry;
  subs.forEach((fn) => fn());
}

function getTokenClient(
  callback: (token: string, expiresInSec: number) => void,
  onError: (message: string) => void
): TokenClient {
  const google = (window as unknown as {
    google?: { accounts?: { oauth2?: { initTokenClient: (c: object) => TokenClient } } };
  }).google;
  const init = google?.accounts?.oauth2?.initTokenClient;
  if (!init) throw new Error("Google sign-in didn't load. Try again.");
  return init({
    client_id: getClientId(),
    scope: GOOGLE_CALENDAR_SCOPE,
    callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => {
      if (resp.error || !resp.access_token) {
        onError("Google sign-in was cancelled or blocked.");
        return;
      }
      callback(resp.access_token, resp.expires_in ?? 3600);
    },
    error_callback: () => {
      onError("Google sign-in was dismissed. Tap to try again.");
    },
  });
}

let sharedClient: TokenClient | null = null;

/** Google Calendar connection: shared in-memory token, green while live. */
export function useGoogleCalendar() {
  // Version ticks whenever the shared session changes, so every hook
  // instance re-renders (module values alone can't trigger renders).
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fn = () => setVersion((v) => v + 1);
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, []);

  // Re-render when the token lapses so dots flip green -> red on their own.
  // No reschedule once lapsed: isTokenLive false ends the chain.
  useEffect(() => {
    void version; // re-arm on every session change (module values can't be deps)
    if (!sharedToken || !isTokenLive(sharedExpiry)) return;
    const ms = Math.max(0, sharedExpiry - Date.now()) + 1000;
    const t = window.setTimeout(() => setVersion((v) => v + 1), ms);
    return () => window.clearTimeout(t);
  }, [version]);

  const connected = Boolean(sharedToken && isTokenLive(sharedExpiry));

  const connect = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await loadGisScript();
      const fail = (message: string) => {
        setBusy(false);
        setError(message);
      };
      const client =
        sharedClient ??
        getTokenClient(
          (t, secs) => {
            setShared(t, Date.now() + secs * 1000);
            setBusy(false);
          },
          fail
        );
      sharedClient = client;
      client.requestAccessToken({ prompt: "consent" });
      // Busy clears in the token/error callback above.
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Google sign-in failed.");
    }
  }, []);

  const disconnect = useCallback(() => {
    if (sharedToken) revokeToken(sharedToken);
    setShared(null, 0);
  }, []);

  const list = useCallback(async (fromISO: string, toISO: string): Promise<GCalEvent[]> => {
    if (!sharedToken) throw new Error("Connect Google Calendar first.");
    const from = new Date(`${fromISO}T00:00:00`).toISOString();
    const to = new Date(`${toISO}T23:59:59`).toISOString();
    return listUpcomingEvents(sharedToken, from, to);
  }, []);

  const insert = useCallback(async (body: GCalInsert): Promise<GCalEvent> => {
    if (!sharedToken) throw new Error("Connect Google Calendar first.");
    return insertCalendarEvent(sharedToken, body);
  }, []);

  return { configured: isGoogleConfigured, connected, busy, error, connect, disconnect, list, insert };
}
