import { describe, expect, it } from "vitest";
import { budgetProgress, budgetSchema } from "./schemas";

describe("presupuesto disponible", () => {
  it("usa el disponible con arrastre y marca los umbrales y exceso", () => {
    expect(budgetProgress(120, 84).status).toBe("warning");
    expect(budgetProgress(120, 108).status).toBe("danger");
    expect(budgetProgress(120, 121.15)).toEqual({
      percent: (121.15 / 120) * 100,
      remaining: -1.15,
      status: "exceeded",
    });
    expect(budgetProgress(0, 0).percent).toBe(0);
    expect(budgetProgress(0, 1).status).toBe("exceeded");
  });
  it("rechaza negativos, fracciones de centavo y meses inválidos", () => {
    const base = {
      month: "2026-09-01",
      category_id: "11111111-1111-4111-8111-111111111111",
      amount: "10.25",
      carry_over: "on",
    };
    expect(budgetSchema.parse(base).amount).toBe(10.25);
    for (const amount of ["-1", "1.001", "", "NaN"])
      expect(budgetSchema.safeParse({ ...base, amount }).success).toBe(false);
    expect(
      budgetSchema.safeParse({ ...base, month: "2026-02-30" }).success,
    ).toBe(false);
  });
});
