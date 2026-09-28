import { describe, expect, it } from "vitest";
import { transactionSchema } from "./schemas";

const base = {
  type: "expense",
  amount: "12.50",
  date: "2026-09-27",
  account_id: "11111111-1111-4111-8111-111111111111",
  destination_account_id: "",
  category_id: "22222222-2222-4222-8222-222222222222",
  payment_method_id: "",
  description: "Supermercado",
  notes: "",
};

describe("transactionSchema", () => {
  it("requires a category for expenses and income", () => {
    expect(
      transactionSchema.safeParse({ ...base, category_id: "" }).success,
    ).toBe(false);
    expect(
      transactionSchema.safeParse({ ...base, type: "income", category_id: "" })
        .success,
    ).toBe(false);
  });
  it("requires two distinct accounts for a transfer", () => {
    const transfer = {
      ...base,
      type: "transfer",
      category_id: "",
      destination_account_id: base.account_id,
    };
    expect(transactionSchema.safeParse(transfer).success).toBe(false);
    expect(
      transactionSchema.safeParse({
        ...transfer,
        destination_account_id: "33333333-3333-4333-8333-333333333333",
      }).success,
    ).toBe(true);
  });
  it("rejects zero, excessive precision, and invalid dates", () => {
    for (const amount of ["0", "-1", "1.234"])
      expect(transactionSchema.safeParse({ ...base, amount }).success).toBe(
        false,
      );
    expect(
      transactionSchema.safeParse({ ...base, date: "2026-02-31" }).success,
    ).toBe(false);
  });
});
