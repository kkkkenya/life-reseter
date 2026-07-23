import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { pullProfile, pushProfile, isSupabaseConfigured } from "@/lib/supabaseSync";

export type SyncStatus = "offline" | "idle" | "syncing" | "synced" | "error";

const PUSH_DEBOUNCE_MS = 1500;

/**
 * Keeps the local zustand store in sync with the user's Supabase row.
 *
 * Reconciliation model (deliberately simple, not a field-level merge):
 * - On sign-in, if a remote profile already exists, it REPLACES local state —
 *   the assumption is you're picking up where another device left off.
 * - If no remote profile exists yet (first sign-in), the current local
 *   profile is pushed up to seed it.
 * - Every change after that debounce-pushes to Supabase (last write wins).
 *
 * Two devices editing offline at the same time will still clobber each
 * other on next sync — this is a single-user convenience layer, not
 * conflict-free multi-device merging.
 */
export function useCloudSync(userId: string | undefined): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(isSupabaseConfigured ? "idle" : "offline");
  const hydratedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    let cancelled = false;
    hydratedForUser.current = null;
    setStatus("syncing");

    (async () => {
      const remote = await pullProfile(userId);
      if (cancelled) return;

      if (remote) {
        useAppStore.getState().hydrateFromRemote(remote);
      } else {
        const local = useAppStore.getState().profile;
        if (local.onboarded) await pushProfile(userId, local);
      }
      hydratedForUser.current = userId;
      setStatus("synced");
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = useAppStore.subscribe((state) => {
      if (hydratedForUser.current !== userId) return; // ignore changes made during initial hydration
      if (timer) clearTimeout(timer);
      setStatus("syncing");
      timer = setTimeout(async () => {
        const ok = await pushProfile(userId, state.profile);
        setStatus(ok ? "synced" : "error");
      }, PUSH_DEBOUNCE_MS);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [userId]);

  return status;
}
