import { describe, expect, it } from "vitest";
import { MONEY_RE } from "./money-mask";

describe("MONEY_RE", () => {
  it("reconoce montos", () => {
    for (const t of ["$1,234.56", "-$40.00", "$1.2k", "Te toca apartar $5.00", "120.00 USD"])
      expect(MONEY_RE.test(t), t).toBe(true);
  });
  it("no toca porcentajes, km, fechas ni etiquetas", () => {
    for (const t of ["45%", "125,000 km", "2026-10-29", "Monto (USD)", "En 3 días"])
      expect(MONEY_RE.test(t), t).toBe(false);
  });
});
