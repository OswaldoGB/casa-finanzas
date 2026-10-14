import { expect, it } from "vitest";
import { shoppingItemStatus, shoppingPurchaseTotals } from "./purchase-totals";

it("counts paid purchases once and separates cart, pending and available goods", () => {
  const items = [
    {
      quantity: 1.5,
      real_price: 2.25,
      estimated_price: 2,
      checked: true,
      purchase_id: null,
      resolution: "pending",
    },
    {
      quantity: 3,
      real_price: null,
      estimated_price: 0.1,
      checked: false,
      purchase_id: null,
      resolution: "pending",
    },
    {
      quantity: 2,
      real_price: null,
      estimated_price: 10,
      checked: false,
      purchase_id: null,
      resolution: "available",
    },
  ];
  const totals = shoppingPurchaseTotals(
    items,
    [{ transaction_id: "paid" }, { transaction_id: "paid" }],
    [{ id: "paid", amount: 20 }],
  );
  expect(totals).toMatchObject({
    paid: 20,
    cart: 3.38,
    pending: 0.3,
    projected: 23.68,
    missingCart: 0,
    missingPending: 0,
  });
});
it("distinguishes missing and zero prices, and uses the edited transaction amount", () => {
  const items = [
    {
      quantity: 1,
      real_price: null,
      estimated_price: null,
      checked: false,
      resolution: "pending",
      purchase_id: null,
    },
    {
      quantity: 1,
      real_price: 0,
      estimated_price: 0,
      checked: true,
      resolution: "pending",
      purchase_id: null,
    },
    {
      quantity: 1,
      real_price: 20,
      estimated_price: 19,
      checked: true,
      resolution: "pending",
      purchase_id: "purchase",
    },
  ];
  expect(
    shoppingPurchaseTotals(
      items,
      [{ id: "purchase", transaction_id: "paid" }],
      [{ id: "paid", amount: 21 }],
    ),
  ).toMatchObject({
    paid: 21,
    missingCart: 0,
    missingPending: 1,
    discrepancies: [{ purchase_id: "purchase", difference: 1 }],
  });
  expect(shoppingItemStatus(items[2])).toBe("purchased");
});
