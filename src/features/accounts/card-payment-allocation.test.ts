import { describe, expect, it } from "vitest";
import { planCardPayment } from "./card-payment-allocation";

describe("planCardPayment", () => {
  it("pays the oldest statement before a newer statement", () => {
    expect(
      planCardPayment(45, [
        {
          id: "old",
          closesOn: "2026-10-07",
          unpaid: 40,
          installments: [{ id: "old-installment", amount: 15, paid: 0 }],
        },
        {
          id: "new",
          closesOn: "2026-11-07",
          unpaid: 50,
          installments: [{ id: "new-installment", amount: 20, paid: 0 }],
        },
      ]),
    ).toEqual({
      statements: [
        { statementId: "old", amount: 40 },
        { statementId: "new", amount: 5 },
      ],
      installments: [
        { installmentId: "old-installment", amount: 15 },
        { installmentId: "new-installment", amount: 5 },
      ],
    });
  });

  it("only allocates a partial payment to an installment up to its unpaid amount", () => {
    expect(
      planCardPayment(10, [
        {
          id: "statement",
          closesOn: "2026-10-07",
          unpaid: 50,
          installments: [{ id: "installment", amount: 15, paid: 7 }],
        },
      ]),
    ).toEqual({
      statements: [{ statementId: "statement", amount: 10 }],
      installments: [{ installmentId: "installment", amount: 8 }],
    });
  });
});
