// GET /api/weekly-ics?weekStart=YYYY-MM-DD&weekEnd=YYYY-MM-DD[&download=1]
// One-click calendar subscription: the same weekly feed the Events page shows
// (deterministic sources + the AI online fill), rendered as an .ics calendar.
// Omit the range to get the current Nairobi week.
import {
  collectDirectEvents,
  collectAiEvents,
} from "../src/lib/eventPipeline";
import { buildIcs, nairobiWeek } from "../src/lib/eventIcs";
import { overlapsWeek, type ParsedEvent } from "../src/lib/eventParsers";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

function readDate(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim().slice(0, 10)) ? v.trim().slice(0, 10) : null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const fallback = nairobiWeek();
  const weekStart = readDate(req.query?.weekStart) ?? fallback.weekStart;
  const weekEnd = readDate(req.query?.weekEnd) ?? fallback.weekEnd;
  const download = req.query?.download === "1" || req.query?.download === "true";

  let events: ParsedEvent[] = [];
  try {
    const [direct, ai] = await Promise.all([
      collectDirectEvents(weekStart, weekEnd),
      collectAiEvents(weekStart, weekEnd, API_KEY, MODEL),
    ]);
    const seen = new Set<string>();
    for (const e of [...direct.events, ...ai.events]) {
      const key = `${e.title.toLowerCase()}|${e.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push(e);
    }
    events = events
      .filter((e) => overlapsWeek(e, weekStart, weekEnd))
      .sort((a, b) => `${a.date} ${a.startTime ?? ""}`.localeCompare(`${b.date} ${b.startTime ?? ""}`))
      .slice(0, 80);
  } catch {
    events = [];
  }

  const ics = buildIcs(events, { weekStart, weekEnd });
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
  if (download) {
    res.setHeader("Content-Disposition", `attachment; filename="tech-events-${weekStart}.ics"`);
  }
  res.status(200).send(ics);
}
