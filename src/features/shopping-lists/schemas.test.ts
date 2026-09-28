import { expect, it } from "vitest";
import { itemSchema, shoppingTotals } from "./schemas";
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
