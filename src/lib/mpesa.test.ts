import { describe, expect, it } from "vitest";
import { parseMpesaStatement, splitMpesaTxs } from "./mpesa";

const SAMPLE = `M-PESA STATEMENT
Statement Period: 01/08/2026 - 31/08/2026
Receipt No. Completion Time Details Transaction Type Paid In Withdrawn Balance
OKA1P8QZ62 2026-08-03 14:22:51 Pay Bill to KENYA POWER Postpaid Pay Bill Account 0.00 1,540.00 4,230.00
RKB6Q2XY90 2026-08-05 09:01:12 Deposit of funds via agent 12345 Deposite 5,000.00 0.00 9,230.00
QFG71H2K04 2026-08-06 18:44:09 Buy Goods to NAIVAS SUPERMARKET Buy Goods 0.00 2,315.50 6,914.50
OKL2M9TT13 2026-08-07 07:15:00 Funds received from JANE WANJIKU 2547XXXXXXXXX Customer Transfer of Funds Received 3,000.00 9,914.50
-- Page 2 of 4 --
OKD4R7NN88 2026-08-12 21:30:45 Withdraw Cash at ATM AGENT Agent Withdrawal 0.00 4,000.00 5,914.50
OKA1P8QZ62 2026-08-03 14:22:51 Pay Bill to KENYA POWER Postpaid Pay Bill Account 0.00 1,540.00 4,230.00
SFA9Z1PP55 2026-08-20 10:00:00 Business payment to STUDIO LENS B2B Payment 1,200.00 7,114.50`;

describe("parseMpesaStatement", () => {
  it("reads the well-formed rows and skips headers, footers and duplicates", () => {
    const txs = parseMpesaStatement(SAMPLE);
    // 6 unique transaction rows (the page-break line, header and the repeated
    // receipt on page 2 are dropped)
    expect(txs).toHaveLength(6);
    expect(txs.every((t) => /^OK|RK|QF|SF/.test(t.receipt))).toBe(true);
    expect(txs.map((t) => t.receipt)).toEqual([
      "OKA1P8QZ62",
      "RKB6Q2XY90",
      "QFG71H2K04",
      "OKL2M9TT13",
      "OKD4R7NN88",
      "SFA9Z1PP55",
    ]);
  });

  it("splits direction off the Paid In / Withdrawn columns", () => {
    const txs = parseMpesaStatement(SAMPLE);
    const paybill = txs.find((t) => t.receipt === "OKA1P8QZ62")!;
    expect(paybill.direction).toBe("out");
    expect(paybill.amountKES).toBe(1540);
    const deposit = txs.find((t) => t.receipt === "RKB6Q2XY90")!;
    expect(deposit.direction).toBe("in");
    expect(deposit.amountKES).toBe(5000);
    expect(deposit.balance).toBe(9230);
  });

  it("uses the type wording when a column is collapsed", () => {
    const txs = parseMpesaStatement(SAMPLE);
    const received = txs.find((t) => t.receipt === "OKL2M9TT13")!;
    expect(received.direction).toBe("in");
    expect(received.amountKES).toBe(3000);
    const b2b = txs.find((t) => t.receipt === "SFA9Z1PP55")!;
    expect(b2b.direction).toBe("out");
    expect(b2b.amountKES).toBe(1200);
  });

  it("keeps dates and times verbatim", () => {
    const txs = parseMpesaStatement(SAMPLE);
    expect(txs[0].date).toBe("2026-08-03");
    expect(txs[0].time).toBe("14:22:51");
  });

  it("returns nothing for non-statement text", () => {
    expect(parseMpesaStatement("totally unrelated pdf text\nno rows here")).toEqual([]);
  });

  it("splits cleanly into income and expenses", () => {
    const { income, expenses } = splitMpesaTxs(parseMpesaStatement(SAMPLE));
    expect(income).toHaveLength(2);
    expect(expenses).toHaveLength(4);
    expect(income.reduce((s, t) => s + t.amountKES, 0)).toBe(8000);
  });
});
