// GET /api/direct-events?weekStart=YYYY-MM-DD&weekEnd=YYYY-MM-DD
// Deterministic event fetching — no AI curation. The registry of sources and
// every parser live in src/lib (eventSources.ts / eventParsers.ts /
// eventPipeline.ts) so the UI, the .ics export, and the tests all read the
// same definition. This file is only the HTTP shell.
import { collectDirectEvents } from "../src/lib/eventPipeline";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const weekStart = typeof req.query?.weekStart === "string" ? req.query.weekStart : null;
  const weekEnd = typeof req.query?.weekEnd === "string" ? req.query.weekEnd : null;
  if (!weekStart || !weekEnd || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !/^\d{4}-\d{2}-\d{2}$/.test(weekEnd)) {
    res.status(400).json({ error: "Missing week range." });
    return;
  }

  try {
    const { events, sources } = await collectDirectEvents(weekStart, weekEnd);
    const failed = sources.filter((s) => !s.ok).length;
    res.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate=86400");
    // `degraded` tells the client some sources died — an informative 200, not
    // a silent one: a fully-broken scrape must never read as "no events".
    res.status(200).json({ events, sources, degraded: failed > 0, fetchedAt: new Date().toISOString() });
  } catch (e) {
    // collectDirectEvents catches per-source failures; reaching here means the
    // whole collect blew up (e.g. the registry itself threw).
    console.error("[direct-events] collect failed:", e);
    res.status(502).json({ error: "Event sources unreachable." });
  }
}
