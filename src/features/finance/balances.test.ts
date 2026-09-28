import { describe, expect, it } from "vitest";
import {
  accountBalanceCents,
  decimalToCents,
  netAccountAssetsCents,
  type MoneyMovement,
} from "./balances";

const posted = (movement: Omit<MoneyMovement, "status">): MoneyMovement => ({
  ...movement,
  status: "posted",
});

describe("accountBalanceCents", () => {
  it("adds income and subtracts expenses for an asset account", () => {
    const movements = [
      posted({
        type: "income",
        amountCents: 12525,
        destinationAccountId: "bank",
      }),
      posted({ type: "expense", amountCents: 3400, sourceAccountId: "bank" }),
    ];

    expect(
      accountBalanceCents(
        { id: "bank", type: "checking", openingBalanceCents: 5000 },
        movements,
      ),
    ).toBe(14125);
  });

  it("moves the same amount between accounts, including a card payment", () => {
    const movements = [
      posted({
        type: "transfer",
        amountCents: 3000,
        sourceAccountId: "bank",
        destinationAccountId: "cash",
      }),
      posted({
        type: "transfer",
        amountCents: 2000,
        sourceAccountId: "bank",
        destinationAccountId: "card",
      }),
    ];

    expect(
      accountBalanceCents(
        { id: "bank", type: "checking", openingBalanceCents: 10000 },
        movements,
      ),
    ).toBe(5000);
    expect(
      accountBalanceCents(
        { id: "cash", type: "cash", openingBalanceCents: 0 },
        movements,
      ),
    ).toBe(3000);
    expect(
      accountBalanceCents(
        { id: "card", type: "credit_card", openingBalanceCents: 5000 },
        movements,
      ),
    ).toBe(3000);
  });

  it("treats a card purchase as increased positive debt", () => {
    const movements = [
      posted({ type: "expense", amountCents: 1234, sourceAccountId: "card" }),
    ];

    expect(
      accountBalanceCents(
        { id: "card", type: "credit_card", openingBalanceCents: 2000 },
        movements,
      ),
    ).toBe(3234);
  });

  it("debits a loan disbursement and credits a repayment", () => {
    const movements = [
      posted({ type: "loan_out", amountCents: 5000, sourceAccountId: "bank" }),
      posted({
        type: "loan_repayment",
        amountCents: 1200,
        destinationAccountId: "bank",
      }),
    ];

    expect(
      accountBalanceCents(
        { id: "bank", type: "checking", openingBalanceCents: 10000 },
        movements,
      ),
    ).toBe(6200);
  });

  it("ignores pending movements", () => {
    const movements: MoneyMovement[] = [
      {
        type: "expense",
        amountCents: 1000,
        sourceAccountId: "bank",
        status: "pending",
      },
    ];

    expect(
      accountBalanceCents(
        { id: "bank", type: "checking", openingBalanceCents: 5000 },
        movements,
      ),
    ).toBe(5000);
  });
});

describe("netAccountAssetsCents", () => {
  it("subtracts credit-card debt from other account balances", () => {
    expect(
      netAccountAssetsCents([
        { type: "checking", balanceCents: 10000 },
        { type: "credit_card", balanceCents: 4500 },
      ]),
    ).toBe(5500);
  });
});

describe("decimalToCents", () => {
  it("converts numeric database values exactly, including negative balances", () => {
    expect(decimalToCents("123456789012.34")).toBe(12345678901234);
    expect(decimalToCents(0.29)).toBe(29);
    expect(decimalToCents("-0.05")).toBe(-5);
  });

  it("rejects sub-cent and unsafe values instead of rounding them", () => {
    expect(() => decimalToCents("0.001")).toThrow(RangeError);
    expect(() => decimalToCents(0.1 + 0.2)).toThrow(RangeError);
    expect(() => decimalToCents("90071992547409.92")).toThrow(RangeError);
  });
});
