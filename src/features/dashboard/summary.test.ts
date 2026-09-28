import { describe, expect, it } from "vitest";
import { accountNetWorth, cashFlowPoints } from "./summary";

describe("dashboard summary", () => {
  it("subtracts card debt from account assets", () => {
    expect(
      accountNetWorth([
        { type: "checking", balance: 200.1 },
        { type: "savings", balance: 100.2 },
        { type: "credit_card", balance: 50.3 },
      ]),
    ).toBe(250);
  });

  it("projects signed payments by day from cash and bank balances", () => {
    expect(
      cashFlowPoints(
        "2026-09-27",
        [
          { type: "checking", balance: 100 },
          { type: "credit_card", balance: 50 },
          { type: "investment", balance: 500 },
        ],
        [
          { date: "2026-09-29", cashImpact: -20.1 },
          { date: "2026-09-29", cashImpact: 10.2 },
          { date: "2026-10-01", cashImpact: -50 },
          { date: "2026-11-01", cashImpact: -1000 },
        ],
      ),
    ).toEqual([
      { date: "2026-09-27", balance: 100 },
      { date: "2026-09-29", balance: 90.1 },
      { date: "2026-10-01", balance: 40.1 },
    ]);
  });
});
