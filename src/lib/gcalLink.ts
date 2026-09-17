/** Google Calendar deep link — the zero-config way to put an event in
 *  someone's Google Calendar (no API, no client ID, no sign-in flow): this
 *  opens Google's prefilled event page and the user taps Save. Times are
 *  emitted floating (Nairobi wall-clock) with a ctz hint, matching the
 *  .ics convention. All-day Google events take an EXCLUSIVE end date. */
export interface GcalLinkEvent {
  title: string;
  date: string; // YYYY-MM-DD
  endDate: string | null; // multi-day events end here (inclusive)
  startTime: string | null; // HH:MM
  endTime: string | null;
  venue: string | null;
  city: string | null;
  isOnline: boolean;
  url: string | null;
  source: string | null;
}

export function gcalEventUrl(ev: GcalLinkEvent): string {
  const compact = (iso: string) => iso.replace(/-/g, "");
  const nextDay = (iso: string) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const plusOneHour = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  let dates: string;
  if (ev.startTime) {
    const endDay0 = ev.endDate && ev.endDate > ev.date ? ev.endDate : ev.date;
    let endTime: string;
    if (ev.endTime && (endDay0 !== ev.date || ev.endTime > ev.startTime)) endTime = ev.endTime;
    else endTime = plusOneHour(ev.startTime);
    // A default 23:30 + 1h rolls to 00:30 the NEXT day — keep end after start.
    const rollsPastMidnight = endTime <= ev.startTime && endDay0 === ev.date;
    const endDay = rollsPastMidnight ? nextDay(endDay0) : endDay0;
    dates = `${compact(ev.date)}T${ev.startTime.replace(":", "")}00/${compact(endDay)}T${endTime.replace(":", "")}00`;
  } else {
    const endDay = ev.endDate && ev.endDate > ev.date ? ev.endDate : ev.date;
    dates = `${compact(ev.date)}/${compact(nextDay(endDay))}`;
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates,
    ctz: "Africa/Nairobi",
  });
  const location = ev.isOnline ? "Online" : [ev.venue, ev.city].filter(Boolean).join(", ");
  if (location) params.set("location", location);
  const details = [ev.source ? `Host: ${ev.source}` : "", ev.url ?? ""].filter(Boolean).join("\n");
  if (details) params.set("details", details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
