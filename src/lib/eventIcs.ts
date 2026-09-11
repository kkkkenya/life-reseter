/**
 * eventIcs.ts — turn the merged weekly feed into a subscribable iCalendar
 * document. Local convention: times are Africa/Nairobi, emitted floating
 * (no trailing Z) so a calendar app renders them as the wall-clock time the
 * event actually happens in Kenya.
 */

import type { ParsedEvent } from "./eventParsers";

export const ICS_TIMEZONE = "Africa/Nairobi";

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold to <=75 octets per RFC 5545 (character approximation is fine here). */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 72) {
    parts.push(` ${rest.slice(0, 72)}`);
    rest = rest.slice(72);
  }
  if (rest) parts.push(` ${rest}`);
  return parts.join("\r\n");
}

function compact(iso: string): string {
  return iso.replace(/-/g, "");
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function dtStamp(now = new Date()): string {
  return `${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
}

function uidFor(e: ParsedEvent): string {
  const basis = `${e.title}|${e.date}|${e.url ?? e.source ?? ""}`;
  let h = 0;
  for (let i = 0; i < basis.length; i++) h = (Math.imul(31, h) + basis.charCodeAt(i)) | 0;
  return `evt-${(h >>> 0).toString(36)}-${compact(e.date)}@life-reset`;
}

export interface BuildIcsOptions {
  weekStart: string;
  weekEnd: string;
  calendarName?: string;
  now?: Date;
}

/** Build an ICS calendar from a list of merged events. */
export function buildIcs(events: ParsedEvent[], opts: BuildIcsOptions): string {
  const name = opts.calendarName ?? `Tech events (${opts.weekStart} → ${opts.weekEnd})`;
  const stamp = dtStamp(opts.now);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//life-reset//events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(name)}`,
    `X-WR-TIMEZONE:${ICS_TIMEZONE}`,
  ];

  for (const e of events) {
    if (!e.date) continue;
    const endDate = e.endDate && e.endDate > e.date ? e.endDate : e.date;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uidFor(e)}`);
    lines.push(`DTSTAMP:${stamp}`);
    if (e.startTime) {
      lines.push(`DTSTART:${compact(e.date)}T${e.startTime.replace(":", "")}00`);
      const endTime = e.endTime ?? e.startTime;
      const endDay = e.endDate && e.endDate > e.date ? e.endDate : e.date;
      lines.push(`DTEND:${compact(endDay)}T${endTime.replace(":", "")}00`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(e.date)}`);
      lines.push(`DTEND;VALUE=DATE:${compact(nextDay(endDate))}`);
    }
    lines.push(`SUMMARY:${icsEscape(e.title)}`);
    const place = e.isOnline ? "Online" : [e.venue, e.city].filter(Boolean).join(", ");
    if (place) lines.push(`LOCATION:${icsEscape(place)}`);
    const descBits = [
      e.source ? `Host: ${e.source}` : "",
      e.priceText ? `Cost: ${e.priceText}` : "",
      e.topics.length ? `Topics: ${e.topics.join(", ")}` : "",
      e.url ? `Details: ${e.url}` : "",
      e.origin === "ai" ? "Source: AI pick — verify on the event page." : "",
    ].filter(Boolean);
    if (descBits.length) lines.push(`DESCRIPTION:${icsEscape(descBits.join("\n"))}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Monday-start week containing `ref` (defaults to now), in Nairobi time. */
export function nairobiWeek(ref: Date = new Date()): { weekStart: string; weekEnd: string } {
  const shifted = new Date(ref.getTime() + 180 * 60000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  const dow = (new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7; // Mon=0
  const mon = new Date(Date.UTC(y, m, d - dow));
  const sun = new Date(Date.UTC(y, m, d - dow + 6));
  return { weekStart: mon.toISOString().slice(0, 10), weekEnd: sun.toISOString().slice(0, 10) };
}
