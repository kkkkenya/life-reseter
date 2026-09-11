// POST /api/tech-events — ONLINE-ONLY AI fill for the Events feed.
// Kenya in-person coverage comes from deterministic direct fetching
// (api/direct-events.ts). This endpoint compensates where deterministic
// fetching can't reach: virtual/online tech events in English, any country.
// Every item it returns is badged "AI picks" in the UI — never mixed silently
// with directly-fetched listings. Uses the same GEMINI_API_KEY as api/gemini.ts.
// The prompt, validation and URL verification live in src/lib/eventPipeline.ts.
import { collectAiEvents } from "../src/lib/eventPipeline";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { weekStart, weekEnd } = req.body ?? {};
  const asDate = (v: unknown) =>
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim().slice(0, 10)) ? v.trim().slice(0, 10) : null;
  const start = asDate(weekStart);
  const end = asDate(weekEnd);
  if (!start || !end || start > end) {
    res.status(400).json({ error: "Missing week range." });
    return;
  }

  const result = await collectAiEvents(start, end, API_KEY, MODEL);
  res.status(200).json(result);
}
