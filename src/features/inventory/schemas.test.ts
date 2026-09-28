import { describe, it, expect } from "vitest";
import { inventoryValue, warrantyExpiring } from "./schemas";

describe("inventario", () => {
  it("suma cantidad por precio y excluye artículos sin precio", () => {
    expect(
      inventoryValue([
        { quantity: 3, purchase_price: 12.66 },
        { quantity: 2, purchase_price: null },
      ]),
    ).toBe(37.98);
  });
  it("advierte garantía de próximos 30 días sin incluir garantías vencidas", () => {
    expect(warrantyExpiring("2026-10-27", "2026-09-27")).toBe(true);
    expect(warrantyExpiring("2026-10-28", "2026-09-27")).toBe(false);
    expect(warrantyExpiring("2026-09-26", "2026-09-27")).toBe(false);
  });
});
