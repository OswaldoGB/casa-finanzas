import { expect, it } from "vitest";
import { installmentSchema, cardPaymentSchema } from "./card-schemas";
import { projectCash } from "../projections/logic";
import { installmentAmounts } from "./card-schemas";

const card = "11111111-1111-4111-8111-111111111111";
const source = "22222222-2222-4222-8222-222222222222";
it("importa cuotas avanzadas desde saldo pendiente o importe original sin perder el redondeo final", () => {
  expect(installmentAmounts(1200, 12, 6, "original")).toEqual({
    pendingAmount: 600,
    pendingCount: 6,
    monthlyAmount: 100,
  });
  expect(installmentAmounts(600, 12, 6, "remaining")).toEqual({
    pendingAmount: 600,
    pendingCount: 6,
    monthlyAmount: 100,
  });
  expect(installmentAmounts(1000, 12, 10, "original")).toEqual({
    pendingAmount: 166.7,
    pendingCount: 2,
    monthlyAmount: 83.33,
  });
  expect(installmentAmounts(600, 12, 12, "remaining")).toBeNull();
  expect(installmentAmounts(600, 12, -1, "remaining")).toBeNull();
});
it("valida plazos y rechaza importes que no alcanzan un centavo por cuota", () => {
  const plan = {
    card_id: card,
    name: "Laptop",
    amount: "1000.00",
    installments: "12",
    purchase_date: "2026-01-10",
    first_close: "2026-01-15",
    mode: "existing",
    category_id: "",
  };
  expect(installmentSchema.safeParse(plan).success).toBe(true);
  expect(installmentSchema.safeParse({ ...plan, amount: "0.01" }).success).toBe(
    false,
  );
  expect(
    installmentSchema.safeParse({ ...plan, first_close: "2026-01-01" }).success,
  ).toBe(false);
});
it("valida pago repartido sin duplicar cuentas ni aceptar montos negativos", () => {
  const payment = {
    card_id: card,
    date: "2026-01-20",
    sources: [{ account_id: source, amount: "100.25" }],
  };
  expect(cardPaymentSchema.parse(payment).sources[0].amount).toBe(100.25);
  expect(
    cardPaymentSchema.safeParse({
      ...payment,
      sources: [...payment.sources, ...payment.sources],
    }).success,
  ).toBe(false);
  expect(
    cardPaymentSchema.safeParse({
      ...payment,
      sources: [{ account_id: card, amount: "-1" }],
    }).success,
  ).toBe(false);
});
it("proyecta deuda financiada por cuotas, sin cobrar todo el principal en el siguiente mes", () => {
  const input = {
    today: "2026-01-16",
    accounts: [
      {
        id: source,
        name: "Banco",
        type: "checking",
        balance: 1000,
        statement_closing_day: null,
        payment_due_day: null,
        statement_close: null,
        statement_unpaid: 0,
      },
      {
        id: card,
        name: "Tarjeta",
        type: "credit_card",
        balance: 300,
        statement_closing_day: 15,
        payment_due_day: 25,
        statement_close: "2026-01-15",
        statement_unpaid: 100,
        installment_future: 200,
      },
    ],
    installments: [
      {
        card_id: card,
        close_date: "2026-02-15",
        due_date: "2026-02-25",
        amount: 100,
      },
      {
        card_id: card,
        close_date: "2026-03-15",
        due_date: "2026-03-25",
        amount: 100,
      },
    ],
    recurring: [],
    budgets: [],
  };
  expect(projectCash(input, 3).map((row) => row.expense)).toEqual([
    100, 100, 100,
  ]);
  const ledgerChange = {
    ...input,
    accounts: input.accounts.map((account) =>
      account.id === card
        ? { ...account, balance: 100, statement_unpaid: 0 }
        : account,
    ),
  };
  expect(projectCash(ledgerChange, 3).map((row) => row.expense)).toEqual([
    0, 100, 100,
  ]);
  const coveredQuota = {
    ...ledgerChange,
    accounts: ledgerChange.accounts.map((account) =>
      account.id === card ? { ...account, installment_future: 100 } : account,
    ),
    installments: input.installments.slice(1),
  };
  expect(projectCash(coveredQuota, 3).map((row) => row.expense)).toEqual([
    0, 0, 100,
  ]);
});
