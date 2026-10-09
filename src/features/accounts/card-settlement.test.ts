import { describe, expect, it } from "vitest";
import {
  cardCutSummary,
  installmentProgress,
  cardObligations,
  installmentSettlementStatus,
  statementSettlementStatus,
} from "./card-settlement";

describe("card settlement status", () => {
  it("labels statements from their bank balance", () => {
    expect(statementSettlementStatus({ bankDue: 80, paid: 0 })).toBe("pending");
    expect(statementSettlementStatus({ bankDue: 80, paid: 30 })).toBe(
      "partial",
    );
    expect(statementSettlementStatus({ bankDue: 80, paid: 80 })).toBe(
      "settled",
    );
  });

  it("keeps an installment included until it is fully paid", () => {
    expect(installmentSettlementStatus({ amount: 15, paid: 0 })).toBe(
      "included",
    );
    expect(installmentSettlementStatus({ amount: 15, paid: 14.99 })).toBe(
      "included",
    );
    expect(installmentSettlementStatus({ amount: 15, paid: 15 })).toBe(
      "settled",
    );
  });

  it("covers an included installment when the official bank cut is settled without inventing paid money", () => {
    expect(
      installmentSettlementStatus({
        amount: 20,
        paid: 10,
        statementSettled: true,
      }),
    ).toBe("settled");
  });

  it("uses the bank cut instead of the app difference as an amount to pay", () => {
    const bank = {
      id: "s",
      closesOn: "2026-10-07",
      dueOn: "2026-10-31",
      bankDue: 100,
      appTotal: 120,
      paid: 100,
      unpaid: 0,
      note: "",
      status: "settled" as const,
      installments: [],
    };
    expect(
      cardCutSummary(
        {
          closesOn: "2026-10-07",
          dueOn: "2026-10-30",
          balance: 120,
          unpaid: 20,
        },
        [bank],
        "2026-10-09",
      ),
    ).toMatchObject({
      unpaid: 0,
      dueOn: "2026-10-31",
      confirmed: true,
      difference: 20,
    });
    expect(
      cardCutSummary(
        {
          closesOn: "2026-11-07",
          dueOn: "2026-11-30",
          balance: 30,
          unpaid: 30,
        },
        [bank],
        "2026-11-08",
      ),
    ).toMatchObject({ confirmed: false, unpaid: 30 });
  });

  it("combines historical paid quotas with covered quotas and keeps overdue unpaid quotas next", () => {
    const rows = [
      {
        plan_id: "p",
        installment: 11,
        close_date: "2026-10-07",
        due_date: "2026-10-30",
        amount: 10,
      },
      {
        plan_id: "p",
        installment: 12,
        close_date: "2026-11-07",
        due_date: "2026-11-30",
        amount: 10,
      },
    ];
    const included = [
      {
        id: "i",
        planId: "p",
        installment: 11,
        closeOn: "2026-10-07",
        dueOn: "2026-10-31",
        amount: 10,
        paid: 5,
        status: "included" as const,
      },
    ];
    expect(installmentProgress(10, rows, included)).toMatchObject({
      paidCount: 10,
      remaining: 15,
      next: { installment: 11, due_date: "2026-10-31" },
    });
    expect(
      installmentProgress(10, rows, [{ ...included[0], status: "settled" }]),
    ).toMatchObject({
      paidCount: 11,
      remaining: 10,
      next: { installment: 12 },
    });
  });
  it("keeps overdue bank cuts and does not let a settled historical cut hide a newer estimate", () => {
    const estimate = {
      closesOn: "2026-10-07",
      dueOn: "2026-10-30",
      unpaid: 60,
    };
    expect(
      cardObligations(
        estimate,
        [{ closesOn: "2026-09-07", dueOn: "2026-09-30", unpaid: 40 }],
        "2026-10-09",
      ),
    ).toEqual([
      { closesOn: "2026-09-07", dueOn: "2026-09-30", unpaid: 40 },
      { ...estimate, unpaid: 20 },
    ]);
    expect(
      cardObligations(
        estimate,
        [{ closesOn: "2026-09-07", dueOn: "2026-09-30", unpaid: 0 }],
        "2026-10-09",
      ),
    ).toEqual([estimate]);
    expect(
      cardObligations(estimate, [{ ...estimate, unpaid: 0 }], "2026-10-09"),
    ).toEqual([]);
  });
  it("warns about ambiguous links without substituting the wrong cut's date or paid amount", () => {
    const result = installmentProgress(
      0,
      [
        {
          plan_id: "p",
          installment: 1,
          close_date: "2026-08-07",
          due_date: "2026-08-30",
          amount: 20,
        },
      ],
      [
        {
          id: "i",
          planId: "p",
          installment: 1,
          closeOn: "2026-08-07",
          dueOn: "2026-09-30",
          amount: 20,
          paid: 20,
          status: "included",
          needsReview: true,
        },
      ],
    );
    expect(result).toMatchObject({
      paidCount: 0,
      remaining: 20,
      next: { due_date: "2026-08-30", needsReview: true },
    });
  });
});
