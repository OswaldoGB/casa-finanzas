import { expect, it } from "vitest";
import { recurringRuleSchema } from "./schemas";

const income = {
  name: "Salario",
  type: "income",
  amount: "1200.50",
  accountId: "c1c2c3c4-1111-4111-8111-123456789abc",
  categoryId: "c1c2c3c4-2222-4222-8222-123456789abc",
  destinationAccountId: "",
  paymentMethodId: "",
  description: "Sueldo",
  notes: "",
  frequency: "monthly",
  intervalCount: "1",
  startDate: "2026-09-01",
  endDate: "",
  mode: "auto",
};

it("accepts a valid recurring income and rejects a missing category", () => {
  expect(recurringRuleSchema.safeParse(income).success).toBe(true);
  expect(
    recurringRuleSchema.safeParse({ ...income, categoryId: "" }).success,
  ).toBe(false);
});

it("requires a different destination for transfers and valid date range", () => {
  const transfer = {
    ...income,
    type: "transfer",
    categoryId: "",
    destinationAccountId: income.accountId,
  };
  expect(recurringRuleSchema.safeParse(transfer).success).toBe(false);
  expect(
    recurringRuleSchema.safeParse({
      ...transfer,
      destinationAccountId: "c1c2c3c4-3333-4333-8333-123456789abc",
    }).success,
  ).toBe(true);
  expect(
    recurringRuleSchema.safeParse({ ...income, endDate: "2026-08-31" }).success,
  ).toBe(false);
  expect(
    recurringRuleSchema.safeParse({ ...income, startDate: "2026-02-30" })
      .success,
  ).toBe(false);
});
