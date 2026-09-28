import { expect, it } from "vitest";
import { loanEditSchema, loanSchema, loanSourceSchema } from "./schemas";

const loan = {
  debtor: "Ana",
  amount: "250.00",
  date: "2026-09-28",
  expected_payment_date: "",
  notes: "Compra con tarjeta",
  account_id: "11111111-1111-4111-8111-111111111111",
};

it("conserva un préstamo ya reflejado en el saldo sin crear otra salida", () => {
  expect(
    loanSchema.parse({ ...loan, balance_effect: "already_recorded" })
      .balance_effect,
  ).toBe("already_recorded");
});

it("registra una salida nueva de la cuenta seleccionada", () => {
  expect(
    loanSchema.parse({ ...loan, balance_effect: "record_now" }).balance_effect,
  ).toBe("record_now");
});

it("corrige el origen sin confundir un saldo ya registrado", () => {
  expect(
    loanSourceSchema.parse({
      id: "22222222-2222-4222-8222-222222222222",
      account_id: loan.account_id,
      balance_effect: "already_recorded",
    }).balance_effect,
  ).toBe("already_recorded");
});

it("permite editar los datos del préstamo y conserva el saldo ya recuperado", () => {
  expect(
    loanEditSchema.parse({
      ...loan,
      id: "22222222-2222-4222-8222-222222222222",
      debtor: "Ana López",
      amount: "275.00",
      expected_payment_date: "2026-10-15",
      balance_effect: "record_now",
    }),
  ).toMatchObject({ debtor: "Ana López", amount: 275 });
});
