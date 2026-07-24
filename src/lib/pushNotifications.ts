import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/** True once a VAPID public key has been set — without it, subscribing is a no-op everywhere. */
export const isPushConfigured = Boolean(VAPID_PUBLIC_KEY);

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Streak reminders need somewhere server-side to look up "did this user finish today?" — that's cloud sync. */
export const streakRemindersAvailable = isPushConfigured && isSupabaseConfigured;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export function currentPermission(): NotificationPermission {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
}

/** True if this browser already holds an active push subscription (doesn't check Supabase). */
export async function hasActiveSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
}

/**
 * Requests notification permission, subscribes this browser to push, and saves
 * the subscription — endpoint, keys, IANA timezone, and the local hour to send
 * the nudge — to Supabase. The reminder cron job reads that row; it has no other
 * way to know a subscription belongs to a given account.
 */
export async function subscribeToStreakReminders(userId: string, reminderHour: number): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "Push notifications aren't supported in this browser." };
  if (!VAPID_PUBLIC_KEY) return { ok: false, error: "Push isn't configured on this deployment yet." };
  if (!supabase) return { ok: false, error: "Sign in to cloud sync first — reminders need it to find your account." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, error: "Notification permission was denied." };

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const json = sub.toJSON();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      timezone,
      reminder_hour: reminderHour,
      last_sent_date: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Changes just the reminder hour for an existing subscription (e.g. user picks a different time). */
export async function updateReminderHour(userId: string, reminderHour: number): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("push_subscriptions").update({ reminder_hour: reminderHour }).eq("user_id", userId);
  return !error;
}

export async function unsubscribeFromStreakReminders(userId: string): Promise<void> {
  if (isPushSupported()) {
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe().catch(() => {});
  }
  if (supabase) {
    await supabase.from("push_subscriptions").delete().eq("user_id", userId);
  }
}
