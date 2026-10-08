import { describe, expect, it } from "vitest";
import { allocatePayment, summarizeStatement } from "./card-statements";

describe("conciliación de tarjeta", () => {
  it("asigna el pago a los estados más antiguos primero", () => {
    expect(
      allocatePayment(140, [
        { id: "old", dueOn: "2026-10-20", closesOn: "2026-10-07", unpaid: 100 },
        { id: "new", dueOn: "2026-11-20", closesOn: "2026-11-07", unpaid: 80 },
      ]),
    ).toEqual([
      { statementId: "old", amount: 100 },
      { statementId: "new", amount: 40 },
    ]);
  });

  it("muestra la diferencia del banco sin cambiar el total calculado", () => {
    expect(
      summarizeStatement({ appTotal: 120, bankCashDue: 100, allocated: 30 }),
    ).toEqual({
      appTotal: 120,
      bankCashDue: 100,
      difference: -20,
      allocated: 30,
      unpaid: 70,
      status: "partial",
    });
  });
});
