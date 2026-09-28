import { expect, it } from "vitest";
import { projectionInputSchema } from "./schemas";

it("acepta una cuenta bancaria sin estado de tarjeta", () => {
  const parsed = projectionInputSchema.parse({
    today: "2026-09-27",
    accounts: [
      {
        id: "bank",
        name: "Banco",
        type: "checking",
        balance: 100,
        statement_closing_day: null,
        payment_due_day: null,
        statement_close: null,
        statement_unpaid: null,
      },
    ],
    recurring: [],
    budgets: [],
  });
  expect(parsed.accounts[0].statement_unpaid).toBe(0);
});
