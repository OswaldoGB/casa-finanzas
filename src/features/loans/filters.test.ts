import { expect, it } from "vitest";
import type { Loan } from "./schemas";
import { organizeLoans } from "./filters";

const loan = (overrides: Partial<Loan>): Loan => ({
  id: crypto.randomUUID(),
  debtor: "Ana",
  amount: 100,
  date: "2026-09-01",
  expected_payment_date: null,
  notes: null,
  status: "active",
  lent: 100,
  recovered: 0,
  pending: 100,
  overdue: false,
  source_account_id: null,
  source_account_name: null,
  source_account_type: null,
  already_recorded: false,
  ...overrides,
});

const loans = [
  loan({ debtor: "Pendiente", date: "2026-09-01", amount: 300 }),
  loan({ debtor: "Parcial", date: "2026-08-01", recovered: 20, pending: 80 }),
  loan({ debtor: "Pagado", status: "paid", recovered: 100, pending: 0 }),
];

it("separa los préstamos pagados de los que aún tienen saldo", () => {
  const result = organizeLoans(loans, "all", "date_desc");
  expect(result.current.map((item) => item.debtor)).toEqual([
    "Pendiente",
    "Parcial",
  ]);
  expect(result.paid.map((item) => item.debtor)).toEqual(["Pagado"]);
});

it("filtra los préstamos parciales y ordena por mayor valor", () => {
  const result = organizeLoans(loans, "partial", "amount_desc");
  expect(result.current.map((item) => item.debtor)).toEqual(["Parcial"]);
  expect(result.paid).toEqual([]);
});
