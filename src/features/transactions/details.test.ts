import { describe, expect, it } from "vitest";
import { loanRepaymentSummary, transactionTypeLabel } from "./details";

describe("transaction details", () => {
  it("uses understandable labels instead of internal transaction types", () => {
    expect(transactionTypeLabel("loan_repayment")).toBe("Abono de préstamo");
    expect(transactionTypeLabel("transfer")).toBe("Transferencia");
  });

  it("summarizes the original loan and its pending balance", () => {
    expect(
      loanRepaymentSummary({
        debtor: "Ana",
        amount: 120,
        recovered_amount: 45.5,
        date: "2026-09-15",
        expected_payment_date: "2026-11-01",
      }),
    ).toEqual({
      debtor: "Ana",
      lent: 120,
      recovered: 45.5,
      pending: 74.5,
      date: "2026-09-15",
      expectedPaymentDate: "2026-11-01",
    });
  });
});
