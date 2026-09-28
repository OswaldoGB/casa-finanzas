import { describe, it, expect } from "vitest";
import { suggestedMonthly } from "./schemas";
describe("Aporte mensual sugerido", () => {
  it("distribuye lo faltante y redondea hacia arriba a centavos", () =>
    expect(suggestedMonthly(100, 0, "2026-01-15", "2026-04-15")).toBe(33.34));
  it("usa al menos un mes para fechas vencidas", () =>
    expect(suggestedMonthly(100, 20, "2026-09-27", "2026-01-01")).toBe(80));
  it("no inventa un plazo sin fecha ni un faltante al cumplir", () => {
    expect(suggestedMonthly(100, 20, "2026-01-01", null)).toBeNull();
    expect(suggestedMonthly(100, 120, "2026-01-01", "2026-06-01")).toBe(0);
  });
});
