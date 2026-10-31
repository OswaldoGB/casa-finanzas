import { describe, expect, it } from "vitest";
import { packageEntrySchema, stockChangeSchema, packagingPresets } from "./packages";

describe("presentaciones de inventario", () => {
  it("acepta una caja con cuatro bolsas de 39 unidades", () => {
    expect(packageEntrySchema.parse({ count: 4, capacity: 39, name: "Bolsa" })).toMatchObject({ count: 4, capacity: 39 });
  });
  it("rechaza cantidades nulas, negativas o fraccionarias", () => {
    for (const count of [0, -1, 1.5]) expect(packageEntrySchema.safeParse({ count, capacity: 39, name: "Bolsa" }).success).toBe(false);
    expect(stockChangeSchema.safeParse({ amount: 0 }).success).toBe(false);
  });
  it("incluye opciones habituales", () => {
    expect(packagingPresets).toEqual(expect.arrayContaining(["Caja", "Bolsa", "Botella", "Rollo"]));
  });
});
