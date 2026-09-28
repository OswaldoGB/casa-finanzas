import { describe, expect, it } from "vitest";
import { categorySchema, paymentMethodSchema } from "./schemas";

describe("catálogos", () => {
  it("rechaza categoría sin nombre o con color inválido", () => {
    expect(
      categorySchema.safeParse({
        name: " ",
        type: "expense",
        color: "#123456",
        icon: "tag",
      }).success,
    ).toBe(false);
    expect(
      categorySchema.safeParse({
        name: "Alimentos",
        type: "expense",
        color: "rojo",
        icon: "tag",
      }).success,
    ).toBe(false);
  });

  it("normaliza categoría válida y permite subcategoría", () => {
    expect(
      categorySchema.parse({
        name: "  Alimentos ",
        type: "expense",
        color: "#123456",
        icon: "tag",
        parentId: "00000000-0000-4000-8000-000000000001",
      }),
    ).toEqual({
      name: "Alimentos",
      type: "expense",
      color: "#123456",
      icon: "tag",
      parentId: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("valida el método y su cuenta vinculada", () => {
    expect(
      paymentMethodSchema.safeParse({
        name: "Débito",
        type: "debit",
        accountId: "otro",
      }).success,
    ).toBe(false);
    expect(
      paymentMethodSchema.parse({
        name: " Débito ",
        type: "debit",
        accountId: "",
      }),
    ).toEqual({ name: "Débito", type: "debit", accountId: null });
  });
});
