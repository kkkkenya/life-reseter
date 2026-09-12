// POST /api/tech-events — ONLINE-ONLY AI fill for the Events feed.
// Kenya in-person coverage comes from deterministic direct fetching
// (api/direct-events.ts). This endpoint compensates where deterministic
// fetching can't reach: virtual/online tech events in English, any country.
// Every item it returns is badged "AI picks" in the UI — never mixed silently
// with directly-fetched listings. Uses the same GEMINI_API_KEY as api/gemini.ts.
// The prompt, validation and URL verification live in src/lib/eventPipeline.ts.
//
// This route triggers a paid Gemini call, so it is guarded (same-origin +
// per-IP rate limit) and memoised per week — repeat pulls never re-bill.
import { collectAiEvents } from "../src/lib/eventPipeline";
import { clientIp, rateLimit, readMemo, sameOrigin, writeMemo } from "../src/lib/apiGuard";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const MEMO_TTL_MS = 6 * 60 * 60 * 1000; // one Gemini call per week per warm instance
const MAX_PULLS_PER_HOUR = 6; // per IP; memo hits don't count against this

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "Forbidden" });
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

  const memoKey = `ai-events:${start}|${end}`;
  const memo = readMemo(memoKey, MEMO_TTL_MS);
  if (memo) {
    res.status(200).json(memo);
    return;
  }

  if (!rateLimit(`ai:${clientIp(req)}`, MAX_PULLS_PER_HOUR, 60 * 60 * 1000)) {
    res.status(429).json({ error: "Too many requests — try again in a bit." });
    return;
  }

  const result = await collectAiEvents(start, end, API_KEY, MODEL);
  // Only memoise real Gemini answers; an empty/error fallback must stay
  // retryable instead of being sticky for 6 hours.
  if (result.source === "gemini") writeMemo(memoKey, result);
  res.status(200).json(result);
}
