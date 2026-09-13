/**
 * mpesa.ts — pure parser for Safaricom M-PESA full-statement PDFs.
 *
 * The serverless route extracts raw text from the PDF (pdf-parse); this file
 * turns that text into transaction rows. No network, no Node APIs — directly
 * unit-testable against a pasted text sample.
 *
 * A statement row in extracted text looks like:
 *   OKA1P8QZ62 2026-08-03 14:22:51 Pay Bill to KENYA POWER Postpaid Pay Bill Account 0.00 1,540.00 4,230.00
 *   RKB6Q2XY90 2026-08-05 09:01:12 Deposit of funds via agent - AGENT NO. 12345 Deposite 5,000.00 0.00 9,230.00
 * Some exports collapse an empty Paid In / Withdrawn column, so the amount
 * tail may hold two numbers instead of three — direction is then inferred
 * from the transaction-type keywords.
 */

export interface MpesaTx {
  receipt: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  details: string; // details + transaction type, verbatim from the statement
  amountKES: number; // always positive
  direction: "in" | "out";
  balance: number | null;
}

/** Statement types that move money INTO the wallet (lowercase contains-match). */
const INCOME_HINTS = [
  "deposite",
  "deposit",
  "funds received",
  "received from",
  "reversal",
  "refund",
  "salary",
  "b2c",
];

function money(s: string): number {
  return Number(s.replace(/,/g, ""));
}

function looksIncome(details: string): boolean {
  const d = details.toLowerCase();
  return INCOME_HINTS.some((h) => d.includes(h));
}

/** One statement line = one transaction. Lines that don't match (headers,
 *  page footers, the summary block) are simply skipped. */
export function parseMpesaStatement(text: string): MpesaTx[] {
  const out: MpesaTx[] = [];
  const seen = new Set<string>();
  const row =
    /^([A-Z0-9]{6,15})\s+(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s+(.+?)\s+([\d,]+(?:\.\d{1,2})?(?:\s+[\d,]+(?:\.\d{1,2})?){0,2})$/;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = row.exec(line);
    if (!m) continue;

    const [, receipt, date, time, details, amountTail] = m;
    if (seen.has(receipt)) continue; // page-break duplicates in some exports

    const nums = amountTail.trim().split(/\s+/).map(money);
    const balance = nums[nums.length - 1] ?? null;
    let paidIn = 0;
    let withdrawn = 0;

    if (nums.length >= 3) {
      [paidIn, withdrawn] = [nums[nums.length - 3], nums[nums.length - 2]];
    } else if (nums.length === 2) {
      // collapsed column: decide by the transaction-type wording
      if (looksIncome(details)) paidIn = nums[0];
      else withdrawn = nums[0];
    } else {
      continue; // balance alone — no transaction amount
    }

    const amountKES = paidIn > 0 ? paidIn : withdrawn;
    if (!(amountKES > 0)) continue; // fee-only rows / zero rows add noise, not signal

    seen.add(receipt);
    out.push({
      receipt,
      date,
      time,
      details: details.trim().slice(0, 160),
      amountKES,
      direction: paidIn > 0 ? "in" : "out",
      balance,
    });
  }

  return out;
}

/** Group a parse into what the finances tab wants, netting nothing — every
 *  row is one income or one expense entry, keyed by statement receipt. */
export function splitMpesaTxs(txs: MpesaTx[]): { income: MpesaTx[]; expenses: MpesaTx[] } {
  return {
    income: txs.filter((t) => t.direction === "in"),
    expenses: txs.filter((t) => t.direction === "out"),
  };
}
