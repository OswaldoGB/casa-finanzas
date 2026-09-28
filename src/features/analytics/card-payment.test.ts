import { describe, it, expect } from "vitest";
import { remainingCardPayment } from "./card-payment";

describe("pago de tarjeta previsto", () => {
  it("descuenta los abonos programados antes del vencimiento sin repetir la salida", () => {
    expect(
      remainingCardPayment(100, "card", "2026-10-05", [
        { repaymentCardId: "card", date: "2026-10-02", amount: -60 },
        { repaymentCardId: "card", date: "2026-10-06", amount: -50 },
      ]),
    ).toBe(40);
  });
  it("no genera pagos negativos al cubrir la deuda", () => {
    expect(
      remainingCardPayment(10, "card", "2026-10-05", [
        { repaymentCardId: "card", date: "2026-10-02", amount: -30 },
      ]),
    ).toBe(0);
  });
});
