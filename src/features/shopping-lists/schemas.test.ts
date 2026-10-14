import { expect, it } from "vitest";
import {
  itemSchema,
  shoppingTotals,
  groupSchema,
  purchaseInputSchema,
} from "./schemas";
import { randomUUID } from "node:crypto";
it("validates store names and rejects repeated purchase products", () => {
  expect(groupSchema.safeParse({ name: "   " }).success).toBe(false);
  expect(groupSchema.parse({ name: " Selectos " })).toEqual({
    name: "Selectos",
  });
  const id = randomUUID();
  expect(
    purchaseInputSchema.safeParse({
      list_id: id,
      group_id: "",
      item_ids: [id, id],
      account_id: id,
      category_id: id,
      date: "2026-10-14",
      payment_method_id: "",
      request_key: id,
      expected_total: "3.38",
    }).success,
  ).toBe(false);
});
it("separa carrito real y restantes estimados, sin inventar precios", () => {
  expect(
    shoppingTotals([
      { quantity: 1.5, estimated_price: 2, real_price: 2.25, checked: true },
      { quantity: 3, estimated_price: 0.1, real_price: null, checked: false },
      { quantity: 1, estimated_price: 5, real_price: null, checked: true },
      { quantity: 2, estimated_price: null, real_price: null, checked: false },
    ]),
  ).toEqual({
    cart: 3.38,
    estimated: 0.3,
    projected: 3.68,
    missingCart: 1,
    missingRemaining: 1,
  });
});
it("valida cantidades decimales y centavos", () => {
  const item = {
    name: "Arroz",
    quantity: "1.500",
    unit: "kg",
    estimated_price: "2.25",
    real_price: "",
    notes: "",
  };
  expect(itemSchema.parse(item).quantity).toBe(1.5);
  for (const quantity of ["0", "-1", "1.0001"])
    expect(itemSchema.safeParse({ ...item, quantity }).success).toBe(false);
  expect(itemSchema.safeParse({ ...item, real_price: "1.001" }).success).toBe(
    false,
  );
});
