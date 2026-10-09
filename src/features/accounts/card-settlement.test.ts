import { describe, expect, it } from "vitest";
import {
  installmentSettlementStatus,
  statementSettlementStatus,
} from "./card-settlement";

describe("card settlement status", () => {
  it("labels statements from their bank balance", () => {
    expect(statementSettlementStatus({ bankDue: 80, paid: 0 })).toBe("pending");
    expect(statementSettlementStatus({ bankDue: 80, paid: 30 })).toBe(
      "partial",
    );
    expect(statementSettlementStatus({ bankDue: 80, paid: 80 })).toBe(
      "settled",
    );
  });

  it("keeps an installment included until it is fully paid", () => {
    expect(installmentSettlementStatus({ amount: 15, paid: 0 })).toBe(
      "included",
    );
    expect(installmentSettlementStatus({ amount: 15, paid: 14.99 })).toBe(
      "included",
    );
    expect(installmentSettlementStatus({ amount: 15, paid: 15 })).toBe(
      "settled",
    );
  });
});
