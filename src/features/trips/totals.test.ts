import { expect, it } from "vitest";
import { tripTotals, tripCostBreakdown } from "./totals";
it("matches the beach budget without counting purchases twice", () => {
  const data = {
    project: { budget: 600 },
    shoppingSummary: { estimated: 529.59, pending: 0, missing: 0 },
    costLines: [],
    costTransactions: [],
    transactions: [{ id: "paid", amount: 535.71, status: "posted" }],
  };
  expect(tripTotals(data)).toMatchObject({
    maximum: 600,
    estimated: 529.59,
    real: 535.71,
    pending: 0,
    projected: 535.71,
    margin: 64.29,
    difference: -6.12,
  });
});
it("distinguishes a partial payment from a completed purchase below the estimate", () => {
  const line = {
    id: "hotel",
    quantity: 1,
    estimated_price: 314,
    is_settled: false,
  };
  const links = [{ cost_line_id: "hotel", transaction_id: "deposit" }];
  const tx = [{ id: "deposit", amount: 100, status: "posted" }];
  expect(tripCostBreakdown(line, links, tx)).toMatchObject({
    real: 100,
    pending: 214,
    difference: null,
  });
  expect(
    tripCostBreakdown({ ...line, is_settled: true }, links, [
      { id: "deposit", amount: 300, status: "posted" },
    ]),
  ).toMatchObject({ real: 300, pending: 0, difference: 14 });
});
it("keeps missing estimates explicit and sums shared purchases only once", () => {
  const input = {
    project: { budget: 600 },
    shoppingSummary: { estimated: 6, pending: 6, missing: 0 },
    costLines: [
      {
        id: "transport",
        quantity: 1,
        estimated_price: null,
        is_settled: false,
      },
    ],
    costTransactions: [],
    transactions: [
      { id: "same", amount: 20, status: "posted" },
      { id: "same", amount: 20, status: "posted" },
    ],
  };
  expect(tripTotals(input)).toMatchObject({
    real: 20,
    estimated: 6,
    pending: 6,
    missingPrices: 1,
    projected: 26,
  });
});
