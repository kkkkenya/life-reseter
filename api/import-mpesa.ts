// POST /api/import-mpesa — M-PESA statement PDF -> transaction rows.
// The PDF is extracted once (pdf-parse, server-side) and never stored; only
// the parsed rows come back for the client to review before importing.
import { PDFParse } from "pdf-parse";
import { parseMpesaStatement } from "../src/lib/mpesa";
import { clientIp, rateLimit, sameOrigin } from "../src/lib/apiGuard";

const MAX_B64_CHARS = 12_000_000; // ~9MB statement PDF
const MAX_IMPORTS_PER_HOUR = 4; // statements are a rare, deliberate import

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!sameOrigin(req)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!rateLimit(`mpesa:${clientIp(req)}`, MAX_IMPORTS_PER_HOUR, 60 * 60 * 1000)) {
    res.status(429).json({ error: "Too many imports — try again in a bit." });
    return;
  }

  const { fileBase64 } = req.body ?? {};
  if (typeof fileBase64 !== "string" || fileBase64.length < 500) {
    res.status(400).json({ error: "Missing statement. Upload the PDF from the M-PESA app." });
    return;
  }
  if (fileBase64.length > MAX_B64_CHARS) {
    res.status(413).json({ error: "That PDF is too large — export a shorter statement period." });
    return;
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(fileBase64, "base64");
  } catch {
    res.status(400).json({ error: "Couldn't read that file." });
    return;
  }

  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    const transactions = parseMpesaStatement(result.text);
    if (transactions.length === 0) {
      res.status(422).json({
        error:
          "No transactions found. Make sure this is the full M-PESA statement PDF (the one emailed from the M-PESA app), not a screenshot.",
      });
      return;
    }
    res.status(200).json({ transactions, pages: result.total });
  } catch (e) {
    console.error("[import-mpesa] extract failed:", e);
    res.status(502).json({ error: "Couldn't read that PDF. Try re-exporting the statement." });
  } finally {
    await parser?.destroy().catch(() => {});
  }
}
