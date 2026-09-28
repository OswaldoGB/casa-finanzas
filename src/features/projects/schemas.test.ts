import { it, expect } from "vitest";
import { projectSchema } from "./schemas";
it("rechaza fechas de proyecto invertidas", () => {
  expect(
    projectSchema.safeParse({
      name: "Cocina",
      description: "",
      budget: "250",
      start_date: "2026-09-27",
      end_date: "2026-09-26",
      status: "planned",
    }).success,
  ).toBe(false);
});
