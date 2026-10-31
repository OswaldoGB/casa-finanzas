import { describe, expect, it } from "vitest";
import { initialStockSchema } from "./create-stock";

describe("existencias iniciales", () => {
  it("acepta cuatro bolsas de 39 unidades en una caja", () => {
    expect(initialStockSchema.safeParse({ mode: "packages", package_name: "Bolsa", package_count: 4, package_capacity: 39, group_name: "Caja" }).success).toBe(true);
  });
  it("rechaza envases sin capacidad o cantidad", () => {
    expect(initialStockSchema.safeParse({ mode: "packages", package_name: "Bolsa", package_count: 0, package_capacity: 39, group_name: "" }).success).toBe(false);
  });
  it("admite existencias simples", () => {
    expect(initialStockSchema.safeParse({ mode: "simple" }).success).toBe(true);
  });
});
