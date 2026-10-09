import { describe, expect, it } from "vitest";
import { cardStatementSchema } from "./card-schemas";

describe("estado de cuenta conciliado", () => {
  const base = {
    card_id: "00000000-0000-4000-8000-000000000001",
    closes_on: "2026-10-07",
    due_on: "2026-10-27",
    bank_cash_due: "154.80",
    note: "Compra en proceso",
  };

  it("acepta el pago de contado y una fecha límite posterior al corte", () => {
    expect(cardStatementSchema.safeParse(base).success).toBe(true);
  });
  it("accepts an official zero amount without leaving the cut unconfirmed", () => {
    expect(
      cardStatementSchema.safeParse({ ...base, bank_cash_due: "0.00" }).success,
    ).toBe(true);
  });

  it("rechaza una fecha límite igual o anterior al corte", () => {
    expect(
      cardStatementSchema.safeParse({ ...base, due_on: base.closes_on })
        .success,
    ).toBe(false);
  });
});
