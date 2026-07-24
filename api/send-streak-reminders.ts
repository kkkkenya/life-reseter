// Runs on Vercel's server, triggered by Vercel Cron (see vercel.json) — never in
// the browser. Uses the Supabase SERVICE ROLE key, which bypasses Row Level
// Security. That's necessary here (the job has to check every subscribed user,
// not just one signed-in session) and it's the ONLY place in this app that key
// is used. It must be set as SUPABASE_SERVICE_ROLE_KEY (no VITE_ prefix) so Vite
// never inlines it into the client bundle.
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:hello@example.com";

/** Mirrors src/lib/planGenerator.ts#programDayFromDate — duplicated rather than
 *  imported because this function runs in a separate (Node, non-Vite) bundle
 *  where the "@/" alias isn't resolved. Keep these two in sync if that logic changes. */
function programDayFromDate(startDate: string, todayIso: string): number {
  const start = new Date(startDate + "T00:00:00");
  const today = new Date(todayIso + "T00:00:00");
  const diff = Math.round((today.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

/** Current local date (YYYY-MM-DD) and hour (0-23) in an IANA timezone. */
function localDateAndHour(timezone: string): { date: string; hour: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour")) % 24; // some locales report midnight as "24"
  return { date, hour };
}

export default async function handler(req: any, res: any) {
  // Vercel sets this header automatically on cron-triggered requests when
  // CRON_SECRET is configured — rejects anyone else from hitting this endpoint.
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    res.status(501).json({ error: "Supabase isn't configured on the server (SUPABASE_SERVICE_ROLE_KEY missing)." });
    return;
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    res.status(501).json({ error: "VAPID keys aren't configured on the server." });
    return;
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: subs, error: subsError } = await admin.from("push_subscriptions").select("*");
  if (subsError) {
    res.status(502).json({ error: subsError.message });
    return;
  }

  let sent = 0;
  let skipped = 0;
  let removed = 0;

  for (const sub of subs ?? []) {
    const { date, hour } = localDateAndHour(sub.timezone || "UTC");

    // Not their hour, or we already handled them today — nothing to do.
    if (hour !== sub.reminder_hour || sub.last_sent_date === date) {
      skipped++;
      continue;
    }

    const { data: profileRow } = await admin
      .from("life_reset_profiles")
      .select("data")
      .eq("user_id", sub.user_id)
      .maybeSingle();
    const profile = profileRow?.data as
      | { startDate: string | null; days: Record<number, { tasks: Record<string, string> }>; dayCompleteShown?: Record<string, boolean> }
      | undefined;

    let alreadyDone = false;
    if (profile?.startDate) {
      const day = programDayFromDate(profile.startDate, date);
      const statuses = Object.values(profile.days?.[day]?.tasks ?? {});
      const pending = statuses.filter((s) => s === "pending").length;
      const done = statuses.filter((s) => s === "done").length;
      alreadyDone = (statuses.length > 0 && pending === 0 && done > 0) || !!profile.dayCompleteShown?.[date];
    }

    if (alreadyDone) {
      await admin.from("push_subscriptions").update({ last_sent_date: date }).eq("user_id", sub.user_id);
      skipped++;
      continue;
    }

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: "Don't lose your streak",
          body: "Today's tasks are still open — a few minutes keeps it alive.",
          url: "/",
        })
      );
      await admin.from("push_subscriptions").update({ last_sent_date: date }).eq("user_id", sub.user_id);
      sent++;
    } catch (err: any) {
      // Subscription is gone (browser data cleared, permission revoked, etc.) — clean it up.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("user_id", sub.user_id);
        removed++;
      }
    }
  }

  res.status(200).json({ checked: subs?.length ?? 0, sent, skipped, removed });
}
