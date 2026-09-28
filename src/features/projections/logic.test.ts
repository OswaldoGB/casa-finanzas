import { describe, expect, it } from "vitest";
import { projectCash, type ProjectionInput } from "./logic";

const base: ProjectionInput = {
  today: "2026-01-20",
  accounts: [
    {
      id: "cash",
      name: "Banco",
      type: "checking",
      balance: 1000,
      statement_closing_day: null,
      payment_due_day: null,
      statement_close: null,
      statement_unpaid: 0,
    },
  ],
  recurring: [],
  budgets: [],
};
const rule = {
  id: "r",
  name: "Gasto",
  type: "expense" as const,
  amount: 50,
  account_id: "cash",
  destination_account_id: null,
  category_id: "food",
  frequency: "monthly" as const,
  interval_count: 1,
  start_date: "2026-01-31",
  next_run_date: "2026-01-31",
  end_date: "2026-02-28",
  mode: "auto" as const,
};
describe("proyección de efectivo", () => {
  it("incluye abonos por cobrar y apartados hacia inversiones, omitiendo apartados virtuales", () => {
    const result = projectCash(
      {
        ...base,
        accounts: [
          ...base.accounts,
          {
            ...base.accounts[0],
            id: "investment",
            type: "investment",
            balance: 0,
          },
        ],
        recurring: [
          { ...rule, type: "loan_repayment", amount: 30 },
          {
            ...rule,
            id: "goal",
            type: "goal_contribution",
            amount: 20,
            category_id: null,
            destination_account_id: "investment",
          },
          {
            ...rule,
            id: "virtual",
            type: "goal_contribution",
            amount: 100,
            account_id: null,
            category_id: null,
          },
        ],
      },
      3,
    );
    expect(result.map((row) => row.balance)).toEqual([1010, 1020, 1020]);
  });
  it("repite categorías ausentes y respeta planes explícitos, incluso cero", () => {
    const food = {
      id: "b",
      category_id: "food",
      name: "Comida",
      color: "#fff",
      amount: 100,
      carry_over: false,
      carried: 0,
      available: 100,
      spent: 0,
    };
    const other = {
      ...food,
      id: "other",
      category_id: "other",
      amount: 40,
      available: 40,
    };
    const result = projectCash(
      {
        ...base,
        budgets: [
          { month: "2026-01-01", rows: [food, other] },
          { month: "2026-02-01", rows: [] },
          {
            month: "2026-03-01",
            rows: [{ ...food, amount: 25, available: 25 }],
          },
          { month: "2026-04-01", rows: [{ ...food, amount: 0, available: 0 }] },
        ],
      },
      6,
    );
    expect(result.map((row) => row.budget)).toEqual([
      140, 140, 65, 40, 140, 140,
    ]);
  });
  it("respeta fin de mes y fin de regla, y usa centavos", () => {
    const result = projectCash(
      { ...base, recurring: [{ ...rule, amount: 0.1 }] },
      3,
    );
    expect(result.map((row) => row.balance)).toEqual([999.9, 999.8, 999.8]);
  });
  it("presupuesta solo lo restante y no duplica gastos recurrentes", () => {
    const rows = [
      {
        id: "b",
        category_id: "food",
        name: "Comida",
        color: "#fff",
        amount: 200,
        carry_over: false,
        carried: 0,
        available: 200,
        spent: 100,
      },
    ];
    const result = projectCash(
      { ...base, recurring: [rule], budgets: [{ month: "2026-01-01", rows }] },
      3,
    );
    expect(result.map((row) => row.balance)).toEqual([900, 700, 500]);
  });
  it("mueve cargos de tarjeta al vencimiento y separa deuda actual", () => {
    const card = {
      id: "card",
      name: "Tarjeta",
      type: "credit_card",
      balance: 130,
      statement_closing_day: 15,
      payment_due_day: 5,
      statement_close: "2026-01-15",
      statement_unpaid: 100,
    };
    const result = projectCash(
      {
        ...base,
        accounts: [...base.accounts, card],
        recurring: [{ ...rule, account_id: "card" }],
      },
      3,
    );
    expect(result.map((row) => row.balance)).toEqual([1000, 900, 820]);
  });
  it("no duplica pago programado de tarjeta y reconoce transferencias a inversión", () => {
    const card = {
      id: "card",
      name: "Tarjeta",
      type: "credit_card",
      balance: 100,
      statement_closing_day: 15,
      payment_due_day: 5,
      statement_close: "2026-01-15",
      statement_unpaid: 100,
    };
    const result = projectCash(
      {
        ...base,
        accounts: [...base.accounts, card],
        recurring: [
          {
            ...rule,
            type: "transfer",
            amount: 100,
            destination_account_id: "card",
            category_id: null,
            end_date: "2026-01-31",
          },
        ],
      },
      3,
    );
    expect(result.map((row) => row.balance)).toEqual([900, 900, 900]);
  });
  it("resta transferencias a inversión y aplica escenario sin mutar datos", () => {
    const investment = {
      ...base.accounts[0],
      id: "investment",
      type: "investment",
      balance: 5000,
    };
    const input = {
      ...base,
      accounts: [...base.accounts, investment],
      recurring: [
        {
          ...rule,
          type: "transfer" as const,
          destination_account_id: "investment",
          category_id: null,
          end_date: "2026-01-31",
        },
      ],
    };
    expect(
      projectCash(input, 3, {
        type: "expense",
        amount: 12.34,
        date: "2026-02-01",
      }).map((row) => row.balance),
    ).toEqual([950, 937.66, 937.66]);
    expect(input.accounts[0].balance).toBe(1000);
  });
});
