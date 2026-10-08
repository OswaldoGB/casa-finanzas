import { describe, expect, it } from "vitest";
import { dashboardPriorities } from "./priorities";

describe("dashboard priorities", () => {
  it("puts urgent financial items ahead of general upcoming payments", () => {
    expect(
      dashboardPriorities({
        overdueLoans: { count: 2, amount: 75 },
        atRiskBudgets: { count: 1, amount: 95 },
        lowestProjectedCash: -12.5,
        upcomingCount: 3,
        nextUpcomingDate: "2026-10-10",
      }),
    ).toEqual([
      { kind: "loan", href: "/loans", count: 2, amount: 75 },
      { kind: "budget", href: "/budgets", count: 1, amount: 95 },
      { kind: "cash", href: "/projections", amount: -12.5 },
      {
        kind: "upcoming",
        href: "/projections",
        count: 3,
        date: "2026-10-10",
      },
    ]);
  });

  it("shows a calm state when there is nothing to resolve", () => {
    expect(
      dashboardPriorities({
        overdueLoans: { count: 0, amount: 0 },
        atRiskBudgets: { count: 0, amount: 0 },
        lowestProjectedCash: 20,
        upcomingCount: 0,
        nextUpcomingDate: undefined,
      }),
    ).toEqual([{ kind: "clear" }]);
  });
});
